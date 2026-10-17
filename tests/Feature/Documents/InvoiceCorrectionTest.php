<?php

namespace Tests\Feature\Documents;

use App\Enums\PeriodStatus;
use App\Models\Customer;
use App\Models\Document;
use App\Models\DocumentRevision;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\LeashalEtumProductsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceCorrectionTest extends TestCase
{
    use RefreshDatabase;

    protected User $supervisor;

    protected User $cashier;

    protected Product $clams;

    protected Product $snails;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(LeashalEtumProductsSeeder::class);

        $this->supervisor = User::where('username', 'supervisor1')->firstOrFail();
        $this->cashier = User::where('username', 'cashier1')->firstOrFail();
        $this->clams = Product::where('sku', 'ETUM-OP-01')->firstOrFail();
        $this->snails = Product::where('sku', 'ETUM-OP-02')->firstOrFail();
    }

    public function test_supervisor_corrects_a_paid_invoice_and_keeps_its_number(): void
    {
        $invoice = $this->checkout([[$this->clams, 2]]);
        $number = $invoice->document_number;

        // The menu price changed after the sale: the dish already on the invoice keeps its sold price
        $this->clams->update(['unit_price' => '9.00']);

        $this->actingAs($this->supervisor)->put(route('invoices.update', $invoice), [
            'items' => [
                ['product_id' => $this->clams->id, 'quantity' => 1],
                ['product_id' => $this->snails->id, 'quantity' => 1],
            ],
            'payment_method' => 'khqr',
            'reason' => 'Guest returned one plate',
        ])->assertRedirect(route('invoices.show', $invoice));

        $invoice->refresh();
        $expected = number_format(1.75 + (float) $this->snails->unit_price, 2, '.', '');
        $this->assertSame($number, $invoice->document_number);
        $this->assertSame($expected, (string) $invoice->grand_total);
        $this->assertSame('khqr', $invoice->payment_method);
        $this->assertSame('1.75', (string) $invoice->items()->where('product_id', $this->clams->id)->value('unit_price'));
        $this->assertSame(1, DocumentRevision::where('document_id', $invoice->id)->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'document.edited', 'actor_id' => $this->supervisor->id]);
    }

    public function test_editing_requires_a_reason(): void
    {
        $invoice = $this->checkout([[$this->clams, 2]]);

        $this->actingAs($this->supervisor)->put(route('invoices.update', $invoice), [
            'items' => [['product_id' => $this->clams->id, 'quantity' => 1]],
            'payment_method' => 'cash',
            'reason' => '',
        ])->assertSessionHasErrors('reason');

        $this->assertSame('3.50', (string) $invoice->refresh()->grand_total);
    }

    public function test_trashed_invoice_leaves_lists_and_can_be_restored(): void
    {
        $invoice = $this->checkout([[$this->clams, 2]]);

        $this->actingAs($this->supervisor)
            ->delete(route('invoices.destroy', $invoice), ['reason' => 'Test sale by mistake'])
            ->assertRedirect(route('invoices.index'));

        $this->assertSoftDeleted($invoice);
        $this->actingAs($this->supervisor)->get(route('invoices.index'))
            ->assertInertia(fn ($page) => $page->where('documents.total', 0));
        $this->actingAs($this->supervisor)->get(route('invoices.index', ['status' => 'trash']))
            ->assertInertia(fn ($page) => $page->where('documents.data.0.id', $invoice->id));

        $this->actingAs($this->supervisor)->post(route('invoices.restore', $invoice))->assertSessionHas('success');

        $this->assertNotSoftDeleted($invoice);
        $this->assertDatabaseHas('audit_logs', ['action' => 'document.trashed']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'document.restored']);
    }

    public function test_trash_and_restore_move_customer_loyalty_with_the_invoice(): void
    {
        $customer = Customer::create(['name' => 'Sokha', 'loyalty_points' => 10, 'total_spent_usd' => '50.00', 'visits_count' => 3]);
        $invoice = $this->checkout([[$this->clams, 4]], $customer->id);

        $this->actingAs($this->supervisor)->delete(route('invoices.destroy', $invoice), ['reason' => 'Duplicate sale']);
        $this->assertSame(10, $customer->refresh()->loyalty_points);
        $this->assertSame(3, $customer->visits_count);

        $this->actingAs($this->supervisor)->post(route('invoices.restore', $invoice));
        $this->assertSame(17, $customer->refresh()->loyalty_points);
        $this->assertSame(4, $customer->visits_count);
    }

    public function test_invoice_in_a_closed_period_cannot_be_edited_or_deleted(): void
    {
        $invoice = $this->checkout([[$this->clams, 2]]);
        $invoice->period->update(['status' => PeriodStatus::Closed]);

        $this->actingAs($this->supervisor)->put(route('invoices.update', $invoice), [
            'items' => [['product_id' => $this->clams->id, 'quantity' => 1]],
            'payment_method' => 'cash',
            'reason' => 'Late correction',
        ])->assertSessionHas('error');
        $this->actingAs($this->supervisor)
            ->delete(route('invoices.destroy', $invoice), ['reason' => 'Late delete'])
            ->assertSessionHas('error');

        $this->assertSame('3.50', (string) $invoice->refresh()->grand_total);
        $this->assertNotSoftDeleted($invoice);
    }

    public function test_cashier_cannot_edit_delete_or_restore_invoices(): void
    {
        $invoice = $this->checkout([[$this->clams, 2]]);

        $this->actingAs($this->cashier)->put(route('invoices.update', $invoice), [
            'items' => [['product_id' => $this->clams->id, 'quantity' => 1]],
            'payment_method' => 'cash',
            'reason' => 'Trying',
        ])->assertForbidden();
        $this->actingAs($this->cashier)->delete(route('invoices.destroy', $invoice), ['reason' => 'Trying'])->assertForbidden();
        $this->actingAs($this->cashier)->post(route('invoices.restore', $invoice))->assertForbidden();

        $this->assertNotSoftDeleted($invoice);
        $this->assertSame('3.50', (string) $invoice->refresh()->grand_total);
    }

    /**
     * @param  array<int, array{0: Product, 1: int}>  $items
     */
    private function checkout(array $items, ?int $customerId = null): Document
    {
        $this->actingAs($this->cashier)->post(route('invoices.checkout'), [
            'table_identifier' => 'ខ្ចប់ (Takeaway)',
            'payment_method' => 'cash',
            'amount_received' => '50',
            'customer_id' => $customerId,
            'items' => array_map(fn (array $item) => ['product_id' => $item[0]->id, 'quantity' => $item[1]], $items),
        ]);

        return Document::latest('id')->firstOrFail();
    }
}
