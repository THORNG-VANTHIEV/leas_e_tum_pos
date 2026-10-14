<?php

namespace Tests\Feature\Audit;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\Audit\AuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class AuditLogImmutabilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_audit_logs_cannot_be_updated_from_application(): void
    {
        $auditService = new AuditService();
        $log = $auditService->record('test.action', 'App\Models\User', null, ['foo' => 'bar'], null, null, 'Test reason');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Audit logs are append-only and cannot be updated.');

        $log->update(['reason' => 'Tampered reason']);
    }

    public function test_audit_logs_cannot_be_deleted_from_application(): void
    {
        $auditService = new AuditService();
        $log = $auditService->record('test.action', 'App\Models\User', null, ['foo' => 'bar'], null, null, 'Test reason');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Audit logs are append-only and cannot be deleted.');

        $log->delete();
    }
}
