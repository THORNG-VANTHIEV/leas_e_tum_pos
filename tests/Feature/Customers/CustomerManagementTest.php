<?php

namespace Tests\Feature\Customers;

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => UserRole::Admin,
            'is_active' => true,
        ]);
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
}
