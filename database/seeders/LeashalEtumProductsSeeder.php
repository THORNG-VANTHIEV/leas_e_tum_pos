<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;

class LeashalEtumProductsSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::first();
        $adminId = $admin ? $admin->id : 1;

        // Units
        $uCan = Unit::firstOrCreate(['code' => 'CAN'], ['name_primary' => 'កំប៉ុង', 'name_secondary' => 'Can', 'is_active' => true]);
        $uPlate = Unit::firstOrCreate(['code' => 'PLATE'], ['name_primary' => 'ចាន', 'name_secondary' => 'Plate', 'is_active' => true]);
        $uSet = Unit::firstOrCreate(['code' => 'SET'], ['name_primary' => 'ឈុត', 'name_secondary' => 'Set', 'is_active' => true]);
        $uGlass = Unit::firstOrCreate(['code' => 'GLASS'], ['name_primary' => 'កែវ', 'name_secondary' => 'Glass', 'is_active' => true]);
        $uBottle = Unit::firstOrCreate(['code' => 'BTL'], ['name_primary' => 'ដប', 'name_secondary' => 'Bottle', 'is_active' => true]);

        // Categories
        $catClams = ProductCategory::firstOrCreate(
            ['code' => 'CLAMS'],
            ['name_primary' => 'លៀសហាល & ខ្ចៅ', 'name_secondary' => 'Sun-dried Clams & Snails', 'category_type' => 'food', 'sort_order' => 1]
        );

        $catGrill = ProductCategory::firstOrCreate(
            ['code' => 'GRILL'],
            ['name_primary' => 'ពងទាកូន & សាច់អាំង', 'name_secondary' => 'Balut & BBQ Skewers', 'category_type' => 'food', 'sort_order' => 2]
        );

        $catSalad = ProductCategory::firstOrCreate(
            ['code' => 'SALAD'],
            ['name_primary' => 'បុកល្ហុង & ញាំ', 'name_secondary' => 'Papaya Salad & Yum', 'category_type' => 'food', 'sort_order' => 3]
        );

        $catDrinks = ProductCategory::firstOrCreate(
            ['code' => 'DRINKS'],
            ['name_primary' => 'ភេសជ្ជៈ & ទឹកផ្លែឈើ', 'name_secondary' => 'Beverages & Soft Drinks', 'category_type' => 'beverage', 'sort_order' => 4]
        );

        // Products for Leashal Etum
        $items = [
            // Clams
            [
                'sku' => 'ETUM-01',
                'category_id' => $catClams->id,
                'name_primary' => 'លៀសហាលរសជាតិដើម',
                'name_secondary' => 'Sun-dried Clams (Original)',
                'unit_id' => $uCan->id,
                'unit_price' => '2.00',
                'is_primary_package' => true,
                'sort_order' => 1,
            ],
            [
                'sku' => 'ETUM-02',
                'category_id' => $catClams->id,
                'name_primary' => 'លៀសហាលម្ទេសហឹរពិសេស',
                'name_secondary' => 'Spicy Sun-dried Clams (Special)',
                'unit_id' => $uCan->id,
                'unit_price' => '2.50',
                'is_primary_package' => true,
                'sort_order' => 2,
            ],
            [
                'sku' => 'ETUM-03',
                'category_id' => $catClams->id,
                'name_primary' => 'ខ្ចៅស្ងោរជ្រក់អំពិលទុំ',
                'name_secondary' => 'Boiled Snails w/ Tamarind Dip',
                'unit_id' => $uPlate->id,
                'unit_price' => '2.50',
                'is_primary_package' => false,
                'sort_order' => 3,
            ],

            // Grill & Balut
            [
                'sku' => 'GRILL-01',
                'category_id' => $catGrill->id,
                'name_primary' => 'ពងទាកូន (១ឈុត ២គ្រាប់)',
                'name_secondary' => 'Balut Egg Set (2 Eggs)',
                'unit_id' => $uSet->id,
                'unit_price' => '1.50',
                'is_primary_package' => false,
                'sort_order' => 10,
            ],
            [
                'sku' => 'GRILL-02',
                'category_id' => $catGrill->id,
                'name_primary' => 'ប្រហិតសាច់គោអាំង (៥ចង្កាក់)',
                'name_secondary' => 'Grilled Beef Meatballs (5 Skewers)',
                'unit_id' => $uSet->id,
                'unit_price' => '2.00',
                'is_primary_package' => false,
                'sort_order' => 11,
            ],
            [
                'sku' => 'GRILL-03',
                'category_id' => $catGrill->id,
                'name_primary' => 'មឹកអាំងទឹកត្រីកោះកុង',
                'name_secondary' => 'Grilled Squid Koh Kong Dip',
                'unit_id' => $uPlate->id,
                'unit_price' => '4.00',
                'is_primary_package' => false,
                'sort_order' => 12,
            ],

            // Salads
            [
                'sku' => 'SLD-01',
                'category_id' => $catSalad->id,
                'name_primary' => 'បុកល្ហុងក្តាមប្រៃហឹរស្រួយ',
                'name_secondary' => 'Som Tum Crab Spicy Salad',
                'unit_id' => $uPlate->id,
                'unit_price' => '2.50',
                'is_primary_package' => false,
                'sort_order' => 20,
            ],
            [
                'sku' => 'SLD-02',
                'category_id' => $catSalad->id,
                'name_primary' => 'បុកល្ហុងគ្រឿងសមុទ្រ',
                'name_secondary' => 'Seafood Papaya Salad',
                'unit_id' => $uPlate->id,
                'unit_price' => '3.50',
                'is_primary_package' => false,
                'sort_order' => 21,
            ],

            // Drinks
            [
                'sku' => 'DRK-01',
                'category_id' => $catDrinks->id,
                'name_primary' => 'តែបៃតងទឹកដោះគោទឹកកក',
                'name_secondary' => 'Iced Green Tea Milk',
                'unit_id' => $uGlass->id,
                'unit_price' => '1.25',
                'is_primary_package' => false,
                'sort_order' => 30,
            ],
            [
                'sku' => 'DRK-02',
                'category_id' => $catDrinks->id,
                'name_primary' => 'កូកាកូឡាត្រជាក់',
                'name_secondary' => 'Coca-Cola 330ml Can',
                'unit_id' => $uCan->id,
                'unit_price' => '0.75',
                'is_primary_package' => false,
                'sort_order' => 31,
            ],
            [
                'sku' => 'DRK-03',
                'category_id' => $catDrinks->id,
                'name_primary' => 'ស្រាបៀរអង្គរត្រជាក់',
                'name_secondary' => 'Angkor Beer Can',
                'unit_id' => $uCan->id,
                'unit_price' => '1.25',
                'is_primary_package' => false,
                'sort_order' => 32,
            ],
            [
                'sku' => 'DRK-04',
                'category_id' => $catDrinks->id,
                'name_primary' => 'ទឹកបរិសុទ្ធដប',
                'name_secondary' => 'Mineral Bottled Water',
                'unit_id' => $uBottle->id,
                'unit_price' => '0.50',
                'is_primary_package' => false,
                'sort_order' => 33,
            ],
        ];

        foreach ($items as $item) {
            Product::firstOrCreate(
                ['sku' => $item['sku']],
                [
                    ...$item,
                    'is_active' => true,
                    'created_by' => $adminId,
                    'updated_by' => $adminId,
                ]
            );
        }
    }
}
