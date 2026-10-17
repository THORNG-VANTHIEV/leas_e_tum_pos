<?php

namespace App\Features\Customers\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search');
        $tier = $request->query('tier');

        $query = Customer::query()->withCount('documents');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($tier && $tier !== 'all') {
            $query->where('tier', $tier);
        }

        $customers = $query
            ->orderByDesc('loyalty_points')
            ->orderByDesc('total_spent_usd')
            ->paginate(25)
            ->withQueryString();

        $metrics = [
            'total_customers' => Customer::count(),
            'vip_customers' => Customer::where('tier', 'vip')->count(),
            'gold_customers' => Customer::where('tier', 'gold')->count(),
            'silver_customers' => Customer::where('tier', 'silver')->count(),
            'total_points' => Customer::sum('loyalty_points'),
            'total_spent_usd' => (float) Customer::sum('total_spent_usd'),
        ];

        return Inertia::render('customers/index', [
            'customers' => $customers,
            'metrics' => $metrics,
            'filters' => [
                'search' => $search ?? '',
                'tier' => $tier ?? 'all',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'phone' => 'nullable|string|max:30|unique:customers,phone',
            'email' => 'nullable|email|max:120',
            'address' => 'nullable|string|max:255',
            'tier' => 'nullable|in:standard,silver,gold,vip',
            'notes' => 'nullable|string|max:500',
        ]);

        Customer::create([
            'name' => $validated['name'],
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'tier' => $validated['tier'] ?? 'standard',
            'notes' => $validated['notes'] ?? null,
            'loyalty_points' => 0,
            'total_spent_usd' => 0.00,
            'visits_count' => 0,
            'is_active' => true,
        ]);

        return back()->with('success', __('បានចុះឈ្មោះអតិថិជនថ្មី: :name', ['name' => $validated['name']]));
    }

    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'phone' => 'nullable|string|max:30|unique:customers,phone,'.$customer->id,
            'email' => 'nullable|email|max:120',
            'address' => 'nullable|string|max:255',
            'tier' => 'required|in:standard,silver,gold,vip',
            'notes' => 'nullable|string|max:500',
        ]);

        $customer->update($validated);

        return back()->with('success', __('បានកែប្រែទិន្នន័យអតិថិជន: :name', ['name' => $customer->name]));
    }

    public function adjustPoints(Request $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validate([
            'points' => 'required|integer',
            'reason' => 'nullable|string|max:200',
        ]);

        $newPoints = max(0, $customer->loyalty_points + $validated['points']);
        $customer->update(['loyalty_points' => $newPoints]);

        return back()->with('success', __('បានកែប្រែពិន្ទុសន្សំ: :newPoints pts', ['newPoints' => $newPoints]));
    }

    public function toggle(Customer $customer): RedirectResponse
    {
        $customer->update(['is_active' => ! $customer->is_active]);

        $status = $customer->is_active ? __('សកម្ម') : __('អសកម្ម');

        return back()->with('success', __('ស្ថានភាពអតិថិជនត្រូវបានប្ដូរទៅជា :status', ['status' => $status]));
    }

    public function lookup(Request $request): JsonResponse
    {
        $search = $request->query('query', '');

        if (strlen($search) < 2) {
            return response()->json([]);
        }

        $results = Customer::where('is_active', true)
            ->where(function ($q) use ($search) {
                $q->where('phone', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            })
            ->take(8)
            ->get(['id', 'name', 'phone', 'tier', 'loyalty_points']);

        return response()->json($results);
    }
}
