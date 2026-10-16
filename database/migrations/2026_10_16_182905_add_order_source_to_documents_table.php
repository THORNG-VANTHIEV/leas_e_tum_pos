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
            $table->string('order_source', 20)->default('walk_in')->after('reference_identifier'); // walk_in, foodpanda, grab, nham24, wownow, other
            $table->string('external_order_ref', 40)->nullable()->after('order_source'); // Delivery app's own order number
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['order_source', 'external_order_ref']);
        });
    }
};
