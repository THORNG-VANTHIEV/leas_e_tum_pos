<?php

namespace Tests\Feature\Users;

use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManagerOnlyActionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_cashier_cannot_change_product_price(): void
    {
        $product = Product::where('is_active', true)->firstOrFail();
        $originalPrice = (string) $product->unit_price;
        $cashier = User::where('username', 'cashier1')->firstOrFail();

        $this->actingAs($cashier)
            ->patch(route('catalog.products.update', $product), [...$product->toArray(), 'unit_price' => '0.01'])
            ->assertForbidden();

        $this->actingAs($cashier)
            ->post(route('catalog.products.toggle', $product))
            ->assertForbidden();

        $product->refresh();
        $this->assertSame($originalPrice, (string) $product->unit_price);
        $this->assertTrue((bool) $product->is_active);
    }

    public function test_cashier_cannot_adjust_customer_points(): void
    {
        $customer = Customer::create(['name' => 'Dara', 'loyalty_points' => 5]);
        $cashier = User::where('username', 'cashier1')->firstOrFail();

        $this->actingAs($cashier)
            ->post(route('customers.adjust-points', $customer), ['points' => 500, 'reason' => 'gift'])
            ->assertForbidden();

        $this->assertSame(5, $customer->refresh()->loyalty_points);
    }

    public function test_cashier_cannot_create_table(): void
    {
        $cashier = User::where('username', 'cashier1')->firstOrFail();

        $this->actingAs($cashier)
            ->post(route('tables.store'), ['code' => 'X-99', 'name' => 'X 99', 'zone' => 'Main Dining', 'capacity' => 4, 'shape' => 'square'])
            ->assertForbidden();

        $this->assertDatabaseMissing('restaurant_tables', ['code' => 'X-99']);
    }

    public function test_supervisor_can_still_manage_catalog(): void
    {
        $product = Product::where('is_active', true)->firstOrFail();
        $supervisor = User::where('username', 'supervisor1')->firstOrFail();

        $this->actingAs($supervisor)
            ->post(route('catalog.products.toggle', $product))
            ->assertRedirect();

        $this->assertFalse((bool) $product->refresh()->is_active);
    }
}
