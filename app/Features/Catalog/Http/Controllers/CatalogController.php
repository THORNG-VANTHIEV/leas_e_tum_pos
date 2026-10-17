<?php

namespace App\Features\Catalog\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Unit;
use App\Support\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CatalogController extends Controller
{
    public function __construct(
        protected AuditService $audit,
    ) {}

    /**
     * Display the items, units, and categories management hub.
     */
    public function index(): Response
    {
        $products = Product::with(['category', 'unit'])
            ->orderBy('category_id')
            ->orderBy('sort_order')
            ->orderBy('name_primary')
            ->get();

        $categories = ProductCategory::withCount('products')
            ->orderBy('sort_order')
            ->orderBy('name_primary')
            ->get();

        $units = Unit::withCount('products')
            ->orderBy('sort_order')
            ->orderBy('name_primary')
            ->get();

        $business = BusinessSetting::current();
        $exchangeRate = $business->khrExchangeRate();

        return Inertia::render('catalog/index', [
            'products' => $products,
            'categories' => $categories,
            'units' => $units,
            'exchange_rate' => $exchangeRate,
        ]);
    }

    /**
     * Upload product image from local machine.
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:png,jpg,jpeg,webp,gif', 'max:5120'],
        ]);

        $file = $request->file('image');
        $fileName = 'prod_'.time().'_'.bin2hex(random_bytes(6)).'.'.$file->getClientOriginalExtension();
        $path = $file->storeAs('products', $fileName, 'public');

        $url = '/storage/'.$path;

        return response()->json([
            'success' => true,
            'url' => $url,
            'path' => $path,
            'filename' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
        ]);
    }

    /**
     * Store a newly created product.
     */
    public function storeProduct(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category_id' => ['required', 'exists:product_categories,id'],
            'sku' => ['nullable', 'string', 'max:60', 'unique:products,sku'],
            'name_primary' => ['required', 'string', 'max:180'],
            'name_secondary' => ['nullable', 'string', 'max:180'],
            'unit_id' => ['required', 'exists:units,id'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'image_file' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp,gif', 'max:5120'],
            'is_primary_package' => ['boolean'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ]);

        $imageUrl = $validated['image_url'] ?? null;
        if ($request->hasFile('image_file')) {
            $file = $request->file('image_file');
            $fileName = 'prod_'.time().'_'.bin2hex(random_bytes(6)).'.'.$file->getClientOriginalExtension();
            $path = $file->storeAs('products', $fileName, 'public');
            $imageUrl = '/storage/'.$path;
        }

        $product = Product::create([
            ...$validated,
            'sku' => $validated['sku'] ?: null,
            'image_url' => $imageUrl,
            'is_primary_package' => $request->boolean('is_primary_package'),
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => $validated['sort_order'] ?? 0,
            'created_by' => $request->user()->id,
            'updated_by' => $request->user()->id,
        ]);

        $this->audit->record(
            'product.created',
            $product,
            null,
            $product->toArray(),
            null,
            $request->user()->id,
            "Created product '{$product->name_primary}'"
        );

        return back()->with('success', "បានបន្ថែមមុខទំនិញ '{$product->name_primary}' ដោយជោគជ័យ");
    }

    /**
     * Update the specified product.
     */
    public function updateProduct(Request $request, Product $product): RedirectResponse
    {
        $validated = $request->validate([
            'category_id' => ['required', 'exists:product_categories,id'],
            'sku' => ['nullable', 'string', 'max:60', Rule::unique('products', 'sku')->ignore($product->id)],
            'name_primary' => ['required', 'string', 'max:180'],
            'name_secondary' => ['nullable', 'string', 'max:180'],
            'unit_id' => ['required', 'exists:units,id'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'image_file' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp,gif', 'max:5120'],
            'is_primary_package' => ['boolean'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ]);

        $oldData = $product->toArray();

        $imageUrl = $validated['image_url'] ?? null;
        if ($request->hasFile('image_file')) {
            $file = $request->file('image_file');
            $fileName = 'prod_'.time().'_'.bin2hex(random_bytes(6)).'.'.$file->getClientOriginalExtension();
            $path = $file->storeAs('products', $fileName, 'public');
            $imageUrl = '/storage/'.$path;
        }

        $product->update([
            ...$validated,
            'sku' => $validated['sku'] ?: null,
            'image_url' => $imageUrl,
            'is_primary_package' => $request->boolean('is_primary_package'),
            'is_active' => $request->boolean('is_active'),
            'sort_order' => $validated['sort_order'] ?? 0,
            'updated_by' => $request->user()->id,
        ]);

        $this->audit->record(
            'product.updated',
            $product,
            $oldData,
            $product->toArray(),
            null,
            $request->user()->id,
            "Updated product '{$product->name_primary}'"
        );

        return back()->with('success', "បានកែប្រែមុខទំនិញ '{$product->name_primary}' ដោយជោគជ័យ");
    }

    /**
     * Toggle active status of a product.
     */
    public function toggleProduct(Request $request, Product $product): RedirectResponse
    {
        $oldState = $product->is_active;
        $product->update([
            'is_active' => ! $oldState,
            'updated_by' => $request->user()->id,
        ]);

        $statusLabel = $product->is_active ? 'បើកដំណើរការ' : 'ផ្អាកដំណើរការ';

        $this->audit->record(
            'product.toggled',
            $product,
            ['is_active' => $oldState],
            ['is_active' => $product->is_active],
            null,
            $request->user()->id,
            "Toggled product active status to {$statusLabel}"
        );

        return back()->with('success', "បាន{$statusLabel}មុខទំនិញ '{$product->name_primary}'");
    }

    /**
     * Store a newly created unit.
     */
    public function storeUnit(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:40', 'unique:units,code'],
            'name_primary' => ['required', 'string', 'max:150'],
            'name_secondary' => ['nullable', 'string', 'max:150'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ]);

        $unit = Unit::create([
            ...$validated,
            'code' => strtoupper($validated['code']),
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        $this->audit->record(
            'unit.created',
            $unit,
            null,
            $unit->toArray(),
            null,
            $request->user()->id,
            "Created unit '{$unit->name_primary}' ({$unit->code})"
        );

        return back()->with('success', "បានបន្ថែមឯកតា '{$unit->name_primary}' ដោយជោគជ័យ");
    }

    /**
     * Update the specified unit.
     */
    public function updateUnit(Request $request, Unit $unit): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:40', Rule::unique('units', 'code')->ignore($unit->id)],
            'name_primary' => ['required', 'string', 'max:150'],
            'name_secondary' => ['nullable', 'string', 'max:150'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ]);

        $oldData = $unit->toArray();

        $unit->update([
            ...$validated,
            'code' => strtoupper($validated['code']),
            'is_active' => $request->boolean('is_active'),
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        $this->audit->record(
            'unit.updated',
            $unit,
            $oldData,
            $unit->toArray(),
            null,
            $request->user()->id,
            "Updated unit '{$unit->name_primary}'"
        );

        return back()->with('success', "បានកែប្រែឯកតា '{$unit->name_primary}' ដោយជោគជ័យ");
    }

    /**
     * Toggle active status of a unit.
     */
    public function toggleUnit(Request $request, Unit $unit): RedirectResponse
    {
        $oldState = $unit->is_active;
        $unit->update([
            'is_active' => ! $oldState,
        ]);

        $statusLabel = $unit->is_active ? 'បើកដំណើរការ' : 'ផ្អាកដំណើរការ';

        return back()->with('success', "បាន{$statusLabel}ឯកតា '{$unit->name_primary}'");
    }

    /**
     * Store a newly created category.
     */
    public function storeCategory(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:40', 'unique:product_categories,code'],
            'name_primary' => ['required', 'string', 'max:150'],
            'name_secondary' => ['nullable', 'string', 'max:150'],
            'category_type' => ['required', 'string', 'max:30'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ]);

        $category = ProductCategory::create([
            ...$validated,
            'code' => strtoupper($validated['code']),
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        $this->audit->record(
            'category.created',
            $category,
            null,
            $category->toArray(),
            null,
            $request->user()->id,
            "Created category '{$category->name_primary}'"
        );

        return back()->with('success', "បានបន្ថែមប្រភេទ '{$category->name_primary}' ដោយជោគជ័យ");
    }

    /**
     * Update the specified category.
     */
    public function updateCategory(Request $request, ProductCategory $category): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:40', Rule::unique('product_categories', 'code')->ignore($category->id)],
            'name_primary' => ['required', 'string', 'max:150'],
            'name_secondary' => ['nullable', 'string', 'max:150'],
            'category_type' => ['required', 'string', 'max:30'],
            'sort_order' => ['nullable', 'integer'],
            'is_active' => ['boolean'],
        ]);

        $oldData = $category->toArray();

        $category->update([
            ...$validated,
            'code' => strtoupper($validated['code']),
            'is_active' => $request->boolean('is_active'),
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        $this->audit->record(
            'category.updated',
            $category,
            $oldData,
            $category->toArray(),
            null,
            $request->user()->id,
            "Updated category '{$category->name_primary}'"
        );

        return back()->with('success', "បានកែប្រែប្រភេទ '{$category->name_primary}' ដោយជោគជ័យ");
    }

    /**
     * Toggle active status of a category.
     */
    public function toggleCategory(Request $request, ProductCategory $category): RedirectResponse
    {
        $oldState = $category->is_active;
        $category->update([
            'is_active' => ! $oldState,
        ]);

        $statusLabel = $category->is_active ? 'បើកដំណើរការ' : 'ផ្អាកដំណើរការ';

        return back()->with('success', "បាន{$statusLabel}ប្រភេទ '{$category->name_primary}'");
    }
}
