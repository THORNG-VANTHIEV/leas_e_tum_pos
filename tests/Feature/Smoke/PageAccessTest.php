<?php

namespace Tests\Feature\Smoke;

use App\Models\Customer;
use App\Models\Document;
use App\Models\KitchenTicket;
use App\Models\Period;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Opens every page with realistic data (held table, delivery takeaway, settled table, kitchen tickets)
 * for each role. Run it after any change: `composer test:smoke`.
 */
class PageAccessTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Pages only administrators may open.
     */
    private const ADMIN_ONLY_PREFIXES = ['/settings', '/periods'];

    /**
     * @return array<string, array{0: string}>
     */
    public static function roles(): array
    {
        return [
            'admin' => ['admin'],
            'supervisor' => ['supervisor1'],
            'cashier' => ['cashier1'],
        ];
    }

    #[DataProvider('roles')]
    public function test_every_page_renders_for_role(string $username): void
    {
        $this->seed();
        $user = User::where('username', $username)->firstOrFail();
        $ids = $this->createRealisticOrders($user);

        $failures = [];
        foreach ($this->pages($ids) as $url) {
            $status = $this->actingAs($user)->get($url)->getStatusCode();
            $mustBeForbidden = ! $user->isAdmin() && collect(self::ADMIN_ONLY_PREFIXES)->contains(fn ($prefix) => str_starts_with($url, $prefix));
            $expected = $mustBeForbidden ? 403 : 200;

            if ($status !== $expected) {
                $failures[] = "{$url} => {$status} (expected {$expected})";
            }
        }

        $this->assertSame([], $failures, "Pages failing for {$username}:\n".implode("\n", $failures));
    }

    /**
     * @return array{invoice: int, ticket: int, period: int}
     */
    private function createRealisticOrders(User $user): array
    {
        $product = Product::where('is_active', true)->firstOrFail();
        $item = [['product_id' => $product->id, 'quantity' => 2]];

        $this->actingAs($user)->post(route('invoices.hold-table'), ['table_identifier' => 'តុ ០១', 'items' => $item]);
        $this->actingAs($user)->post(route('invoices.checkout'), [
            'table_identifier' => 'ខ្ចប់ (Takeaway)',
            'order_source' => 'grab',
            'external_order_ref' => 'GF-1',
            'payment_method' => 'cash',
            'amount_received' => '50',
            'customer_id' => Customer::value('id'),
            'items' => $item,
        ]);
        $draft = Document::where('status', 'draft')->latest('id')->firstOrFail();
        $this->actingAs($user)->post(route('invoices.checkout'), [
            'document_id' => $draft->id,
            'table_identifier' => $draft->reference_identifier,
            'payment_method' => 'khqr',
            'items' => [['product_id' => $product->id, 'quantity' => 3]],
        ]);

        return [
            'invoice' => Document::where('status', 'finalized')->latest('id')->value('id'),
            'ticket' => KitchenTicket::latest('id')->value('id'),
            'period' => Period::latest('id')->value('id'),
        ];
    }

    /**
     * @param  array{invoice: int, ticket: int, period: int}  $ids
     * @return array<int, string>
     */
    private function pages(array $ids): array
    {
        return [
            '/dashboard',
            '/invoices/create', '/invoices/create?table_ref=តុ ០២', '/invoices', '/invoices?search=INV',
            "/invoices/{$ids['invoice']}", "/invoices/{$ids['invoice']}/preview/80mm", "/invoices/{$ids['invoice']}/preview/a5",
            '/invoices/print-range', '/invoices/print-range/preview',
            '/kds', '/kds?status=all', "/kitchen-tickets/{$ids['ticket']}/print",
            '/tables', '/tables?zone=all',
            '/catalog', '/purchases', '/customers', '/customers/lookup?q=a',
            '/expenses', '/expenses/export/csv', '/reports', '/reports/export/csv', '/approvals',
            '/settings', '/settings/periods', "/periods/{$ids['period']}/review",
        ];
    }
}
