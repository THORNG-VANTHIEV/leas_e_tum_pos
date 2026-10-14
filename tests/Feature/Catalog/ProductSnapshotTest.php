<?php

namespace Tests\Feature\Catalog;

use App\Enums\PeriodStatus;
use App\Enums\UserRole;
use App\Features\Documents\Actions\CreateDraftDocument;
use App\Models\BusinessSetting;
use App\Models\Location;
use App\Models\Period;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Unit;
use App\Models\User;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProductSnapshotTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $cashier;
    protected Period $period;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        BusinessSetting::current();

        $this->admin = User::create([
            'name' => 'Admin User',
            'username' => 'admin',
            'password' => Hash::make('secret'),
            'role' => UserRole::Admin,
            'is_active' => true,
        ]);

        $this->cashier = User::create([
            'name' => 'Cashier User',
            'username' => 'cashier',
            'password' => Hash::make('secret'),
            'role' => UserRole::Cashier,
            'is_active' => true,
        ]);

        $location = Location::create([
            'code' => 'LOC-01',
            'name_primary' => 'Main Hall',
            'created_by' => $this->admin->id,
        ]);

        $this->period = Period::create([
            'location_id' => $location->id,
            'code' => 'P01',
            'name' => 'Period 01',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(30)->toDateString(),
            'status' => PeriodStatus::Active,
            'entry_settings_snapshot' => ['require_source_total' => false],
            'created_by' => $this->admin->id,
        ]);

        $unit = Unit::create(['code' => 'person', 'name_primary' => 'Person (Pax)']);
        $category = ProductCategory::create(['code' => 'BUFFET', 'name_primary' => 'Buffet', 'category_type' => 'package']);

        $this->product = Product::create([
            'category_id' => $category->id,
            'name_primary' => 'Dinner Buffet',
            'unit_id' => $unit->id,
            'unit_price' => '15.00',
            'is_primary_package' => true,
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);
    }

    public function test_line_items_preserve_immutable_snapshots_when_catalog_changes(): void
    {
        $action = app(CreateDraftDocument::class);

        $document = $action->handle([
            'period_id' => $this->period->id,
            'business_date' => now()->toDateString(),
            'event_time' => '18:00',
            'reference_identifier' => 'T-01',
            'amount_received' => '30.00',
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 2],
            ],
        ], $this->cashier->id);

        $item = $document->items->first();
        $this->assertSame('Dinner Buffet', $item->product_name_primary_snapshot);
        $this->assertSame('15.00', $item->unit_price);
        $this->assertSame('30.00', $item->line_total);
        $this->assertSame('Person (Pax)', $item->unit_snapshot);

        // Later: Admin mutates the master catalog price and name
        $this->product->update([
            'name_primary' => 'Luxury Dinner Buffet',
            'unit_price' => '25.00',
        ]);

        // Historical snapshot in document line MUST remain untouched (Invariant INV-04)
        $freshItem = $document->items()->first();
        $this->assertSame('Dinner Buffet', $freshItem->product_name_primary_snapshot);
        $this->assertSame('15.00', $freshItem->unit_price);
        $this->assertSame('30.00', $freshItem->line_total);
    }

    public function test_inactive_product_cannot_be_added_to_new_order(): void
    {
        $this->product->update(['is_active' => false]);

        $action = app(CreateDraftDocument::class);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage("Product #{$this->product->id} is inactive or does not exist.");

        $action->handle([
            'period_id' => $this->period->id,
            'business_date' => now()->toDateString(),
            'event_time' => '18:00',
            'amount_received' => '15.00',
            'items' => [
                ['product_id' => $this->product->id, 'quantity' => 1],
            ],
        ], $this->cashier->id);
    }
}
