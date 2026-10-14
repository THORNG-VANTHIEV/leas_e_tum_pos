<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RestaurantTable extends Model
{
    use HasFactory;

    protected $fillable = [
        'location_id',
        'code',
        'name',
        'zone',
        'capacity',
        'shape',
        'status',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'capacity' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }
}
