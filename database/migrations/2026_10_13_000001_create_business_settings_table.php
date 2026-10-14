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
        Schema::create('business_settings', function (Blueprint $table) {
            $table->id();
            $table->string('business_name_primary', 180);
            $table->string('business_name_secondary', 180)->nullable();
            $table->text('address_primary')->nullable();
            $table->text('address_secondary')->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('logo_path', 500)->nullable();
            $table->string('tax_identifier', 40)->nullable();
            $table->char('currency_code', 3)->default('USD');
            $table->string('currency_symbol', 5)->default('$');
            $table->unsignedTinyInteger('decimal_places')->default(2);
            $table->string('timezone', 60)->default('Asia/Phnom_Penh');
            $table->string('document_language', 20)->default('bilingual');
            $table->text('document_footer')->nullable();
            $table->json('print_settings')->nullable();
            $table->json('entry_settings')->nullable();
            $table->json('font_settings')->nullable();
            $table->unsignedInteger('approval_expiry_minutes')->default(30);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('business_settings');
    }
};
