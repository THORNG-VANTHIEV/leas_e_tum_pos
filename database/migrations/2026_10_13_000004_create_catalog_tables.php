<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name_primary', 150);
            $table->string('name_secondary', 150)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('product_categories', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name_primary', 150);
            $table->string('name_secondary', 150)->nullable();
            $table->string('category_type', 30); // food, beverage, package, etc.
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('product_categories')->restrictOnDelete();
            $table->string('sku', 60)->nullable()->unique();
            $table->string('name_primary', 180);
            $table->string('name_secondary', 180)->nullable();
            $table->foreignId('unit_id')->constrained('units')->restrictOnDelete();
            $table->decimal('unit_price', 12, 2);
            $table->boolean('is_primary_package')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('updated_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['category_id', 'is_active'], 'products_category_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
        Schema::dropIfExists('product_categories');
        Schema::dropIfExists('units');
    }
};
