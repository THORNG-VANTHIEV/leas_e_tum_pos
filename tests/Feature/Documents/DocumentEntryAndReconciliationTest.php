<?php

namespace Tests\Feature\Documents;

use App\Enums\PeriodStatus;
use App\Enums\UserRole;
use App\Models\BusinessSetting;
use App\Models\Document;
use App\Models\Location;
use App\Models\Period;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DocumentEntryAndReconciliationTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $cashier;
    protected User $otherCashier;
    protected Period $activePeriod;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        BusinessSetting::current();

        $this->admin = User::create([
            'name' => 'Admin User',
            'username' => 'admin',
            'password' => Hash::make('secret'),
            'role' => UserRole::Admin,
            'is_active' => true,
        ]);

        $this->cashier = User::create([
            'name' => 'Cashier One',
            'username' => 'cashier1',
            'password' => Hash::make('secret'),
            'role' => UserRole::Cashier,
            'is_active' => true,
        ]);

        $this->otherCashier = User::create([
            'name' => 'Cashier Two',
            'username' => 'cashier2',
            'password' => Hash::make('secret'),
            'role' => UserRole::Cashier,
            'is_active' => true,
        ]);

        $location = Location::create([
            'code' => 'LOC-01',
            'name_primary' => 'Main Hall',
            'created_by' => $this->admin->id,
        ]);

        $this->activePeriod = Period::create([
            'location_id' => $location->id,
            'code' => 'P01',
            'name' => 'Active Shift',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'status' => PeriodStatus::Active,
            'entry_settings_snapshot' => ['require_source_total' => true],
            'created_by' => $this->admin->id,
        ]);

        $unit = Unit::create(['code' => 'dish', 'name_primary' => 'Dish']);
        $cat = ProductCategory::create(['code' => 'KITCHEN', 'name_primary' => 'Kitchen', 'category_type' => 'food']);

        $this->product = Product::create([
            'category_id' => $cat->id,
            'name_primary' => 'Beef Lok Lak',
            'unit_id' => $unit->id,
            'unit_price' => '10.00',
            'is_primary_package' => false,
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);
    }

    public function test_cashier_can_create_draft_when_source_total_is_balanced(): void
    {
        $response = $this->actingAs($this->cashier)->post('/invoices', [
            'period_id' => $this->activePeriod->id,
            'business_date' => now()->toDateString(),
            'event_time' => '12:30',
            'reference_identifier' => 'T-05',
            'payment_method' => 'cash',
            'source_total' => '20.00', // matches 2 * 10.00
            'amount_received' => '25.00',
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('documents', [
            'period_id' => $this->activePeriod->id,
            'reference_identifier' => 'T-05',
            'grand_total' => '20.00',
            'source_total' => '20.00',
            'source_total_verified' => true,
            'amount_received' => '25.00',
            'change_amount' => '5.00',
            'created_by' => $this->cashier->id,
        ]);
    }

    public function test_creation_fails_when_source_total_has_discrepancy(): void
    {
        $response = $this->actingAs($this->cashier)->post('/invoices', [
            'period_id' => $this->activePeriod->id,
            'business_date' => now()->toDateString(),
            'event_time' => '12:30',
            'reference_identifier' => 'T-05',
            'payment_method' => 'cash',
            'source_total' => '25.00', // Physical slip says 25, but calculated is 20!
            'amount_received' => '25.00',
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
        ]);

        $response->assertSessionHas('error');
        $this->assertDatabaseCount('documents', 0);
    }

    public function test_cashier_cannot_view_invoices_created_by_another_cashier(): void
    {
        // Document created by cashier1
        $doc = Document::create([
            'period_id' => $this->activePeriod->id,
            'provisional_order' => 1,
            'business_date' => now()->toDateString(),
            'event_time' => '12:00',
            'source_total' => '10.00',
            'subtotal' => '10.00',
            'grand_total' => '10.00',
            'amount_received' => '10.00',
            'change_amount' => '0.00',
            'created_by' => $this->cashier->id,
            'updated_by' => $this->cashier->id,
        ]);

        // Cashier 2 tries to view it -> 403 Forbidden
        $response = $this->actingAs($this->otherCashier)->get("/invoices/{$doc->id}");
        $response->assertStatus(403);

        // Admin CAN view it
        $adminResponse = $this->actingAs($this->admin)->get("/invoices/{$doc->id}");
        $adminResponse->assertStatus(200);
    }
}
