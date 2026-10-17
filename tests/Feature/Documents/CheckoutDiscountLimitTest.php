<?php

namespace Tests\Feature\Documents;

use App\Models\Document;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\LeashalEtumProductsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class CheckoutDiscountLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(LeashalEtumProductsSeeder::class);
    }

    public function test_cashier_can_give_up_to_ten_percent_discount(): void
    {
        // 4 x $2.50 = $10.00, 10% = $1.00
        $this->checkoutAs('cashier1', '1.00')->assertSessionHasNoErrors();

        $this->assertSame('9.00', Document::latest('id')->firstOrFail()->grand_total);
    }

    public function test_cashier_discount_above_ten_percent_is_rejected(): void
    {
        $countBefore = Document::count();

        $this->checkoutAs('cashier1', '1.01')
            ->assertSessionHasErrors(['discount_amount' => 'Cashier អាចបញ្ចុះតម្លៃបានត្រឹម 10% ($1.00)។ សូមឱ្យ Supervisor ឬ Admin ធ្វើការបញ្ចុះតម្លៃលើសនេះ។']);

        $this->assertSame($countBefore, Document::count());
    }

    public function test_supervisor_can_give_larger_discount(): void
    {
        $this->checkoutAs('supervisor1', '5.00')->assertSessionHasNoErrors();

        $this->assertSame('5.00', Document::latest('id')->firstOrFail()->grand_total);
    }

    private function checkoutAs(string $username, string $discount): TestResponse
    {
        return $this->actingAs(User::where('username', $username)->firstOrFail())->post(route('invoices.checkout'), [
            'table_identifier' => 'ខ្ចប់ (Takeaway)',
            'payment_method' => 'khqr',
            'discount_amount' => $discount,
            'items' => [['product_id' => Product::where('sku', 'ETUM-OP-02')->firstOrFail()->id, 'quantity' => 4]],
        ]);
    }
}
