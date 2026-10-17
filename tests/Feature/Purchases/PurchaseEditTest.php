<?php

namespace Tests\Feature\Purchases;

use App\Enums\PeriodStatus;
use App\Models\AuditLog;
use App\Models\Purchase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseEditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    public function test_supervisor_can_edit_purchase_items_and_totals_keeping_its_number(): void
    {
        $purchase = $this->createPurchase();
        $originalNumber = $purchase->purchase_number;
        $supervisor = User::where('username', 'supervisor1')->firstOrFail();

        $this->actingAs($supervisor)
            ->patch(route('purchases.update', $purchase), [
                ...$this->payload(),
                'discount_amount' => 1,
                'items' => [
                    ['item_name' => 'Coca Cola', 'unit_name' => 'Can', 'quantity' => 24, 'unit_cost' => 0.5],
                    ['item_name' => 'Ice', 'unit_name' => 'Bag', 'quantity' => 2, 'unit_cost' => 1.5],
                ],
            ])
            ->assertSessionHas('success');

        $purchase->refresh();
        $this->assertSame($originalNumber, $purchase->purchase_number);
        $this->assertCount(2, $purchase->items);
        // 24 x 0.50 + 2 x 1.50 = 15.00, minus 1.00 discount
        $this->assertEquals(15.00, (float) $purchase->subtotal);
        $this->assertEquals(14.00, (float) $purchase->total_amount);
        $this->assertTrue(AuditLog::where('action', 'purchase.updated')->where('auditable_id', $purchase->id)->exists());
    }

    public function test_cashier_cannot_edit_purchase(): void
    {
        $purchase = $this->createPurchase();
        $cashier = User::where('username', 'cashier1')->firstOrFail();

        $this->actingAs($cashier)
            ->patch(route('purchases.update', $purchase), $this->payload())
            ->assertForbidden();
    }

    public function test_edit_requires_at_least_one_item(): void
    {
        $purchase = $this->createPurchase();
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($admin)
            ->patch(route('purchases.update', $purchase), [...$this->payload(), 'items' => []])
            ->assertSessionHasErrors(['items' => 'The items field is required.']);

        $this->assertCount(1, $purchase->refresh()->items);
    }

    public function test_purchase_in_closed_period_cannot_be_edited(): void
    {
        $purchase = $this->createPurchase();
        $purchase->period->update(['status' => PeriodStatus::Closed]);
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($admin)
            ->patch(route('purchases.update', $purchase), [
                ...$this->payload(),
                'items' => [['item_name' => 'Changed', 'quantity' => 1, 'unit_cost' => 99]],
            ])
            ->assertSessionHas('error');

        $this->assertSame('Coca Cola', $purchase->refresh()->items->first()->item_name);
    }

    private function createPurchase(): Purchase
    {
        $admin = User::where('username', 'admin')->firstOrFail();

        $this->actingAs($admin)->post(route('purchases.store'), $this->payload());

        return Purchase::latest('id')->firstOrFail();
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return [
            'purchase_date' => '2026-10-16',
            'status' => 'received',
            'items' => [
                ['item_name' => 'Coca Cola', 'unit_name' => 'Can', 'quantity' => 12, 'unit_cost' => 0.5],
            ],
        ];
    }
}
