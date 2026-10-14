<?php

namespace Tests\Feature;

use App\Enums\DocumentStatus;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Document;
use App\Models\Expense;
use App\Models\Location;
use App\Models\Period;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NewPosModulesTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Period $period;
    private Location $location;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => UserRole::Admin,
            'is_active' => true,
        ]);

        $this->location = Location::create([
            'code' => 'LOC-01',
            'name_primary' => 'Main Stall',
            'name_secondary' => 'តូបធំ',
            'address' => 'Street 123',
            'is_active' => true,
            'created_by' => $this->admin->id,
        ]);

        $this->period = Period::resolveActive($this->location->id, $this->admin->id);
    }

    public function test_kds_can_be_accessed_and_status_updated(): void
    {
        $document = Document::create([
            'period_id' => $this->period->id,
            'sequence_no' => 1,
            'document_number' => 'DOC-0001',
            'business_date' => now()->toDateString(),
            'event_time' => now()->format('H:i:s'),
            'reference_identifier' => 'តុ ០១',
            'unit_count' => 1,
            'source_total' => '5.00',
            'source_total_verified' => true,
            'subtotal' => '5.00',
            'grand_total' => '5.00',
            'amount_received' => '5.00',
            'change_amount' => '0.00',
            'payment_method' => 'cash',
            'status' => DocumentStatus::Finalized,
            'kitchen_status' => 'pending',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->get('/kds');
        $response->assertOk();

        // Update to cooking
        $updateResponse = $this->actingAs($this->admin)->post("/kds/orders/{$document->id}/status", [
            'status' => 'cooking',
        ]);
        $updateResponse->assertRedirect();
        $this->assertEquals('cooking', $document->fresh()->kitchen_status);
        $this->assertNotNull($document->fresh()->kitchen_started_at);

        // Update to ready
        $this->actingAs($this->admin)->post("/kds/orders/{$document->id}/status", [
            'status' => 'ready',
        ]);
        $this->assertEquals('ready', $document->fresh()->kitchen_status);

        // Update to served
        $this->actingAs($this->admin)->post("/kds/orders/{$document->id}/status", [
            'status' => 'served',
        ]);
        $this->assertEquals('served', $document->fresh()->kitchen_status);
    }

    public function test_customer_crm_can_be_managed_and_points_adjusted(): void
    {
        $response = $this->actingAs($this->admin)->get('/customers');
        $response->assertOk();

        $storeResponse = $this->actingAs($this->admin)->post('/customers', [
            'name' => 'សុខ វិបុល',
            'phone' => '012999888',
            'tier' => 'gold',
            'notes' => 'ចូលចិត្តលៀសហាលទឹកដោះគោ',
        ]);
        $storeResponse->assertRedirect();

        $customer = Customer::where('phone', '012999888')->first();
        $this->assertNotNull($customer);
        $this->assertEquals('gold', $customer->tier);

        // Adjust points
        $adjustResponse = $this->actingAs($this->admin)->post("/customers/{$customer->id}/adjust-points", [
            'points' => 50,
            'reason' => 'ប្រូម៉ូសិនសម្ពោធ',
        ]);
        $adjustResponse->assertRedirect();
        $this->assertEquals(50, $customer->fresh()->loyalty_points);

        // Lookup endpoint
        $lookupResponse = $this->actingAs($this->admin)->getJson('/customers/lookup?query=012999888');
        $lookupResponse->assertOk();
        $lookupResponse->assertJsonFragment(['phone' => '012999888']);
    }

    public function test_expenses_can_be_recorded_and_drawer_logged(): void
    {
        $response = $this->actingAs($this->admin)->get('/expenses');
        $response->assertOk();

        // Record expense
        $expenseResponse = $this->actingAs($this->admin)->post('/expenses', [
            'category' => 'utilities',
            'title' => 'ថ្លៃភ្លើងប្រចាំខែ',
            'amount_usd' => 45.00,
            'payment_method' => 'cash_drawer',
            'paid_to' => 'EDC',
            'expense_date' => now()->toDateString(),
        ]);
        $expenseResponse->assertRedirect();

        $expense = Expense::where('title', 'ថ្លៃភ្លើងប្រចាំខែ')->first();
        $this->assertNotNull($expense);
        $this->assertEquals('45.00', (string) $expense->amount_usd);

        // Record cash drawer movement
        $drawerResponse = $this->actingAs($this->admin)->post('/expenses/drawer-log', [
            'type' => 'cash_drop',
            'amount_usd' => 100.00,
            'reason' => 'ផ្ទេរចូលទូដែក',
        ]);
        $drawerResponse->assertRedirect();

        // Export CSV
        $csvResponse = $this->actingAs($this->admin)->get('/expenses/export/csv');
        $csvResponse->assertOk();
    }

    public function test_floor_tables_can_be_managed_and_status_updated(): void
    {
        $response = $this->actingAs($this->admin)->get('/tables');
        $response->assertOk();

        $tableResponse = $this->actingAs($this->admin)->post('/tables', [
            'code' => 'T-99',
            'name' => 'តុ ៩៩',
            'zone' => 'VIP Room',
            'capacity' => 8,
            'shape' => 'rectangle',
        ]);
        $tableResponse->assertRedirect();

        $table = RestaurantTable::where('code', 'T-99')->first();
        $this->assertNotNull($table);
        $this->assertEquals('available', $table->status);

        // Update status to occupied
        $statusResponse = $this->actingAs($this->admin)->patch("/tables/{$table->id}/status", [
            'status' => 'occupied',
        ]);
        $statusResponse->assertRedirect();
        $this->assertEquals('occupied', $table->fresh()->status);
    }
}
