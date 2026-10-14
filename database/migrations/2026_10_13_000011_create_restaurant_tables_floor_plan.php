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
        Schema::create('restaurant_tables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('location_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->string('code', 30)->unique(); // e.g. T-01, T-02, VIP-1
            $table->string('name', 60); // តុ 01, តុ VIP 1
            $table->string('zone', 40)->default('Main Dining'); // Main Dining Hall, VIP Room, Outdoor Garden
            $table->unsignedInteger('capacity')->default(4); // 4 pax
            $table->string('shape', 20)->default('square'); // square, round, rectangle
            $table->string('status', 20)->default('available'); // available, occupied, reserved
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['zone', 'is_active']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('restaurant_tables');
    }
};
