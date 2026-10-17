<?php

namespace App\Features\Catalog\Http\Controllers;

use App\Enums\DocumentStatus;
use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\DocumentItem;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Unit;
use App\Support\Audit\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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

        return back()->with('success', __('បានបន្ថែមមុខទំនិញ \':name_primary\' ដោយជោគជ័យ', ['name_primary' => $product->name_primary]));
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

        return back()->with('success', __('បានកែប្រែមុខទំនិញ \':name_primary\' ដោយជោគជ័យ', ['name_primary' => $product->name_primary]));
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

        $statusLabel = $product->is_active ? __('បើកដំណើរការ') : __('ផ្អាកដំណើរការ');

        $this->audit->record(
            'product.toggled',
            $product,
            ['is_active' => $oldState],
            ['is_active' => $product->is_active],
            null,
            $request->user()->id,
            "Toggled product active status to {$statusLabel}"
        );

        return back()->with('success', __('បាន:statusLabelមុខទំនិញ \':name_primary\'', ['statusLabel' => $statusLabel, 'name_primary' => $product->name_primary]));
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

        return back()->with('success', __('បានបន្ថែមឯកតា \':name_primary\' ដោយជោគជ័យ', ['name_primary' => $unit->name_primary]));
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

        return back()->with('success', __('បានកែប្រែឯកតា \':name_primary\' ដោយជោគជ័យ', ['name_primary' => $unit->name_primary]));
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

        $statusLabel = $unit->is_active ? __('បើកដំណើរការ') : __('ផ្អាកដំណើរការ');

        return back()->with('success', __('បាន:statusLabelឯកតា \':name_primary\'', ['statusLabel' => $statusLabel, 'name_primary' => $unit->name_primary]));
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

        return back()->with('success', __('បានបន្ថែមប្រភេទ \':name_primary\' ដោយជោគជ័យ', ['name_primary' => $category->name_primary]));
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

        return back()->with('success', __('បានកែប្រែប្រភេទ \':name_primary\' ដោយជោគជ័យ', ['name_primary' => $category->name_primary]));
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

        $statusLabel = $category->is_active ? __('បើកដំណើរការ') : __('ផ្អាកដំណើរការ');

        return back()->with('success', __('បាន:statusLabelប្រភេទ \':name_primary\'', ['statusLabel' => $statusLabel, 'name_primary' => $category->name_primary]));
    }

    /**
     * Delete a product. Invoices and purchases keep their own name/price snapshot, so history stays intact;
     * a dish that is still on an unpaid table order cannot be removed.
     */
    public function destroyProduct(Request $request, Product $product): RedirectResponse
    {
        $onOpenOrder = DocumentItem::where('product_id', $product->id)
            ->whereHas('document', fn ($query) => $query->where('status', DocumentStatus::Draft))
            ->exists();

        if ($onOpenOrder) {
            return back()->with('error', __('មិនអាចលុប \':name_primary\' បានទេ ព្រោះកំពុងមានក្នុងការកម្មង់តុដែលមិនទាន់គិតប្រាក់។', ['name_primary' => $product->name_primary]));
        }

        $oldData = $product->toArray();
        $product->delete();
        $this->deleteUnusedUploadedImage($product->image_url);

        $this->audit->record(
            'product.deleted',
            $product,
            $oldData,
            null,
            null,
            $request->user()->id,
            "Deleted product '{$product->name_primary}'"
        );

        return back()->with('success', __('បានលុបមុខទំនិញ \':name_primary\'', ['name_primary' => $product->name_primary]));
    }

    /**
     * Delete a unit that no product uses any more.
     */
    public function destroyUnit(Request $request, Unit $unit): RedirectResponse
    {
        $productCount = $unit->products()->count();

        if ($productCount > 0) {
            return back()->with('error', __('មិនអាចលុបឯកតា \':name_primary\' បានទេ ព្រោះមានមុខទំនិញ :count កំពុងប្រើ។ សូមប្តូរឯកតារបស់មុខទំនិញទាំងនោះសិន។', ['name_primary' => $unit->name_primary, 'count' => $productCount]));
        }

        $oldData = $unit->toArray();
        $unit->delete();

        $this->audit->record(
            'unit.deleted',
            $unit,
            $oldData,
            null,
            null,
            $request->user()->id,
            "Deleted unit '{$unit->name_primary}'"
        );

        return back()->with('success', __('បានលុបឯកតា \':name_primary\'', ['name_primary' => $unit->name_primary]));
    }

    /**
     * Delete a category that has no products left.
     */
    public function destroyCategory(Request $request, ProductCategory $category): RedirectResponse
    {
        $productCount = $category->products()->count();

        if ($productCount > 0) {
            return back()->with('error', __('មិនអាចលុបប្រភេទ \':name_primary\' បានទេ ព្រោះមានមុខទំនិញ :count នៅក្នុងប្រភេទនេះ។ សូមផ្លាស់មុខទំនិញទៅប្រភេទផ្សេងសិន។', ['name_primary' => $category->name_primary, 'count' => $productCount]));
        }

        $oldData = $category->toArray();
        $category->delete();

        $this->audit->record(
            'category.deleted',
            $category,
            $oldData,
            null,
            null,
            $request->user()->id,
            "Deleted category '{$category->name_primary}'"
        );

        return back()->with('success', __('បានលុបប្រភេទ \':name_primary\'', ['name_primary' => $category->name_primary]));
    }

    /**
     * Remove an uploaded product photo from storage once no other product points to it.
     */
    private function deleteUnusedUploadedImage(?string $imageUrl): void
    {
        if (! $imageUrl || ! str_starts_with($imageUrl, '/storage/products/')) {
            return;
        }

        if (Product::where('image_url', $imageUrl)->exists()) {
            return;
        }

        Storage::disk('public')->delete(substr($imageUrl, strlen('/storage/')));
    }
}
