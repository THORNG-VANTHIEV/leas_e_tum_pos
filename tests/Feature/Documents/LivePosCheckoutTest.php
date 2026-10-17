<?php

namespace Tests\Feature\Documents;

use App\Enums\DocumentStatus;
use App\Enums\PeriodStatus;
use App\Models\Document;
use App\Models\Period;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\LeashalEtumProductsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LivePosCheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected User $cashier;

    protected Product $clams;

    protected Product $balut;

    protected Product $drinks;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(LeashalEtumProductsSeeder::class);

        $this->cashier = User::where('username', 'cashier1')->first() ?? User::factory()->create([
            'role' => 'cashier',
            'is_active' => true,
        ]);

        $this->clams = Product::where('sku', 'ETUM-OP-01')->firstOrFail();
        $this->balut = Product::where('sku', 'ETUM-OP-02')->firstOrFail();
        $this->drinks = Product::where('sku', 'ETUM-OP-05')->firstOrFail();
    }

    public function test_pos_terminal_screen_loads_without_requiring_manual_period_activation(): void
    {
        // Make sure no periods are active
        Period::query()->update(['status' => PeriodStatus::Closed]);

        $response = $this->actingAs($this->cashier)->get(route('invoices.create'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('documents/create')
            ->has('categories')
            ->has('products')
            ->has('active_tables')
            ->has('tables_list')
            ->where('exchange_rate', 4000) // Settings default (1$ = 4,000៛)
        );

        // Active period should have been auto-provisioned
        $this->assertDatabaseHas('periods', [
            'status' => PeriodStatus::Active->value,
        ]);
    }

    public function test_instant_pos_takeaway_checkout_generates_finalized_invoice_immediately(): void
    {
        $payload = [
            'table_identifier' => 'ខ្ចប់ (Takeaway)',
            'payment_method' => 'cash',
            'amount_received' => '10.00',
            'discount_amount' => '0.00',
            'items' => [
                ['product_id' => $this->clams->id, 'quantity' => 2], // 2 * $1.75 = $3.50
                ['product_id' => $this->drinks->id, 'quantity' => 2], // 2 * $1.25 = $2.50
            ],
        ];

        $response = $this->actingAs($this->cashier)
            ->post(route('invoices.checkout'), $payload);

        $document = Document::latest('id')->first();
        $this->assertNotNull($document);
        $this->assertSame(DocumentStatus::Finalized, $document->status);
        $this->assertNotNull($document->document_number);
        $this->assertSame('6.00', $document->grand_total);
        $this->assertSame('10.00', $document->amount_received);
        $this->assertSame('4.00', $document->change_amount);
        $this->assertSame('ខ្ចប់ (Takeaway)', $document->reference_identifier);
        $this->assertCount(2, $document->items);

        $response->assertRedirect(route('invoices.show', $document->id));
    }

    public function test_instant_pos_khqr_checkout(): void
    {
        $payload = [
            'table_identifier' => 'ខ្ចប់ (Takeaway)',
            'payment_method' => 'khqr',
            'discount_amount' => '0.50',
            'items' => [
                ['product_id' => $this->balut->id, 'quantity' => 2], // 2 * $2.50 = $5.00 - $0.50 = $4.50
            ],
        ];

        $response = $this->actingAs($this->cashier)
            ->post(route('invoices.checkout'), $payload);

        $document = Document::latest('id')->first();
        $this->assertNotNull($document);
        $this->assertSame(DocumentStatus::Finalized, $document->status);
        $this->assertSame('4.50', $document->grand_total);
        $this->assertSame('4.50', $document->amount_received);
        $this->assertSame('0.00', $document->change_amount);
        $this->assertSame('khqr', $document->payment_method);
    }

    public function test_hold_table_order_and_subsequent_checkout(): void
    {
        // 1. Waiter holds Dine-in order for Table 03
        $holdPayload = [
            'table_identifier' => 'តុ ០៣',
            'items' => [
                ['product_id' => $this->clams->id, 'quantity' => 1], // $1.75
            ],
        ];

        $response = $this->actingAs($this->cashier)
            ->post(route('invoices.hold-table'), $holdPayload);

        $response->assertRedirect();

        $draft = Document::where('reference_identifier', 'តុ ០៣')
            ->where('status', DocumentStatus::Draft)
            ->first();

        $this->assertNotNull($draft);
        $this->assertSame('1.75', $draft->grand_total);

        // 2. Later, customer orders 2 more items and settles table
        $checkoutPayload = [
            'document_id' => $draft->id,
            'table_identifier' => 'តុ ០៣',
            'payment_method' => 'cash',
            'amount_received' => '5.00',
            'items' => [
                ['product_id' => $this->clams->id, 'quantity' => 1], // $1.75
                ['product_id' => $this->drinks->id, 'quantity' => 2], // 2 * $1.25 = $2.50 -> Total $4.25
            ],
        ];

        $this->actingAs($this->cashier)
            ->post(route('invoices.checkout'), $checkoutPayload);

        $settled = Document::find($draft->id);
        $this->assertSame(DocumentStatus::Finalized, $settled->status);
        $this->assertSame('4.25', $settled->grand_total);
        $this->assertSame('0.75', $settled->change_amount);
    }

    public function test_cancel_table_order(): void
    {
        $holdPayload = [
            'table_identifier' => 'តុ ០៥',
            'items' => [
                ['product_id' => $this->balut->id, 'quantity' => 1],
            ],
        ];

        $this->actingAs($this->cashier)
            ->post(route('invoices.hold-table'), $holdPayload);

        $draft = Document::where('reference_identifier', 'តុ ០៥')->firstOrFail();

        $response = $this->actingAs($this->cashier)
            ->delete(route('invoices.cancel-table', $draft->id));

        $response->assertRedirect();
        $this->assertDatabaseMissing('documents', ['id' => $draft->id]);
    }
}
