<?php

namespace Tests\Feature\Documents;

use App\Enums\UserRole;
use App\Models\Document;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\LeashalEtumProductsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceAccessTest extends TestCase
{
    use RefreshDatabase;

    protected User $cashier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(LeashalEtumProductsSeeder::class);
        $this->cashier = User::where('username', 'cashier1')->firstOrFail();
    }

    public function test_cashier_cannot_open_print_previews_of_another_cashiers_invoice(): void
    {
        $invoice = $this->checkoutAs($this->cashier);
        $otherCashier = User::factory()->create(['role' => UserRole::Cashier, 'is_active' => true]);

        $this->actingAs($otherCashier)->get(route('invoices.preview.thermal', $invoice))->assertForbidden();
        $this->actingAs($otherCashier)->get(route('invoices.preview.a5', $invoice))->assertForbidden();
        $this->actingAs($otherCashier)->get(route('invoices.show', $invoice))->assertForbidden();
    }

    public function test_supervisor_can_open_any_invoice_to_void_it(): void
    {
        $invoice = $this->checkoutAs($this->cashier);
        $supervisor = User::where('username', 'supervisor1')->firstOrFail();

        $this->actingAs($supervisor)->get(route('invoices.show', $invoice))->assertOk();
        $this->actingAs($supervisor)->get(route('invoices.preview.thermal', $invoice))->assertOk();
    }

    public function test_cashier_who_settled_a_table_held_by_someone_else_can_print_its_receipt(): void
    {
        $product = Product::where('sku', 'ETUM-OP-01')->firstOrFail();
        $this->actingAs($this->cashier)->post(route('invoices.hold-table'), [
            'table_identifier' => 'តុ ០៣',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ]);
        $draft = Document::latest('id')->firstOrFail();

        $settlingCashier = User::factory()->create(['role' => UserRole::Cashier, 'is_active' => true]);
        $this->actingAs($settlingCashier)->post(route('invoices.checkout'), [
            'document_id' => $draft->id,
            'table_identifier' => 'តុ ០៣',
            'payment_method' => 'cash',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ]);

        $this->actingAs($settlingCashier)->get(route('invoices.preview.thermal', $draft))->assertOk();
    }

    private function checkoutAs(User $user): Document
    {
        $product = Product::where('sku', 'ETUM-OP-01')->firstOrFail();

        $this->actingAs($user)->post(route('invoices.checkout'), [
            'table_identifier' => 'ខ្ចប់ (Takeaway)',
            'payment_method' => 'khqr',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ]);

        return Document::latest('id')->firstOrFail();
    }
}
