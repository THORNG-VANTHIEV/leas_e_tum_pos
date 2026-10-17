<?php

namespace App\Features\Documents\Http\Controllers;

use App\Enums\OrderSource;
use App\Features\Documents\Actions\RestoreInvoiceAction;
use App\Features\Documents\Actions\TrashInvoiceAction;
use App\Features\Documents\Actions\UpdatePaidInvoiceAction;
use App\Http\Controllers\Controller;
use App\Models\Document;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Manager-only corrections of paid invoices: edit, move to trash and restore.
 */
class InvoiceCorrectionController extends Controller
{
    public function __construct(
        protected UpdatePaidInvoiceAction $updateInvoice,
        protected TrashInvoiceAction $trashInvoice,
        protected RestoreInvoiceAction $restoreInvoice,
    ) {}

    /**
     * Save the corrected items and payment of a paid invoice (sent from the POS in edit mode).
     */
    public function update(Request $request, Document $invoice): RedirectResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:9999'],
            'payment_method' => ['required', 'string', 'in:cash,card,qr_transfer,khqr,app'],
            'amount_received' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:999999'],
            'discount_amount' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:999999'],
            'order_source' => ['nullable', Rule::enum(OrderSource::class)],
            'external_order_ref' => ['nullable', 'string', 'max:40'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        try {
            $this->updateInvoice->handle($invoice, $validated, $request->user()->id);
        } catch (DomainException $e) {
            return back()->with('error', __($e->getMessage()));
        }

        return redirect()
            ->route('invoices.show', $invoice)
            ->with('success', __('បានកែវិក្កយបត្រ :number រួចរាល់។', ['number' => $invoice->document_number]));
    }

    /**
     * Move a paid or voided invoice to the trash.
     */
    public function destroy(Request $request, Document $invoice): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        try {
            $this->trashInvoice->handle($invoice, $validated['reason'], $request->user()->id);
        } catch (DomainException $e) {
            return back()->with('error', __($e->getMessage()));
        }

        return redirect()
            ->route('invoices.index')
            ->with('success', __('បានដាក់វិក្កយបត្រ :number ក្នុងធុងសំរាម។', ['number' => $invoice->document_number]));
    }

    /**
     * Bring an invoice back from the trash.
     */
    public function restore(Request $request, Document $invoice): RedirectResponse
    {
        try {
            $this->restoreInvoice->handle($invoice, $request->user()->id);
        } catch (DomainException $e) {
            return back()->with('error', __($e->getMessage()));
        }

        return back()->with('success', __('បានស្ដារវិក្កយបត្រ :number វិញ។', ['number' => $invoice->document_number]));
    }
}
