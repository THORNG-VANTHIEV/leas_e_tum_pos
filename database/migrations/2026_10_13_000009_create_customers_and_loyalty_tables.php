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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('phone', 30)->nullable()->unique();
            $table->string('email', 120)->nullable();
            $table->text('address')->nullable();
            $table->string('tier', 20)->default('standard'); // standard, silver, gold, vip
            $table->unsignedInteger('loyalty_points')->default(0);
            $table->decimal('total_spent_usd', 12, 2)->default(0.00);
            $table->unsignedInteger('visits_count')->default(0);
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['phone', 'is_active']);
            $table->index('loyalty_points');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->foreignId('customer_id')->nullable()->after('reference_identifier')->constrained('customers')->nullOnDelete();
            $table->unsignedInteger('points_earned')->default(0)->after('customer_id');
            $table->unsignedInteger('points_redeemed')->default(0)->after('points_earned');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn(['customer_id', 'points_earned', 'points_redeemed']);
        });

        Schema::dropIfExists('customers');
    }
};
