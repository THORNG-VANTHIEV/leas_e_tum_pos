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

        // 1. Units
        $uDish = Unit::updateOrCreate(
            ['code' => 'DISH'],
            ['name_primary' => 'ចាន', 'name_secondary' => 'Plate / Dish', 'sort_order' => 1, 'is_active' => true]
        );
        $uSkewer = Unit::updateOrCreate(
            ['code' => 'SKEWER'],
            ['name_primary' => 'ចង្កាក់', 'name_secondary' => 'Skewer', 'sort_order' => 2, 'is_active' => true]
        );
        $uCan = Unit::updateOrCreate(
            ['code' => 'CAN'],
            ['name_primary' => 'កំប៉ុង', 'name_secondary' => 'Can', 'sort_order' => 3, 'is_active' => true]
        );
        $uBottle = Unit::updateOrCreate(
            ['code' => 'BTL'],
            ['name_primary' => 'ដប', 'name_secondary' => 'Bottle', 'sort_order' => 4, 'is_active' => true]
        );

        // Remove previous dummy products and categories
        Product::where('sku', 'NOT LIKE', 'ETUM-%')
            ->orWhereIn('sku', ['ETUM-01', 'ETUM-02', 'ETUM-03'])
            ->delete();

        ProductCategory::whereNotIn('code', [
            'STEAM_SPICE',
            'STEAM_TAMARIND',
            'BOILED_BLANCHED',
            'FRIED_GRILL',
            'BEVERAGES',
        ])->delete();

        // 2. Real Menu Categories
        $catSteamSpice = ProductCategory::updateOrCreate(
            ['code' => 'STEAM_SPICE'],
            [
                'name_primary' => 'មុខម្ហូបអប់គ្រឿង',
                'name_secondary' => 'Steamed with Khmer Herbs',
                'category_type' => 'food',
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        $catSteamTamarind = ProductCategory::updateOrCreate(
            ['code' => 'STEAM_TAMARIND'],
            [
                'name_primary' => 'មុខម្ហូបអប់អំពិលម្ទេស',
                'name_secondary' => 'Steamed Tamarind & Chili',
                'category_type' => 'food',
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        $catBoiled = ProductCategory::updateOrCreate(
            ['code' => 'BOILED_BLANCHED'],
            [
                'name_primary' => 'មុខម្ហូបស្ងោរ និងស្រុះ',
                'name_secondary' => 'Boiled & Blanched Dishes',
                'category_type' => 'food',
                'sort_order' => 3,
                'is_active' => true,
            ]
        );

        $catFriedGrill = ProductCategory::updateOrCreate(
            ['code' => 'FRIED_GRILL'],
            [
                'name_primary' => 'មុខម្ហូបបំពង អាំង និងប្រហិត',
                'name_secondary' => 'Fried, Grilled & Meatballs',
                'category_type' => 'food',
                'sort_order' => 4,
                'is_active' => true,
            ]
        );

        $catBeverages = ProductCategory::updateOrCreate(
            ['code' => 'BEVERAGES'],
            [
                'name_primary' => 'ភេសជ្ជៈ',
                'name_secondary' => 'Beverages & Soft Drinks',
                'category_type' => 'beverage',
                'sort_order' => 5,
                'is_active' => true,
            ]
        );

        // 3. Real Menu Products (All prices calibrated with exchange rate: 1 USD = 4,000 KHR)
        $products = [
            // --- ១. មុខម្ហូបអប់គ្រឿង ---
            [
                'sku' => 'ETUM-OP-01',
                'category_id' => $catSteamSpice->id,
                'name_primary' => 'លៀសអប់',
                'name_secondary' => 'Steamed River Clams w/ Herbs',
                'unit_id' => $uDish->id,
                'unit_price' => '1.75', // 7,000៛
                'image_url' => '/images/products/leas-op.png',
                'is_primary_package' => true,
                'sort_order' => 1,
            ],
            [
                'sku' => 'ETUM-OP-02',
                'category_id' => $catSteamSpice->id,
                'name_primary' => 'លៀសសអប់',
                'name_secondary' => 'Steamed White Clams w/ Herbs',
                'unit_id' => $uDish->id,
                'unit_price' => '2.50', // 10,000៛
                'image_url' => '/images/products/leas-sar-op.png',
                'is_primary_package' => false,
                'sort_order' => 2,
            ],
            [
                'sku' => 'ETUM-OP-03',
                'category_id' => $catSteamSpice->id,
                'name_primary' => 'ខ្យងស្រែអប់គ្រឿង',
                'name_secondary' => 'Steamed Field Snails w/ Herbs',
                'unit_id' => $uDish->id,
                'unit_price' => '2.50', // 10,000៛
                'image_url' => '/images/products/khyong-sre-op.png',
                'is_primary_package' => false,
                'sort_order' => 3,
            ],
            [
                'sku' => 'ETUM-OP-04',
                'category_id' => $catSteamSpice->id,
                'name_primary' => 'ខ្យៅអប់គ្រឿង',
                'name_secondary' => 'Steamed Small Snails w/ Herbs',
                'unit_id' => $uDish->id,
                'unit_price' => '1.75', // 7,000៛
                'image_url' => '/images/products/khyav-op-kroeung.png',
                'is_primary_package' => false,
                'sort_order' => 4,
            ],
            [
                'sku' => 'ETUM-OP-05',
                'category_id' => $catSteamSpice->id,
                'name_primary' => 'ប្រហិតសាច់គោអប់ (ធម្មតា)',
                'name_secondary' => 'Steamed Beef Meatballs (Regular)',
                'unit_id' => $uDish->id,
                'unit_price' => '1.25', // 5,000៛
                'image_url' => '/images/products/prohet-sach-ko-op.png',
                'is_primary_package' => false,
                'sort_order' => 5,
            ],
            [
                'sku' => 'ETUM-OP-06',
                'category_id' => $catSteamSpice->id,
                'name_primary' => 'ប្រហិតសាច់គោអប់ (ធំ)',
                'name_secondary' => 'Steamed Beef Meatballs (Large)',
                'unit_id' => $uDish->id,
                'unit_price' => '2.50', // 10,000៛
                'image_url' => '/images/products/prohet-sach-ko-op.png',
                'is_primary_package' => false,
                'sort_order' => 6,
            ],

            // --- ២. មុខម្ហូបអប់អំពិលម្ទេស ---
            [
                'sku' => 'ETUM-AM-01',
                'category_id' => $catSteamTamarind->id,
                'name_primary' => 'ងាវអប់អំពិលម្ទេស',
                'name_secondary' => 'Steamed Blood Cockles Tamarind Chili',
                'unit_id' => $uDish->id,
                'unit_price' => '3.75', // 15,000៛
                'image_url' => '/images/products/ngeav-op-ampil-mtes.png',
                'is_primary_package' => false,
                'sort_order' => 10,
            ],
            [
                'sku' => 'ETUM-AM-02',
                'category_id' => $catSteamTamarind->id,
                'name_primary' => 'បង្កងអប់អំពិលម្ទេស',
                'name_secondary' => 'Steamed Prawns Tamarind Chili',
                'unit_id' => $uDish->id,
                'unit_price' => '2.50', // 10,000៛
                'image_url' => '/images/products/bangkang-op-ampil-mtes.png',
                'is_primary_package' => false,
                'sort_order' => 11,
            ],
            [
                'sku' => 'ETUM-AM-03',
                'category_id' => $catSteamTamarind->id,
                'name_primary' => 'ក្ដាមស្រែអប់អំពិលម្ទេស',
                'name_secondary' => 'Steamed Field Crabs Tamarind Chili',
                'unit_id' => $uDish->id,
                'unit_price' => '1.75', // 7,000៛
                'image_url' => '/images/products/kdam-sre-op-ampil-mtes.png',
                'is_primary_package' => false,
                'sort_order' => 12,
            ],
            [
                'sku' => 'ETUM-AM-04',
                'category_id' => $catSteamTamarind->id,
                'name_primary' => 'ពងក្រួចកូន (ធម្មតា)',
                'name_secondary' => 'Quail Balut Eggs (Regular)',
                'unit_id' => $uDish->id,
                'unit_price' => '1.25', // 5,000៛
                'image_url' => '/images/products/pong-krouch-koun.png',
                'is_primary_package' => false,
                'sort_order' => 13,
            ],
            [
                'sku' => 'ETUM-AM-05',
                'category_id' => $catSteamTamarind->id,
                'name_primary' => 'ពងក្រួចកូន (ធំ)',
                'name_secondary' => 'Quail Balut Eggs (Large)',
                'unit_id' => $uDish->id,
                'unit_price' => '2.50', // 10,000៛
                'image_url' => '/images/products/pong-krouch-koun.png',
                'is_primary_package' => false,
                'sort_order' => 14,
            ],

            // --- ៣. មុខម្ហូបស្ងោរ និងស្រុះ ---
            [
                'sku' => 'ETUM-SS-01',
                'category_id' => $catBoiled->id,
                'name_primary' => 'ខ្យៅស្ងោរ',
                'name_secondary' => 'Boiled Small Snails w/ Dip',
                'unit_id' => $uDish->id,
                'unit_price' => '1.75', // 7,000៛
                'image_url' => '/images/products/khyav-sngor.png',
                'is_primary_package' => false,
                'sort_order' => 20,
            ],
            [
                'sku' => 'ETUM-SS-02',
                'category_id' => $catBoiled->id,
                'name_primary' => 'ក្ដាមស្ងោរ',
                'name_secondary' => 'Boiled Field Crabs w/ Lime Leaves',
                'unit_id' => $uDish->id,
                'unit_price' => '1.75', // 7,000៛
                'image_url' => '/images/products/kdam-sngor.png',
                'is_primary_package' => false,
                'sort_order' => 21,
            ],
            [
                'sku' => 'ETUM-SS-03',
                'category_id' => $catBoiled->id,
                'name_primary' => 'ខ្យងស្ងោរ',
                'name_secondary' => 'Boiled Field Apple Snails',
                'unit_id' => $uDish->id,
                'unit_price' => '2.50', // 10,000៛
                'image_url' => '/images/products/khyong-sngor.png',
                'is_primary_package' => false,
                'sort_order' => 22,
            ],
            [
                'sku' => 'ETUM-SS-04',
                'category_id' => $catBoiled->id,
                'name_primary' => 'ងាវស្រុះ',
                'name_secondary' => 'Blanched Fresh Blood Cockles',
                'unit_id' => $uDish->id,
                'unit_price' => '3.75', // 15,000៛
                'image_url' => '/images/products/ngeav-sros.png',
                'is_primary_package' => false,
                'sort_order' => 23,
            ],

            // --- ៤. មុខម្ហូបបំពង អាំង និងប្រហិត ---
            [
                'sku' => 'ETUM-BG-01',
                'category_id' => $catFriedGrill->id,
                'name_primary' => 'ស្លាបមាន់បំពង',
                'name_secondary' => 'Crispy Fried Chicken Wings',
                'unit_id' => $uDish->id,
                'unit_price' => '2.50', // 10,000៛
                'image_url' => '/images/products/sleab-moan-bampong.png',
                'is_primary_package' => false,
                'sort_order' => 30,
            ],
            [
                'sku' => 'ETUM-BG-02',
                'category_id' => $catFriedGrill->id,
                'name_primary' => 'ស្លាបមាន់បំពងផ្នែកកណ្ដាល',
                'name_secondary' => 'Crispy Chicken Mid-Joint Wings',
                'unit_id' => $uDish->id,
                'unit_price' => '2.50', // 10,000៛
                'image_url' => '/images/products/sleab-moan-kandal.png',
                'is_primary_package' => false,
                'sort_order' => 31,
            ],
            [
                'sku' => 'ETUM-BG-03',
                'category_id' => $catFriedGrill->id,
                'name_primary' => 'សាច់គោជ្រនួចអាំង',
                'name_secondary' => 'Grilled Beef Skewer w/ Pickles',
                'unit_id' => $uSkewer->id,
                'unit_price' => '0.63', // 2,500៛ / ចង្កាក់
                'image_url' => '/images/products/sach-ko-chranoch.png',
                'is_primary_package' => false,
                'sort_order' => 32,
            ],
            [
                'sku' => 'ETUM-BG-04',
                'category_id' => $catFriedGrill->id,
                'name_primary' => 'ប្រហិតសាច់គោ (ធម្មតា)',
                'name_secondary' => 'Fried Beef Meatballs (Regular)',
                'unit_id' => $uDish->id,
                'unit_price' => '1.25', // 5,000៛
                'image_url' => '/images/products/prohet-sach-ko.png',
                'is_primary_package' => false,
                'sort_order' => 33,
            ],
            [
                'sku' => 'ETUM-BG-05',
                'category_id' => $catFriedGrill->id,
                'name_primary' => 'ប្រហិតសាច់គោ (ធំ)',
                'name_secondary' => 'Fried Beef Meatballs (Large)',
                'unit_id' => $uDish->id,
                'unit_price' => '2.50', // 10,000៛
                'image_url' => '/images/products/prohet-sach-ko.png',
                'is_primary_package' => false,
                'sort_order' => 34,
            ],
            [
                'sku' => 'ETUM-BG-06',
                'category_id' => $catFriedGrill->id,
                'name_primary' => 'ប្រហិតបន្លែ',
                'name_secondary' => 'Fried Vegetable Fish Rolls',
                'unit_id' => $uDish->id,
                'unit_price' => '2.50', // 10,000៛
                'image_url' => '/images/products/prohet-banle.png',
                'is_primary_package' => false,
                'sort_order' => 35,
            ],

            // --- ៥. ភេសជ្ជៈ ---
            [
                'sku' => 'ETUM-DRK-01',
                'category_id' => $catBeverages->id,
                'name_primary' => 'ទឹកបរិសុទ្ធ',
                'name_secondary' => 'Pure Drinking Bottled Water',
                'unit_id' => $uBottle->id,
                'unit_price' => '0.50', // 2,000៛
                'image_url' => '/images/products/mineral-water.jpg',
                'is_primary_package' => false,
                'sort_order' => 40,
            ],
            [
                'sku' => 'ETUM-DRK-02',
                'category_id' => $catBeverages->id,
                'name_primary' => 'កូកាកូឡា',
                'name_secondary' => 'Coca-Cola 330ml Can',
                'unit_id' => $uCan->id,
                'unit_price' => '0.63', // 2,500៛
                'image_url' => '/images/products/coca-cola.jpg',
                'is_primary_package' => false,
                'sort_order' => 41,
            ],
        ];

        foreach ($products as $item) {
            Product::updateOrCreate(
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
