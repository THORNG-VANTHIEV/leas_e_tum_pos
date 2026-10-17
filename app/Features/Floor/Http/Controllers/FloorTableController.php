<?php

namespace App\Features\Floor\Http\Controllers;

use App\Enums\DocumentStatus;
use App\Enums\PeriodStatus;
use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Location;
use App\Models\Period;
use App\Models\RestaurantTable;
use App\Support\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FloorTableController extends Controller
{
    public function __construct(
        private readonly AuditService $audit,
    ) {}

    public function index(Request $request): Response
    {
        $zone = $request->query('zone', 'all');

        $query = RestaurantTable::query()->where('is_active', true)->orderBy('sort_order')->orderBy('code');

        if ($zone !== 'all') {
            $query->where('zone', $zone);
        }

        // Open (held) table orders in any active period, matched to tables by name/code
        $activePeriodIds = Period::where('status', PeriodStatus::Active)->pluck('id');
        $activeOrders = Document::where('status', DocumentStatus::Draft)
            ->whereIn('period_id', $activePeriodIds)
            ->whereNotNull('reference_identifier')
            ->with(['items', 'creator'])
            ->get()
            ->keyBy(function ($doc) {
                return trim($doc->reference_identifier);
            });

        $tables = $query->get()->map(function ($table) use ($activeOrders) {
            // Check if there is an active provisional order matching table code or name
            $matchedOrder = $activeOrders->get($table->name) ?? $activeOrders->get($table->code);

            $status = $table->status;
            if ($matchedOrder) {
                $status = 'occupied';
            }

            return [
                'id' => $table->id,
                'code' => $table->code,
                'name' => $table->name,
                'zone' => $table->zone,
                'capacity' => $table->capacity,
                'shape' => $table->shape,
                'status' => $status,
                'sort_order' => $table->sort_order,
                'active_order' => $matchedOrder ? [
                    'id' => $matchedOrder->id,
                    'document_number' => $matchedOrder->document_number,
                    'grand_total' => (float) $matchedOrder->grand_total,
                    'item_count' => $matchedOrder->items->count(),
                    'created_at' => $matchedOrder->created_at->toIso8601String(),
                    'elapsed_minutes' => (int) $matchedOrder->created_at->diffInMinutes(now()),
                    'server_name' => $matchedOrder->creator?->name ?: 'Staff',
                ] : null,
            ];
        });

        $allTables = RestaurantTable::where('is_active', true)->get();
        $zones = RestaurantTable::where('is_active', true)->pluck('zone')->unique()->values();

        $metrics = [
            'total_tables' => $allTables->count(),
            'available_tables' => $tables->where('status', 'available')->count(),
            'occupied_tables' => $tables->where('status', 'occupied')->count(),
            'reserved_tables' => $tables->where('status', 'reserved')->count(),
            'total_capacity' => $allTables->sum('capacity'),
        ];

        return Inertia::render('floor/index', [
            'tables' => $tables,
            'zones' => $zones,
            'currentZone' => $zone,
            'metrics' => $metrics,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:30|unique:restaurant_tables,code',
            'name' => 'required|string|max:60',
            'zone' => 'required|string|max:40',
            'capacity' => 'required|integer|min:1|max:50',
            'shape' => 'required|in:square,rectangle,round',
        ]);

        $location = Location::first();

        RestaurantTable::create([
            'location_id' => $location?->id,
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'zone' => $validated['zone'],
            'capacity' => $validated['capacity'],
            'shape' => $validated['shape'],
            'status' => 'available',
            'sort_order' => RestaurantTable::count() + 1,
            'is_active' => true,
        ]);

        return back()->with('success', "បានបង្កើតតុថ្មី: {$validated['name']} ({$validated['code']})");
    }

    public function update(Request $request, RestaurantTable $table): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:30', Rule::unique('restaurant_tables', 'code')->ignore($table->id)],
            'name' => 'required|string|max:60',
            'zone' => 'required|string|max:40',
            'capacity' => 'required|integer|min:1|max:50',
            'shape' => 'required|in:square,rectangle,round',
        ]);

        $validated['code'] = strtoupper($validated['code']);

        // Open orders are linked by table name/code, so renaming would orphan them
        $isRenamed = $validated['name'] !== $table->name || $validated['code'] !== $table->code;
        if ($isRenamed && $this->hasOpenOrder($table)) {
            return back()->with('error', "មិនអាចប្តូរឈ្មោះ ឬកូដតុ {$table->name} បានទេ ព្រោះកំពុងមានការកម្មង់បើក។");
        }

        $oldValues = $table->only(array_keys($validated));
        $table->update($validated);

        $this->audit->record(
            'table.updated',
            $table,
            $oldValues,
            $table->only(array_keys($validated)),
            null,
            $request->user()->id,
            "Updated table {$table->code}"
        );

        return back()->with('success', "បានកែប្រែតុ: {$table->name} ({$table->code})");
    }

    public function destroy(Request $request, RestaurantTable $table): RedirectResponse
    {
        if ($this->hasOpenOrder($table)) {
            return back()->with('error', "មិនអាចលុបតុ {$table->name} បានទេ ព្រោះកំពុងមានការកម្មង់បើក។");
        }

        // Deactivate rather than delete so historical invoices keep their table reference meaningful
        $table->update(['is_active' => false]);

        $this->audit->record(
            'table.deactivated',
            $table,
            ['is_active' => true],
            ['is_active' => false],
            null,
            $request->user()->id,
            "Removed table {$table->code} from the floor plan"
        );

        return back()->with('success', "បានលុបតុ {$table->name} ចេញពីប្លង់។");
    }

    private function hasOpenOrder(RestaurantTable $table): bool
    {
        return Document::query()
            ->where('status', DocumentStatus::Draft)
            ->whereIn('reference_identifier', [$table->name, $table->code])
            ->exists();
    }

    public function updateStatus(Request $request, RestaurantTable $table): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:available,occupied,reserved',
        ]);

        $table->update(['status' => $validated['status']]);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'status' => $validated['status']]);
        }

        return back()->with('success', "ស្ថានភាពតុ {$table->name} ត្រូវបានកែប្រែទៅជា {$validated['status']}");
    }
}
