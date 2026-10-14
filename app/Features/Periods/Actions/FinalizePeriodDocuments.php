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
     *
     * @param int $periodId
     * @param int $adminId
     * @return Period
     */
    public function handle(int $periodId, int $adminId): Period
    {
        return DB::transaction(function () use ($periodId, $adminId): Period {
            $period = Period::query()->lockForUpdate()->findOrFail($periodId);

            if ($period->status !== PeriodStatus::Review && $period->status !== PeriodStatus::Active) {
                throw new DomainException('Only an active period or a period under review can be finalized.');
            }

            $requireSource = (bool) data_get(
                $period->entry_settings_snapshot,
                'require_source_total',
                true
            );

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
                throw new DomainException('An empty period cannot be finalized.');
            }

            // 1. Authoritative recalculation and verification of each document
            foreach ($documents as $document) {
                if ($document->document_number !== null) {
                    throw new DomainException('A document with an existing official number cannot be re-sequenced.');
                }

                $items = $document->items()->orderBy('line_position')->get();
                if ($items->isEmpty()) {
                    throw new DomainException("Document #{$document->id} has no line items.");
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
                        throw new DomainException("Stored {$field} does not match authoritative calculation on document #{$document->id}.");
                    }
                }

                if ($requireSource && ! $document->source_total_verified) {
                    throw new DomainException("Document #{$document->id} requires verified physical source-total reconciliation before finalization.");
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
