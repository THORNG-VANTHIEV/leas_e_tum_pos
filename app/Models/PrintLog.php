<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrintLog extends Model
{
    use HasFactory;

    public const CREATED_AT = 'requested_at';
    public const UPDATED_AT = null;

    protected $fillable = [
        'document_id',
        'format',
        'print_type',
        'request_id',
        'requested_by',
        'requested_at',
        'document_checksum',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}
