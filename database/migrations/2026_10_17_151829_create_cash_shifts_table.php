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
        Schema::create('cash_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->decimal('opening_float_usd', 12, 2)->default(0);
            // Snapshot of the drawer maths at closing time
            $table->decimal('cash_sales_usd', 12, 2)->nullable();
            $table->decimal('cash_in_usd', 12, 2)->nullable();
            $table->decimal('cash_out_usd', 12, 2)->nullable();
            $table->decimal('cash_expenses_usd', 12, 2)->nullable();
            $table->decimal('expected_cash_usd', 12, 2)->nullable();
            $table->decimal('counted_usd', 12, 2)->nullable();
            $table->unsignedBigInteger('counted_khr')->nullable();
            $table->decimal('exchange_rate_khr', 10, 2)->nullable();
            $table->decimal('counted_total_usd', 12, 2)->nullable();
            $table->decimal('variance_usd', 12, 2)->nullable(); // counted - expected (negative = short)
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'closed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_shifts');
    }
};
