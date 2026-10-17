<?php

namespace App\Features\Periods\Actions;

use App\Enums\DocumentStatus;
use App\Enums\PeriodStatus;
use App\Features\Documents\Services\DocumentCalculator;
use App\Models\Document;
use App\Models\Period;
use App\Support\Audit\AuditService;
use App\Support\Money\Money;
use DomainException;
use Illuminate\Support\Facades\DB;

final class FinalizePeriodDocuments
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly DocumentCalculator $calculator,
    ) {}

    /**
     * Atomically finalize period and assign gapless contiguous sequential numbers.
     */
    public function handle(int $periodId, int $adminId): Period
    {
        return DB::transaction(function () use ($periodId, $adminId): Period {
            $period = Period::query()->lockForUpdate()->findOrFail($periodId);

            if ($period->status !== PeriodStatus::Review && $period->status !== PeriodStatus::Active) {
                throw new DomainException('អាចបិទបញ្ជីបានតែវគ្គដែលកំពុងបើក ឬកំពុងពិនិត្យប៉ុណ្ណោះ។');
            }

            $requireSource = (bool) data_get(
                $period->entry_settings_snapshot,
                'require_source_total',
                true
            );

            // Tables held at the POS but not paid yet cannot become official invoices; name them so staff can settle them
            $unpaidOrders = Document::query()
                ->where('period_id', $period->id)
                ->where('status', DocumentStatus::Draft)
                ->where('payment_method', 'cash')
                ->whereColumn('amount_received', '<', 'grand_total')
                ->orderBy('id')
                ->get(['id', 'reference_identifier', 'grand_total']);

            if ($unpaidOrders->isNotEmpty()) {
                $list = $unpaidOrders
                    ->map(fn (Document $order) => ($order->reference_identifier ?: "#{$order->id}")." (\${$order->grand_total})")
                    ->implode(', ');

                throw new DomainException("មិនអាចបិទវគ្គបានទេ៖ មានការកម្មង់មិនទាន់គិតប្រាក់ — {$list}។ សូមគិតប្រាក់ ឬលុបចោលនៅ POS មុនសិន។");
            }

            $documents = Document::query()
                ->where('period_id', $period->id)
                ->whereNull('sequence_no')
                ->whereIn('status', [DocumentStatus::Draft->value, DocumentStatus::Review->value])
                ->orderBy('business_date')
                ->orderBy('event_time')
                ->orderBy('provisional_order')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($documents->isEmpty() && $period->last_sequence_no === 0) {
                throw new DomainException('មិនអាចបិទបញ្ជីវគ្គដែលគ្មានវិក្កយបត្របានទេ។');
            }

            // 1. Authoritative recalculation and verification of each document
            foreach ($documents as $document) {
                if ($document->document_number !== null) {
                    throw new DomainException('វិក្កយបត្រដែលមានលេខរួចហើយ មិនអាចដាក់លេខម្តងទៀតបានទេ។');
                }

                $items = $document->items()->orderBy('line_position')->get();
                if ($items->isEmpty()) {
                    throw new DomainException("វិក្កយបត្រ #{$document->id} គ្មានមុខទំនិញ។");
                }

                $calculated = $this->calculator->calculate(
                    $items->map(fn ($item) => [
                        'quantity' => (int) $item->quantity,
                        'unit_price' => (string) $item->unit_price,
                        'is_primary_package' => (bool) $item->is_primary_package_snapshot,
                    ])->all(),
                    $document->source_total_verified ? (string) $document->source_total : null,
                    (string) $document->amount_received,
                    (string) $document->tax_amount,
                    (string) $document->discount_amount,
                    (string) $document->payment_method,
                );

                foreach (['subtotal', 'tax_amount', 'discount_amount', 'grand_total', 'amount_received', 'change_amount'] as $field) {
                    if (Money::toCents((string) $document->{$field}) !== Money::toCents($calculated[$field])) {
                        throw new DomainException("{$field} របស់វិក្កយបត្រ #{$document->id} មិនត្រូវនឹងការគណនារបស់ប្រព័ន្ធ។");
                    }
                }

                if ($requireSource && ! $document->source_total_verified) {
                    throw new DomainException("វិក្កយបត្រ #{$document->id} ត្រូវផ្ទៀងផ្ទាត់សរុបតាមក្រដាសសិន មុននឹងបិទបញ្ជី។");
                }
            }

            // 2. Deterministic gapless sequence numbering
            $sequence = max($period->last_sequence_no, $period->starting_sequence - 1);

            foreach ($documents as $document) {
                $sequence++;
                $number = sprintf('%s-%s-%04d', $period->document_prefix, $period->code, $sequence);

                $document->forceFill([
                    'sequence_no' => $sequence,
                    'document_number' => $number,
                    'status' => DocumentStatus::Finalized,
                    'finalized_by' => $adminId,
                    'finalized_at' => now(),
                    'lock_version' => $document->lock_version + 1,
                ])->save();

                $this->audit->record('document.finalized', $document, null, [
                    'document_number' => $number,
                    'sequence_no' => $sequence,
                ], actorId: $adminId);
            }

            // 3. Close the period
            $period->forceFill([
                'last_sequence_no' => $sequence,
                'status' => PeriodStatus::Closed,
                'closed_by' => $adminId,
                'closed_at' => now(),
                'lock_version' => $period->lock_version + 1,
            ])->save();

            $this->audit->record('period.closed', $period, null, [
                'last_sequence_no' => $sequence,
                'assigned_count' => $documents->count(),
            ], actorId: $adminId);

            return $period->refresh();
        }, 3);
    }
}
