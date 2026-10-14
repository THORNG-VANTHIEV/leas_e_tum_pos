<?php

namespace App\Models;

use App\Enums\ApprovalStatus;
use App\Enums\ApprovalType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'request_type',
        'target_type',
        'target_id',
        'requested_by',
        'reason',
        'requested_changes',
        'status',
        'reviewed_by',
        'review_note',
        'reviewed_at',
        'expires_at',
        'used_at',
        'used_by',
    ];

    protected $casts = [
        'request_type' => ApprovalType::class,
        'status' => ApprovalStatus::class,
        'requested_changes' => 'array',
        'reviewed_at' => 'datetime',
        'expires_at' => 'datetime',
        'used_at' => 'datetime',
        'target_id' => 'integer',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function consumer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'used_by');
    }

    public function isUsable(): bool
    {
        return $this->status === ApprovalStatus::Approved
            && $this->expires_at !== null
            && $this->expires_at->isFuture()
            && $this->used_at === null;
    }
}
