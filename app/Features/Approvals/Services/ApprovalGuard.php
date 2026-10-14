<?php

namespace App\Features\Approvals\Services;

use App\Enums\ApprovalStatus;
use App\Enums\ApprovalType;
use App\Models\ApprovalRequest;
use DomainException;

final class ApprovalGuard
{
    /**
     * Assert that an approval is approved, unexpired, unconsumed, and matches target and payload.
     *
     * @param ApprovalRequest $approval
     * @param ApprovalType $type
     * @param string $targetType
     * @param int $targetId
     * @param array<string, mixed>|null $normalizedPayload
     * @throws DomainException
     */
    public function assertUsable(
        ApprovalRequest $approval,
        ApprovalType $type,
        string $targetType,
        int $targetId,
        ?array $normalizedPayload = null
    ): void {
        if ($approval->status !== ApprovalStatus::Approved) {
            throw new DomainException('Approval request is not in approved status.');
        }

        if ($approval->expires_at === null || ! $approval->expires_at->isFuture()) {
            throw new DomainException('Approval request has expired and can no longer be used.');
        }

        if ($approval->used_at !== null || $approval->status === ApprovalStatus::Used) {
            throw new DomainException('Approval request has already been consumed (single-use invariant INV-06).');
        }

        if ($approval->request_type !== $type) {
            throw new DomainException("Approval request type mismatch. Expected {$type->value}.");
        }

        if ($approval->target_type !== $targetType || (int) $approval->target_id !== $targetId) {
            throw new DomainException('Approval request target does not match current operation.');
        }

        if ($normalizedPayload !== null && ($approval->requested_changes ?? []) !== $normalizedPayload) {
            throw new DomainException('Approved mutation payload does not match attempted changes.');
        }
    }
}
