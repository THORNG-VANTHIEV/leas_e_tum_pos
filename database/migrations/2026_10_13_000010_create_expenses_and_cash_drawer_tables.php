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
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->nullable()->constrained('periods')->nullOnDelete();
            $table->string('category', 40); // utilities, rent, supplies, staff_meal, maintenance, transport, marketing, other
            $table->string('title', 160);
            $table->text('description')->nullable();
            $table->decimal('amount_usd', 12, 2);
            $table->unsignedBigInteger('amount_khr')->default(0);
            $table->string('payment_method', 30)->default('cash_drawer'); // cash_drawer, petty_cash, bank_khqr, other
            $table->string('paid_to', 120)->nullable();
            $table->string('receipt_reference', 80)->nullable();
            $table->date('expense_date');
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['period_id', 'expense_date']);
            $table->index('category');
        });

        Schema::create('cash_drawer_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('periods')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('type', 30); // opening_float, cash_drop, cash_in, pay_out, closing_reconciliation
            $table->decimal('amount_usd', 12, 2);
            $table->unsignedBigInteger('amount_khr')->default(0);
            $table->string('reason', 200)->nullable();
            $table->timestamps();

            $table->index(['period_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_drawer_logs');
        Schema::dropIfExists('expenses');
    }
};
