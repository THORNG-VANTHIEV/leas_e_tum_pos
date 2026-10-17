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
     * @param  array<string, mixed>|null  $normalizedPayload
     *
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
            throw new DomainException(__('សំណើនេះមិនទាន់ត្រូវបានអនុម័តទេ។ (Approval request is not in approved status)'));
        }

        if ($approval->expires_at === null || ! $approval->expires_at->isFuture()) {
            throw new DomainException(__('សំណើនេះផុតកំណត់ហើយ មិនអាចប្រើបានទៀតទេ។ (Approval request has expired)'));
        }

        if ($approval->used_at !== null || $approval->status === ApprovalStatus::Used) {
            throw new DomainException(__('សំណើនេះត្រូវបានប្រើរួចហើយ (ប្រើបានតែម្តង)។ (Approval request has already been consumed)'));
        }

        if ($approval->request_type !== $type) {
            throw new DomainException(__('ប្រភេទសំណើមិនត្រូវគ្នា។ ត្រូវការ :value។', ['value' => $type->value]));
        }

        if ($approval->target_type !== $targetType || (int) $approval->target_id !== $targetId) {
            throw new DomainException(__('សំណើនេះមិនមែនសម្រាប់ប្រតិបត្តិការនេះទេ។'));
        }

        if ($normalizedPayload !== null && ($approval->requested_changes ?? []) !== $normalizedPayload) {
            throw new DomainException(__('ការកែប្រែមិនដូចអ្វីដែលបានអនុម័តទេ។'));
        }
    }
}
