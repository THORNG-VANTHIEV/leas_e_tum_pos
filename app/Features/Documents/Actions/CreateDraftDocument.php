<?php

namespace App\Features\Documents\Actions;

use App\Enums\DocumentStatus;
use App\Enums\PeriodStatus;
use App\Features\Documents\Services\DocumentCalculator;
use App\Models\Document;
use App\Models\Period;
use App\Models\Product;
use App\Support\Audit\AuditService;
use DomainException;
use Illuminate\Support\Facades\DB;

final class CreateDraftDocument
{
    public function __construct(
        private readonly DocumentCalculator $calculator,
        private readonly AuditService $audit,
    ) {}

    /**
     * Create an immutable draft document.
     *
     * @param  array<string, mixed>  $data
     */
    public function handle(array $data, int $creatorId): Document
    {
        return DB::transaction(function () use ($data, $creatorId) {
            $period = Period::findOrFail($data['period_id']);

            if ($period->status !== PeriodStatus::Active) {
                throw new DomainException('អាចបង្កើតការកម្មង់បានតែក្នុងវគ្គដែលកំពុងបើកប៉ុណ្ណោះ។');
            }

            $entryPolicy = $period->entry_settings_snapshot ?? [];
            $requireSource = (bool) ($entryPolicy['require_source_total'] ?? true);

            // 1. Authoritative Server-Side Product Resolution & Snapshots
            $rawItems = $data['items'] ?? [];
            if (empty($rawItems)) {
                throw new DomainException('វិក្កយបត្រត្រូវមានមុខទំនិញយ៉ាងហោចណាស់មួយ។');
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
                    throw new DomainException("មុខទំនិញ #{$productId} ត្រូវបានបិទ ឬមិនមានក្នុងប្រព័ន្ធ។");
                }

                $quantity = (int) $rawItem['quantity'];
                if ($quantity < 1 || $quantity > 9999) {
                    throw new DomainException('ចំនួនត្រូវនៅចន្លោះ 1 ដល់ 9999។');
                }

                // Authoritative master price
                $unitPrice = $product->unit_price;

                $resolvedItems[] = [
                    'product_id' => $product->id,
                    'line_position' => $position + 1,
                    'category_type_snapshot' => $product->category->category_type,
                    'product_name_primary_snapshot' => $product->name_primary,
                    'product_name_secondary_snapshot' => $product->name_secondary,
                    'unit_snapshot' => $product->unit->name_primary,
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

            // 2. Strict Financial Engine Calculation
            $sourceTotalInput = isset($data['source_total']) && $data['source_total'] !== ''
                ? (string) $data['source_total']
                : null;

            $amountReceivedInput = (string) ($data['amount_received'] ?? '0.00');
            $taxAmountInput = '0.00';
            $discountAmountInput = (string) ($data['discount_amount'] ?? '0.00');
            $paymentMethod = (string) ($data['payment_method'] ?? 'cash');

            $calc = $this->calculator->calculate(
                items: $calcItems,
                sourceTotal: $requireSource ? $sourceTotalInput : null,
                amountReceived: $amountReceivedInput,
                taxAmount: $taxAmountInput,
                discountAmount: $discountAmountInput,
                paymentMethod: $paymentMethod,
            );

            // 3. Strict Source Total Reconciliation Check
            if ($requireSource) {
                if (! $calc['source_total_verified'] || $calc['variance'] !== '0.00') {
                    throw new DomainException(
                        "សរុបតាមក្រដាសមិនត្រូវនឹងប្រព័ន្ធ (ខុសគ្នា {$calc['variance']})។ ត្រូវតែស្មើគ្នាពិតប្រាកដ។"
                    );
                }
            }

            // 4. Provisional Order Allocation
            $maxOrder = Document::where('period_id', $period->id)->max('provisional_order') ?? 0;
            $provisionalOrder = $maxOrder + 1;

            // 5. Create Document Header
            $document = Document::create([
                'period_id' => $period->id,
                'provisional_order' => $provisionalOrder,
                'sequence_no' => null,
                'document_number' => null,
                'business_date' => $data['business_date'] ?? now()->toDateString(),
                'event_time' => $data['event_time'] ?? now()->format('H:i'),
                'reference_identifier' => $data['reference_identifier'] ?? null,
                'unit_count' => $calc['unit_count'],
                'source_total' => $calc['source_total'],
                'source_total_verified' => $calc['source_total_verified'],
                'subtotal' => $calc['subtotal'],
                'tax_amount' => $calc['tax_amount'],
                'discount_amount' => $calc['discount_amount'],
                'grand_total' => $calc['grand_total'],
                'amount_received' => $calc['amount_received'],
                'change_amount' => $calc['change_amount'],
                'payment_method' => $paymentMethod,
                'status' => DocumentStatus::Draft,
                'note' => $data['note'] ?? null,
                'print_settings_snapshot' => $period->print_settings_snapshot,
                'entry_settings_snapshot' => $period->entry_settings_snapshot,
                'created_by' => $creatorId,
                'updated_by' => $creatorId,
                'lock_version' => 0,
            ]);

            // 6. Create Document Lines with Snapshots
            foreach ($resolvedItems as $pos => $item) {
                $document->items()->create([
                    ...$item,
                    'line_total' => $calc['line_totals'][$pos],
                ]);
            }

            // 7. Append-only Audit Log
            $this->audit->record(
                'document.draft_created',
                $document,
                null,
                [
                    'grand_total' => $calc['grand_total'],
                    'unit_count' => $calc['unit_count'],
                    'items_count' => count($resolvedItems),
                ],
                null,
                $creatorId,
                'Cashier created draft order'
            );

            return $document->load(['items', 'period']);
        });
    }
}
