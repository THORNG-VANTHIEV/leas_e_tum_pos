<?php

namespace App\Features\Shifts\Services;

use App\Enums\DocumentStatus;
use App\Models\CashDrawerLog;
use App\Models\CashShift;
use App\Models\Document;
use App\Models\Expense;
use App\Support\Money\Money;
use Carbon\CarbonInterface;

/**
 * Works out how much cash should be in a cashier's drawer for a shift.
 *
 * expected = opening float + cash sales (received - change) + cash in - cash out (drops, pay-outs) - expenses paid from the drawer
 * Only the shift owner's own movements inside the shift window count; voided and app/KHQR/card sales never touch the drawer.
 */
final class CashShiftCalculator
{
    /**
     * @return array{opening_float_usd: string, cash_sales_usd: string, cash_sales_count: int, cash_in_usd: string, cash_out_usd: string, cash_expenses_usd: string, expected_cash_usd: string}
     */
    public function summarize(CashShift $shift, CarbonInterface $until): array
    {
        $window = [$shift->opened_at, $until];

        $cashSales = Document::query()
            ->where('finalized_by', $shift->user_id)
            ->where('status', DocumentStatus::Finalized)
            ->where('payment_method', 'cash')
            ->whereBetween('finalized_at', $window)
            ->get(['amount_received', 'change_amount']);
        $cashSalesCents = $cashSales->sum(fn (Document $doc) => Money::toCents((string) $doc->amount_received) - Money::toCents((string) $doc->change_amount));

        $drawerLogs = CashDrawerLog::query()
            ->where('user_id', $shift->user_id)
            ->whereBetween('created_at', $window)
            ->get(['type', 'amount_usd']);
        $cashInCents = $drawerLogs->where('type', 'cash_in')->sum(fn ($log) => Money::toCents((string) $log->amount_usd));
        $cashOutCents = $drawerLogs->whereIn('type', ['cash_drop', 'pay_out'])->sum(fn ($log) => Money::toCents((string) $log->amount_usd));

        $expenseCents = Expense::query()
            ->where('created_by', $shift->user_id)
            ->where('payment_method', 'cash_drawer')
            ->whereBetween('created_at', $window)
            ->get(['amount_usd'])
            ->sum(fn (Expense $expense) => Money::toCents((string) $expense->amount_usd));

        $floatCents = Money::toCents((string) $shift->opening_float_usd);
        $expectedCents = $floatCents + $cashSalesCents + $cashInCents - $cashOutCents - $expenseCents;

        return [
            'opening_float_usd' => Money::fromCents($floatCents),
            'cash_sales_usd' => Money::fromCents($cashSalesCents),
            'cash_sales_count' => $cashSales->count(),
            'cash_in_usd' => Money::fromCents($cashInCents),
            'cash_out_usd' => Money::fromCents($cashOutCents),
            'cash_expenses_usd' => Money::fromCents($expenseCents),
            'expected_cash_usd' => Money::fromCents($expectedCents),
        ];
    }
}
