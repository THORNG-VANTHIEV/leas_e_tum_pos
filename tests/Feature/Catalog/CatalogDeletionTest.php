<?php

namespace Tests\Feature\Catalog;

use App\Models\Document;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Unit;
use App\Models\User;
use Database\Seeders\LeashalEtumProductsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogDeletionTest extends TestCase
{
    use RefreshDatabase;

    protected User $supervisor;

    protected User $cashier;

    protected Product $clams;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(LeashalEtumProductsSeeder::class);

        $this->supervisor = User::where('username', 'supervisor1')->firstOrFail();
        $this->cashier = User::where('username', 'cashier1')->firstOrFail();
        $this->clams = Product::where('sku', 'ETUM-OP-01')->firstOrFail();
    }

    public function test_supervisor_deletes_a_product_and_paid_invoices_keep_their_snapshot(): void
    {
        $this->actingAs($this->cashier)->post(route('invoices.checkout'), [
            'table_identifier' => 'ខ្ចប់ (Takeaway)',
            'payment_method' => 'khqr',
            'items' => [['product_id' => $this->clams->id, 'quantity' => 1]],
        ]);
        $item = Document::latest('id')->firstOrFail()->items()->firstOrFail();

        $this->actingAs($this->supervisor)
            ->delete(route('catalog.products.destroy', $this->clams))
            ->assertSessionHas('success');

        $this->assertModelMissing($this->clams);
        $item->refresh();
        $this->assertNull($item->product_id);
        $this->assertSame($this->clams->name_primary, $item->product_name_primary_snapshot);
        $this->assertDatabaseHas('audit_logs', ['action' => 'product.deleted', 'actor_id' => $this->supervisor->id]);
    }

    public function test_product_on_an_unpaid_table_order_cannot_be_deleted(): void
    {
        $this->actingAs($this->cashier)->post(route('invoices.hold-table'), [
            'table_identifier' => 'តុ ០៧',
            'items' => [['product_id' => $this->clams->id, 'quantity' => 2]],
        ]);

        $this->actingAs($this->supervisor)
            ->delete(route('catalog.products.destroy', $this->clams))
            ->assertSessionHas('error');

        $this->assertModelExists($this->clams);
    }

    public function test_unit_and_category_in_use_cannot_be_deleted(): void
    {
        $this->actingAs($this->supervisor)
            ->delete(route('catalog.units.destroy', $this->clams->unit_id))
            ->assertSessionHas('error');
        $this->actingAs($this->supervisor)
            ->delete(route('catalog.categories.destroy', $this->clams->category_id))
            ->assertSessionHas('error');

        $this->assertModelExists($this->clams->unit);
        $this->assertModelExists($this->clams->category);
    }

    public function test_unused_unit_and_category_are_deleted(): void
    {
        $unit = Unit::create(['code' => 'BOWL', 'name_primary' => 'ចាន', 'is_active' => true, 'sort_order' => 9]);
        $category = ProductCategory::create(['code' => 'TEMP', 'name_primary' => 'បណ្ដោះអាសន្ន', 'category_type' => 'food', 'is_active' => true, 'sort_order' => 9]);

        $this->actingAs($this->supervisor)->delete(route('catalog.units.destroy', $unit))->assertSessionHas('success');
        $this->actingAs($this->supervisor)->delete(route('catalog.categories.destroy', $category))->assertSessionHas('success');

        $this->assertModelMissing($unit);
        $this->assertModelMissing($category);
    }

    public function test_cashier_cannot_delete_catalog_records(): void
    {
        $this->actingAs($this->cashier)->delete(route('catalog.products.destroy', $this->clams))->assertForbidden();
        $this->actingAs($this->cashier)->delete(route('catalog.units.destroy', $this->clams->unit_id))->assertForbidden();
        $this->actingAs($this->cashier)->delete(route('catalog.categories.destroy', $this->clams->category_id))->assertForbidden();

        $this->assertModelExists($this->clams);
    }
}
