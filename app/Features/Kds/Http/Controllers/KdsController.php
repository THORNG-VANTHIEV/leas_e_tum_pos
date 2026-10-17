<?php

namespace App\Features\Kds\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\DocumentItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KdsController extends Controller
{
    public function index(Request $request): Response
    {
        $statusFilter = $request->query('status', 'active'); // 'active', 'pending', 'cooking', 'ready', 'served', 'all'

        $query = Document::query()
            ->with(['items.product', 'creator', 'customer'])
            ->visibleInKitchen();

        if ($statusFilter === 'active') {
            $query->whereIn('kitchen_status', ['pending', 'cooking', 'ready']);
        } elseif ($statusFilter !== 'all') {
            $query->where('kitchen_status', $statusFilter);
        }

        $orders = $query
            ->orderByRaw("CASE 
                WHEN kitchen_status = 'pending' THEN 1 
                WHEN kitchen_status = 'cooking' THEN 2 
                WHEN kitchen_status = 'ready' THEN 3 
                ELSE 4 END")
            ->orderBy('created_at', 'asc')
            ->take(60)
            ->get()
            ->map(function ($doc) {
                return [
                    'id' => $doc->id,
                    // Held dine-in orders have no invoice number until they are paid
                    'document_number' => $doc->document_number ?? "TBL-DRAFT-{$doc->id}",
                    'reference_identifier' => $doc->reference_identifier ?: 'Takeaway',
                    'order_source' => $doc->order_source?->value ?? 'walk_in',
                    'external_order_ref' => $doc->external_order_ref,
                    'kitchen_status' => $doc->kitchen_status ?: 'pending',
                    'kitchen_started_at' => $doc->kitchen_started_at?->toIso8601String(),
                    'kitchen_ready_at' => $doc->kitchen_ready_at?->toIso8601String(),
                    'kitchen_served_at' => $doc->kitchen_served_at?->toIso8601String(),
                    'created_at' => $doc->created_at->toIso8601String(),
                    'time_ago' => $doc->created_at->diffForHumans(),
                    'elapsed_minutes' => (int) max(0, round(abs(now()->diffInMinutes($doc->created_at)))),
                    'unit_count' => $doc->unit_count,
                    'note' => $doc->note,
                    'creator_name' => $doc->creator?->name ?: 'Staff',
                    'customer_name' => $doc->customer?->name,
                    'items' => $doc->items->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'product_name' => $item->product_name_secondary_snapshot ?: $item->product_name_primary_snapshot,
                            'product_name_en' => $item->product_name_primary_snapshot,
                            'quantity' => $item->quantity,
                            'unit' => $item->unit_snapshot ?: 'កញ្ចប់',
                            'kitchen_status' => $item->kitchen_status ?: 'pending',
                        ];
                    }),
                ];
            });

        // Summary counts for tabs
        $counts = [
            'pending' => Document::visibleInKitchen()->where('kitchen_status', 'pending')->count(),
            'cooking' => Document::visibleInKitchen()->where('kitchen_status', 'cooking')->count(),
            'ready' => Document::visibleInKitchen()->where('kitchen_status', 'ready')->count(),
            'served_today' => Document::visibleInKitchen()
                ->where('kitchen_status', 'served')
                ->whereDate('updated_at', today())
                ->count(),
        ];

        return Inertia::render('kds/index', [
            'orders' => $orders,
            'counts' => $counts,
            'currentFilter' => $statusFilter,
        ]);
    }

    public function updateStatus(Request $request, Document $document): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,cooking,ready,served',
        ]);

        $status = $validated['status'];
        $document->kitchen_status = $status;

        if ($status === 'cooking' && ! $document->kitchen_started_at) {
            $document->kitchen_started_at = now();
        } elseif ($status === 'ready') {
            $document->kitchen_ready_at = now();
        } elseif ($status === 'served') {
            $document->kitchen_served_at = now();
        }

        $document->save();

        // Also sync items if needed
        $document->items()->update(['kitchen_status' => $status]);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'kitchen_status' => $status]);
        }

        return back()->with('success', __('បច្ចុប្បន្នភាពផ្ទះបាយ (#:reference_identifier) បានផ្លាស់ប្ដូរទៅជា :status', ['reference_identifier' => $document->reference_identifier, 'status' => $status]));
    }

    public function updateItemStatus(Request $request, DocumentItem $item): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,cooking,ready,served',
        ]);

        $item->update(['kitchen_status' => $validated['status']]);

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back();
    }
}
