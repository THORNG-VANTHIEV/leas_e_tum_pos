<?php

namespace Tests\Feature\Expenses;

use App\Enums\PeriodStatus;
use App\Models\AuditLog;
use App\Models\BusinessSetting;
use App\Models\Expense;
use App\Models\Period;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_supervisor_can_update_expense(): void
    {
        $expense = $this->createExpense();
        $supervisor = User::where('username', 'supervisor1')->firstOrFail();

        $response = $this->actingAs($supervisor)
            ->patch(route('expenses.update', $expense), [
                ...$this->validPayload(),
                'title' => 'Ice delivery (corrected)',
                'amount_usd' => '12.50',
                'amount_khr' => 51250,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $expense->refresh();
        $this->assertSame('Ice delivery (corrected)', $expense->title);
        $this->assertSame('12.50', $expense->amount_usd);
        $this->assertSame(51250, $expense->amount_khr);
        $this->assertTrue(AuditLog::where('action', 'expense.updated')->where('auditable_id', $expense->id)->exists());
    }

    public function test_admin_can_delete_expense_with_audit_snapshot(): void
    {
        $expense = $this->createExpense();
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($admin)
            ->delete(route('expenses.destroy', $expense))
            ->assertRedirect();

        $this->assertDatabaseMissing('expenses', ['id' => $expense->id]);

        $log = AuditLog::where('action', 'expense.deleted')->where('auditable_id', $expense->id)->firstOrFail();
        $this->assertSame('Ice delivery', $log->old_values['title']);
    }

    public function test_cashier_cannot_update_or_delete_expense(): void
    {
        $expense = $this->createExpense();
        $cashier = User::where('username', 'cashier1')->firstOrFail();

        $this->actingAs($cashier)
            ->patch(route('expenses.update', $expense), $this->validPayload())
            ->assertForbidden();

        $this->actingAs($cashier)
            ->delete(route('expenses.destroy', $expense))
            ->assertForbidden();

        $this->assertDatabaseHas('expenses', ['id' => $expense->id, 'title' => 'Ice delivery']);
    }

    public function test_update_requires_title(): void
    {
        $expense = $this->createExpense();
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($admin)
            ->patch(route('expenses.update', $expense), [...$this->validPayload(), 'title' => ''])
            ->assertSessionHasErrors(['title' => 'The title field is required.']);
    }

    public function test_expense_in_closed_period_cannot_be_changed(): void
    {
        $expense = $this->createExpense();
        $expense->period->update(['status' => PeriodStatus::Closed]);
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($admin)
            ->patch(route('expenses.update', $expense), [...$this->validPayload(), 'title' => 'Changed'])
            ->assertSessionHas('error');

        $this->actingAs($admin)
            ->delete(route('expenses.destroy', $expense))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('expenses', ['id' => $expense->id, 'title' => 'Ice delivery']);
    }

    public function test_new_expense_converts_to_riel_with_the_rate_from_settings(): void
    {
        $settings = BusinessSetting::current();
        $settings->update(['print_settings' => [...($settings->print_settings ?? []), 'exchange_rate_khr' => 4000]]);
        $cashier = User::where('username', 'cashier1')->firstOrFail();

        $this->actingAs($cashier)->post(route('expenses.store'), $this->validPayload());

        $this->assertSame(40000, Expense::latest('id')->firstOrFail()->amount_khr);
    }

    private function createExpense(): Expense
    {
        $admin = User::where('username', 'admin')->firstOrFail();
        $period = Period::resolveActive(1, $admin->id);

        return Expense::create([
            ...$this->validPayload(),
            'amount_khr' => 41000,
            'period_id' => $period->id,
            'created_by' => $admin->id,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validPayload(): array
    {
        return [
            'category' => 'utilities',
            'title' => 'Ice delivery',
            'amount_usd' => '10.00',
            'payment_method' => 'cash_drawer',
            'expense_date' => '2026-10-16',
        ];
    }
}
