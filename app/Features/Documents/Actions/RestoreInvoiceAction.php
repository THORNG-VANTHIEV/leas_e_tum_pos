<?php

namespace App\Features\Documents\Actions;

use App\Enums\DocumentStatus;
use App\Features\Documents\Services\PaidInvoiceGuard;
use App\Models\Document;
use App\Support\Audit\AuditService;
use Illuminate\Support\Facades\DB;

/**
 * Bring an invoice back from the trash, with its original number and totals.
 */
final class RestoreInvoiceAction
{
    public function __construct(
        private readonly PaidInvoiceGuard $guard,
        private readonly AuditService $audit,
    ) {}

    public function handle(Document $invoice, int $actorId): void
    {
        DB::transaction(function () use ($invoice, $actorId) {
            $document = Document::onlyTrashed()->with('period')->lockForUpdate()->findOrFail($invoice->id);
            $this->guard->assertPeriodOpen($document);

            $document->restore();
            $document->update(['deleted_by' => null, 'delete_reason' => null]);

            if ($document->status === DocumentStatus::Finalized) {
                $this->guard->applyLoyalty($document, 1);
            }

            $this->audit->record(
                'document.restored',
                $document,
                null,
                ['document_number' => $document->document_number, 'grand_total' => (string) $document->grand_total],
                null,
                $actorId,
                'Restored invoice from trash'
            );
        });
    }
}
