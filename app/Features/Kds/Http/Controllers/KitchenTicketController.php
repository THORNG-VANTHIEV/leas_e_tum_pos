<?php

namespace App\Features\Kds\Http\Controllers;

use App\Enums\DocumentStatus;
use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\KitchenTicket;
use App\Support\Audit\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class KitchenTicketController extends Controller
{
    public function __construct(
        protected AuditService $audit,
    ) {}

    /**
     * 80mm kitchen ticket (KOT) for the cashier printer.
     */
    public function print(Request $request, KitchenTicket $ticket): Response
    {
        $ticket->load(['document:id,document_number,reference_identifier,order_source,external_order_ref,note,status', 'creator:id,name']);

        return Inertia::render('kitchen-tickets/print', [
            'ticket' => [
                'id' => $ticket->id,
                'ticket_no' => $ticket->ticket_no,
                'lines' => $ticket->lines,
                'created_at' => $ticket->created_at->format('Y-m-d H:i'),
                'cashier' => $ticket->creator?->name,
                'table' => $ticket->document->reference_identifier ?: 'Takeaway',
                'order_source' => $ticket->document->order_source?->value ?? 'walk_in',
                'external_order_ref' => $ticket->document->external_order_ref,
                'document_number' => $ticket->document->document_number,
                'note' => $ticket->document->note,
                'is_reprint' => $request->boolean('reprint'),
            ],
        ]);
    }

    /**
     * Send the order's latest kitchen ticket to the cashier printer again (lost or jammed slip).
     * Open table orders are shared on the floor, so any staff member may reprint them;
     * paid invoices follow the normal invoice visibility rule.
     */
    public function reprint(Request $request, Document $document): RedirectResponse
    {
        $user = $request->user();

        if ($document->status !== DocumentStatus::Draft && ! $user->canViewInvoice($document)) {
            abort(403, __('អ្នកមិនមានសិទ្ធិមើលវិក្កយបត្ររបស់បុគ្គលិកផ្សេងទេ។'));
        }

        $ticket = $document->kitchenTickets()->latest('ticket_no')->first();

        if (! $ticket) {
            return back()->with('error', __('ការកម្មង់នេះមិនទាន់មានបុងចុងភៅទេ។'));
        }

        $this->audit->record(
            'kitchen_ticket.reprinted',
            $document,
            null,
            ['ticket_id' => $ticket->id, 'ticket_no' => $ticket->ticket_no],
            null,
            $user->id,
            'Kitchen ticket reprinted from the POS'
        );

        return back()
            ->with('success', __('កំពុងព្រីនបុងចុងភៅ #:number ម្តងទៀត។', ['number' => $ticket->ticket_no]))
            ->with('print_jobs', [
                'token' => (string) Str::uuid(),
                'jobs' => [[
                    'type' => 'kitchen_ticket',
                    'url' => route('kitchen-tickets.print', $ticket).'?autoprint=1&reprint=1',
                ]],
            ]);
    }
}
