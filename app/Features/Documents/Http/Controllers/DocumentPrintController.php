<?php

namespace App\Features\Documents\Http\Controllers;

use App\Enums\DocumentStatus;
use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Period;
use App\Models\PrintLog;
use App\Support\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Ramsey\Uuid\Uuid;

class DocumentPrintController extends Controller
{
    public function __construct(
        protected AuditService $audit,
    ) {}

    /**
     * Preview 80mm thermal receipt (read-only, side-effect free per spec Section 12.1).
     */
    public function previewThermal(Request $request, Document $invoice): Response
    {
        $invoice->load(['creator', 'period', 'items.product', 'printLogs']);

        return Inertia::render('documents/preview-80mm', [
            'document' => $invoice,
        ]);
    }

    /**
     * Preview A5 formal invoice (read-only, side-effect free per spec Section 12.1).
     */
    public function previewA5(Request $request, Document $invoice): Response
    {
        $invoice->load(['creator', 'period', 'items.product', 'printLogs']);

        return Inertia::render('documents/preview-a5', [
            'document' => $invoice,
        ]);
    }

    /**
     * Preview continuous range of finalized documents (read-only, side-effect free per spec Section 12.1).
     */
    public function previewRange(Request $request): Response
    {
        $validated = $request->validate([
            'start_sequence' => ['nullable', 'integer', 'min:1'],
            'end_sequence' => ['nullable', 'integer', 'min:1'],
            'period_id' => ['nullable', 'integer', 'exists:periods,id'],
            'format' => ['nullable', 'string', 'in:80mm,a5'],
        ]);

        $query = Document::query()
            ->where('status', DocumentStatus::Finalized)
            ->whereNotNull('sequence_no');

        if (! empty($validated['period_id'])) {
            $query->where('period_id', $validated['period_id']);
        }

        if (! empty($validated['start_sequence'])) {
            $query->where('sequence_no', '>=', $validated['start_sequence']);
        }

        if (! empty($validated['end_sequence'])) {
            $query->where('sequence_no', '<=', $validated['end_sequence']);
        }

        $documents = $query->with(['creator', 'period', 'items.product', 'printLogs'])
            ->orderBy('sequence_no', 'asc')
            ->get();

        $periods = Period::orderByDesc('id')->get(['id', 'code', 'name', 'status']);

        $minSeq = Document::where('status', DocumentStatus::Finalized)->min('sequence_no') ?? 1;
        $maxSeq = Document::where('status', DocumentStatus::Finalized)->max('sequence_no') ?? 1;

        return Inertia::render('documents/preview-range', [
            'documents' => $documents,
            'range' => [
                'start_sequence' => (int) ($validated['start_sequence'] ?? ($documents->first()?->sequence_no ?? $minSeq)),
                'end_sequence' => (int) ($validated['end_sequence'] ?? ($documents->last()?->sequence_no ?? $maxSeq)),
                'period_id' => ! empty($validated['period_id']) ? (int) $validated['period_id'] : null,
                'count' => $documents->count(),
                'total_amount' => number_format((float) $documents->sum('grand_total'), 2, '.', ''),
                'min_available_sequence' => (int) $minSeq,
                'max_available_sequence' => (int) $maxSeq,
            ],
            'format' => $validated['format'] ?? '80mm',
            'periods' => $periods,
        ]);
    }

    /**
     * Continuous print-ready range view (alias per spec Section 12.1).
     */
    public function printRange(Request $request): Response
    {
        return $this->previewRange($request);
    }

    /**
     * Authenticated, idempotent print request recorder for single invoice.
     */
    public function storePrintRequest(Request $request, Document $invoice): RedirectResponse
    {
        $validated = $request->validate([
            'format' => ['required', 'string', 'in:80mm,a5,pdf'],
            'request_id' => ['required', 'string', 'size:36'],
        ]);

        $existing = PrintLog::where('request_id', $validated['request_id'])->first();

        if (! $existing) {
            $isReprint = $invoice->printLogs()->exists();

            $log = PrintLog::create([
                'document_id' => $invoice->id,
                'format' => $validated['format'],
                'print_type' => $isReprint ? 'reprint' : 'original',
                'request_id' => $validated['request_id'],
                'requested_by' => $request->user()->id,
                'document_checksum' => hash('sha256', (string) $invoice->grand_total . (string) $invoice->sequence_no),
            ]);

            $this->audit->record(
                'document.print_requested',
                $invoice,
                null,
                ['format' => $validated['format'], 'print_type' => $log->print_type, 'request_id' => $log->request_id],
                null,
                $request->user()->id,
                'Recorded idempotent hardware print request'
            );
        }

        return back()->with('success', 'Print request logged.');
    }

    /**
     * Authenticated, idempotent print request recorder for continuous range batches.
     */
    public function storeRangePrintRequest(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'batch_request_id' => ['required', 'string', 'size:36'],
            'format' => ['required', 'string', 'in:80mm,a5,pdf'],
            'start_sequence' => ['nullable', 'integer', 'min:1'],
            'end_sequence' => ['nullable', 'integer', 'min:1'],
            'period_id' => ['nullable', 'integer', 'exists:periods,id'],
        ]);

        $query = Document::query()
            ->where('status', DocumentStatus::Finalized)
            ->whereNotNull('sequence_no');

        if (! empty($validated['period_id'])) {
            $query->where('period_id', $validated['period_id']);
        }

        if (! empty($validated['start_sequence'])) {
            $query->where('sequence_no', '>=', $validated['start_sequence']);
        }

        if (! empty($validated['end_sequence'])) {
            $query->where('sequence_no', '<=', $validated['end_sequence']);
        }

        $documents = $query->orderBy('sequence_no', 'asc')->get();

        $batchNamespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

        DB::transaction(function () use ($documents, $validated, $request, $batchNamespace) {
            foreach ($documents as $doc) {
                $docRequestId = Uuid::uuid5($batchNamespace, $validated['batch_request_id'] . '-' . $doc->id)->toString();

                $existing = PrintLog::where('request_id', $docRequestId)->first();
                if (! $existing) {
                    $isReprint = $doc->printLogs()->exists();

                    PrintLog::create([
                        'document_id' => $doc->id,
                        'format' => $validated['format'],
                        'print_type' => $isReprint ? 'reprint' : 'original',
                        'request_id' => $docRequestId,
                        'requested_by' => $request->user()->id,
                        'document_checksum' => hash('sha256', (string) $doc->grand_total . (string) $doc->sequence_no),
                    ]);
                }
            }

            $this->audit->record(
                'document.range_print_requested',
                'App\Models\Document',
                null,
                [
                    'format' => $validated['format'],
                    'batch_request_id' => $validated['batch_request_id'],
                    'documents_count' => $documents->count(),
                    'start_sequence' => $validated['start_sequence'] ?? null,
                    'end_sequence' => $validated['end_sequence'] ?? null,
                ],
                null,
                $request->user()->id,
                "Continuous range print request recorded for {$documents->count()} documents"
            );
        });

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'count' => $documents->count(),
                'batch_request_id' => $validated['batch_request_id'],
            ]);
        }

        return back()->with('success', "Batch print request recorded for {$documents->count()} documents.");
    }
}
