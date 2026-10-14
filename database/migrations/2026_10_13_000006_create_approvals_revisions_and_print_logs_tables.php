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
        Schema::create('approval_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->nullable()->constrained('documents')->nullOnDelete();
            $table->string('request_type', 30); // edit_finalized, price_override, void, reopen_period
            $table->string('target_type', 40);  // document, document_item, period
            $table->unsignedBigInteger('target_id');
            $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
            $table->text('reason');
            $table->json('requested_changes')->nullable();
            $table->string('status', 20)->default('pending'); // pending, approved, rejected, expired, used
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('review_note')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('used_at')->nullable();
            $table->foreignId('used_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'request_type', 'created_at'], 'idx_status_type_created');
            $table->index(['target_type', 'target_id'], 'idx_target');
        });

        Schema::create('document_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->restrictOnDelete();
            $table->unsignedInteger('revision_no');
            $table->foreignId('approval_request_id')->nullable()->constrained('approval_requests')->nullOnDelete();
            $table->json('before_payload');
            $table->json('after_payload');
            $table->text('reason');
            $table->foreignId('changed_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['document_id', 'revision_no'], 'uq_document_revision');
        });

        Schema::create('print_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_id')->constrained('documents')->restrictOnDelete();
            $table->string('format', 20); // 80mm, a5, pdf
            $table->string('print_type', 20)->default('original'); // original, reprint
            $table->char('request_id', 36)->unique();
            $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('requested_at')->useCurrent();
            $table->string('document_checksum', 64)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('print_logs');
        Schema::dropIfExists('document_revisions');
        Schema::dropIfExists('approval_requests');
    }
};
