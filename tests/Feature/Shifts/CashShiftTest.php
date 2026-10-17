<?php

namespace Tests\Feature\Shifts;

use App\Enums\UserRole;
use App\Models\BusinessSetting;
use App\Models\CashShift;
use App\Models\Document;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\LeashalEtumProductsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashShiftTest extends TestCase
{
    use RefreshDatabase;

    protected User $cashier;

    protected User $otherCashier;

    protected Product $snails;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(LeashalEtumProductsSeeder::class);
        $settings = BusinessSetting::current();
        $settings->update(['print_settings' => [...($settings->print_settings ?? []), 'exchange_rate_khr' => 4000]]);

        $this->cashier = User::where('username', 'cashier1')->firstOrFail();
        $this->otherCashier = User::factory()->create(['role' => UserRole::Cashier, 'is_active' => true]);
        $this->snails = Product::where('sku', 'ETUM-OP-02')->firstOrFail(); // $2.50
    }

    public function test_closing_a_shift_compares_counted_cash_with_what_should_be_in_the_drawer(): void
    {
        $this->actingAs($this->cashier)->post(route('shifts.open'), ['opening_float_usd' => '20.00'])->assertSessionHas('success');
        $this->createDrawerActivity();

        // Expected: 20 float + 5 cash sale + 5 cash in - 3 drop - 2 drawer expense = 25.00
        // Counted: $24 + 4,000៛ ($1.00) = 25.00
        $this->actingAs($this->cashier)
            ->post(route('shifts.close'), ['counted_usd' => '24.00', 'counted_khr' => 4000, 'note' => 'OK'])
            ->assertSessionHas('success', 'បានបិទវេន៖ លុយគួរមាន $25.00, រាប់បាន $25.00 — ត្រូវគ្នា');

        $shift = CashShift::firstOrFail();
        $this->assertNotNull($shift->closed_at);
        $this->assertSame('5.00', $shift->cash_sales_usd);
        $this->assertSame('25.00', $shift->expected_cash_usd);
        $this->assertSame('0.00', $shift->variance_usd);
    }

    public function test_short_drawer_is_reported_as_negative_variance(): void
    {
        $this->actingAs($this->cashier)->post(route('shifts.open'), ['opening_float_usd' => '20.00']);
        $this->createDrawerActivity();

        $this->actingAs($this->cashier)
            ->post(route('shifts.close'), ['counted_usd' => '24.00'])
            ->assertSessionHas('success', 'បានបិទវេន៖ លុយគួរមាន $25.00, រាប់បាន $24.00 — ខ្វះ $1.00');

        $this->assertSame('-1.00', CashShift::firstOrFail()->variance_usd);
    }

    public function test_cashier_cannot_open_two_shifts_or_close_without_one(): void
    {
        $this->actingAs($this->cashier)->post(route('shifts.close'), ['counted_usd' => '1'])->assertSessionHas('error', 'មិនមានវេនកំពុងបើកទេ។');

        $this->actingAs($this->cashier)->post(route('shifts.open'), ['opening_float_usd' => '10']);
        $this->actingAs($this->cashier)->post(route('shifts.open'), ['opening_float_usd' => '10'])->assertSessionHas('error', 'អ្នកមានវេនកំពុងបើករួចហើយ។');

        $this->assertSame(1, CashShift::count());
    }

    public function test_shift_history_is_private_to_the_cashier_and_visible_to_managers(): void
    {
        foreach ([$this->cashier, $this->otherCashier] as $user) {
            $this->actingAs($user)->post(route('shifts.open'), ['opening_float_usd' => '10']);
            $this->actingAs($user)->post(route('shifts.close'), ['counted_usd' => '10']);
        }
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($this->cashier)->get(route('shifts.index'))
            ->assertInertia(fn ($page) => $page->component('shifts/index')->where('history.total', 1)->where('cashiers', []));

        $this->actingAs($admin)->get(route('shifts.index'))
            ->assertInertia(fn ($page) => $page->where('history.total', 2));

        $this->actingAs($admin)->get(route('shifts.index', ['cashier_id' => $this->otherCashier->id]))
            ->assertInertia(fn ($page) => $page->where('history.total', 1));
    }

    /**
     * Mix of movements: only this cashier's cash ones may count towards the drawer.
     */
    private function createDrawerActivity(): void
    {
        $item = [['product_id' => $this->snails->id, 'quantity' => 2]]; // $5.00

        // Counts: cash sale $5.00 paid with $10, $5 change given
        $this->actingAs($this->cashier)->post(route('invoices.checkout'), ['table_identifier' => 'ខ្ចប់', 'payment_method' => 'cash', 'amount_received' => '10.00', 'items' => $item]);
        // Not drawer cash: KHQR, delivery app, a voided cash sale and another cashier's sale
        $this->actingAs($this->cashier)->post(route('invoices.checkout'), ['table_identifier' => 'ខ្ចប់', 'payment_method' => 'khqr', 'items' => $item]);
        $this->actingAs($this->cashier)->post(route('invoices.checkout'), ['table_identifier' => 'ខ្ចប់', 'order_source' => 'grab', 'payment_method' => 'app', 'items' => $item]);
        $this->actingAs($this->cashier)->post(route('invoices.checkout'), ['table_identifier' => 'ខ្ចប់', 'payment_method' => 'cash', 'items' => $item]);
        $voided = Document::latest('id')->firstOrFail();
        $this->actingAs(User::where('username', 'admin')->firstOrFail())->post(route('invoices.void', $voided), ['reason' => 'Mistake']);
        $this->actingAs($this->otherCashier)->post(route('invoices.checkout'), ['table_identifier' => 'ខ្ចប់', 'payment_method' => 'cash', 'items' => $item]);

        // Drawer movements and expenses
        $this->actingAs($this->cashier)->post(route('expenses.drawer-log'), ['type' => 'cash_in', 'amount_usd' => '5', 'reason' => 'Change top-up']);
        $this->actingAs($this->cashier)->post(route('expenses.drawer-log'), ['type' => 'cash_drop', 'amount_usd' => '3', 'reason' => 'Safe drop']);
        $this->actingAs($this->cashier)->post(route('expenses.store'), ['category' => 'supplies', 'title' => 'Ice', 'amount_usd' => '2', 'payment_method' => 'cash_drawer', 'expense_date' => now()->toDateString()]);
        $this->actingAs($this->cashier)->post(route('expenses.store'), ['category' => 'supplies', 'title' => 'Gas', 'amount_usd' => '4', 'payment_method' => 'petty_cash', 'expense_date' => now()->toDateString()]);
    }
}
