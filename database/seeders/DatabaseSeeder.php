<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\BusinessSetting;
use App\Models\Location;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Business Settings
        BusinessSetting::current();

        // 2. Main Admin
        $admin = User::firstOrCreate(
            ['username' => 'admin'],
            [
                'name' => 'System Administrator',
                'password' => Hash::make('admin123'),
                'role' => UserRole::Admin,
                'is_active' => true,
            ]
        );

        // 3. Primary Location
        $location = Location::firstOrCreate(
            ['code' => 'LOC-01'],
            [
                'name_primary' => 'Main Dining Hall',
                'name_secondary' => 'សាលធំកណ្ដាល',
                'address' => 'Ground Floor, Building 1',
                'is_active' => true,
                'created_by' => $admin->id,
            ]
        );

        // Attach admin to location
        $admin->locations()->syncWithoutDetaching([
            $location->id => ['is_default' => true],
        ]);

        // 4. Sample Cashier
        $cashier = User::firstOrCreate(
            ['username' => 'cashier1'],
            [
                'name' => 'Sophea Operator',
                'password' => Hash::make('cashier123'),
                'role' => UserRole::Cashier,
                'is_active' => true,
            ]
        );

        $cashier->locations()->syncWithoutDetaching([
            $location->id => ['is_default' => true],
        ]);

        // 5. Sample Supervisor
        $supervisor = User::firstOrCreate(
            ['username' => 'supervisor1'],
            [
                'name' => 'Dara Supervisor',
                'password' => Hash::make('supervisor123'),
                'role' => UserRole::Supervisor,
                'is_active' => true,
            ]
        );

        $supervisor->locations()->syncWithoutDetaching([
            $location->id => ['is_default' => true],
        ]);

        // 6. Units Master
        $uPerson = \App\Models\Unit::firstOrCreate(['code' => 'person'], ['name_primary' => 'Person (Pax)', 'name_secondary' => 'នាក់', 'sort_order' => 1]);
        $uCan = \App\Models\Unit::firstOrCreate(['code' => 'can'], ['name_primary' => 'Can', 'name_secondary' => 'កំប៉ុង', 'sort_order' => 2]);
        $uBottle = \App\Models\Unit::firstOrCreate(['code' => 'bottle'], ['name_primary' => 'Bottle', 'name_secondary' => 'ដប', 'sort_order' => 3]);
        $uDish = \App\Models\Unit::firstOrCreate(['code' => 'dish'], ['name_primary' => 'Dish', 'name_secondary' => 'ចាន', 'sort_order' => 4]);

        // 7. Categories
        $catBuffet = \App\Models\ProductCategory::firstOrCreate(['code' => 'BUFFET'], ['name_primary' => 'Buffet Packages', 'name_secondary' => 'កញ្ចប់ប៊ូហ្វេ', 'category_type' => 'package', 'sort_order' => 1]);
        $catBev = \App\Models\ProductCategory::firstOrCreate(['code' => 'BEV'], ['name_primary' => 'Soft Drinks', 'name_secondary' => 'ភេសជ្ជៈ', 'category_type' => 'beverage', 'sort_order' => 2]);
        $catBeer = \App\Models\ProductCategory::firstOrCreate(['code' => 'BEER'], ['name_primary' => 'Beer & Cider', 'name_secondary' => 'ស្រាបៀរ', 'category_type' => 'beverage', 'sort_order' => 3]);
        $catFood = \App\Models\ProductCategory::firstOrCreate(['code' => 'FOOD'], ['name_primary' => 'Special Kitchen Dishes', 'name_secondary' => 'ម្ហូបពិសេស', 'category_type' => 'food', 'sort_order' => 4]);

        // 8. Products
        \App\Models\Product::firstOrCreate(
            ['sku' => 'PKG-01'],
            [
                'category_id' => $catBuffet->id,
                'name_primary' => 'Standard Buffet Adult',
                'name_secondary' => 'ប៊ូហ្វេធម្មតា មនុស្សពេញវ័យ',
                'unit_id' => $uPerson->id,
                'unit_price' => '15.00',
                'is_primary_package' => true,
                'sort_order' => 1,
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]
        );

        \App\Models\Product::firstOrCreate(
            ['sku' => 'PKG-02'],
            [
                'category_id' => $catBuffet->id,
                'name_primary' => 'Seafood BBQ Buffet Adult',
                'name_secondary' => 'ប៊ូហ្វេគ្រឿងសមុទ្រ មនុស្សពេញវ័យ',
                'unit_id' => $uPerson->id,
                'unit_price' => '22.00',
                'is_primary_package' => true,
                'sort_order' => 2,
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]
        );

        \App\Models\Product::firstOrCreate(
            ['sku' => 'PKG-03'],
            [
                'category_id' => $catBuffet->id,
                'name_primary' => 'Child Buffet (<120cm)',
                'name_secondary' => 'ប៊ូហ្វេកុមារ (ក្រោម ១២០ស.ម)',
                'unit_id' => $uPerson->id,
                'unit_price' => '7.50',
                'is_primary_package' => true,
                'sort_order' => 3,
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]
        );

        \App\Models\Product::firstOrCreate(
            ['sku' => 'BEV-01'],
            [
                'category_id' => $catBev->id,
                'name_primary' => 'Coca-Cola 330ml',
                'name_secondary' => 'កូកាកូឡា',
                'unit_id' => $uCan->id,
                'unit_price' => '1.50',
                'is_primary_package' => false,
                'sort_order' => 10,
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]
        );

        \App\Models\Product::firstOrCreate(
            ['sku' => 'BEV-02'],
            [
                'category_id' => $catBev->id,
                'name_primary' => 'Mineral Water 500ml',
                'name_secondary' => 'ទឹកបរិសុទ្ធ ៥០០ម.ល',
                'unit_id' => $uBottle->id,
                'unit_price' => '1.00',
                'is_primary_package' => false,
                'sort_order' => 11,
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]
        );

        \App\Models\Product::firstOrCreate(
            ['sku' => 'BEER-01'],
            [
                'category_id' => $catBeer->id,
                'name_primary' => 'Angkor Beer Can',
                'name_secondary' => 'ស្រាបៀរអង្គរ កំប៉ុង',
                'unit_id' => $uCan->id,
                'unit_price' => '2.00',
                'is_primary_package' => false,
                'sort_order' => 20,
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]
        );

        \App\Models\Product::firstOrCreate(
            ['sku' => 'DISH-01'],
            [
                'category_id' => $catFood->id,
                'name_primary' => 'Grilled Giant River Prawn',
                'name_secondary' => 'បង្កងទន្លេអាំង',
                'unit_id' => $uDish->id,
                'unit_price' => '8.00',
                'is_primary_package' => false,
                'sort_order' => 30,
                'created_by' => $admin->id,
                'updated_by' => $admin->id,
            ]
        );

        // 9. Initial Active Period
        \App\Models\Period::firstOrCreate(
            ['code' => 'P01'],
            [
                'location_id' => $location->id,
                'name' => 'October 2026 Shift Run 01',
                'start_date' => now()->startOfMonth()->toDateString(),
                'end_date' => now()->endOfMonth()->toDateString(),
                'document_prefix' => 'INV',
                'starting_sequence' => 1,
                'last_sequence_no' => 0,
                'status' => \App\Enums\PeriodStatus::Active,
                'entry_settings_snapshot' => [
                    'require_source_total' => true,
                    'show_event_time' => true,
                ],
                'print_settings_snapshot' => [
                    'format' => '80mm',
                    'show_guest_count' => true,
                    'show_item_quantity' => true,
                ],
                'created_by' => $admin->id,
                'activated_by' => $admin->id,
                'activated_at' => now(),
            ]
        );
    }
}
