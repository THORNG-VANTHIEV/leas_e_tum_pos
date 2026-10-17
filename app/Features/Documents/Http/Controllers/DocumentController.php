<?php

namespace App\Features\Documents\Http\Controllers;

use App\Enums\DocumentStatus;
use App\Enums\OrderSource;
use App\Enums\PeriodStatus;
use App\Features\Documents\Actions\CheckoutOrderAction;
use App\Features\Documents\Actions\CreateDraftDocument;
use App\Features\Documents\Actions\HoldTableOrderAction;
use App\Features\Documents\Actions\VoidDocumentAction;
use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\Customer;
use App\Models\Document;
use App\Models\Period;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\RestaurantTable;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DocumentController extends Controller
{
    public function __construct(
        protected CreateDraftDocument $createDraft,
        protected CheckoutOrderAction $checkoutOrder,
        protected HoldTableOrderAction $holdTableOrder,
        protected VoidDocumentAction $voidDocument,
    ) {}

    /**
     * Document Register & Search Grid.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user->isAdmin();

        $query = Document::with(['creator:id,name,username', 'period:id,code,name', 'items'])
            ->when(! $isAdmin, fn ($q) => $q->where('created_by', $user->id));

        // Search by reference #, doc #
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('document_number', 'like', "%{$search}%")
                    ->orWhere('reference_identifier', 'like', "%{$search}%")
                    ->orWhere('id', $search);
            });
        }

        // Status filter
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        // Drafts-last guarantee per spec Section 13.3:
        // Finalized first (sorted by business_date desc, id desc), then drafts at bottom
        $documents = $query->orderByRaw("CASE WHEN status = 'draft' THEN 1 ELSE 0 END ASC")
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        $activePeriod = Period::where('status', PeriodStatus::Active)->first();

        return Inertia::render('documents/index', [
            'documents' => $documents,
            'filters' => $request->only(['search', 'status']),
            'active_period' => $activePeriod ? [
                'id' => $activePeriod->id,
                'code' => $activePeriod->code,
                'name' => $activePeriod->name,
            ] : null,
        ]);
    }

    /**
     * Live Food Stall / Restaurant POS Terminal.
     */
    public function create(Request $request): Response
    {
        $user = $request->user();
        $activePeriod = Period::resolveActive($user->location_id ?? 1, $user->id);

        $categories = ProductCategory::with(['products' => function ($query) {
            $query->where('is_active', true)->with('unit')->orderBy('sort_order');
        }])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        $allProducts = Product::with(['category', 'unit'])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        // Active table orders (Dine-in drafts)
        $activeTables = Document::with(['items.product', 'creator:id,name'])
            ->where('period_id', $activePeriod->id)
            ->where('status', DocumentStatus::Draft)
            ->latest('updated_at')
            ->get()
            ->map(fn ($doc) => [
                'id' => $doc->id,
                'table_identifier' => $doc->reference_identifier ?? "តុ {$doc->id}",
                'grand_total' => $doc->grand_total,
                'unit_count' => $doc->unit_count,
                'note' => $doc->note,
                'created_at' => $doc->created_at->format('H:i'),
                'updated_at' => $doc->updated_at->diffForHumans(),
                'items' => $doc->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'name_primary' => $item->product_name_primary_snapshot,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'line_total' => $item->line_total,
                ]),
            ]);

        $tablesList = RestaurantTable::where('is_active', true)
            ->orderBy('sort_order')
            ->pluck('name')
            ->toArray();

        if (empty($tablesList)) {
            $tablesList = [
                'តុ ០១', 'តុ ០២', 'តុ ០៣', 'តុ ០៤',
                'តុ ០៥', 'តុ ០៦', 'តុ ០៧', 'តុ ០៨',
                'VIP 01', 'VIP 02',
            ];
        }

        $customers = Customer::where('is_active', true)
            ->orderBy('name')
            ->take(30)
            ->get(['id', 'name', 'phone', 'tier', 'loyalty_points']);

        return Inertia::render('documents/create', [
            'period' => [
                'id' => $activePeriod->id,
                'code' => $activePeriod->code,
                'name' => $activePeriod->name,
                'start_date' => $activePeriod->start_date->toDateString(),
                'end_date' => $activePeriod->end_date->toDateString(),
                'entry_settings' => $activePeriod->entry_settings_snapshot,
            ],
            'categories' => $categories,
            'products' => $allProducts,
            'active_tables' => $activeTables,
            'tables_list' => $tablesList,
            'customers' => $customers,
            'initial_table' => $request->query('table_ref', ''),
            'exchange_rate' => BusinessSetting::current()->khrExchangeRate(),
        ]);
    }

    /**
     * Instant POS Real-Time Checkout with Automatic Sequence Allocation.
     */
    public function checkout(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:9999'],
            'payment_method' => ['required', 'string', 'in:cash,card,qr_transfer,khqr'],
            'amount_received' => ['nullable', 'string'],
            'discount_amount' => ['nullable', 'string'],
            'table_identifier' => ['nullable', 'string', 'max:50'],
            'order_source' => ['nullable', Rule::enum(OrderSource::class)],
            'external_order_ref' => ['nullable', 'string', 'max:40'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'document_id' => ['nullable', 'integer', 'exists:documents,id'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $document = $this->checkoutOrder->handle($validated, $request->user()->id);

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'document' => $document,
                    'receipt_url' => route('invoices.preview.thermal', $document->id),
                    'print_jobs' => $this->printJobs($document, withReceipt: true),
                ]);
            }

            return redirect()->route('invoices.show', $document->id)
                ->with('success', "វិក្កយបត្រ {$document->document_number} ត្រូវបានទូទាត់ជោគជ័យ!")
                ->with('print_jobs', $this->printJobs($document, withReceipt: true));
        } catch (DomainException $e) {
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
            }

            return back()->withInput()->with('error', $e->getMessage());
        }
    }

    /**
     * Hold or update an active Dine-in table order.
     */
    public function holdTable(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:9999'],
            'table_identifier' => ['nullable', 'string', 'max:50'],
            'document_id' => ['nullable', 'integer', 'exists:documents,id'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $document = $this->holdTableOrder->handle($validated, $request->user()->id);

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'document' => $document,
                    'print_jobs' => $this->printJobs($document, withReceipt: false),
                ]);
            }

            return back()
                ->with('success', "បានរក្សាទុកការកុម្ម៉ង់សម្រាប់ {$document->reference_identifier} រួចរាល់!")
                ->with('print_jobs', $this->printJobs($document, withReceipt: false));
        } catch (DomainException $e) {
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
            }

            return back()->withInput()->with('error', $e->getMessage());
        }
    }

    /**
     * Void / cancel an open table draft.
     */
    public function cancelTable(Request $request, Document $invoice): RedirectResponse|JsonResponse
    {
        if ($invoice->status !== DocumentStatus::Draft) {
            $msg = 'អាចលុបចោលបានតែការកុម្ម៉ង់ដែលមិនទាន់គិតលុយ (Draft) ប៉ុណ្ណោះ។';

            return $request->wantsJson()
                ? response()->json(['success' => false, 'error' => $msg], 422)
                : back()->with('error', $msg);
        }

        $tableName = $invoice->reference_identifier ?? "តុ #{$invoice->id}";
        $invoice->items()->delete();
        $invoice->delete();

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back()->with('success', "បានលុបការកុម្ម៉ង់ {$tableName} ដោយជោគជ័យ។");
    }

    /**
     * Store new draft document (backward compatibility).
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'period_id' => ['required', 'integer', 'exists:periods,id'],
            'business_date' => ['required', 'date'],
            'event_time' => ['required', 'string'],
            'reference_identifier' => ['nullable', 'string', 'max:30'],
            'payment_method' => ['required', 'string', 'in:cash,card,qr_transfer,khqr'],
            'source_total' => ['nullable', 'string', 'regex:/^\\d{1,10}(\\.\\d{1,2})?$/'],
            'amount_received' => ['required', 'string', 'regex:/^\\d{1,10}(\\.\\d{1,2})?$/'],
            'discount_amount' => ['nullable', 'string', 'regex:/^\\d{1,10}(\\.\\d{1,2})?$/'],
            'note' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:9999'],
        ]);

        try {
            $document = $this->createDraft->handle($validated, $request->user()->id);

            return redirect()->route('invoices.show', $document->id)
                ->with('success', "Draft order #{$document->id} (Table {$document->reference_identifier}) created successfully.");
        } catch (DomainException $e) {
            return back()->withInput()->with('error', $e->getMessage());
        }
    }

    /**
     * Slips the cashier printer should produce right away: the kitchen ticket first (if any dishes changed),
     * then the customer receipt. The token lets the browser print each batch exactly once.
     *
     * @return array{token: string, jobs: array<int, array{type: string, url: string}>}
     */
    private function printJobs(Document $document, bool $withReceipt): array
    {
        $jobs = [];

        $ticket = $document->relationLoaded('issuedKitchenTicket') ? $document->getRelation('issuedKitchenTicket') : null;
        if ($ticket) {
            $jobs[] = ['type' => 'kitchen_ticket', 'url' => route('kitchen-tickets.print', $ticket).'?autoprint=1'];
        }

        if ($withReceipt) {
            $jobs[] = ['type' => 'receipt', 'url' => route('invoices.preview.thermal', $document->id).'?autoprint=1'];
        }

        return ['token' => (string) Str::uuid(), 'jobs' => $jobs];
    }

    /**
     * Void a finalized invoice while retaining its official sequence number.
     */
    public function void(Request $request, Document $invoice): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        try {
            $this->voidDocument->handle($invoice->id, $validated['reason'], $request->user()->id);
        } catch (DomainException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', "វិក្កយបត្រ {$invoice->document_number} ត្រូវបានលុបចោល (Void) រួចរាល់។");
    }

    /**
     * Document Details & Line Items View.
     */
    public function show(Request $request, Document $invoice): Response
    {
        $user = $request->user();

        // Cashier ownership scoping
        if (! $user->canViewInvoice($invoice)) {
            abort(403, 'Unauthorized. You cannot view invoices created by other operators.');
        }

        $invoice->load(['creator:id,name,username', 'period', 'items.product']);

        return Inertia::render('documents/show', [
            'document' => $invoice,
        ]);
    }
}
