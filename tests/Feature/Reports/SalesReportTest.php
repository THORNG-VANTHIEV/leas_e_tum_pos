<?php

namespace Tests\Feature\Reports;

use App\Models\Document;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\LeashalEtumProductsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalesReportTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Product $snails;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(LeashalEtumProductsSeeder::class);
        $this->admin = User::where('username', 'admin')->firstOrFail();
        $this->snails = Product::where('sku', 'ETUM-OP-02')->firstOrFail(); // $2.50
    }

    public function test_voided_invoices_are_excluded_from_net_sales(): void
    {
        // Paid: 2 x $2.50 = $5.00
        $this->checkout(2);
        // Paid then voided: 4 x $2.50 = $10.00 must not count as sales
        $voided = $this->checkout(4);
        $this->actingAs($this->admin)->post(route('invoices.void', $voided), ['reason' => 'Wrong order']);

        $this->actingAs($this->admin)
            ->get(route('reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('metrics.net_sales', '5.00')
                ->where('metrics.void_count', 1)
                ->where('metrics.void_value', '10.00')
            );
    }

    public function test_held_tables_are_reported_as_open_orders_not_sales(): void
    {
        $this->checkout(2); // paid $5.00
        $this->actingAs($this->admin)->post(route('invoices.hold-table'), [
            'table_identifier' => 'តុ ០៥',
            'items' => [['product_id' => $this->snails->id, 'quantity' => 1]], // unpaid $2.50
        ]);

        $this->actingAs($this->admin)
            ->get(route('reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('metrics.net_sales', '5.00')
                ->where('metrics.open_orders_count', 1)
                ->where('metrics.open_orders_value', '2.50')
            );

        $this->actingAs($this->admin)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('stats.gross_revenue', '5.00'));
    }

    public function test_cashier_report_only_includes_their_own_invoices(): void
    {
        $this->checkout(2); // admin's sale, $5.00
        $cashier = User::where('username', 'cashier1')->firstOrFail();
        $this->actingAs($cashier)->post(route('invoices.checkout'), [
            'table_identifier' => 'ខ្ចប់ (Takeaway)',
            'payment_method' => 'cash',
            'items' => [['product_id' => $this->snails->id, 'quantity' => 1]],
        ]);

        $this->actingAs($cashier)
            ->get(route('reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('metrics.net_sales', '2.50'));
    }

    private function checkout(int $quantity): Document
    {
        $this->actingAs($this->admin)->post(route('invoices.checkout'), [
            'table_identifier' => 'ខ្ចប់ (Takeaway)',
            'payment_method' => 'khqr',
            'items' => [['product_id' => $this->snails->id, 'quantity' => $quantity]],
        ]);

        return Document::latest('id')->firstOrFail();
    }
}
