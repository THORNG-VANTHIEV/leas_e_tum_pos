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
        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name_primary', 150);
            $table->string('name_secondary', 150)->nullable();
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('user_locations', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('location_id')->constrained('locations')->restrictOnDelete();
            $table->boolean('is_default')->default(false);
            $table->timestamp('created_at')->nullable();

            $table->primary(['user_id', 'location_id']);
            $table->index('location_id', 'user_locations_location');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_locations');
        Schema::dropIfExists('locations');
    }
};
