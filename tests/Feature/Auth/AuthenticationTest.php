<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login_from_root(): void
    {
        $response = $this->get('/');
        $response->assertRedirect('/login');
    }

    public function test_login_page_hides_demo_accounts_outside_local_development(): void
    {
        $this->app['env'] = 'production';

        $this->get('/login')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->where('show_demo_accounts', false));
    }

    public function test_login_page_shows_demo_accounts_in_local_development(): void
    {
        $this->app['env'] = 'local';

        $this->get('/login')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->where('show_demo_accounts', true));
    }

    public function test_active_user_can_authenticate_with_valid_credentials(): void
    {
        $user = User::create([
            'name' => 'Active Cashier',
            'username' => 'cashier_test',
            'password' => Hash::make('secret123'),
            'role' => UserRole::Cashier,
            'is_active' => true,
        ]);

        $response = $this->post('/login', [
            'username' => 'cashier_test',
            'password' => 'secret123',
        ]);

        $response->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user);

        // Audit log verified
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.login_success',
            'actor_id' => $user->id,
        ]);
    }

    public function test_inactive_user_is_denied_login_and_audited(): void
    {
        $inactive = User::create([
            'name' => 'Inactive Cashier',
            'username' => 'inactive_op',
            'password' => Hash::make('secret123'),
            'role' => UserRole::Cashier,
            'is_active' => false,
        ]);

        $response = $this->post('/login', [
            'username' => 'inactive_op',
            'password' => 'secret123',
        ]);

        $response->assertSessionHasErrors('username');
        $this->assertGuest();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.login_blocked_inactive',
        ]);
    }

    public function test_login_attempts_are_throttled_after_consecutive_failures(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', [
                'username' => 'bad_user',
                'password' => 'wrong_password',
            ]);
        }

        // 6th attempt should be blocked by route throttle middleware
        $response = $this->post('/login', [
            'username' => 'bad_user',
            'password' => 'wrong_password',
        ]);

        $response->assertStatus(429);
    }

    public function test_authenticated_user_can_logout_cleanly(): void
    {
        $user = User::create([
            'name' => 'Test User',
            'username' => 'logout_user',
            'password' => Hash::make('password'),
            'role' => UserRole::Cashier,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user)->post('/logout');

        $response->assertRedirect('/login');
        $this->assertGuest();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.logout',
            'actor_id' => $user->id,
        ]);
    }
}
