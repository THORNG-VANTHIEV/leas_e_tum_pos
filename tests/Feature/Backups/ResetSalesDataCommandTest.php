<?php

namespace Tests\Feature\Backups;

use App\Models\Customer;
use App\Models\Document;
use App\Models\Expense;
use App\Models\KitchenTicket;
use App\Models\Product;
use App\Models\RestaurantTable;
use App\Models\User;
use Database\Seeders\LeashalEtumProductsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ResetSalesDataCommandTest extends TestCase
{
    use RefreshDatabase;

    private string $storagePath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(LeashalEtumProductsSeeder::class);
        $this->storagePath = sys_get_temp_dir().'/pos-reset-test-'.uniqid();
        $this->app->useStoragePath($this->storagePath);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->storagePath);

        parent::tearDown();
    }

    public function test_reset_clears_sales_but_keeps_menu_tables_customers_and_staff(): void
    {
        $this->createTestSales();
        $productCount = Product::count();
        $tableCount = RestaurantTable::count();
        $customerCount = Customer::count();
        $userCount = User::count();

        $this->artisan('pos:reset-sales', ['--force' => true])->assertSuccessful();

        $this->assertSame(0, Document::count());
        $this->assertSame(0, KitchenTicket::count());
        $this->assertSame(0, Expense::count());
        $this->assertSame($productCount, Product::count());
        $this->assertSame($tableCount, RestaurantTable::count());
        $this->assertSame($customerCount, Customer::count());
        $this->assertSame($userCount, User::count());
        $this->assertSame(0, (int) Customer::sum('loyalty_points'));
        $this->assertSame(0, RestaurantTable::where('status', '!=', 'available')->count());
        $this->assertCount(1, File::glob($this->storagePath.'/app/backups/pre-reset/*.zip'));
    }

    public function test_reset_does_nothing_when_not_confirmed(): void
    {
        $this->createTestSales();
        $documents = Document::count();

        $this->artisan('pos:reset-sales')
            ->expectsConfirmation('Delete all of these sales/test records? (a backup is written first)', 'no')
            ->assertFailed();

        $this->assertSame($documents, Document::count());
    }

    private function createTestSales(): void
    {
        $cashier = User::where('username', 'cashier1')->firstOrFail();
        $product = Product::where('sku', 'ETUM-OP-01')->firstOrFail();
        $customer = Customer::create(['name' => 'Test', 'loyalty_points' => 0]);

        $this->actingAs($cashier)->post(route('invoices.hold-table'), ['table_identifier' => 'តុ ០១', 'items' => [['product_id' => $product->id, 'quantity' => 1]]]);
        $this->actingAs($cashier)->post(route('invoices.checkout'), ['table_identifier' => 'ខ្ចប់', 'payment_method' => 'cash', 'customer_id' => $customer->id, 'items' => [['product_id' => $product->id, 'quantity' => 4]]]);
        $this->actingAs($cashier)->post(route('expenses.store'), ['category' => 'utilities', 'title' => 'Ice', 'amount_usd' => '2', 'payment_method' => 'cash_drawer', 'expense_date' => now()->toDateString()]);
    }
}
