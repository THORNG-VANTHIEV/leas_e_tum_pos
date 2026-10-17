<?php

namespace Tests\Feature\Floor;

use App\Enums\DocumentStatus;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\Period;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FloorTableManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_supervisor_can_update_table_details(): void
    {
        $table = $this->createTable();
        $supervisor = User::where('username', 'supervisor1')->firstOrFail();

        $this->actingAs($supervisor)
            ->patch(route('tables.update', $table), [
                'code' => 'test-vip-09',
                'name' => 'Test VIP 09',
                'zone' => 'VIP Room',
                'capacity' => 8,
                'shape' => 'round',
            ])
            ->assertSessionHas('success');

        $table->refresh();
        $this->assertSame('TEST-VIP-09', $table->code);
        $this->assertSame('Test VIP 09', $table->name);
        $this->assertSame(8, $table->capacity);
        $this->assertSame('round', $table->shape);
        $this->assertTrue(AuditLog::where('action', 'table.updated')->where('auditable_id', $table->id)->exists());
    }

    public function test_update_rejects_code_used_by_another_table(): void
    {
        $this->createTable(['code' => 'TEST-02', 'name' => 'Test Table 02']);
        $table = $this->createTable();
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($admin)
            ->patch(route('tables.update', $table), [...$this->tablePayload($table), 'code' => 'TEST-02'])
            ->assertSessionHasErrors(['code' => 'The code has already been taken.']);
    }

    public function test_table_with_open_order_cannot_be_renamed_or_deleted(): void
    {
        $table = $this->createTable();
        $this->openDraftOrderFor($table);
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($admin)
            ->patch(route('tables.update', $table), [...$this->tablePayload($table), 'name' => 'Renamed'])
            ->assertSessionHas('error');

        $this->actingAs($admin)
            ->delete(route('tables.destroy', $table))
            ->assertSessionHas('error');

        $table->refresh();
        $this->assertSame('Test Table 01', $table->name);
        $this->assertTrue($table->is_active);
    }

    public function test_table_with_open_order_can_still_change_capacity(): void
    {
        $table = $this->createTable();
        $this->openDraftOrderFor($table);
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($admin)
            ->patch(route('tables.update', $table), [...$this->tablePayload($table), 'capacity' => 6])
            ->assertSessionHas('success');

        $this->assertSame(6, $table->refresh()->capacity);
    }

    public function test_admin_can_remove_table_from_floor_plan(): void
    {
        $table = $this->createTable();
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($admin)
            ->delete(route('tables.destroy', $table))
            ->assertSessionHas('success');

        $this->assertFalse($table->refresh()->is_active);
        $this->assertTrue(AuditLog::where('action', 'table.deactivated')->where('auditable_id', $table->id)->exists());
    }

    public function test_cashier_cannot_update_or_delete_table(): void
    {
        $table = $this->createTable();
        $cashier = User::where('username', 'cashier1')->firstOrFail();

        $this->actingAs($cashier)
            ->patch(route('tables.update', $table), $this->tablePayload($table))
            ->assertForbidden();

        $this->actingAs($cashier)
            ->delete(route('tables.destroy', $table))
            ->assertForbidden();
    }

    public function test_floor_plan_shows_table_with_held_order_as_occupied(): void
    {
        $table = $this->createTable();
        $this->openDraftOrderFor($table);
        $this->travel(15)->minutes();
        $cashier = User::where('username', 'cashier1')->firstOrFail();

        $this->actingAs($cashier)
            ->get(route('tables.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('tables', fn ($tables) => collect($tables)->contains(fn ($row) => $row['id'] === $table->id
                    && $row['status'] === 'occupied'
                    && $row['active_order']['elapsed_minutes'] === 15))
            );
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createTable(array $overrides = []): RestaurantTable
    {
        return RestaurantTable::create([
            'code' => 'TEST-01',
            'name' => 'Test Table 01',
            'zone' => 'Main Dining',
            'capacity' => 4,
            'shape' => 'square',
            'status' => 'available',
            'sort_order' => 1,
            'is_active' => true,
            ...$overrides,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function tablePayload(RestaurantTable $table): array
    {
        return $table->only(['code', 'name', 'zone', 'capacity', 'shape']);
    }

    private function openDraftOrderFor(RestaurantTable $table): void
    {
        $admin = User::where('username', 'admin')->firstOrFail();
        $period = Period::resolveActive(1, $admin->id);

        Document::create([
            'period_id' => $period->id,
            'business_date' => now()->toDateString(),
            'event_time' => now()->format('H:i:s'),
            'reference_identifier' => $table->name,
            'source_total' => '0.00',
            'subtotal' => '0.00',
            'grand_total' => '0.00',
            'amount_received' => '0.00',
            'change_amount' => '0.00',
            'status' => DocumentStatus::Draft,
            'created_by' => $admin->id,
            'updated_by' => $admin->id,
        ]);
    }
}
