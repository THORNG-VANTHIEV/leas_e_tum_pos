<?php

namespace Tests\Feature\Periods;

use App\Features\Periods\Actions\FinalizePeriodDocuments;
use App\Models\BusinessSetting;
use App\Models\Document;
use App\Models\DocumentItem;
use App\Models\Location;
use App\Models\Period;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinalizePeriodDocumentsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Period $period;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        BusinessSetting::create([
            'business_name_primary' => 'Jerng Krann POS',
            'currency_code' => 'USD',
            'currency_symbol' => '$',
            'decimal_places' => 2,
            'timezone' => 'Asia/Phnom_Penh',
            'document_language' => 'km_en',
            'active_period_id' => null,
            'entry_controls' => ['require_source_total' => false],
            'print_layouts' => ['show_guest_count' => true],
            'typography' => ['primary_font' => 'Inter'],
        ]);

        $this->admin = User::create([
            'name' => 'Admin Test',
            'username' => 'admin_test',
            'password' => bcrypt('secret'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $location = Location::create([
            'code' => 'LOC-01',
            'name_primary' => 'Main Hall',
            'is_active' => true,
            'created_by' => $this->admin->id,
        ]);

        $this->period = Period::create([
            'code' => 'P-2026-10',
            'name' => 'October 2026 Shift Run',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'status' => 'active',
            'location_id' => $location->id,
            'document_prefix' => 'INV',
            'starting_sequence' => 1,
            'last_sequence_no' => 0,
            'entry_settings_snapshot' => ['require_source_total' => false],
            'created_by' => $this->admin->id,
        ]);

        $unit = Unit::create(['code' => 'PAX', 'name_primary' => 'Pax', 'sort_order' => 1]);
        $cat = ProductCategory::create([
            'code' => 'BUFFET',
            'name_primary' => 'Buffet Packages',
            'category_type' => 'buffet',
            'sort_order' => 1,
        ]);
        $this->product = Product::create([
            'category_id' => $cat->id,
            'unit_id' => $unit->id,
            'sku' => 'PKG-01',
            'name_primary' => 'Buffet Adult',
            'unit_price' => 15.00,
            'is_active' => true,
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);
    }

    public function test_period_finalization_assigns_contiguous_sequential_numbers(): void
    {
        // doc1: created with provisional_order 2 at 12:30
        $doc1 = Document::create([
            'period_id' => $this->period->id,
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
            'provisional_order' => 2,
            'business_date' => '2026-10-13',
            'event_time' => '12:30:00',
            'unit_count' => 2,
            'subtotal' => 30.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'grand_total' => 30.00,
            'source_total' => 30.00,
            'source_total_verified' => true,
            'amount_received' => 30.00,
            'change_amount' => 0.00,
            'payment_method' => 'cash',
            'status' => 'draft',
            'lock_version' => 1,
        ]);

        DocumentItem::create([
            'document_id' => $doc1->id,
            'product_id' => $this->product->id,
            'line_position' => 1,
            'category_type_snapshot' => 'buffet',
            'product_name_primary_snapshot' => 'Buffet Adult',
            'unit_snapshot' => 'Pax',
            'quantity' => 2,
            'master_price_at_entry' => 15.00,
            'unit_price' => 15.00,
            'line_total' => 30.00,
            'is_primary_package_snapshot' => true,
        ]);

        // doc2: created with provisional_order 1 at 11:00
        $doc2 = Document::create([
            'period_id' => $this->period->id,
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
            'provisional_order' => 1,
            'business_date' => '2026-10-13',
            'event_time' => '11:00:00',
            'unit_count' => 1,
            'subtotal' => 15.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'grand_total' => 15.00,
            'source_total' => 15.00,
            'source_total_verified' => true,
            'amount_received' => 20.00,
            'change_amount' => 5.00,
            'payment_method' => 'cash',
            'status' => 'draft',
            'lock_version' => 1,
        ]);

        DocumentItem::create([
            'document_id' => $doc2->id,
            'product_id' => $this->product->id,
            'line_position' => 1,
            'category_type_snapshot' => 'buffet',
            'product_name_primary_snapshot' => 'Buffet Adult',
            'unit_snapshot' => 'Pax',
            'quantity' => 1,
            'master_price_at_entry' => 15.00,
            'unit_price' => 15.00,
            'line_total' => 15.00,
            'is_primary_package_snapshot' => true,
        ]);

        $action = app(FinalizePeriodDocuments::class);
        $finalizedPeriod = $action->handle($this->period->id, $this->admin->id);

        $doc1->refresh();
        $doc2->refresh();

        // Sorted by event_time: doc2 (11:00) gets #1, doc1 (12:30) gets #2
        $this->assertEquals(1, $doc2->sequence_no);
        $this->assertEquals('INV-P-2026-10-0001', $doc2->document_number);
        $this->assertEquals('finalized', $doc2->status->value ?? (string) $doc2->status);

        $this->assertEquals(2, $doc1->sequence_no);
        $this->assertEquals('INV-P-2026-10-0002', $doc1->document_number);
        $this->assertEquals('finalized', $doc1->status->value ?? (string) $doc1->status);

        // Period last_sequence_no is updated to 2
        $this->assertEquals(2, $finalizedPeriod->last_sequence_no);
    }
}
