<?php

namespace App\Features\Documents\Actions;

use App\Enums\DocumentStatus;
use App\Models\ApprovalRequest;
use App\Models\Document;
use App\Support\Audit\AuditService;
use DomainException;
use Illuminate\Support\Facades\DB;

final class PurgeDraftDocumentAction
{
    public function __construct(
        private readonly AuditService $audit,
    ) {}

    /**
     * Guarded hard purge of an unnumbered draft document with full audit snapshot.
     *
     * @param int $documentId
     * @param int $actorId
     * @return void
     */
    public function handle(int $documentId, int $actorId): void
    {
        DB::transaction(function () use ($documentId, $actorId): void {
            $document = Document::query()->lockForUpdate()->findOrFail($documentId);

            if ($document->status !== DocumentStatus::Draft
                || $document->sequence_no !== null
                || $document->document_number !== null
                || $document->finalized_at !== null) {
                throw new DomainException('Only an unnumbered draft may be purged (Invariant INV-07).');
            }

            if ($document->revisions()->exists() || $document->printLogs()->exists()) {
                throw new DomainException('A document with revision or official print history cannot be purged.');
            }

            $snapshot = [
                'document' => $document->toArray(),
                'items' => $document->items()->orderBy('line_position')->get()->toArray(),
            ];

            // Retain approval requests targeting this draft as history
            ApprovalRequest::query()
                ->where('document_id', $document->id)
                ->orWhere(fn ($query) => $query
                    ->where('target_type', 'document')
                    ->where('target_id', $document->id))
                ->update(['document_id' => null]);

            $document->items()->delete();
            $document->delete();

            $this->audit->record(
                'document.draft_purged',
                'App\Models\Document',
                $snapshot,
                null,
                ['document_id' => $documentId],
                $actorId,
                'Hard-purged unnumbered draft with full historical snapshot'
            );
        });
    }
}
