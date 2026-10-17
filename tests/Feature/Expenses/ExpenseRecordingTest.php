<?php

namespace Tests\Feature\Expenses;

use App\Enums\UserRole;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseRecordingTest extends TestCase
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
}
