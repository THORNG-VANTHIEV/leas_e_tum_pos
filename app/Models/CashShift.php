<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashShift extends Model
{
    protected $fillable = [
        'user_id',
        'opened_at',
        'closed_at',
        'opening_float_usd',
        'cash_sales_usd',
        'cash_in_usd',
        'cash_out_usd',
        'cash_expenses_usd',
        'expected_cash_usd',
        'counted_usd',
        'counted_khr',
        'exchange_rate_khr',
        'counted_total_usd',
        'variance_usd',
        'note',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'opening_float_usd' => 'decimal:2',
        'cash_sales_usd' => 'decimal:2',
        'cash_in_usd' => 'decimal:2',
        'cash_out_usd' => 'decimal:2',
        'cash_expenses_usd' => 'decimal:2',
        'expected_cash_usd' => 'decimal:2',
        'counted_usd' => 'decimal:2',
        'counted_khr' => 'integer',
        'exchange_rate_khr' => 'decimal:2',
        'counted_total_usd' => 'decimal:2',
        'variance_usd' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->whereNull('closed_at');
    }

    /**
     * Cashiers see their own shifts; managers everyone's, optionally one cashier.
     */
    public function scopeVisibleTo(Builder $query, User $user, ?int $cashierId = null): Builder
    {
        if (! $user->canViewAllRecords()) {
            return $query->where('user_id', $user->id);
        }

        return $cashierId ? $query->where('user_id', $cashierId) : $query;
    }
}
