<?php

namespace Tests\Feature\Users;

use App\Enums\UserRole;
use App\Models\BusinessSetting;
use App\Models\Location;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserManagementAndProtectionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $cashier;

    protected function setUp(): void
    {
        parent::setUp();

        BusinessSetting::current();

        $this->admin = User::create([
            'name' => 'Admin User',
            'username' => 'admin_test',
            'password' => Hash::make('secret'),
            'role' => UserRole::Admin,
            'is_active' => true,
        ]);

        $this->cashier = User::create([
            'name' => 'Cashier User',
            'username' => 'cashier_test',
            'password' => Hash::make('secret'),
            'role' => UserRole::Cashier,
            'is_active' => true,
        ]);
    }

    public function test_cashier_is_denied_access_to_settings_hub(): void
    {
        $response = $this->actingAs($this->cashier)->get('/settings');
        $response->assertStatus(403);
    }

    public function test_admin_can_access_settings_hub(): void
    {
        $response = $this->actingAs($this->admin)->get('/settings');
        $response->assertStatus(200);
    }

    public function test_admin_cannot_deactivate_own_active_account(): void
    {
        $response = $this->actingAs($this->admin)->patch("/settings/users/{$this->admin->id}", [
            'name' => 'Admin Self',
            'username' => 'admin_test',
            'role' => 'admin',
            'is_active' => false,
        ]);

        $response->assertSessionHasErrors('is_active');
        $this->assertTrue($this->admin->fresh()->is_active);
    }

    public function test_admin_cannot_archive_own_active_account(): void
    {
        $response = $this->actingAs($this->admin)->post("/settings/users/{$this->admin->id}/archive", [
            'reason' => 'Attempting to self-archive',
        ]);

        $response->assertSessionHasErrors('reason');
        $this->assertNull($this->admin->fresh()->archived_at);
        $this->assertTrue($this->admin->fresh()->is_active);
    }

    public function test_last_admin_cannot_be_archived_or_deactivated(): void
    {
        // Only $this->admin is active admin
        $secondAdmin = User::create([
            'name' => 'Second Admin',
            'username' => 'admin2',
            'password' => Hash::make('secret'),
            'role' => UserRole::Admin,
            'is_active' => true,
        ]);

        // Second admin archives first admin -> allowed since secondAdmin remains
        $response1 = $this->actingAs($secondAdmin)->post("/settings/users/{$this->admin->id}/archive", [
            'reason' => 'Admin 1 resigned',
        ]);
        $response1->assertSessionHasNoErrors();
        $this->assertFalse($this->admin->fresh()->is_active);

        // Now secondAdmin is the sole active admin. Attempting to demote or archive secondAdmin must fail:
        $response2 = $this->actingAs($secondAdmin)->patch("/settings/users/{$secondAdmin->id}", [
            'name' => 'Second Admin',
            'username' => 'admin2',
            'role' => 'cashier', // demotion attempt
            'is_active' => true,
        ]);
        $response2->assertSessionHasErrors();

        $this->assertEquals(UserRole::Admin, $secondAdmin->fresh()->role);
    }

    public function test_admin_can_archive_and_restore_cashier(): void
    {
        // Archive cashier
        $response = $this->actingAs($this->admin)->post("/settings/users/{$this->cashier->id}/archive", [
            'reason' => 'Staff resigned on 2026-10-13',
        ]);
        $response->assertSessionHasNoErrors();

        $freshCashier = $this->cashier->fresh();
        $this->assertFalse($freshCashier->is_active);
        $this->assertNotNull($freshCashier->archived_at);
        $this->assertEquals('Staff resigned on 2026-10-13', $freshCashier->archived_reason);

        // Audit log created
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.archived',
            'auditable_id' => $this->cashier->id,
        ]);

        // Restore cashier (must be restored as inactive per blueprint)
        $restoreResponse = $this->actingAs($this->admin)->post("/settings/users/{$this->cashier->id}/restore");
        $restoreResponse->assertSessionHasNoErrors();

        $restoredCashier = $this->cashier->fresh();
        $this->assertNull($restoredCashier->archived_at);
        $this->assertFalse($restoredCashier->is_active); // Must remain inactive until deliberate reactivation

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.restored',
            'auditable_id' => $this->cashier->id,
        ]);
    }
}
