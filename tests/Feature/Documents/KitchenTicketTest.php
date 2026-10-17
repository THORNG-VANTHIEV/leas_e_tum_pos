<?php

namespace Tests\Feature\Documents;

use App\Models\Document;
use App\Models\KitchenTicket;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\LeashalEtumProductsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class KitchenTicketTest extends TestCase
{
    use RefreshDatabase;

    protected User $cashier;

    protected Product $clams;

    protected Product $snails;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->seed(LeashalEtumProductsSeeder::class);

        $this->cashier = User::where('username', 'cashier1')->firstOrFail();
        $this->clams = Product::where('sku', 'ETUM-OP-01')->firstOrFail();
        $this->snails = Product::where('sku', 'ETUM-OP-02')->firstOrFail();
    }

    public function test_holding_a_table_issues_a_kitchen_ticket_and_flashes_it_for_printing(): void
    {
        $response = $this->holdTable([[$this->clams, 2], [$this->snails, 1]]);

        $ticket = KitchenTicket::latest('id')->firstOrFail();
        $this->assertSame(1, $ticket->ticket_no);
        $this->assertSame([[$this->clams->id, 2, 'add'], [$this->snails->id, 1, 'add']], $this->summarize($ticket));

        $response->assertSessionHas('print_jobs', fn (array $batch) => count($batch['jobs']) === 1
            && $batch['jobs'][0]['type'] === 'kitchen_ticket'
            && str_contains($batch['jobs'][0]['url'], "/kitchen-tickets/{$ticket->id}/print"));
    }

    public function test_add_on_round_only_tickets_new_and_cancelled_dishes(): void
    {
        $this->holdTable([[$this->clams, 2], [$this->snails, 1]]);
        $draft = Document::latest('id')->firstOrFail();

        // Table orders one more clam plate and drops the snails
        $this->holdTable([[$this->clams, 3]], $draft->id);

        $ticket = KitchenTicket::latest('id')->firstOrFail();
        $this->assertSame(2, $ticket->ticket_no);
        $this->assertSame([[$this->clams->id, 1, 'add'], [$this->snails->id, 1, 'cancel']], $this->summarize($ticket));
    }

    public function test_holding_without_changes_does_not_print_a_ticket(): void
    {
        $this->holdTable([[$this->clams, 2]]);
        $draft = Document::latest('id')->firstOrFail();

        $response = $this->holdTable([[$this->clams, 2]], $draft->id);

        $this->assertSame(1, KitchenTicket::count());
        $response->assertSessionHas('print_jobs', fn (array $batch) => $batch['jobs'] === []);
    }

    public function test_takeaway_checkout_prints_kitchen_ticket_then_receipt(): void
    {
        $response = $this->actingAs($this->cashier)->post(route('invoices.checkout'), [
            'table_identifier' => 'ខ្ចប់ (Takeaway)',
            'payment_method' => 'khqr',
            'items' => [['product_id' => $this->clams->id, 'quantity' => 1]],
        ]);

        $document = Document::latest('id')->firstOrFail();
        $this->assertSame([[$this->clams->id, 1, 'add']], $this->summarize($document->kitchenTickets()->firstOrFail()));
        $response->assertSessionHas('print_jobs', fn (array $batch) => array_column($batch['jobs'], 'type') === ['kitchen_ticket', 'receipt']);
    }

    public function test_paying_a_held_table_keeps_kitchen_progress_and_prints_only_the_receipt(): void
    {
        $this->holdTable([[$this->clams, 2]]);
        $draft = Document::latest('id')->firstOrFail();
        $draft->update(['kitchen_status' => 'served']);

        $response = $this->actingAs($this->cashier)->post(route('invoices.checkout'), [
            'document_id' => $draft->id,
            'table_identifier' => $draft->reference_identifier,
            'payment_method' => 'cash',
            'items' => [['product_id' => $this->clams->id, 'quantity' => 2]],
        ]);

        $this->assertSame('served', $draft->refresh()->kitchen_status);
        $this->assertSame(1, $draft->kitchenTickets()->count());
        $response->assertSessionHas('print_jobs', fn (array $batch) => array_column($batch['jobs'], 'type') === ['receipt']);
    }

    public function test_held_dine_in_order_appears_on_kitchen_display_before_payment(): void
    {
        $this->holdTable([[$this->clams, 2]]);
        $draft = Document::latest('id')->firstOrFail();

        $this->actingAs($this->cashier)
            ->get(route('kds.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('kds/index')
                ->where('orders', fn ($orders) => collect($orders)->contains('id', $draft->id))
            );
    }

    public function test_kitchen_ticket_print_page_shows_table_and_lines(): void
    {
        $this->holdTable([[$this->clams, 2]]);
        $ticket = KitchenTicket::latest('id')->firstOrFail();

        $this->actingAs($this->cashier)
            ->get(route('kitchen-tickets.print', $ticket))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('kitchen-tickets/print')
                ->where('ticket.table', 'តុ ០៧')
                ->where('ticket.lines.0.quantity', 2)
            );
    }

    /**
     * @param  array<int, array{0: Product, 1: int}>  $items
     */
    private function holdTable(array $items, ?int $documentId = null): TestResponse
    {
        return $this->actingAs($this->cashier)->post(route('invoices.hold-table'), [
            'table_identifier' => 'តុ ០៧',
            'document_id' => $documentId,
            'items' => array_map(fn (array $item) => ['product_id' => $item[0]->id, 'quantity' => $item[1]], $items),
        ]);
    }

    /**
     * @return array<int, array{0: int, 1: int, 2: string}>
     */
    private function summarize(KitchenTicket $ticket): array
    {
        return array_map(fn (array $line) => [$line['product_id'], $line['quantity'], $line['type']], $ticket->lines);
    }
}
