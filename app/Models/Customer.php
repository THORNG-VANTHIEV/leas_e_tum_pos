<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'tier',
        'loyalty_points',
        'total_spent_usd',
        'visits_count',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'loyalty_points' => 'integer',
        'total_spent_usd' => 'decimal:2',
        'visits_count' => 'integer',
        'is_active' => 'boolean',
    ];

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }
}
