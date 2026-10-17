<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KitchenTicket extends Model
{
    protected $fillable = [
        'document_id',
        'ticket_no',
        'lines',
        'created_by',
    ];

    protected $casts = [
        'ticket_no' => 'integer',
        'lines' => 'array',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Whether this ticket asks the kitchen to cook something new (not only cancellations).
     */
    public function hasAdditions(): bool
    {
        return collect($this->lines)->contains(fn (array $line) => $line['type'] === 'add');
    }
}
