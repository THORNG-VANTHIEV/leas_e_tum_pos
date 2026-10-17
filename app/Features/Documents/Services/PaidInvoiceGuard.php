<?php

namespace App\Features\Documents\Services;

use App\Enums\PeriodStatus;
use App\Models\Customer;
use App\Models\Document;
use DomainException;

/**
 * Shared rules for changing an invoice after it was paid: only while its sales period is still open,
 * and the customer's loyalty totals follow the invoice.
 */
final class PaidInvoiceGuard
{
    /**
     * Closed periods are locked: their totals were already reported.
     */
    public function assertPeriodOpen(Document $document): void
    {
        if ($document->period?->status === PeriodStatus::Closed) {
            throw new DomainException(__('វិក្កយបត្រនេះនៅក្នុងវគ្គដែលបានបិទបញ្ជីរួច មិនអាចកែ ឬលុបបានទេ។'));
        }
    }

    /**
     * Add (+1) or take back (-1) what this invoice gave the customer: one visit, its points and its spend.
     */
    public function applyLoyalty(Document $document, int $direction): void
    {
        if (! $document->customer_id) {
            return;
        }

        $customer = Customer::find($document->customer_id);
        if (! $customer) {
            return;
        }

        $customer->update([
            'visits_count' => max(0, $customer->visits_count + $direction),
            'loyalty_points' => max(0, $customer->loyalty_points + $direction * (int) $document->points_earned),
            'total_spent_usd' => max(0, (float) $customer->total_spent_usd + $direction * (float) $document->grand_total),
        ]);
    }
}
