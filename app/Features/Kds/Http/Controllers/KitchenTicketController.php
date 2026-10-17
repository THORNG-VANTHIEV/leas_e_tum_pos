<?php

namespace App\Features\Kds\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\KitchenTicket;
use Inertia\Inertia;
use Inertia\Response;

class KitchenTicketController extends Controller
{
    /**
     * 80mm kitchen ticket (KOT) for the cashier printer.
     */
    public function print(KitchenTicket $ticket): Response
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
            ],
        ]);
    }
}
