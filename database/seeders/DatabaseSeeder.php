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

        // 6. Real Menu Products & Categories (អ៊ុតុំ លៀសអប់សៀមរាប)
        $this->call([
            LeashalEtumProductsSeeder::class,
            FloorAndCrmSeeder::class,
            PurchasesSeeder::class,
        ]);

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
