<?php

namespace Tests\Feature\Documents;

use App\Enums\DocumentStatus;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Document;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\LeashalEtumProductsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceVoidTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(LeashalEtumProductsSeeder::class);
    }

    public function test_supervisor_can_void_finalized_invoice_and_keep_its_number(): void
    {
        $invoice = $this->checkoutInvoice();
        $supervisor = User::where('username', 'supervisor1')->firstOrFail();

        $response = $this->actingAs($supervisor)
            ->post(route('invoices.void', $invoice), ['reason' => 'Charged the wrong table']);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $invoice->refresh();
        $this->assertSame(DocumentStatus::Void, $invoice->status);
        $this->assertNotNull($invoice->document_number);
        $this->assertStringContainsString('[VOIDED: Charged the wrong table]', $invoice->note);
        $this->assertTrue(AuditLog::where('action', 'document.voided')->where('auditable_id', $invoice->id)->exists());
    }

    public function test_cashier_cannot_void_invoice(): void
    {
        $invoice = $this->checkoutInvoice();
        $cashier = User::where('username', 'cashier1')->firstOrFail();

        $this->actingAs($cashier)
            ->post(route('invoices.void', $invoice), ['reason' => 'Charged the wrong table'])
            ->assertForbidden();

        $this->assertSame(DocumentStatus::Finalized, $invoice->refresh()->status);
    }

    public function test_void_requires_a_reason(): void
    {
        $invoice = $this->checkoutInvoice();
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($admin)
            ->post(route('invoices.void', $invoice), ['reason' => ''])
            ->assertSessionHasErrors(['reason' => 'The reason field is required.']);

        $this->assertSame(DocumentStatus::Finalized, $invoice->refresh()->status);
    }

    public function test_voided_invoice_cannot_be_voided_twice(): void
    {
        $invoice = $this->checkoutInvoice();
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($admin)->post(route('invoices.void', $invoice), ['reason' => 'First void']);

        $this->actingAs($admin)
            ->post(route('invoices.void', $invoice), ['reason' => 'Second void'])
            ->assertSessionHas('error', 'Document is already voided.');
    }

    public function test_voiding_invoice_reverses_customer_loyalty(): void
    {
        $customer = Customer::create([
            'name' => 'Sokha',
            'loyalty_points' => 10,
            'total_spent_usd' => '50.00',
            'visits_count' => 3,
        ]);

        // ETUM-OP-01 costs $1.75 x 4 = $7.00 -> 7 points earned at checkout
        $invoice = $this->checkoutInvoice(['customer_id' => $customer->id, 'quantity' => 4]);
        $customer->refresh();
        $this->assertSame(17, $customer->loyalty_points);
        $this->assertSame(4, $customer->visits_count);

        $admin = User::where('username', 'admin')->firstOrFail();
        $this->actingAs($admin)->post(route('invoices.void', $invoice), ['reason' => 'Customer cancelled']);

        $customer->refresh();
        $this->assertSame(10, $customer->loyalty_points);
        $this->assertSame(3, $customer->visits_count);
        $this->assertSame('50.00', (string) $customer->total_spent_usd);
    }

    public function test_paid_invoice_cannot_be_checked_out_again(): void
    {
        $invoice = $this->checkoutInvoice(['quantity' => 2]);
        $originalNumber = $invoice->document_number;
        $originalTotal = $invoice->grand_total;
        $cashier = User::where('username', 'cashier1')->firstOrFail();

        $this->actingAs($cashier)->post(route('invoices.checkout'), [
            'document_id' => $invoice->id,
            'payment_method' => 'cash',
            'items' => [['product_id' => Product::where('sku', 'ETUM-OP-01')->firstOrFail()->id, 'quantity' => 1]],
        ])->assertSessionHas('error');

        $invoice->refresh();
        $this->assertSame($originalNumber, $invoice->document_number);
        $this->assertSame($originalTotal, $invoice->grand_total);
    }

    public function test_voided_invoice_cannot_be_revived_by_checkout(): void
    {
        $invoice = $this->checkoutInvoice();
        $admin = User::where('username', 'admin')->firstOrFail();
        $this->actingAs($admin)->post(route('invoices.void', $invoice), ['reason' => 'Wrong order']);

        $this->actingAs($admin)->post(route('invoices.checkout'), [
            'document_id' => $invoice->id,
            'payment_method' => 'cash',
            'items' => [['product_id' => Product::where('sku', 'ETUM-OP-01')->firstOrFail()->id, 'quantity' => 1]],
        ])->assertSessionHas('error');

        $this->assertSame(DocumentStatus::Void, $invoice->refresh()->status);
    }

    public function test_checkout_rejects_non_numeric_money_input(): void
    {
        $cashier = User::where('username', 'cashier1')->firstOrFail();

        $this->actingAs($cashier)->post(route('invoices.checkout'), [
            'payment_method' => 'cash',
            'amount_received' => 'abc',
            'discount_amount' => '1e3',
            'items' => [['product_id' => Product::where('sku', 'ETUM-OP-01')->firstOrFail()->id, 'quantity' => 1]],
        ])->assertSessionHasErrors(['amount_received', 'discount_amount']);
    }

    /**
     * @param  array{customer_id?: int, quantity?: int}  $options
     */
    private function checkoutInvoice(array $options = []): Document
    {
        $cashier = User::where('username', 'cashier1')->firstOrFail();
        $product = Product::where('sku', 'ETUM-OP-01')->firstOrFail();

        $this->actingAs($cashier)->post(route('invoices.checkout'), [
            'table_identifier' => 'ខ្ចប់ (Takeaway)',
            'payment_method' => 'khqr',
            'customer_id' => $options['customer_id'] ?? null,
            'items' => [
                ['product_id' => $product->id, 'quantity' => $options['quantity'] ?? 1],
            ],
        ]);

        return Document::latest('id')->firstOrFail();
    }
}
