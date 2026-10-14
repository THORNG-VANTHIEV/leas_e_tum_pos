<?php

namespace Tests\Feature\Catalog;

use App\Enums\UserRole;
use App\Models\BusinessSetting;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CatalogManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected ProductCategory $category;
    protected Unit $unit;

    protected function setUp(): void
    {
        parent::setUp();

        BusinessSetting::current();

        $this->admin = User::create([
            'name' => 'Admin User',
            'username' => 'admin_catalog',
            'password' => Hash::make('secret'),
            'role' => UserRole::Admin,
            'is_active' => true,
        ]);

        $this->unit = Unit::create([
            'code' => 'CAN',
            'name_primary' => 'កំប៉ុង',
            'name_secondary' => 'Can',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $this->category = ProductCategory::create([
            'code' => 'CLAMS',
            'name_primary' => 'លៀសហាល',
            'name_secondary' => 'Sun-dried Clams',
            'category_type' => 'food',
            'sort_order' => 1,
            'is_active' => true,
        ]);
    }

    public function test_authenticated_user_can_view_catalog_index(): void
    {
        $response = $this->actingAs($this->admin)->get('/catalog');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('catalog/index')
            ->has('products')
            ->has('categories')
            ->has('units')
            ->has('exchange_rate')
        );
    }

    public function test_can_create_new_product(): void
    {
        $response = $this->actingAs($this->admin)->post('/catalog/products', [
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'sku' => 'TEST-01',
            'name_primary' => 'លៀសហាលតេស្ត',
            'name_secondary' => 'Test Clams',
            'unit_price' => '3.50',
            'is_primary_package' => true,
            'sort_order' => 5,
            'is_active' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('products', [
            'sku' => 'TEST-01',
            'name_primary' => 'លៀសហាលតេស្ត',
            'unit_price' => '3.50',
            'is_primary_package' => true,
        ]);
    }

    public function test_can_update_product(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'sku' => 'TEST-02',
            'name_primary' => 'ម្ហូបចាស់',
            'name_secondary' => 'Old Dish',
            'unit_price' => '2.00',
            'is_primary_package' => false,
            'sort_order' => 1,
            'is_active' => true,
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->patch("/catalog/products/{$product->id}", [
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'sku' => 'TEST-02-UPDATED',
            'name_primary' => 'ម្ហូបថ្មី',
            'name_secondary' => 'Updated Dish',
            'unit_price' => '4.25',
            'is_primary_package' => true,
            'sort_order' => 2,
            'is_active' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'sku' => 'TEST-02-UPDATED',
            'name_primary' => 'ម្ហូបថ្មី',
            'unit_price' => '4.25',
        ]);
    }

    public function test_can_toggle_product_status(): void
    {
        $product = Product::create([
            'category_id' => $this->category->id,
            'unit_id' => $this->unit->id,
            'sku' => 'TEST-TOGGLE',
            'name_primary' => 'ម្ហូប Toggle',
            'unit_price' => '2.00',
            'is_active' => true,
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);

        $this->actingAs($this->admin)->post("/catalog/products/{$product->id}/toggle");
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_active' => false,
        ]);

        $this->actingAs($this->admin)->post("/catalog/products/{$product->id}/toggle");
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_active' => true,
        ]);
    }

    public function test_can_create_and_update_unit(): void
    {
        $this->actingAs($this->admin)->post('/catalog/units', [
            'code' => 'BOWL',
            'name_primary' => 'ចានគោម',
            'name_secondary' => 'Bowl',
            'sort_order' => 3,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('units', [
            'code' => 'BOWL',
            'name_primary' => 'ចានគោម',
        ]);

        $unit = Unit::where('code', 'BOWL')->firstOrFail();

        $this->actingAs($this->admin)->patch("/catalog/units/{$unit->id}", [
            'code' => 'BOWL',
            'name_primary' => 'ចានគោមធំ',
            'name_secondary' => 'Large Bowl',
            'sort_order' => 4,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('units', [
            'id' => $unit->id,
            'name_primary' => 'ចានគោមធំ',
        ]);
    }

    public function test_can_create_and_update_category(): void
    {
        $this->actingAs($this->admin)->post('/catalog/categories', [
            'code' => 'SOUPS',
            'name_primary' => 'ស៊ុប & មី',
            'name_secondary' => 'Soups & Noodles',
            'category_type' => 'food',
            'sort_order' => 2,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('product_categories', [
            'code' => 'SOUPS',
            'name_primary' => 'ស៊ុប & មី',
        ]);

        $category = ProductCategory::where('code', 'SOUPS')->firstOrFail();

        $this->actingAs($this->admin)->patch("/catalog/categories/{$category->id}", [
            'code' => 'SOUPS',
            'name_primary' => 'ស៊ុបពិសេស',
            'name_secondary' => 'Special Soups',
            'category_type' => 'food',
            'sort_order' => 5,
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('product_categories', [
            'id' => $category->id,
            'name_primary' => 'ស៊ុបពិសេស',
        ]);
    }
}
