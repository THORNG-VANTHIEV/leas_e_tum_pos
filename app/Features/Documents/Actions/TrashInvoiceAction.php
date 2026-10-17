<?php

namespace App\Features\Documents\Actions;

use App\Enums\DocumentStatus;
use App\Features\Documents\Services\PaidInvoiceGuard;
use App\Models\Document;
use App\Support\Audit\AuditService;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * Move a paid or voided invoice to the trash: it leaves lists, reports and shift totals,
 * keeps its official number and can be restored by a manager.
 */
final class TrashInvoiceAction
{
    public function __construct(
        private readonly PaidInvoiceGuard $guard,
        private readonly AuditService $audit,
    ) {}

    public function handle(Document $invoice, string $reason, int $actorId): void
    {
        DB::transaction(function () use ($invoice, $reason, $actorId) {
            $document = Document::query()->with('period')->lockForUpdate()->findOrFail($invoice->id);

            if (! in_array($document->status, [DocumentStatus::Finalized, DocumentStatus::Void], true)) {
                throw new DomainException(__('ការកម្មង់ដែលមិនទាន់គិតប្រាក់ សូមលុបចោលនៅ POS វិញ។'));
            }
            $this->guard->assertPeriodOpen($document);

            if ($document->status === DocumentStatus::Finalized) {
                $this->guard->applyLoyalty($document, -1);
            }

            $document->update(['deleted_by' => $actorId, 'delete_reason' => $reason]);
            $document->delete();

            $this->audit->record(
                'document.trashed',
                $document,
                ['document_number' => $document->document_number, 'grand_total' => (string) $document->grand_total, 'status' => $document->status->value],
                null,
                null,
                $actorId,
                $reason
            );
        });
    }
}
