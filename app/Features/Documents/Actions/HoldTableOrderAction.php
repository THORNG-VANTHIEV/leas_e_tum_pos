<?php

namespace App\Features\Documents\Actions;

use App\Enums\DocumentStatus;
use App\Enums\PeriodStatus;
use App\Features\Documents\Services\DocumentCalculator;
use App\Features\Documents\Services\KitchenTicketIssuer;
use App\Models\Document;
use App\Models\Period;
use App\Models\Product;
use App\Models\RestaurantTable;
use App\Support\Audit\AuditService;
use App\Support\Money\Money;
use DomainException;
use Illuminate\Support\Facades\DB;

final class HoldTableOrderAction
{
    public function __construct(
        private readonly DocumentCalculator $calculator,
        private readonly AuditService $audit,
        private readonly KitchenTicketIssuer $kitchenTickets,
    ) {}

    /**
     * Hold or update an active Dine-in table order.
     *
     * @param  array<string, mixed>  $data
     */
    public function handle(array $data, int $cashierId): Document
    {
        return DB::transaction(function () use ($data, $cashierId) {
            $period = Period::where('status', PeriodStatus::Active)->first();
            if (! $period) {
                $period = Period::resolveActive(1, $cashierId);
            }

            $rawItems = $data['items'] ?? [];
            if (empty($rawItems)) {
                throw new DomainException(__('សូមបន្ថែមមុខម្ហូបយ៉ាងហោចណាស់មួយ មុននឹងរក្សាទុកតុ។'));
            }

            $tableName = trim((string) ($data['table_identifier'] ?? $data['reference_identifier'] ?? 'តុ ០១'));

            // Look up existing open table order if document_id given or by table name in active period
            $existing = null;
            if (! empty($data['document_id'])) {
                $existing = Document::where('id', $data['document_id'])
                    ->where('status', DocumentStatus::Draft)
                    ->first();
            }

            if (! $existing) {
                $existing = Document::where('period_id', $period->id)
                    ->where('status', DocumentStatus::Draft)
                    ->where('reference_identifier', $tableName)
                    ->latest('id')
                    ->first();
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
                    throw new DomainException(__('មុខទំនិញ #:productId មិនមានលក់ទេ។', ['productId' => $productId]));
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

            // Compute expected grand total for draft calculation
            $itemsSubtotalCents = 0;
            foreach ($calcItems as $ci) {
                $itemsSubtotalCents += Money::toCents((string) $ci['unit_price']) * (int) $ci['quantity'];
            }
            $discountCents = Money::toCents((string) ($data['discount_amount'] ?? '0.00'));
            $expectedGrandTotalCents = max(0, $itemsSubtotalCents - $discountCents);
            $expectedGrandTotal = Money::fromCents($expectedGrandTotalCents);

            $calc = $this->calculator->calculate(
                items: $calcItems,
                sourceTotal: null,
                amountReceived: $expectedGrandTotal,
                taxAmount: '0.00',
                discountAmount: (string) ($data['discount_amount'] ?? '0.00'),
                paymentMethod: 'cash',
            );

            // What the kitchen already received, so the new ticket only carries the changes
            $previousItems = $existing ? $this->kitchenTickets->snapshot($existing) : [];

            if ($existing) {
                $existing->items()->delete();

                $existing->update([
                    'unit_count' => $calc['unit_count'],
                    'source_total' => $calc['grand_total'],
                    'source_total_verified' => true,
                    'subtotal' => $calc['subtotal'],
                    'tax_amount' => $calc['tax_amount'],
                    'discount_amount' => $calc['discount_amount'],
                    'grand_total' => $calc['grand_total'],
                    'reference_identifier' => $tableName,
                    'note' => $data['note'] ?? $existing->note,
                    'updated_by' => $cashierId,
                ]);

                $document = $existing;
            } else {
                $maxOrder = Document::where('period_id', $period->id)->max('provisional_order') ?? 0;

                $document = Document::create([
                    'period_id' => $period->id,
                    'provisional_order' => $maxOrder + 1,
                    'sequence_no' => null,
                    'document_number' => null,
                    'business_date' => now()->toDateString(),
                    'event_time' => now()->format('H:i:s'),
                    'reference_identifier' => $tableName,
                    'unit_count' => $calc['unit_count'],
                    'source_total' => $calc['grand_total'],
                    'source_total_verified' => true,
                    'subtotal' => $calc['subtotal'],
                    'tax_amount' => $calc['tax_amount'],
                    'discount_amount' => $calc['discount_amount'],
                    'grand_total' => $calc['grand_total'],
                    'amount_received' => '0.00',
                    'change_amount' => '0.00',
                    'payment_method' => 'cash',
                    'status' => DocumentStatus::Draft,
                    'kitchen_status' => 'pending',
                    'note' => $data['note'] ?? null,
                    'print_settings_snapshot' => $period->print_settings_snapshot,
                    'entry_settings_snapshot' => $period->entry_settings_snapshot,
                    'created_by' => $cashierId,
                    'updated_by' => $cashierId,
                    'lock_version' => 0,
                ]);
            }

            // Mark table occupied in restaurant floor plan
            $resTable = RestaurantTable::where('name', $tableName)->orWhere('code', $tableName)->first();
            if ($resTable && $resTable->status === 'available') {
                $resTable->update(['status' => 'occupied']);
            }

            foreach ($resolvedItems as $pos => $item) {
                $document->items()->create([
                    ...$item,
                    'line_total' => $calc['line_totals'][$pos],
                ]);
            }

            $ticket = $this->kitchenTickets->issue($document, $previousItems, $cashierId);
            if ($ticket?->hasAdditions()) {
                $document->update(['kitchen_status' => 'pending']);
            }
            $document->setRelation('issuedKitchenTicket', $ticket);

            $this->audit->record(
                'document.table_held',
                $document,
                null,
                [
                    'table' => $tableName,
                    'grand_total' => $calc['grand_total'],
                    'items_count' => count($resolvedItems),
                ],
                null,
                $cashierId,
                "Held Dine-in table order for {$tableName}"
            );

            return $document->load(['items.product', 'creator', 'period']);
        });
    }
}
