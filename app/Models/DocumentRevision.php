<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentRevision extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'document_id',
        'revision_no',
        'approval_request_id',
        'before_payload',
        'after_payload',
        'reason',
        'changed_by',
    ];

    protected $casts = [
        'before_payload' => 'array',
        'after_payload' => 'array',
        'revision_no' => 'integer',
        'created_at' => 'datetime',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function approval(): BelongsTo
    {
        return $this->belongsTo(ApprovalRequest::class, 'approval_request_id');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
