<?php

namespace App\Features\Floor\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Location;
use App\Models\RestaurantTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FloorTableController extends Controller
{
    public function index(Request $request): Response
    {
        $zone = $request->query('zone', 'all');

        $query = RestaurantTable::query()->where('is_active', true)->orderBy('sort_order')->orderBy('code');

        if ($zone !== 'all') {
            $query->where('zone', $zone);
        }

        // Active provisional orders to see which table has an open order in real-time
        $activeOrders = Document::where('status', 'provisional')
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
                    'elapsed_minutes' => (int) round(now()->diffInMinutes($matchedOrder->created_at)),
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
