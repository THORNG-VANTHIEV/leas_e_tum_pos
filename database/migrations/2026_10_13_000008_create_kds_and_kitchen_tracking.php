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
        Schema::table('documents', function (Blueprint $table) {
            $table->string('kitchen_status', 20)->default('pending')->after('status'); // pending, cooking, ready, served
            $table->timestamp('kitchen_started_at')->nullable()->after('kitchen_status');
            $table->timestamp('kitchen_ready_at')->nullable()->after('kitchen_started_at');
            $table->timestamp('kitchen_served_at')->nullable()->after('kitchen_ready_at');
        });

        Schema::table('document_items', function (Blueprint $table) {
            $table->string('kitchen_status', 20)->default('pending')->after('line_position');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('document_items', function (Blueprint $table) {
            $table->dropColumn('kitchen_status');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn([
                'kitchen_status',
                'kitchen_started_at',
                'kitchen_ready_at',
                'kitchen_served_at',
            ]);
        });
    }
};
