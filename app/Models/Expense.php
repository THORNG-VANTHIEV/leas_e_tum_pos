<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_id',
        'category',
        'title',
        'description',
        'amount_usd',
        'amount_khr',
        'payment_method',
        'paid_to',
        'receipt_reference',
        'expense_date',
        'created_by',
    ];

    protected $casts = [
        'amount_usd' => 'decimal:2',
        'amount_khr' => 'integer',
        'expense_date' => 'date:Y-m-d',
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Cashiers see only what they recorded; managers everything, optionally one cashier.
     */
    public function scopeVisibleTo(Builder $query, User $user, ?int $cashierId = null): Builder
    {
        if (! $user->canViewAllRecords()) {
            return $query->where('created_by', $user->id);
        }

        return $cashierId ? $query->where('created_by', $cashierId) : $query;
    }
}
