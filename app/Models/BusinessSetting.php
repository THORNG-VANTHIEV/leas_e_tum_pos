<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BusinessSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_name_primary',
        'business_name_secondary',
        'address_primary',
        'address_secondary',
        'phone',
        'logo_path',
        'tax_identifier',
        'currency_code',
        'currency_symbol',
        'decimal_places',
        'timezone',
        'document_language',
        'document_footer',
        'print_settings',
        'entry_settings',
        'font_settings',
        'approval_expiry_minutes',
    ];

    protected function casts(): array
    {
        return [
            'print_settings' => 'array',
            'entry_settings' => 'array',
            'font_settings' => 'array',
            'decimal_places' => 'integer',
            'approval_expiry_minutes' => 'integer',
        ];
    }

    public static function current(): self
    {
        return static::firstOrCreate(
            ['id' => 1],
            [
                'business_name_primary' => 'លៀសហាល អ៉ីទុម',
                'business_name_secondary' => 'LEASHAL ETUM POS',
                'address_primary' => 'Phnom Penh, Cambodia',
                'phone' => '+855 12 345 678',
                'currency_code' => 'USD',
                'currency_symbol' => '$',
                'decimal_places' => 2,
                'timezone' => 'Asia/Phnom_Penh',
                'document_language' => 'bilingual',
                'document_footer' => 'Thank you for dining with us! សូមអរគុណ!',
                'print_settings' => [
                    'format' => '80mm',
                    'show_guest_count' => true,
                    'show_item_quantity' => true,
                    'show_tax' => false,
                ],
                'entry_settings' => [
                    'require_source_total' => true,
                    'show_event_time' => true,
                ],
                'font_settings' => [
                    'primary_font' => 'Inter',
                    'khmer_font' => 'Siemreap',
                ],
                'approval_expiry_minutes' => 30,
            ]
        );
    }
}
