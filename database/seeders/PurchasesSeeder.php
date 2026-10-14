<?php

namespace Database\Seeders;

use App\Models\Period;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;

class PurchasesSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::first();
        $adminId = $admin ? $admin->id : 1;
        $activePeriod = Period::resolveActive();

        // 1. Create Authentic Suppliers for Leashal Etum
        $suppClams = Supplier::firstOrCreate(['name' => 'ដេប៉ូលៀស & គ្រឿងសមុទ្រ កោះកុង'], [
            'contact_person' => 'អ្នកស្រី ចាន់ណា',
            'phone' => '012 345 678',
            'address' => 'ផ្សារអូរឫស្សី តូបលេខ B-24, ភ្នំពេញ',
            'notes' => 'ផ្គត់ផ្គង់លៀសហាលស្រស់, ខ្ចៅ, មឹក និងបង្គាប្រចាំថ្ងៃ',
            'is_active' => true,
            'created_by' => $adminId,
        ]);

        $suppMeat = Supplier::firstOrCreate(['name' => 'CP Food & Meat Supply'], [
            'contact_person' => 'លោក វិចិត្រ',
            'phone' => '015 888 999',
            'address' => 'ផ្លូវជាតិលេខ ៤, រាជធានីភ្នំពេញ',
            'notes' => 'ផ្គត់ផ្គង់ប្រហិតសាច់គោ និងសាច់អាំងគ្រប់មុខ',
            'is_active' => true,
            'created_by' => $adminId,
        ]);

        $suppDrinks = Supplier::firstOrCreate(['name' => 'ដេប៉ូចែកចាយភេសជ្ជៈ និងស្រាបៀរ លីហួរ'], [
            'contact_person' => 'លោក ហេង',
            'phone' => '077 654 321',
            'address' => 'ផ្លូវ ២៧១, សង្កាត់បឹងទំពុន, ភ្នំពេញ',
            'notes' => 'ចែកចាយ កូកាកូឡា, ស្រាបៀរអង្គរ, ទឹកសុទ្ធ',
            'is_active' => true,
            'created_by' => $adminId,
        ]);

        // 2. Create Initial Purchase Records
        $purchasesData = [
            [
                'number' => 'PUR-2610-0001',
                'supplier_id' => $suppClams->id,
                'date' => '2026-10-12',
                'ref' => 'INV-KK-9021',
                'items' => [
                    ['name' => 'លៀសហាលស្រស់ (Original Raw Clams)', 'unit' => 'កំប៉ុង', 'qty' => 50, 'cost' => 1.20],
                    ['name' => 'ខ្ចៅស្រស់ (Fresh River Snails)', 'unit' => 'ចាន', 'qty' => 30, 'cost' => 1.50],
                    ['name' => 'បង្គាស្រស់ (Fresh Prawns)', 'unit' => 'ចាន', 'qty' => 20, 'cost' => 4.50],
                ],
            ],
            [
                'number' => 'PUR-2610-0002',
                'supplier_id' => $suppMeat->id,
                'date' => '2026-10-13',
                'ref' => 'CP-DO-4821',
                'items' => [
                    ['name' => 'ប្រហិតសាច់គោអាំង (Beef Meatballs)', 'unit' => 'ឈុត', 'qty' => 40, 'cost' => 1.10],
                    ['name' => 'ពងទាកូនស្រស់ (Fresh Balut Eggs)', 'unit' => 'ឈុត', 'qty' => 50, 'cost' => 0.80],
                ],
            ],
            [
                'number' => 'PUR-2610-0003',
                'supplier_id' => $suppDrinks->id,
                'date' => '2026-10-13',
                'ref' => 'BEV-BILL-1102',
                'items' => [
                    ['name' => 'Coca-Cola 330ml (Can)', 'unit' => 'កំប៉ុង', 'qty' => 96, 'cost' => 0.45],
                    ['name' => 'Angkor Beer Can 330ml', 'unit' => 'កំប៉ុង', 'qty' => 72, 'cost' => 0.75],
                    ['name' => 'ទឹកបរិសុទ្ធ ៥០០មល (Mineral Water)', 'unit' => 'ដប', 'qty' => 120, 'cost' => 0.25],
                ],
            ],
        ];

        foreach ($purchasesData as $pData) {
            if (Purchase::where('purchase_number', $pData['number'])->exists()) {
                continue;
            }

            $subtotal = 0;
            foreach ($pData['items'] as $item) {
                $subtotal += ($item['qty'] * $item['cost']);
            }

            $purchase = Purchase::create([
                'purchase_number' => $pData['number'],
                'supplier_id' => $pData['supplier_id'],
                'period_id' => $activePeriod ? $activePeriod->id : null,
                'purchase_date' => $pData['date'],
                'status' => 'received',
                'subtotal' => $subtotal,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'total_amount' => $subtotal,
                'reference_note' => $pData['ref'],
                'notes' => 'Received into cold storage and dry inventory pantry.',
                'created_by' => $adminId,
            ]);

            foreach ($pData['items'] as $item) {
                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'item_name' => $item['name'],
                    'unit_name' => $item['unit'],
                    'quantity' => $item['qty'],
                    'unit_cost' => $item['cost'],
                    'total_cost' => $item['qty'] * $item['cost'],
                ]);
            }
        }
    }
}
