<?php

namespace App\Features\Purchases\Http\Controllers;

use App\Enums\PeriodStatus;
use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\Period;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\Unit;
use App\Support\Audit\AuditService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    public function __construct(
        protected AuditService $audit,
    ) {}

    /**
     * Display the purchases and suppliers management hub.
     */
    public function index(Request $request): Response
    {
        $purchases = Purchase::with(['supplier', 'creator', 'items'])
            ->latest('purchase_date')
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        $suppliers = Supplier::withCount('purchases')
            ->orderBy('name')
            ->get();

        $products = Product::where('is_active', true)
            ->with('unit')
            ->orderBy('name_primary')
            ->get();

        $units = Unit::where('is_active', true)
            ->orderBy('name_primary')
            ->get();

        $business = BusinessSetting::current();
        $exchangeRate = (float) ($business->invoice_settings['exchange_rate'] ?? 4100);

        // Calculate summary metrics
        $totalPurchasesUsd = (float) Purchase::where('status', '!=', 'cancelled')->sum('total_amount');
        $thisMonthPurchasesUsd = (float) Purchase::where('status', '!=', 'cancelled')
            ->whereBetween('purchase_date', [
                Carbon::now()->startOfMonth()->toDateString(),
                Carbon::now()->endOfMonth()->toDateString(),
            ])
            ->sum('total_amount');

        $activeSuppliersCount = Supplier::where('is_active', true)->count();
        $totalPurchasesCount = Purchase::count();

        return Inertia::render('purchases/index', [
            'purchases' => $purchases,
            'suppliers' => $suppliers,
            'products' => $products,
            'units' => $units,
            'exchange_rate' => $exchangeRate,
            'metrics' => [
                'total_purchases_usd' => $totalPurchasesUsd,
                'this_month_purchases_usd' => $thisMonthPurchasesUsd,
                'active_suppliers_count' => $activeSuppliersCount,
                'total_purchases_count' => $totalPurchasesCount,
            ],
        ]);
    }

    /**
     * Store a newly created purchase order.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->purchaseRules());

        $activePeriod = Period::resolveActive();

        $purchase = DB::transaction(function () use ($validated, $request, $activePeriod) {
            // Generate sequential purchase number: PUR-YYMM-XXXX
            $date = Carbon::parse($validated['purchase_date']);
            $prefix = 'PUR-'.$date->format('ym').'-';

            $lastPurchase = Purchase::where('purchase_number', 'LIKE', $prefix.'%')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            $sequence = 1;
            if ($lastPurchase && preg_match('/PUR-\d{4}-(\d+)/', $lastPurchase->purchase_number, $matches)) {
                $sequence = (int) $matches[1] + 1;
            }
            $purchaseNumber = $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);

            ['items' => $itemsData, 'totals' => $totals] = $this->buildItemsAndTotals($validated);

            $purchase = Purchase::create([
                'purchase_number' => $purchaseNumber,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'period_id' => $activePeriod?->id,
                'purchase_date' => $validated['purchase_date'],
                'status' => $validated['status'],
                ...$totals,
                'reference_note' => $validated['reference_note'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($itemsData as $item) {
                $purchase->items()->create($item);
            }

            return $purchase;
        });

        $this->audit->record(
            'purchase.created',
            $purchase,
            null,
            $purchase->load('items')->toArray(),
            null,
            $request->user()->id,
            "Recorded purchase order {$purchase->purchase_number} totaling \${$purchase->total_amount}"
        );

        return back()->with('success', "បានកត់ត្រាការទិញចូល #{$purchase->purchase_number} ដោយជោគជ័យ");
    }

    /**
     * Edit a purchase's header and line items, keeping its purchase number.
     */
    public function update(Request $request, Purchase $purchase): RedirectResponse
    {
        if ($purchase->period?->status === PeriodStatus::Closed) {
            return back()->with('error', 'មិនអាចកែការទិញចូលក្នុងវគ្គគណនេយ្យដែលបានបិទរួចហើយទេ។');
        }

        $validated = $request->validate($this->purchaseRules());
        $oldValues = $purchase->load('items')->toArray();

        DB::transaction(function () use ($validated, $purchase) {
            ['items' => $itemsData, 'totals' => $totals] = $this->buildItemsAndTotals($validated);

            $purchase->update([
                'supplier_id' => $validated['supplier_id'] ?? null,
                'purchase_date' => $validated['purchase_date'],
                'status' => $validated['status'],
                ...$totals,
                'reference_note' => $validated['reference_note'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            $purchase->items()->delete();
            foreach ($itemsData as $item) {
                $purchase->items()->create($item);
            }
        });

        $this->audit->record(
            'purchase.updated',
            $purchase,
            $oldValues,
            $purchase->load('items')->toArray(),
            null,
            $request->user()->id,
            "Edited purchase order {$purchase->purchase_number} (now \${$purchase->total_amount})"
        );

        return back()->with('success', "បានកែប្រែការទិញចូល #{$purchase->purchase_number} ដោយជោគជ័យ");
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function purchaseRules(): array
    {
        return [
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'purchase_date' => ['required', 'date'],
            'status' => ['required', 'in:received,pending,cancelled'],
            'reference_note' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:500'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'exists:products,id'],
            'items.*.item_name' => ['required', 'string', 'max:180'],
            'items.*.unit_name' => ['nullable', 'string', 'max:50'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{items: array<int, array<string, mixed>>, totals: array{subtotal: float, discount_amount: float, tax_amount: float, total_amount: float}}
     */
    private function buildItemsAndTotals(array $validated): array
    {
        $subtotal = 0;
        $itemsData = [];

        foreach ($validated['items'] as $item) {
            $lineQty = (float) $item['quantity'];
            $lineCost = (float) $item['unit_cost'];
            $lineTotal = round($lineQty * $lineCost, 2);
            $subtotal += $lineTotal;

            $itemsData[] = [
                'product_id' => $item['product_id'] ?? null,
                'item_name' => $item['item_name'],
                'unit_name' => $item['unit_name'] ?? 'ឯកតា',
                'quantity' => $lineQty,
                'unit_cost' => $lineCost,
                'total_cost' => $lineTotal,
                'notes' => $item['notes'] ?? null,
            ];
        }

        $discountAmount = (float) ($validated['discount_amount'] ?? 0);
        $taxAmount = (float) ($validated['tax_amount'] ?? 0);

        return [
            'items' => $itemsData,
            'totals' => [
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'tax_amount' => $taxAmount,
                'total_amount' => max(0, round($subtotal + $taxAmount - $discountAmount, 2)),
            ],
        ];
    }

    /**
     * Update the status of a purchase.
     */
    public function updateStatus(Request $request, Purchase $purchase): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:received,pending,cancelled'],
        ]);

        $oldStatus = $purchase->status;
        $purchase->update(['status' => $validated['status']]);

        $this->audit->record(
            'purchase.status_updated',
            $purchase,
            ['status' => $oldStatus],
            ['status' => $purchase->status],
            null,
            $request->user()->id,
            "Changed purchase {$purchase->purchase_number} status from {$oldStatus} to {$purchase->status}"
        );

        return back()->with('success', "បានផ្លាស់ប្ដូរស្ថានភាពការទិញចូល #{$purchase->purchase_number} ទៅជា '{$purchase->status}'");
    }

    /**
     * Store a newly created supplier.
     */
    public function storeSupplier(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'contact_person' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ]);

        $supplier = Supplier::create([
            ...$validated,
            'is_active' => $request->boolean('is_active', true),
            'created_by' => $request->user()->id,
        ]);

        $this->audit->record(
            'supplier.created',
            $supplier,
            null,
            $supplier->toArray(),
            null,
            $request->user()->id,
            "Created supplier '{$supplier->name}'"
        );

        return back()->with('success', "បានបន្ថែមអ្នកផ្គត់ផ្គង់ '{$supplier->name}' ដោយជោគជ័យ");
    }

    /**
     * Update an existing supplier.
     */
    public function updateSupplier(Request $request, Supplier $supplier): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'contact_person' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:500'],
            'is_active' => ['boolean'],
        ]);

        $oldData = $supplier->toArray();

        $supplier->update([
            ...$validated,
            'is_active' => $request->boolean('is_active'),
        ]);

        $this->audit->record(
            'supplier.updated',
            $supplier,
            $oldData,
            $supplier->toArray(),
            null,
            $request->user()->id,
            "Updated supplier '{$supplier->name}'"
        );

        return back()->with('success', "បានកែប្រែអ្នកផ្គត់ផ្គង់ '{$supplier->name}' ដោយជោគជ័យ");
    }

    /**
     * Toggle active state of a supplier.
     */
    public function toggleSupplier(Request $request, Supplier $supplier): RedirectResponse
    {
        $oldState = $supplier->is_active;
        $supplier->update([
            'is_active' => ! $oldState,
        ]);

        $statusLabel = $supplier->is_active ? 'បើកដំណើរការ' : 'ផ្អាកដំណើរការ';

        return back()->with('success', "បាន{$statusLabel}អ្នកផ្គត់ផ្គង់ '{$supplier->name}'");
    }
}
