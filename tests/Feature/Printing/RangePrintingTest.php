<?php

namespace Tests\Feature\Printing;

use App\Enums\DocumentStatus;
use App\Models\BusinessSetting;
use App\Models\Document;
use App\Models\DocumentItem;
use App\Models\Location;
use App\Models\Period;
use App\Models\PrintLog;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RangePrintingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Period $period;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        BusinessSetting::create([
            'business_name_primary' => 'លៀសហាល អ៉ីទុម',
            'business_name_secondary' => 'LEASHAL ETUM POS',
            'currency_code' => 'USD',
            'currency_symbol' => '$',
            'decimal_places' => 2,
            'timezone' => 'Asia/Phnom_Penh',
            'document_language' => 'km_en',
            'entry_controls' => ['require_source_total' => false],
            'print_layouts' => ['show_guest_count' => true],
            'typography' => ['primary_font' => 'Inter'],
        ]);

        $this->user = User::create([
            'name' => 'Cashier One',
            'username' => 'cashier_print',
            'password' => bcrypt('password'),
            'role' => 'cashier',
            'is_active' => true,
        ]);

        $location = Location::create([
            'code' => 'MAIN-01',
            'name_primary' => 'Main Outlet',
            'is_active' => true,
            'created_by' => $this->user->id,
        ]);

        $this->period = Period::create([
            'code' => 'P-2026-10-A',
            'name' => 'Shift Morning',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'location_id' => $location->id,
            'status' => 'active',
            'created_by' => $this->user->id,
        ]);

        $unit = Unit::create([
            'code' => 'PLATE',
            'name_primary' => 'ចាន',
            'sort_order' => 1,
        ]);

        $category = ProductCategory::create([
            'code' => 'FOOD',
            'name_primary' => 'Food Menu',
            'category_type' => 'regular',
            'sort_order' => 1,
        ]);

        $this->product = Product::create([
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'sku' => 'ETUM-01',
            'name_primary' => 'លៀសហាល អ៉ីទុម ពិសេស',
            'unit_price' => 3.50,
            'is_active' => true,
            'created_by' => $this->user->id,
            'updated_by' => $this->user->id,
        ]);
    }

    public function test_user_can_preview_continuous_range_of_finalized_documents(): void
    {
        // Create 3 finalized documents with sequence numbers 1, 2, 3
        for ($i = 1; $i <= 3; $i++) {
            $doc = Document::create([
                'period_id' => $this->period->id,
                'provisional_order' => $i,
                'sequence_no' => $i,
                'document_number' => sprintf('INV-%s-%04d', $this->period->code, $i),
                'business_date' => now()->toDateString(),
                'event_time' => now()->toTimeString(),
                'unit_count' => 1,
                'source_total' => 3.50,
                'source_total_verified' => true,
                'subtotal' => 3.50,
                'tax_amount' => 0.00,
                'discount_amount' => 0.00,
                'grand_total' => 3.50,
                'amount_received' => 5.00,
                'change_amount' => 1.50,
                'payment_method' => 'cash',
                'status' => DocumentStatus::Finalized,
                'created_by' => $this->user->id,
                'updated_by' => $this->user->id,
            ]);

            DocumentItem::create([
                'document_id' => $doc->id,
                'product_id' => $this->product->id,
                'unit_id' => $this->product->unit_id,
                'line_position' => 1,
                'category_type_snapshot' => 'food',
                'product_name_primary_snapshot' => $this->product->name_primary,
                'unit_snapshot' => 'ចាន',
                'quantity' => 1,
                'master_price_at_entry' => 3.50,
                'unit_price' => 3.50,
                'line_total' => 3.50,
                'is_primary_package_snapshot' => true,
            ]);
        }

        // Also create a draft document (should NOT be included in range)
        Document::create([
            'period_id' => $this->period->id,
            'provisional_order' => 4,
            'sequence_no' => null,
            'business_date' => now()->toDateString(),
            'event_time' => now()->toTimeString(),
            'unit_count' => 1,
            'source_total' => 3.50,
            'source_total_verified' => true,
            'subtotal' => 3.50,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'grand_total' => 3.50,
            'amount_received' => 5.00,
            'change_amount' => 1.50,
            'payment_method' => 'cash',
            'status' => DocumentStatus::Draft,
            'created_by' => $this->user->id,
            'updated_by' => $this->user->id,
        ]);

        // Request sequence range 1 to 2
        $response = $this->actingAs($this->user)->get('/invoices/print-range/preview?start_sequence=1&end_sequence=2&format=80mm');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('documents/preview-range')
            ->has('documents', 2)
            ->where('range.count', 2)
            ->where('range.start_sequence', 1)
            ->where('range.end_sequence', 2)
            ->where('format', '80mm')
        );
    }

    public function test_print_range_alias_returns_same_preview_component(): void
    {
        $response = $this->actingAs($this->user)->get('/invoices/print-range');

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('documents/preview-range')
        );
    }

    public function test_user_can_record_idempotent_range_print_requests(): void
    {
        // Create 2 finalized documents
        for ($i = 1; $i <= 2; $i++) {
            Document::create([
                'period_id' => $this->period->id,
                'provisional_order' => $i,
                'sequence_no' => $i,
                'document_number' => sprintf('INV-%s-%04d', $this->period->code, $i),
                'business_date' => now()->toDateString(),
                'event_time' => now()->toTimeString(),
                'unit_count' => 1,
                'source_total' => 3.50,
                'source_total_verified' => true,
                'subtotal' => 3.50,
                'tax_amount' => 0.00,
                'discount_amount' => 0.00,
                'grand_total' => 3.50,
                'amount_received' => 5.00,
                'change_amount' => 1.50,
                'payment_method' => 'cash',
                'status' => DocumentStatus::Finalized,
                'created_by' => $this->user->id,
                'updated_by' => $this->user->id,
            ]);
        }

        $batchId = (string) Str::uuid();

        // 1. Submit batch print request
        $response = $this->actingAs($this->user)->postJson('/invoices/print-range/print-requests', [
            'batch_request_id' => $batchId,
            'format' => '80mm',
            'start_sequence' => 1,
            'end_sequence' => 2,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'count' => 2,
            'batch_request_id' => $batchId,
        ]);

        $this->assertEquals(2, PrintLog::count());

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'document.range_print_requested',
            'actor_id' => $this->user->id,
        ]);

        // 2. Retry with same batch ID (must remain idempotent, no duplicate PrintLogs)
        $retryResponse = $this->actingAs($this->user)->postJson('/invoices/print-range/print-requests', [
            'batch_request_id' => $batchId,
            'format' => '80mm',
            'start_sequence' => 1,
            'end_sequence' => 2,
        ]);

        $retryResponse->assertStatus(200);
        $this->assertEquals(2, PrintLog::count());
    }
}
