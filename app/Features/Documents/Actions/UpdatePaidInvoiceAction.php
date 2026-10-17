<?php

namespace App\Features\Documents\Actions;

use App\Enums\DocumentStatus;
use App\Enums\OrderSource;
use App\Features\Documents\Services\DocumentCalculator;
use App\Features\Documents\Services\PaidInvoiceGuard;
use App\Models\Document;
use App\Models\DocumentRevision;
use App\Models\Product;
use App\Support\Audit\AuditService;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Correct a paid invoice (items, discount, payment, source) while keeping its official number.
 * The previous version is kept as a revision and in the audit log.
 */
final class UpdatePaidInvoiceAction
{
    public function __construct(
        private readonly DocumentCalculator $calculator,
        private readonly PaidInvoiceGuard $guard,
        private readonly AuditService $audit,
    ) {}

    /**
     * @param  array{items: array<int, array{product_id: int|string, quantity: int|string}>, payment_method: string, amount_received?: string|null, discount_amount?: string|null, order_source?: string|null, external_order_ref?: string|null, customer_id?: int|null, reason: string}  $data
     */
    public function handle(Document $invoice, array $data, int $actorId): Document
    {
        return DB::transaction(function () use ($invoice, $data, $actorId) {
            $document = Document::query()->with(['items', 'period'])->lockForUpdate()->findOrFail($invoice->id);

            if ($document->status !== DocumentStatus::Finalized) {
                throw new DomainException(__('អាចកែបានតែវិក្កយបត្រដែលបានគិតប្រាក់ប៉ុណ្ណោះ។'));
            }
            $this->guard->assertPeriodOpen($document);

            // Dishes already on the invoice keep the price they were sold at; newly added dishes use today's price
            $previousLines = $document->items->whereNotNull('product_id')->keyBy('product_id');
            $products = Product::with(['category', 'unit'])
                ->whereIn('id', array_column($data['items'], 'product_id'))
                ->get()
                ->keyBy('id');

            $resolvedItems = [];
            $calcItems = [];
            foreach (array_values($data['items']) as $position => $rawItem) {
                $productId = (int) $rawItem['product_id'];
                $quantity = max(1, (int) $rawItem['quantity']);
                $previous = $previousLines->get($productId);
                $product = $products->get($productId);

                if (! $previous && (! $product || ! $product->is_active)) {
                    throw new DomainException(__('មុខទំនិញ #:productId មិនមានលក់ទេ។', ['productId' => $productId]));
                }

                $resolvedItems[] = $previous
                    ? [
                        'product_id' => $productId,
                        'line_position' => $position + 1,
                        'category_type_snapshot' => $previous->category_type_snapshot,
                        'product_name_primary_snapshot' => $previous->product_name_primary_snapshot,
                        'product_name_secondary_snapshot' => $previous->product_name_secondary_snapshot,
                        'unit_snapshot' => $previous->unit_snapshot,
                        'quantity' => $quantity,
                        'master_price_at_entry' => $previous->master_price_at_entry,
                        'unit_price' => $previous->unit_price,
                        'is_primary_package_snapshot' => $previous->is_primary_package_snapshot,
                        'is_price_override' => $previous->is_price_override,
                    ]
                    : [
                        'product_id' => $productId,
                        'line_position' => $position + 1,
                        'category_type_snapshot' => $product->category->category_type ?? 'regular',
                        'product_name_primary_snapshot' => $product->name_primary,
                        'product_name_secondary_snapshot' => $product->name_secondary,
                        'unit_snapshot' => $product->unit->name_primary ?? 'ចាន',
                        'quantity' => $quantity,
                        'master_price_at_entry' => $product->unit_price,
                        'unit_price' => $product->unit_price,
                        'is_primary_package_snapshot' => (bool) $product->is_primary_package,
                        'is_price_override' => false,
                    ];

                $calcItems[] = [
                    'quantity' => $quantity,
                    'unit_price' => (string) end($resolvedItems)['unit_price'],
                    'is_primary_package' => (bool) end($resolvedItems)['is_primary_package_snapshot'],
                ];
            }

            $paymentMethod = $data['payment_method'];
            $orderSource = OrderSource::tryFrom((string) ($data['order_source'] ?? '')) ?? OrderSource::WalkIn;
            if ($paymentMethod === 'app' && ! $orderSource->isDeliveryPlatform()) {
                throw ValidationException::withMessages([
                    'payment_method' => __('បង់តាម App ប្រើបានតែការកម្មង់ពី foodpanda, Grab, Nham24, WOWNOW ឬ App ផ្សេងៗប៉ុណ្ណោះ។'),
                ]);
            }

            // Non-cash payments always equal the total; cash keeps what the cashier entered when it covers the total
            $discount = (string) ($data['discount_amount'] ?? '0.00');
            $preview = $this->calculator->calculate($calcItems, null, '999999.00', '0.00', $discount, 'cash');
            $amountReceived = (string) ($data['amount_received'] ?? '');
            if ($paymentMethod !== 'cash' || $amountReceived === '' || bccomp($amountReceived, $preview['grand_total'], 2) === -1) {
                $amountReceived = $preview['grand_total'];
            }
            $calc = $this->calculator->calculate($calcItems, null, $amountReceived, '0.00', $discount, $paymentMethod);

            $before = $this->payload($document);

            // Loyalty follows the invoice: take back what the old version gave, then credit the corrected one
            $this->guard->applyLoyalty($document, -1);

            $customerId = ! empty($data['customer_id']) ? (int) $data['customer_id'] : null;
            $document->update([
                'unit_count' => $calc['unit_count'],
                'source_total' => $calc['grand_total'],
                'subtotal' => $calc['subtotal'],
                'tax_amount' => $calc['tax_amount'],
                'discount_amount' => $calc['discount_amount'],
                'grand_total' => $calc['grand_total'],
                'amount_received' => $calc['amount_received'],
                'change_amount' => $calc['change_amount'],
                'payment_method' => $paymentMethod,
                'order_source' => $orderSource,
                'external_order_ref' => $orderSource->isDeliveryPlatform() ? (trim((string) ($data['external_order_ref'] ?? '')) ?: null) : null,
                'customer_id' => $customerId,
                'points_earned' => $customerId ? (int) floor((float) $calc['grand_total']) : 0,
                'updated_by' => $actorId,
                'lock_version' => $document->lock_version + 1,
            ]);

            $document->items()->delete();
            foreach ($resolvedItems as $position => $item) {
                $document->items()->create([...$item, 'line_total' => $calc['line_totals'][$position]]);
            }

            $this->guard->applyLoyalty($document, 1);

            $document->load('items');
            $after = $this->payload($document);

            DocumentRevision::create([
                'document_id' => $document->id,
                'revision_no' => (int) $document->revisions()->max('revision_no') + 1,
                'before_payload' => $before,
                'after_payload' => $after,
                'reason' => $data['reason'],
                'changed_by' => $actorId,
            ]);

            $this->audit->record(
                'document.edited',
                $document,
                $before,
                $after,
                null,
                $actorId,
                $data['reason']
            );

            return $document;
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Document $document): array
    {
        return [
            'grand_total' => (string) $document->grand_total,
            'discount_amount' => (string) $document->discount_amount,
            'amount_received' => (string) $document->amount_received,
            'change_amount' => (string) $document->change_amount,
            'payment_method' => $document->payment_method,
            'order_source' => $document->order_source?->value,
            'external_order_ref' => $document->external_order_ref,
            'customer_id' => $document->customer_id,
            'items' => $document->items->map(fn ($item) => [
                'product_id' => $item->product_id,
                'name' => $item->product_name_primary_snapshot,
                'quantity' => $item->quantity,
                'unit_price' => (string) $item->unit_price,
            ])->values()->all(),
        ];
    }
}
