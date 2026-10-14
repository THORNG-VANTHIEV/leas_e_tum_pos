<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'product_id',
        'line_position',
        'kitchen_status',
        'category_type_snapshot',
        'product_name_primary_snapshot',
        'product_name_secondary_snapshot',
        'unit_snapshot',
        'quantity',
        'master_price_at_entry',
        'unit_price',
        'line_total',
        'is_primary_package_snapshot',
        'is_price_override',
        'override_reason',
        'override_approved_by',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'line_position' => 'integer',
        'master_price_at_entry' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'line_total' => 'decimal:2',
        'is_primary_package_snapshot' => 'boolean',
        'is_price_override' => 'boolean',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
