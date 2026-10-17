<?php

namespace Tests\Feature\Users;

use App\Enums\UserRole;
use App\Models\Location;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StaffAndLocationEditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_admin_can_change_staff_role_without_changing_password(): void
    {
        $admin = User::where('username', 'admin')->firstOrFail();
        $cashier = User::where('username', 'cashier1')->firstOrFail();
        $originalHash = $cashier->password;

        $this->actingAs($admin)
            ->patch(route('settings.users.update', $cashier), [
                'name' => 'Promoted Cashier',
                'username' => 'cashier1',
                'password' => '',
                'role' => 'supervisor',
                'is_active' => true,
                'location_ids' => [Location::firstOrFail()->id],
            ])
            ->assertSessionHas('success');

        $cashier->refresh();
        $this->assertSame('Promoted Cashier', $cashier->name);
        $this->assertSame(UserRole::Supervisor, $cashier->role);
        $this->assertSame($originalHash, $cashier->password);
    }

    public function test_admin_can_reset_staff_password(): void
    {
        $admin = User::where('username', 'admin')->firstOrFail();
        $cashier = User::where('username', 'cashier1')->firstOrFail();

        $this->actingAs($admin)
            ->patch(route('settings.users.update', $cashier), [
                'name' => $cashier->name,
                'username' => 'cashier1',
                'password' => 'new-secret-123',
                'role' => 'cashier',
                'is_active' => true,
            ])
            ->assertSessionHas('success');

        $this->assertTrue(Hash::check('new-secret-123', $cashier->refresh()->password));
    }

    public function test_admin_can_edit_and_deactivate_location(): void
    {
        $admin = User::where('username', 'admin')->firstOrFail();
        $location = Location::firstOrFail();

        $this->actingAs($admin)
            ->patch(route('settings.locations.update', $location), [
                'code' => 'LOC-99',
                'name_primary' => 'Riverside Branch',
                'name_secondary' => 'សាខាមាត់ទន្លេ',
                'address' => 'Siem Reap',
                'is_active' => false,
            ])
            ->assertSessionHas('success');

        $location->refresh();
        $this->assertSame('LOC-99', $location->code);
        $this->assertSame('Riverside Branch', $location->name_primary);
        $this->assertFalse($location->is_active);
    }

    public function test_cashier_cannot_edit_location(): void
    {
        $cashier = User::where('username', 'cashier1')->firstOrFail();
        $location = Location::firstOrFail();

        $this->actingAs($cashier)
            ->patch(route('settings.locations.update', $location), [
                'code' => 'LOC-99',
                'name_primary' => 'Hijacked',
                'is_active' => true,
            ])
            ->assertForbidden();

        $this->assertNotSame('Hijacked', $location->refresh()->name_primary);
    }
}
