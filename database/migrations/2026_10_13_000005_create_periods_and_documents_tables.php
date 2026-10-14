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
        Schema::create('periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('location_id')->constrained('locations')->restrictOnDelete();
            $table->string('code', 20)->unique();
            $table->string('name', 150);
            $table->date('start_date');
            $table->date('end_date');
            $table->string('document_prefix', 20)->default('INV');
            $table->unsignedInteger('starting_sequence')->default(1);
            $table->unsignedInteger('last_sequence_no')->default(0);
            $table->string('status', 20)->default('draft'); // draft, active, review, closed
            $table->unsignedInteger('revision')->default(1);
            $table->json('entry_settings_snapshot')->nullable();
            $table->json('print_settings_snapshot')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('activated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('activated_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->text('reopen_reason')->nullable();
            $table->unsignedInteger('lock_version')->default(0);
            $table->timestamps();

            $table->index(['location_id', 'status'], 'periods_location_status');
            $table->index(['start_date', 'end_date'], 'periods_dates');
        });

        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('periods')->restrictOnDelete();
            $table->unsignedInteger('provisional_order')->default(1);
            $table->unsignedInteger('sequence_no')->nullable();
            $table->string('document_number', 60)->nullable()->unique();
            $table->date('business_date');
            $table->time('event_time');
            $table->string('reference_identifier', 30)->nullable(); // Table #, Room #
            $table->unsignedInteger('unit_count')->default(0);
            $table->decimal('source_total', 12, 2);
            $table->boolean('source_total_verified')->default(false);
            $table->decimal('subtotal', 12, 2);
            $table->decimal('tax_amount', 12, 2)->default(0.00);
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('grand_total', 12, 2);
            $table->decimal('amount_received', 12, 2);
            $table->decimal('change_amount', 12, 2);
            $table->string('payment_method', 20)->default('cash');
            $table->string('status', 20)->default('draft'); // draft, review, finalized, void
            $table->text('note')->nullable();
            $table->json('print_settings_snapshot')->nullable();
            $table->json('entry_settings_snapshot')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('updated_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('finalized_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('finalized_at')->nullable();
            $table->unsignedInteger('lock_version')->default(0);
            $table->timestamps();

            $table->unique(['period_id', 'sequence_no'], 'uq_period_sequence');
            $table->index(['period_id', 'status', 'business_date'], 'idx_period_status_date');
            $table->index(['created_by', 'created_at'], 'idx_created_by_date');
        });

        Schema::create('document_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->unsignedInteger('line_position');
            $table->string('category_type_snapshot', 30);
            $table->string('product_name_primary_snapshot', 180);
            $table->string('product_name_secondary_snapshot', 180)->nullable();
            $table->string('unit_snapshot', 40);
            $table->unsignedInteger('quantity');
            $table->decimal('master_price_at_entry', 12, 2);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('line_total', 12, 2);
            $table->boolean('is_primary_package_snapshot')->default(false);
            $table->boolean('is_price_override')->default(false);
            $table->text('override_reason')->nullable();
            $table->foreignId('override_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['document_id', 'line_position'], 'uq_document_line');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_items');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('periods');
    }
};
