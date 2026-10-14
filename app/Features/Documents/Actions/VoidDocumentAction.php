<?php

namespace App\Features\Documents\Actions;

use App\Enums\ApprovalStatus;
use App\Enums\ApprovalType;
use App\Enums\DocumentStatus;
use App\Features\Approvals\Services\ApprovalGuard;
use App\Models\ApprovalRequest;
use App\Models\Document;
use App\Support\Audit\AuditService;
use DomainException;
use Illuminate\Support\Facades\DB;

final class VoidDocumentAction
{
    public function __construct(
        private readonly ApprovalGuard $guard,
        private readonly AuditService $audit,
    ) {}

    /**
     * Atomically void a finalized document while permanently retaining official sequence.
     *
     * @param int $documentId
     * @param string $reason
     * @param int $actorId
     * @param int|null $approvalRequestId
     * @return Document
     */
    public function handle(int $documentId, string $reason, int $actorId, ?int $approvalRequestId = null): Document
    {
        return DB::transaction(function () use ($documentId, $reason, $actorId, $approvalRequestId) {
            $document = Document::query()->lockForUpdate()->findOrFail($documentId);

            if ($document->status === DocumentStatus::Void) {
                throw new DomainException('Document is already voided.');
            }

            if ($document->status !== DocumentStatus::Finalized) {
                throw new DomainException('Only finalized documents with an official number may be voided.');
            }

            // If approval is provided, validate and consume it atomically
            if ($approvalRequestId !== null) {
                $approval = ApprovalRequest::query()->lockForUpdate()->findOrFail($approvalRequestId);
                $this->guard->assertUsable($approval, ApprovalType::Void, 'document', $document->id);

                $approval->update([
                    'status' => ApprovalStatus::Used,
                    'used_at' => now(),
                    'used_by' => $actorId,
                ]);
            }

            $document->update([
                'status' => DocumentStatus::Void,
                'note' => trim(($document->note ?? '') . "\n[VOIDED: {$reason}]"),
                'lock_version' => $document->lock_version + 1,
            ]);

            $this->audit->record(
                'document.voided',
                $document,
                ['status' => 'finalized'],
                ['status' => 'void', 'document_number' => $document->document_number],
                ['retained_sequence' => $document->sequence_no],
                $actorId,
                $reason
            );

            return $document->refresh();
        });
    }
}
