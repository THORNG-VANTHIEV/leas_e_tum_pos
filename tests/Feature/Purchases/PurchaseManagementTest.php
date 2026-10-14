<?php

namespace Tests\Feature\Purchases;

use App\Models\AuditLog;
use App\Models\BusinessSetting;
use App\Models\Location;
use App\Models\Period;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Period $period;

    protected function setUp(): void
    {
        parent::setUp();

        BusinessSetting::current();

        $this->user = User::create([
            'name' => 'Admin User',
            'username' => 'admin_purchases',
            'password' => bcrypt('secret'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $location = Location::create([
            'code' => 'LOC-01',
            'name_primary' => 'Main Dining Hall',
            'is_active' => true,
            'created_by' => $this->user->id,
        ]);

        $this->period = Period::create([
            'code' => 'P-2026-10',
            'name' => 'October 2026 Shift Run',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'status' => 'active',
            'location_id' => $location->id,
            'document_prefix' => 'INV',
            'created_by' => $this->user->id,
        ]);

        BusinessSetting::current()->update(['active_period_id' => $this->period->id]);
    }

    public function test_user_can_view_purchases_page(): void
    {
        $supplier = Supplier::create([
            'name' => 'ដេប៉ូលៀសហាលកោះកុង',
            'contact_person' => 'អ្នកស្រី នី',
            'phone' => '012 999 888',
            'is_active' => true,
            'created_by' => $this->user->id,
        ]);

        $purchase = Purchase::create([
            'purchase_number' => 'PUR-2610-0001',
            'supplier_id' => $supplier->id,
            'period_id' => $this->period->id,
            'purchase_date' => now()->toDateString(),
            'status' => 'received',
            'subtotal' => 120.00,
            'discount_amount' => 0.00,
            'tax_amount' => 0.00,
            'total_amount' => 120.00,
            'created_by' => $this->user->id,
        ]);

        $purchase->items()->create([
            'item_name' => 'លៀសហាលស្រស់',
            'unit_name' => 'កំប៉ុង',
            'quantity' => 100,
            'unit_cost' => 1.20,
            'total_cost' => 120.00,
        ]);

        $response = $this->actingAs($this->user)->get(route('purchases.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('purchases/index')
            ->has('purchases.data', 1)
            ->has('suppliers', 1)
            ->has('metrics')
        );
    }

    public function test_user_can_create_purchase_order_with_line_items_and_calculate_totals(): void
    {
        $supplier = Supplier::create([
            'name' => 'CP Food Meat Supply',
            'is_active' => true,
            'created_by' => $this->user->id,
        ]);

        $payload = [
            'supplier_id' => $supplier->id,
            'purchase_date' => now()->toDateString(),
            'status' => 'received',
            'reference_note' => 'INV-CP-8831',
            'notes' => 'Received to cold storage',
            'discount_amount' => 5.00,
            'tax_amount' => 0.00,
            'items' => [
                [
                    'item_name' => 'ប្រហិតសាច់គោ',
                    'unit_name' => 'កញ្ចប់',
                    'quantity' => 10,
                    'unit_cost' => 5.50, // 55.00
                ],
                [
                    'item_name' => 'ពងទាកូនស្រស់',
                    'unit_name' => 'ឈុត',
                    'quantity' => 20,
                    'unit_cost' => 2.00, // 40.00
                ],
            ],
        ];

        $response = $this->actingAs($this->user)->post(route('purchases.store'), $payload);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Subtotal = 55 + 40 = 95.00; Total = 95 - 5 = 90.00
        $this->assertDatabaseHas('purchases', [
            'supplier_id' => $supplier->id,
            'subtotal' => 95.00,
            'discount_amount' => 5.00,
            'total_amount' => 90.00,
            'reference_note' => 'INV-CP-8831',
            'status' => 'received',
        ]);

        $this->assertDatabaseHas('purchase_items', [
            'item_name' => 'ប្រហិតសាច់គោ',
            'quantity' => 10.00,
            'unit_cost' => 5.50,
            'total_cost' => 55.00,
        ]);

        $this->assertDatabaseHas('purchase_items', [
            'item_name' => 'ពងទាកូនស្រស់',
            'quantity' => 20.00,
            'unit_cost' => 2.00,
            'total_cost' => 40.00,
        ]);

        // Audit log created
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'purchase.created',
            'actor_id' => $this->user->id,
        ]);
    }

    public function test_user_can_update_purchase_status(): void
    {
        $purchase = Purchase::create([
            'purchase_number' => 'PUR-2610-0099',
            'purchase_date' => now()->toDateString(),
            'status' => 'pending',
            'subtotal' => 50.00,
            'discount_amount' => 0.00,
            'tax_amount' => 0.00,
            'total_amount' => 50.00,
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)->patch(route('purchases.status', $purchase), [
            'status' => 'received',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('purchases', [
            'id' => $purchase->id,
            'status' => 'received',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'purchase.status_updated',
            'auditable_id' => $purchase->id,
        ]);
    }

    public function test_user_can_create_and_update_supplier(): void
    {
        $response = $this->actingAs($this->user)->post(route('purchases.suppliers.store'), [
            'name' => 'ដេប៉ូភេសជ្ជៈ ហេង ហេង',
            'contact_person' => 'លោក ហេង',
            'phone' => '077 123 456',
            'address' => 'ផ្លូវ ២៧១ ភ្នំពេញ',
            'is_active' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('suppliers', [
            'name' => 'ដេប៉ូភេសជ្ជៈ ហេង ហេង',
            'contact_person' => 'លោក ហេង',
        ]);

        $supplier = Supplier::where('name', 'ដេប៉ូភេសជ្ជៈ ហេង ហេង')->first();

        $updateResponse = $this->actingAs($this->user)->patch(route('purchases.suppliers.update', $supplier), [
            'name' => 'ដេប៉ូភេសជ្ជៈ ហេង ហេង (កែប្រែ)',
            'contact_person' => 'លោក ហេង (អ្នកគ្រប់គ្រង)',
            'phone' => '077 123 999',
            'address' => 'ផ្លូវ ២៧១ ភ្នំពេញ',
            'is_active' => true,
        ]);

        $updateResponse->assertRedirect();
        $this->assertDatabaseHas('suppliers', [
            'id' => $supplier->id,
            'name' => 'ដេប៉ូភេសជ្ជៈ ហេង ហេង (កែប្រែ)',
            'phone' => '077 123 999',
        ]);
    }

    public function test_user_can_toggle_supplier_active_state(): void
    {
        $supplier = Supplier::create([
            'name' => 'សិប្បកម្ម ទឹកត្រី កំពត',
            'is_active' => true,
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAs($this->user)->post(route('purchases.suppliers.toggle', $supplier));
        $response->assertRedirect();

        $this->assertFalse($supplier->fresh()->is_active);

        $response2 = $this->actingAs($this->user)->post(route('purchases.suppliers.toggle', $supplier));
        $response2->assertRedirect();

        $this->assertTrue($supplier->fresh()->is_active);
    }
}
