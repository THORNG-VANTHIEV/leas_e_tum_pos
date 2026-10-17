<?php

namespace Tests\Feature\Floor;

use App\Enums\UserRole;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FloorTableCreationTest extends TestCase
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
