<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashDrawerLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_id',
        'user_id',
        'type',
        'amount_usd',
        'amount_khr',
        'reason',
    ];

    protected $casts = [
        'amount_usd' => 'decimal:2',
        'amount_khr' => 'integer',
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(Period::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
