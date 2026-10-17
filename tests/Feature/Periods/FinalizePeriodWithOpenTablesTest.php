<?php

namespace Tests\Feature\Periods;

use App\Enums\DocumentStatus;
use App\Enums\PeriodStatus;
use App\Models\Document;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\LeashalEtumProductsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinalizePeriodWithOpenTablesTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $cashier;

    protected Product $snails;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(LeashalEtumProductsSeeder::class);
        $this->admin = User::where('username', 'admin')->firstOrFail();
        $this->cashier = User::where('username', 'cashier1')->firstOrFail();
        $this->snails = Product::where('sku', 'ETUM-OP-02')->firstOrFail(); // $2.50
    }

    public function test_period_with_unpaid_held_table_cannot_be_closed_and_names_the_table(): void
    {
        $held = $this->holdTable('តុ ០៤', 2);

        $this->actingAs($this->admin)
            ->post(route('settings.periods.finalize', $held->period))
            ->assertSessionHas('error', 'មិនអាចបិទវគ្គបានទេ៖ មានការកម្មង់មិនទាន់គិតប្រាក់ — តុ ០៤ ($5.00)។ សូមគិតប្រាក់ ឬលុបចោលនៅ POS មុនសិន។');

        $this->assertSame(PeriodStatus::Active, $held->period->refresh()->status);
        $this->assertSame(DocumentStatus::Draft, $held->refresh()->status);
    }

    public function test_period_closes_once_the_held_table_is_paid(): void
    {
        $held = $this->holdTable('តុ ០៤', 2);
        $this->actingAs($this->cashier)->post(route('invoices.checkout'), [
            'document_id' => $held->id,
            'table_identifier' => 'តុ ០៤',
            'payment_method' => 'cash',
            'amount_received' => '5.00',
            'items' => [['product_id' => $this->snails->id, 'quantity' => 2]],
        ]);

        $this->actingAs($this->admin)
            ->post(route('settings.periods.finalize', $held->period))
            ->assertSessionMissing('error');

        $this->assertSame(PeriodStatus::Closed, $held->period->refresh()->status);
    }

    private function holdTable(string $table, int $quantity): Document
    {
        $this->actingAs($this->cashier)->post(route('invoices.hold-table'), [
            'table_identifier' => $table,
            'items' => [['product_id' => $this->snails->id, 'quantity' => $quantity]],
        ]);

        return Document::where('status', DocumentStatus::Draft)->latest('id')->firstOrFail();
    }
}
