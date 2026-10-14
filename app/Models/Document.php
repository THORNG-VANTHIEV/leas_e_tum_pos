<?php

namespace App\Models;

use App\Enums\DocumentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_id',
        'provisional_order',
        'sequence_no',
        'document_number',
        'business_date',
        'event_time',
        'reference_identifier',
        'unit_count',
        'source_total',
        'source_total_verified',
        'subtotal',
        'tax_amount',
        'discount_amount',
        'grand_total',
        'amount_received',
        'change_amount',
        'payment_method',
        'status',
        'note',
        'print_settings_snapshot',
        'entry_settings_snapshot',
        'created_by',
        'updated_by',
        'finalized_by',
        'finalized_at',
        'kitchen_status',
        'kitchen_started_at',
        'kitchen_ready_at',
        'kitchen_served_at',
        'customer_id',
        'points_earned',
        'points_redeemed',
        'lock_version',
    ];

    protected $casts = [
        'status' => DocumentStatus::class,
        'business_date' => 'date:Y-m-d',
        'source_total' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'amount_received' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'source_total_verified' => 'boolean',
        'unit_count' => 'integer',
        'provisional_order' => 'integer',
        'sequence_no' => 'integer',
        'lock_version' => 'integer',
        'points_earned' => 'integer',
        'points_redeemed' => 'integer',
        'kitchen_started_at' => 'datetime',
        'kitchen_ready_at' => 'datetime',
        'kitchen_served_at' => 'datetime',
        'print_settings_snapshot' => 'array',
        'entry_settings_snapshot' => 'array',
        'finalized_at' => 'datetime',
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(DocumentItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function finalizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(DocumentRevision::class);
    }

    public function printLogs(): HasMany
    {
        return $this->hasMany(PrintLog::class);
    }
}
