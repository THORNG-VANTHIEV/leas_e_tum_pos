<?php

namespace App\Support\Audit;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Str;

class AuditService
{
    /**
     * Record an append-only audit event.
     *
     * @param string $action
     * @param Model|string $auditable
     * @param array<string, mixed>|null $oldValues
     * @param array<string, mixed>|null $newValues
     * @param array<string, mixed>|null $metadata
     * @param int|null $actorId
     * @param string|null $reason
     * @param string|null $requestId
     * @return AuditLog
     */
    public function record(
        string $action,
        Model|string $auditable,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?array $metadata = null,
        ?int $actorId = null,
        ?string $reason = null,
        ?string $requestId = null,
    ): AuditLog {
        $auditableType = $auditable instanceof Model ? $auditable->getMorphClass() : (string) $auditable;
        $auditableId = $auditable instanceof Model ? (int) $auditable->getKey() : 0;

        return AuditLog::create([
            'actor_id' => $actorId ?? Auth::id(),
            'action' => $action,
            'auditable_type' => $auditableType,
            'auditable_id' => $auditableId,
            'request_id' => $requestId ?? (string) (Request::header('X-Request-ID') ?: Str::uuid()),
            'reason' => $reason,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'metadata' => $metadata,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }
}
