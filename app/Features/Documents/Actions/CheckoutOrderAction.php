<?php

namespace App\Features\Documents\Actions;

use App\Enums\DocumentStatus;
use App\Enums\OrderSource;
use App\Enums\PeriodStatus;
use App\Features\Documents\Services\DocumentCalculator;
use App\Features\Documents\Services\KitchenTicketIssuer;
use App\Models\BusinessSetting;
use App\Models\Customer;
use App\Models\Document;
use App\Models\Period;
use App\Models\Product;
use App\Models\RestaurantTable;
use App\Models\User;
use App\Support\Audit\AuditService;
use App\Support\Money\Money;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class CheckoutOrderAction
{
    public function __construct(
        private readonly DocumentCalculator $calculator,
        private readonly AuditService $audit,
        private readonly KitchenTicketIssuer $kitchenTickets,
    ) {}

    /**
     * Execute instant real-time POS checkout with authoritative sequence number.
     *
     * @param  array<string, mixed>  $data
     */
    public function handle(array $data, int $cashierId): Document
    {
        return DB::transaction(function () use ($data, $cashierId) {
            // 1. Resolve or activate operational shift period
            $period = Period::where('status', PeriodStatus::Active)->lockForUpdate()->first();
            if (! $period) {
                $period = Period::resolveActive(1, $cashierId);
            }

            // 2. Resolve Products and Authoritative Prices
            $rawItems = $data['items'] ?? [];
            if (empty($rawItems)) {
                throw new DomainException('Please add at least one item to checkout.');
            }

            $productIds = array_column($rawItems, 'product_id');
            $products = Product::with(['category', 'unit'])
                ->whereIn('id', $productIds)
                ->where('is_active', true)
                ->get()
                ->keyBy('id');

            $resolvedItems = [];
            $calcItems = [];

            foreach ($rawItems as $position => $rawItem) {
                $productId = (int) $rawItem['product_id'];
                $product = $products->get($productId);

                if (! $product) {
                    throw new DomainException("Product #{$productId} is not available.");
                }

                $quantity = max(1, (int) ($rawItem['quantity'] ?? 1));
                $unitPrice = $product->unit_price;

                $resolvedItems[] = [
                    'product_id' => $product->id,
                    'line_position' => $position + 1,
                    'category_type_snapshot' => $product->category->category_type ?? 'regular',
                    'product_name_primary_snapshot' => $product->name_primary,
                    'product_name_secondary_snapshot' => $product->name_secondary,
                    'unit_snapshot' => $product->unit->name_primary ?? 'ចាន',
                    'quantity' => $quantity,
                    'master_price_at_entry' => $unitPrice,
                    'unit_price' => $unitPrice,
                    'is_primary_package_snapshot' => (bool) $product->is_primary_package,
                    'is_price_override' => false,
                ];

                $calcItems[] = [
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'is_primary_package' => (bool) $product->is_primary_package,
                ];
            }

            // 3. Authoritative Totals Calculation
            $discountAmountInput = (string) ($data['discount_amount'] ?? '0.00');
            $paymentMethod = (string) ($data['payment_method'] ?? 'cash');

            // Compute expected grand total
            $itemsSubtotalCents = 0;
            foreach ($calcItems as $ci) {
                $itemsSubtotalCents += Money::toCents((string) $ci['unit_price']) * (int) $ci['quantity'];
            }
            $discountCents = Money::toCents($discountAmountInput);

            // Cashiers may only give small discounts; larger ones must be entered by a supervisor or admin
            $actor = User::find($cashierId);
            $maxDiscountPercent = BusinessSetting::current()->cashierMaxDiscountPercent();
            if ($actor?->isCashier() && $discountCents * 100 > $itemsSubtotalCents * $maxDiscountPercent) {
                $maxDiscount = Money::fromCents(intdiv($itemsSubtotalCents * $maxDiscountPercent, 100));

                throw ValidationException::withMessages([
                    'discount_amount' => "Cashier អាចបញ្ចុះតម្លៃបានត្រឹម {$maxDiscountPercent}% (\${$maxDiscount})។ សូមឱ្យ Supervisor ឬ Admin ធ្វើការបញ្ចុះតម្លៃលើសនេះ។",
                ]);
            }
            $expectedGrandTotalCents = max(0, $itemsSubtotalCents - $discountCents);
            $expectedGrandTotal = Money::fromCents($expectedGrandTotalCents);

            $amountReceivedInput = (string) ($data['amount_received'] ?? '');
            if ($paymentMethod !== 'cash' || $amountReceivedInput === '' || bccomp($amountReceivedInput, $expectedGrandTotal, 2) === -1) {
                $amountReceivedInput = $expectedGrandTotal;
            }

            $calc = $this->calculator->calculate(
                items: $calcItems,
                sourceTotal: null,
                amountReceived: $amountReceivedInput,
                taxAmount: '0.00',
                discountAmount: $discountAmountInput,
                paymentMethod: $paymentMethod,
            );

            // 4. Atomic Sequential Number Stamping
            $nextSequence = ($period->last_sequence_no ?? 0) + 1;
            $period->last_sequence_no = $nextSequence;
            $period->save();

            $docPrefix = $period->document_prefix ?? 'INV';
            $documentNumber = sprintf('%s-%s-%04d', $docPrefix, $period->code, $nextSequence);

            $tableName = $data['table_identifier'] ?? $data['reference_identifier'] ?? 'Takeaway';

            // Delivery app orders keep the platform's own order number; walk-in orders never carry one
            $orderSource = OrderSource::tryFrom((string) ($data['order_source'] ?? '')) ?? OrderSource::WalkIn;
            $externalOrderRef = $orderSource->isDeliveryPlatform()
                ? (trim((string) ($data['external_order_ref'] ?? '')) ?: null)
                : null;

            // 5. Update Existing Table Draft or Insert New Finalized Document
            $existingDocId = $data['document_id'] ?? null;
            $previousItems = [];
            if ($existingDocId) {
                $document = Document::query()->lockForUpdate()->findOrFail($existingDocId);

                // Only an open table order can be settled; a paid or voided invoice must never be re-numbered or revived
                if ($document->status !== DocumentStatus::Draft) {
                    throw new DomainException('ការកម្មង់នេះត្រូវបានគិតប្រាក់ ឬលុបចោលរួចហើយ។ សូមផ្ទុកទំព័រ POS ឡើងវិញ។');
                }
                // Dishes already sent to the kitchen when the table was held are not ticketed again
                $previousItems = $this->kitchenTickets->snapshot($document);
                $document->items()->delete();

                $document->update([
                    'sequence_no' => $nextSequence,
                    'document_number' => $documentNumber,
                    'unit_count' => $calc['unit_count'],
                    'source_total' => $calc['grand_total'],
                    'source_total_verified' => true,
                    'subtotal' => $calc['subtotal'],
                    'tax_amount' => $calc['tax_amount'],
                    'discount_amount' => $calc['discount_amount'],
                    'grand_total' => $calc['grand_total'],
                    'amount_received' => $calc['amount_received'],
                    'change_amount' => $calc['change_amount'],
                    'payment_method' => $paymentMethod,
                    'status' => DocumentStatus::Finalized,
                    'reference_identifier' => $tableName,
                    'order_source' => $orderSource,
                    'external_order_ref' => $externalOrderRef,
                    'customer_id' => ! empty($data['customer_id']) ? (int) $data['customer_id'] : null,
                    'points_earned' => ! empty($data['customer_id']) ? (int) floor((float) $calc['grand_total']) : 0,
                    'note' => $data['note'] ?? null,
                    'finalized_by' => $cashierId,
                    'finalized_at' => now(),
                    'updated_by' => $cashierId,
                ]);
            } else {
                $customerId = ! empty($data['customer_id']) ? (int) $data['customer_id'] : null;
                $pointsEarned = $customerId ? (int) floor((float) $calc['grand_total']) : 0;

                $document = Document::create([
                    'period_id' => $period->id,
                    'provisional_order' => $nextSequence,
                    'sequence_no' => $nextSequence,
                    'document_number' => $documentNumber,
                    'business_date' => now()->toDateString(),
                    'event_time' => now()->format('H:i:s'),
                    'reference_identifier' => $tableName,
                    'order_source' => $orderSource,
                    'external_order_ref' => $externalOrderRef,
                    'unit_count' => $calc['unit_count'],
                    'source_total' => $calc['grand_total'],
                    'source_total_verified' => true,
                    'subtotal' => $calc['subtotal'],
                    'tax_amount' => $calc['tax_amount'],
                    'discount_amount' => $calc['discount_amount'],
                    'grand_total' => $calc['grand_total'],
                    'amount_received' => $calc['amount_received'],
                    'change_amount' => $calc['change_amount'],
                    'payment_method' => $paymentMethod,
                    'status' => DocumentStatus::Finalized,
                    'kitchen_status' => 'pending',
                    'customer_id' => $customerId,
                    'points_earned' => $pointsEarned,
                    'note' => $data['note'] ?? null,
                    'print_settings_snapshot' => $period->print_settings_snapshot,
                    'entry_settings_snapshot' => $period->entry_settings_snapshot,
                    'created_by' => $cashierId,
                    'updated_by' => $cashierId,
                    'finalized_by' => $cashierId,
                    'finalized_at' => now(),
                    'lock_version' => 0,
                ]);
            }

            // Accrue loyalty points to customer if attached
            if (! empty($document->customer_id)) {
                $customer = Customer::find($document->customer_id);
                if ($customer) {
                    $customer->increment('visits_count');
                    $customer->increment('loyalty_points', $document->points_earned);
                    $customer->increment('total_spent_usd', (float) $calc['grand_total']);
                    if ($customer->total_spent_usd >= 200 && $customer->tier !== 'vip') {
                        $customer->update(['tier' => 'vip']);
                    } elseif ($customer->total_spent_usd >= 100 && in_array($customer->tier, ['standard', 'silver'])) {
                        $customer->update(['tier' => 'gold']);
                    } elseif ($customer->total_spent_usd >= 40 && $customer->tier === 'standard') {
                        $customer->update(['tier' => 'silver']);
                    }
                }
            }

            // If table order checked out, set restaurant table back to available
            $resTable = RestaurantTable::where('name', $tableName)->orWhere('code', $tableName)->first();
            if ($resTable) {
                $resTable->update(['status' => 'available']);
            }

            // 6. Insert Line Items
            foreach ($resolvedItems as $pos => $item) {
                $document->items()->create([
                    ...$item,
                    'line_total' => $calc['line_totals'][$pos],
                ]);
            }

            // Kitchen ticket for new or added dishes; keep the kitchen's progress when nothing new was ordered
            $ticket = $this->kitchenTickets->issue($document, $previousItems, $cashierId);
            if ($existingDocId && $ticket?->hasAdditions()) {
                $document->update(['kitchen_status' => 'pending']);
            }
            $document->setRelation('issuedKitchenTicket', $ticket);

            // 7. Audit Log
            $this->audit->record(
                'document.checkout_completed',
                $document,
                null,
                [
                    'document_number' => $documentNumber,
                    'grand_total' => $calc['grand_total'],
                    'payment_method' => $paymentMethod,
                    'table' => $tableName,
                    'order_source' => $orderSource->value,
                    'external_order_ref' => $externalOrderRef,
                ],
                null,
                $cashierId,
                "Live POS checkout completed: {$documentNumber} for {$tableName}"
            );

            return $document->load(['items.product', 'creator', 'period']);
        });
    }
}
