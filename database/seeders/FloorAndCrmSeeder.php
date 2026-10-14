<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Expense;
use App\Models\Location;
use App\Models\Period;
use App\Models\RestaurantTable;
use App\Models\User;
use Illuminate\Database\Seeder;

class FloorAndCrmSeeder extends Seeder
{
    public function run(): void
    {
        $location = Location::first();
        $admin = User::first();
        $period = Period::where('status', 'active')->first();

        // 1. Restaurant Tables
        $tables = [
            // Main Dining
            ['code' => 'T-01', 'name' => 'តុ 01', 'zone' => 'Main Dining', 'capacity' => 4, 'shape' => 'square', 'sort_order' => 1],
            ['code' => 'T-02', 'name' => 'តុ 02', 'zone' => 'Main Dining', 'capacity' => 4, 'shape' => 'square', 'sort_order' => 2],
            ['code' => 'T-03', 'name' => 'តុ 03', 'zone' => 'Main Dining', 'capacity' => 4, 'shape' => 'square', 'sort_order' => 3],
            ['code' => 'T-04', 'name' => 'តុ 04', 'zone' => 'Main Dining', 'capacity' => 6, 'shape' => 'rectangle', 'sort_order' => 4],
            ['code' => 'T-05', 'name' => 'តុ 05', 'zone' => 'Main Dining', 'capacity' => 6, 'shape' => 'rectangle', 'sort_order' => 5],
            ['code' => 'T-06', 'name' => 'តុ 06', 'zone' => 'Main Dining', 'capacity' => 2, 'shape' => 'round', 'sort_order' => 6],
            // VIP Room
            ['code' => 'VIP-1', 'name' => 'បន្ទប់ VIP 1', 'zone' => 'VIP Room', 'capacity' => 8, 'shape' => 'rectangle', 'sort_order' => 7],
            ['code' => 'VIP-2', 'name' => 'បន្ទប់ VIP 2', 'zone' => 'VIP Room', 'capacity' => 10, 'shape' => 'rectangle', 'sort_order' => 8],
            ['code' => 'VIP-3', 'name' => 'បន្ទប់ VIP 3', 'zone' => 'VIP Room', 'capacity' => 6, 'shape' => 'round', 'sort_order' => 9],
            // Outdoor Garden
            ['code' => 'OUT-01', 'name' => 'សួនក្រៅ 01', 'zone' => 'Outdoor Garden', 'capacity' => 4, 'shape' => 'round', 'sort_order' => 10],
            ['code' => 'OUT-02', 'name' => 'សួនក្រៅ 02', 'zone' => 'Outdoor Garden', 'capacity' => 4, 'shape' => 'round', 'sort_order' => 11],
            ['code' => 'OUT-03', 'name' => 'សួនក្រៅ 03', 'zone' => 'Outdoor Garden', 'capacity' => 4, 'shape' => 'round', 'sort_order' => 12],
            ['code' => 'OUT-04', 'name' => 'សួនក្រៅ 04', 'zone' => 'Outdoor Garden', 'capacity' => 6, 'shape' => 'rectangle', 'sort_order' => 13],
        ];

        foreach ($tables as $t) {
            RestaurantTable::firstOrCreate(
                ['code' => $t['code']],
                array_merge($t, [
                    'location_id' => $location?->id,
                    'status' => 'available',
                    'is_active' => true,
                ])
            );
        }

        // 2. Customers
        $customers = [
            [
                'name' => 'សុខ សុវណ្ណ',
                'phone' => '012345678',
                'email' => 'sovann.sok@gmail.com',
                'tier' => 'vip',
                'loyalty_points' => 180,
                'total_spent_usd' => 240.00,
                'visits_count' => 12,
                'notes' => 'ចូលចិត្តលៀសហាលពិសេស ហិរតិចៗ',
            ],
            [
                'name' => 'ចាន់ ពិសិដ្ឋ',
                'phone' => '098765432',
                'email' => 'piseth.chan@gmail.com',
                'tier' => 'gold',
                'loyalty_points' => 95,
                'total_spent_usd' => 115.00,
                'visits_count' => 7,
                'notes' => 'អតិថិជនប្រចាំពេលល្ងាច',
            ],
            [
                'name' => 'ម៉ៅ សុភ័ក្រ',
                'phone' => '077112233',
                'tier' => 'silver',
                'loyalty_points' => 40,
                'total_spent_usd' => 45.00,
                'visits_count' => 3,
                'notes' => null,
            ],
            [
                'name' => 'គង់ វណ្ណា',
                'phone' => '085998877',
                'tier' => 'standard',
                'loyalty_points' => 15,
                'total_spent_usd' => 15.00,
                'visits_count' => 1,
                'notes' => null,
            ],
        ];

        foreach ($customers as $c) {
            Customer::firstOrCreate(
                ['phone' => $c['phone']],
                $c
            );
        }

        // 3. Sample Expenses
        if ($admin && Expense::count() === 0) {
            Expense::create([
                'period_id' => $period?->id,
                'category' => 'utilities',
                'title' => 'ថ្លៃទឹក & ភ្លើង ប្រចាំសប្ដាហ៍',
                'description' => 'ទូទាត់តាមបេឡាសាច់ប្រាក់',
                'amount_usd' => 35.00,
                'amount_khr' => 143500,
                'payment_method' => 'cash_drawer',
                'paid_to' => 'អគ្គិសនីកម្ពុជា',
                'receipt_reference' => 'EDC-2026-991',
                'expense_date' => now()->toDateString(),
                'created_by' => $admin->id,
            ]);

            Expense::create([
                'period_id' => $period?->id,
                'category' => 'supplies',
                'title' => 'ទិញសម្ភារៈបន្ទាប់បន្សំ & ក្រដាសជូតមាត់',
                'description' => 'ក្រដាសអនាម័យ & ថង់ខ្ចប់ម្ហូប',
                'amount_usd' => 18.50,
                'amount_khr' => 75850,
                'payment_method' => 'petty_cash',
                'paid_to' => 'ផ្សារលើ',
                'receipt_reference' => 'RCP-00234',
                'expense_date' => now()->toDateString(),
                'created_by' => $admin->id,
            ]);
        }
    }
}
