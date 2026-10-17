<?php

namespace Tests\Feature\Users;

use App\Enums\UserRole;
use App\Models\Document;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\LeashalEtumProductsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DataVisibilityTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $cashierA;

    protected User $cashierB;

    protected Product $snails;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(LeashalEtumProductsSeeder::class);
        $this->admin = User::where('username', 'admin')->firstOrFail();
        $this->cashierA = User::where('username', 'cashier1')->firstOrFail();
        $this->cashierB = User::factory()->create(['role' => UserRole::Cashier, 'is_active' => true]);
        $this->snails = Product::where('sku', 'ETUM-OP-02')->firstOrFail(); // $2.50

        // Start from a clean slate so totals are exact
        Document::query()->delete();
        $this->sell($this->cashierA, 2); // A: $5.00
        $this->sell($this->cashierB, 4); // B: $10.00
    }

    public function test_cashier_sees_only_own_invoices_and_totals(): void
    {
        $this->actingAs($this->cashierA)->get(route('invoices.index'))
            ->assertInertia(fn ($page) => $page->where('documents.total', 1)->where('cashiers', []));

        $this->actingAs($this->cashierA)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('stats.gross_revenue', '5.00'));

        $this->actingAs($this->cashierA)->get(route('reports.index'))
            ->assertInertia(fn ($page) => $page->where('metrics.net_sales', '5.00'));
    }

    public function test_cashier_cannot_use_the_staff_filter_to_see_someone_else(): void
    {
        $this->actingAs($this->cashierA)->get(route('dashboard', ['cashier_id' => $this->cashierB->id]))
            ->assertInertia(fn ($page) => $page->where('stats.gross_revenue', '5.00'));

        $this->actingAs($this->cashierA)->get(route('invoices.index', ['cashier_id' => $this->cashierB->id]))
            ->assertInertia(fn ($page) => $page->where('documents.total', 1));
    }

    public function test_admin_sees_everyone_and_can_filter_by_cashier(): void
    {
        $this->actingAs($this->admin)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('stats.gross_revenue', '15.00')
                ->where('cashiers', fn ($cashiers) => collect($cashiers)->pluck('id')->contains($this->cashierB->id)));

        $this->actingAs($this->admin)->get(route('dashboard', ['cashier_id' => $this->cashierB->id]))
            ->assertInertia(fn ($page) => $page->where('stats.gross_revenue', '10.00'));

        $this->actingAs($this->admin)->get(route('invoices.index', ['cashier_id' => $this->cashierA->id]))
            ->assertInertia(fn ($page) => $page->where('documents.total', 1));

        $this->actingAs($this->admin)->get(route('reports.index', ['cashier_id' => $this->cashierB->id]))
            ->assertInertia(fn ($page) => $page->where('metrics.net_sales', '10.00'));
    }

    public function test_table_held_by_one_cashier_and_paid_by_another_counts_for_the_one_who_took_payment(): void
    {
        $this->actingAs($this->cashierA)->post(route('invoices.hold-table'), [
            'table_identifier' => 'តុ ០៦',
            'items' => [['product_id' => $this->snails->id, 'quantity' => 1]],
        ]);
        $draft = Document::where('status', 'draft')->latest('id')->firstOrFail();
        $this->actingAs($this->cashierB)->post(route('invoices.checkout'), [
            'document_id' => $draft->id,
            'table_identifier' => 'តុ ០៦',
            'payment_method' => 'khqr',
            'items' => [['product_id' => $this->snails->id, 'quantity' => 1]],
        ]);

        $this->actingAs($this->cashierB)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('stats.gross_revenue', '12.50'));
        $this->actingAs($this->cashierA)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('stats.gross_revenue', '5.00'));
    }

    public function test_expenses_purchases_and_range_printing_are_scoped_to_the_cashier(): void
    {
        $this->actingAs($this->cashierA)->post(route('expenses.store'), ['category' => 'utilities', 'title' => 'A ice', 'amount_usd' => '3', 'payment_method' => 'cash_drawer', 'expense_date' => now()->toDateString()]);
        $this->actingAs($this->cashierB)->post(route('expenses.store'), ['category' => 'utilities', 'title' => 'B ice', 'amount_usd' => '7', 'payment_method' => 'cash_drawer', 'expense_date' => now()->toDateString()]);
        $this->actingAs($this->cashierB)->post(route('purchases.store'), ['purchase_date' => now()->toDateString(), 'status' => 'received', 'items' => [['item_name' => 'Cola', 'quantity' => 1, 'unit_cost' => 9]]]);

        $this->actingAs($this->cashierA)->get(route('expenses.index'))
            ->assertInertia(fn ($page) => $page->where('expenses.total', 1)->where('metrics.total_usd', 3));

        $this->actingAs($this->cashierA)->get(route('purchases.index'))
            ->assertInertia(fn ($page) => $page->where('purchases.total', 0));

        $this->actingAs($this->cashierA)->get(route('invoices.print-range.preview'))
            ->assertInertia(fn ($page) => $page->where('documents', fn ($documents) => collect($documents)->count() === 1));
    }

    private function sell(User $cashier, int $quantity): void
    {
        $this->actingAs($cashier)->post(route('invoices.checkout'), [
            'table_identifier' => 'ខ្ចប់ (Takeaway)',
            'payment_method' => 'khqr',
            'items' => [['product_id' => $this->snails->id, 'quantity' => $quantity]],
        ]);
    }
}
