<?php

namespace Tests\Feature\Documents;

use App\Enums\OrderSource;
use App\Models\Document;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\LeashalEtumProductsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderSourceCheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected User $cashier;

    protected Product $steamedClams;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(LeashalEtumProductsSeeder::class);

        $this->cashier = User::where('username', 'cashier1')->first() ?? User::factory()->create([
            'role' => 'cashier',
            'is_active' => true,
        ]);

        $this->steamedClams = Product::where('sku', 'ETUM-OP-01')->firstOrFail();
    }

    public function test_delivery_app_checkout_records_order_source_and_app_order_number(): void
    {
        $response = $this->actingAs($this->cashier)
            ->post(route('invoices.checkout'), $this->checkoutPayload([
                'order_source' => 'foodpanda',
                'external_order_ref' => '  f7k2-x9pq  ',
            ]));

        $document = Document::latest('id')->firstOrFail();
        $response->assertRedirect(route('invoices.show', $document->id));
        $this->assertSame(OrderSource::Foodpanda, $document->order_source);
        $this->assertSame('f7k2-x9pq', $document->external_order_ref);
    }

    public function test_walk_in_checkout_discards_app_order_number(): void
    {
        $this->actingAs($this->cashier)
            ->post(route('invoices.checkout'), $this->checkoutPayload([
                'order_source' => 'walk_in',
                'external_order_ref' => 'GF-1001',
            ]));

        $document = Document::latest('id')->firstOrFail();
        $this->assertSame(OrderSource::WalkIn, $document->order_source);
        $this->assertNull($document->external_order_ref);
    }

    public function test_checkout_without_order_source_defaults_to_walk_in(): void
    {
        $this->actingAs($this->cashier)
            ->post(route('invoices.checkout'), $this->checkoutPayload());

        $this->assertSame(OrderSource::WalkIn, Document::latest('id')->firstOrFail()->order_source);
    }

    public function test_checkout_rejects_unknown_order_source(): void
    {
        $documentCountBefore = Document::count();

        $response = $this->actingAs($this->cashier)
            ->post(route('invoices.checkout'), $this->checkoutPayload([
                'order_source' => 'ubereats',
            ]));

        $response->assertSessionHasErrors(['order_source' => 'The selected order source is invalid.']);
        $this->assertSame($documentCountBefore, Document::count());
    }

    public function test_checkout_rejects_app_order_number_longer_than_40_characters(): void
    {
        $response = $this->actingAs($this->cashier)
            ->post(route('invoices.checkout'), $this->checkoutPayload([
                'order_source' => 'grab',
                'external_order_ref' => str_repeat('A', 41),
            ]));

        $response->assertSessionHasErrors(['external_order_ref' => 'The external order ref field must not be greater than 40 characters.']);
    }

    public function test_thermal_receipt_receives_order_source_and_app_order_number(): void
    {
        $this->actingAs($this->cashier)
            ->post(route('invoices.checkout'), $this->checkoutPayload([
                'order_source' => 'grab',
                'external_order_ref' => 'GF-1001',
            ]));

        $document = Document::latest('id')->firstOrFail();

        $this->actingAs($this->cashier)
            ->get(route('invoices.preview.thermal', $document->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('documents/preview-80mm')
                ->where('document.order_source', 'grab')
                ->where('document.external_order_ref', 'GF-1001')
            );
    }

    public function test_delivery_order_can_be_paid_via_the_app(): void
    {
        $this->actingAs($this->cashier)
            ->post(route('invoices.checkout'), $this->checkoutPayload([
                'order_source' => 'grab',
                'payment_method' => 'app',
            ]))
            ->assertSessionHasNoErrors();

        $document = Document::latest('id')->firstOrFail();
        $this->assertSame('app', $document->payment_method);
        $this->assertSame($document->grand_total, $document->amount_received);
        $this->assertSame('0.00', $document->change_amount);
    }

    public function test_walk_in_order_cannot_be_marked_paid_via_app(): void
    {
        $this->actingAs($this->cashier)
            ->post(route('invoices.checkout'), $this->checkoutPayload([
                'order_source' => 'walk_in',
                'payment_method' => 'app',
            ]))
            ->assertSessionHasErrors(['payment_method' => 'បង់តាម App ប្រើបានតែការកម្មង់ពី foodpanda, Grab, Nham24, WOWNOW ឬ App ផ្សេងៗប៉ុណ្ណោះ។']);
    }

    public function test_report_breaks_sales_down_by_channel_and_payment_method(): void
    {
        $admin = User::where('username', 'admin')->firstOrFail();
        Document::query()->delete();

        // ETUM-OP-01 = $1.75
        $this->actingAs($this->cashier)->post(route('invoices.checkout'), $this->checkoutPayload(['order_source' => 'foodpanda', 'payment_method' => 'app']));
        $this->actingAs($this->cashier)->post(route('invoices.checkout'), $this->checkoutPayload(['order_source' => 'foodpanda', 'payment_method' => 'app']));
        $this->actingAs($this->cashier)->post(route('invoices.checkout'), $this->checkoutPayload(['payment_method' => 'cash']));

        $this->actingAs($admin)
            ->get(route('reports.index'))
            ->assertInertia(fn ($page) => $page
                ->where('sales_by_source', [
                    ['source' => 'foodpanda', 'count' => 2, 'total' => '3.50'],
                    ['source' => 'walk_in', 'count' => 1, 'total' => '1.75'],
                ])
                ->where('sales_by_payment', [
                    ['method' => 'app', 'count' => 2, 'total' => '3.50'],
                    ['method' => 'cash', 'count' => 1, 'total' => '1.75'],
                ])
            );
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function checkoutPayload(array $overrides = []): array
    {
        return [
            'table_identifier' => 'ខ្ចប់ (Takeaway)',
            'payment_method' => 'khqr',
            'items' => [
                ['product_id' => $this->steamedClams->id, 'quantity' => 1],
            ],
            ...$overrides,
        ];
    }
}
