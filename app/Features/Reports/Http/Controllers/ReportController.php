<?php

namespace App\Features\Reports\Http\Controllers;

use App\Enums\DocumentStatus;
use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Expense;
use App\Models\Period;
use App\Models\Purchase;
use App\Models\User;
use App\Support\Money\Money;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response as ResponseFactory;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * Operational Reports and Financial Register Hub.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $selectedPeriodId = $request->query('period_id');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $selectedCashierId = $request->query('cashier_id');

        // Scoping per Section 13.4: Cashiers see strictly their own documents
        $cashierFilter = $selectedCashierId ? (int) $selectedCashierId : null;
        $baseQuery = Document::query()->with(['creator', 'period'])->visibleTo($user, $cashierFilter);

        if ($selectedPeriodId) {
            $baseQuery->where('period_id', $selectedPeriodId);
        }

        if ($startDate) {
            $baseQuery->where('business_date', '>=', $startDate);
        }

        if ($endDate) {
            $baseQuery->where('business_date', '<=', $endDate);
        }

        $allDocs = (clone $baseQuery)->get();

        // Separate active finalized/draft vs void documents per spec Section 13.5
        // Sales are paid invoices only; held tables (drafts) are reported separately as open orders
        $validDocs = $allDocs->filter(fn (Document $doc) => $doc->status === DocumentStatus::Finalized);
        $voidDocs = $allDocs->filter(fn (Document $doc) => $doc->status === DocumentStatus::Void);
        $openDocs = $allDocs->filter(fn (Document $doc) => in_array($doc->status, [DocumentStatus::Draft, DocumentStatus::Review], true));

        $grossSalesCents = 0;
        $discountCents = 0;
        $taxCents = 0;
        $grandTotalCents = 0;
        $cashTenderedCents = 0;
        $changeGivenCents = 0;
        $totalUnits = 0;
        $unverifiedCount = 0;

        foreach ($validDocs as $doc) {
            $grossSalesCents += Money::toCents((string) ($doc->subtotal ?? '0.00'));
            $discountCents += Money::toCents((string) ($doc->discount_amount ?? '0.00'));
            $taxCents += Money::toCents((string) ($doc->tax_amount ?? '0.00'));
            $grandTotalCents += Money::toCents((string) ($doc->grand_total ?? '0.00'));
            $totalUnits += (int) $doc->unit_count;

            if (strtolower($doc->payment_method ?? '') === 'cash') {
                $cashTenderedCents += Money::toCents((string) ($doc->amount_received ?? '0.00'));
                $changeGivenCents += Money::toCents((string) ($doc->change_amount ?? '0.00'));
            }

            if (! $doc->source_total_verified) {
                $unverifiedCount++;
            }
        }

        $netSalesCents = $grossSalesCents - $discountCents;
        $netCashReceivedCents = $cashTenderedCents - $changeGivenCents;

        $voidValueCents = 0;
        foreach ($voidDocs as $doc) {
            $voidValueCents += Money::toCents((string) ($doc->grand_total ?? '0.00'));
        }

        // Cashier breakdown aggregation
        $cashierBreakdown = [];
        // Attribute each sale to the cashier who took the payment
        $groupedByCashier = $validDocs->groupBy(fn (Document $doc) => $doc->ownerId());

        foreach ($groupedByCashier as $cashierId => $docs) {
            $cashierName = $docs->first()->creator->name ?? 'Unknown';
            $cashierGross = 0;
            $cashierNet = 0;
            $cashierChange = 0;
            $cashierNetCash = 0;

            foreach ($docs as $d) {
                $sub = Money::toCents((string) ($d->subtotal ?? '0.00'));
                $disc = Money::toCents((string) ($d->discount_amount ?? '0.00'));
                $cashierGross += $sub;
                $cashierNet += ($sub - $disc);

                if (strtolower($d->payment_method ?? '') === 'cash') {
                    $ten = Money::toCents((string) ($d->amount_received ?? '0.00'));
                    $chg = Money::toCents((string) ($d->change_amount ?? '0.00'));
                    $cashierChange += $chg;
                    $cashierNetCash += ($ten - $chg);
                }
            }

            $cashierBreakdown[] = [
                'cashier_id' => $cashierId,
                'name' => $cashierName,
                'document_count' => $docs->count(),
                'gross_sales' => Money::fromCents($cashierGross),
                'net_sales' => Money::fromCents($cashierNet),
                'change_sum' => Money::fromCents($cashierChange),
                'net_cash' => Money::fromCents($cashierNetCash),
            ];
        }

        // Financial P&L: Expenses Query
        $expenseQuery = Expense::query()->with('creator')->visibleTo($user, $cashierFilter);
        if ($selectedPeriodId) {
            $expenseQuery->where('period_id', $selectedPeriodId);
        }
        if ($startDate) {
            $expenseQuery->whereDate('expense_date', '>=', $startDate);
        }
        if ($endDate) {
            $expenseQuery->whereDate('expense_date', '<=', $endDate);
        }
        $expenses = $expenseQuery->get();
        $totalExpensesUsd = (float) $expenses->sum('amount_usd');
        $totalExpensesKhr = (int) $expenses->sum('amount_khr');

        // Expense category breakdown
        $expenseCategoryBreakdown = $expenses->groupBy('category')->map(function ($items, $category) {
            return [
                'category' => $category,
                'count' => $items->count(),
                'total_usd' => (float) $items->sum('amount_usd'),
                'total_khr' => (int) $items->sum('amount_khr'),
            ];
        })->values();

        // Financial P&L: Purchases Query
        $purchaseQuery = Purchase::query()->with('supplier')->where('status', '!=', 'cancelled')->visibleTo($user, $cashierFilter);
        if ($selectedPeriodId) {
            $purchaseQuery->where('period_id', $selectedPeriodId);
        }
        if ($startDate) {
            $purchaseQuery->whereDate('purchase_date', '>=', $startDate);
        }
        if ($endDate) {
            $purchaseQuery->whereDate('purchase_date', '<=', $endDate);
        }
        $purchases = $purchaseQuery->get();
        $totalPurchasesUsd = (float) $purchases->sum('total_amount');

        $netSalesUsd = $netSalesCents / 100;
        $totalOutgoingUsd = $totalExpensesUsd + $totalPurchasesUsd;
        $netProfitUsd = $netSalesUsd - $totalOutgoingUsd;
        $profitMarginPct = $netSalesUsd > 0 ? round(($netProfitUsd / $netSalesUsd) * 100, 1) : 0;

        $financialSummary = [
            'gross_sales' => Money::fromCents($grossSalesCents),
            'discounts' => Money::fromCents($discountCents),
            'net_sales' => Money::fromCents($netSalesCents),
            'operating_expenses' => round($totalExpensesUsd, 2),
            'operating_expenses_khr' => $totalExpensesKhr,
            'stock_purchases' => round($totalPurchasesUsd, 2),
            'total_outgoing' => round($totalOutgoingUsd, 2),
            'net_profit' => round($netProfitUsd, 2),
            'profit_margin_pct' => $profitMarginPct,
            'expense_categories' => $expenseCategoryBreakdown,
            'expenses_count' => $expenses->count(),
            'purchases_count' => $purchases->count(),
        ];

        $periods = Period::orderByDesc('id')->get(['id', 'code', 'name', 'status']);
        $cashiers = $user->canViewAllRecords() ? User::filterOptions() : [];

        // Paginated or latest 50 documents for register preview
        $documents = $baseQuery->orderByDesc('id')->limit(100)->get();

        return Inertia::render('reports/index', [
            'metrics' => [
                'gross_sales' => Money::fromCents($grossSalesCents),
                'discounts' => Money::fromCents($discountCents),
                'net_sales' => Money::fromCents($netSalesCents),
                'tax_collected' => Money::fromCents($taxCents),
                'invoiced_total' => Money::fromCents($grandTotalCents),
                'cash_tendered' => Money::fromCents($cashTenderedCents),
                'change_given' => Money::fromCents($changeGivenCents),
                'net_cash_received' => Money::fromCents($netCashReceivedCents),
                'total_documents' => $validDocs->count(),
                'total_units' => $totalUnits,
                'void_count' => $voidDocs->count(),
                'open_orders_count' => $openDocs->count(),
                'open_orders_value' => Money::fromCents($openDocs->sum(fn (Document $doc) => Money::toCents((string) $doc->grand_total))),
                'void_value' => Money::fromCents($voidValueCents),
                'unverified_count' => $unverifiedCount,
            ],
            'financialSummary' => $financialSummary,
            'cashierBreakdown' => $cashierBreakdown,
            'documents' => $documents,
            'periods' => $periods,
            'cashiers' => $cashiers,
            'filters' => [
                'period_id' => $selectedPeriodId,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'cashier_id' => $selectedCashierId,
            ],
        ]);
    }

    /**
     * Structured CSV export covering Summary and Document Register per Section 13.5.
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $user = $request->user();
        $selectedPeriodId = $request->query('period_id');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $selectedCashierId = $request->query('cashier_id');

        $query = Document::query()->with(['creator', 'period'])
            ->visibleTo($user, $selectedCashierId ? (int) $selectedCashierId : null);

        if ($selectedPeriodId) {
            $query->where('period_id', $selectedPeriodId);
        }
        if ($startDate) {
            $query->where('business_date', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('business_date', '<=', $endDate);
        }

        $docs = $query->orderBy('id')->get();

        $filename = 'financial-register-'.now()->format('Y-m-d-His').'.csv';

        return ResponseFactory::stream(function () use ($docs) {
            $handle = fopen('php://output', 'w');

            // Header Row
            fputcsv($handle, [
                'Document #',
                'Status',
                'Period Code',
                'Date',
                'Time',
                'Table / Ref',
                'Cashier',
                'Pax Units',
                'Subtotal',
                'Discount',
                'Tax',
                'Grand Total',
                'Source Total',
                'Verified',
                'Payment Method',
                'Tendered',
                'Change',
            ]);

            foreach ($docs as $d) {
                fputcsv($handle, [
                    $d->document_number ?? ('DRAFT-'.str_pad((string) $d->provisional_order, 4, '0', STR_PAD_LEFT)),
                    strtoupper($d->status),
                    $d->period->code ?? 'N/A',
                    $d->business_date,
                    $d->event_time,
                    $d->reference_identifier ?? '',
                    $d->creator->name ?? 'Unknown',
                    $d->unit_count,
                    $d->subtotal,
                    $d->discount_amount,
                    $d->tax_amount,
                    $d->grand_total,
                    $d->source_total,
                    $d->source_total_verified ? 'YES' : 'NO',
                    strtoupper($d->payment_method),
                    $d->amount_received,
                    $d->change_amount,
                ]);
            }

            fclose($handle);
        }, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
