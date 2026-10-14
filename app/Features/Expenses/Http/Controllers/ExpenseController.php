<?php

namespace App\Features\Expenses\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\CashDrawerLog;
use App\Models\Expense;
use App\Models\Period;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExpenseController extends Controller
{
    public function index(Request $request): Response
    {
        $category = $request->query('category');
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');

        $query = Expense::query()->with(['creator', 'period']);

        if ($category && $category !== 'all') {
            $query->where('category', $category);
        }

        if ($dateFrom) {
            $query->whereDate('expense_date', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('expense_date', '<=', $dateTo);
        }

        $expenses = $query->orderByDesc('expense_date')->orderByDesc('id')->paginate(20)->withQueryString();

        $activePeriod = Period::where('status', 'active')->first();

        // Cash drawer logs for current active period or recent
        $drawerLogs = CashDrawerLog::with('user')
            ->when($activePeriod, fn ($q) => $q->where('period_id', $activePeriod->id))
            ->orderByDesc('id')
            ->take(20)
            ->get();

        // Metrics
        $totalUsd = (float) Expense::sum('amount_usd');
        $totalKhr = (int) Expense::sum('amount_khr');

        $todayUsd = (float) Expense::whereDate('expense_date', today())->sum('amount_usd');
        $todayKhr = (int) Expense::whereDate('expense_date', today())->sum('amount_khr');

        // Drawer movement today
        $todayDropsUsd = (float) CashDrawerLog::where('type', 'cash_drop')
            ->whereDate('created_at', today())
            ->sum('amount_usd');

        $todayCashInUsd = (float) CashDrawerLog::where('type', 'cash_in')
            ->whereDate('created_at', today())
            ->sum('amount_usd');

        // Category breakdown
        $categoryBreakdown = Expense::selectRaw('category, sum(amount_usd) as total_usd, count(*) as count')
            ->groupBy('category')
            ->get()
            ->keyBy('category');

        $settings = BusinessSetting::current();
        $exchangeRate = $settings->exchange_rate ?? 4100;

        return Inertia::render('expenses/index', [
            'expenses' => $expenses,
            'drawerLogs' => $drawerLogs,
            'activePeriod' => $activePeriod,
            'exchangeRate' => $exchangeRate,
            'metrics' => [
                'total_usd' => $totalUsd,
                'total_khr' => $totalKhr,
                'today_usd' => $todayUsd,
                'today_khr' => $todayKhr,
                'today_drops_usd' => $todayDropsUsd,
                'today_cash_in_usd' => $todayCashInUsd,
                'category_breakdown' => $categoryBreakdown,
            ],
            'filters' => [
                'category' => $category ?? 'all',
                'date_from' => $dateFrom ?? '',
                'date_to' => $dateTo ?? '',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category' => 'required|string|max:40',
            'title' => 'required|string|max:160',
            'description' => 'nullable|string|max:500',
            'amount_usd' => 'required|numeric|min:0',
            'amount_khr' => 'nullable|integer|min:0',
            'payment_method' => 'required|string|max:30',
            'paid_to' => 'nullable|string|max:120',
            'receipt_reference' => 'nullable|string|max:80',
            'expense_date' => 'required|date',
        ]);

        $settings = BusinessSetting::current();
        $rate = $settings->exchange_rate ?? 4100;

        $amountKhr = $validated['amount_khr'] ?? (int) round($validated['amount_usd'] * $rate);
        $activePeriod = Period::where('status', 'active')->first();

        Expense::create([
            'period_id' => $activePeriod?->id,
            'category' => $validated['category'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'amount_usd' => $validated['amount_usd'],
            'amount_khr' => $amountKhr,
            'payment_method' => $validated['payment_method'],
            'paid_to' => $validated['paid_to'] ?? null,
            'receipt_reference' => $validated['receipt_reference'] ?? null,
            'expense_date' => $validated['expense_date'],
            'created_by' => $request->user()->id,
        ]);

        return back()->with('success', "បានកត់ត្រាចំណាយថ្មី: {$validated['title']} (\${$validated['amount_usd']})");
    }

    public function storeDrawerLog(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:opening_float,cash_drop,cash_in,pay_out,closing_reconciliation',
            'amount_usd' => 'required|numeric|min:0',
            'amount_khr' => 'nullable|integer|min:0',
            'reason' => 'nullable|string|max:200',
        ]);

        $activePeriod = Period::where('status', 'active')->first();
        if (! $activePeriod) {
            return back()->with('error', 'មិនមានវេនលក់ (Period) កំពុងដំណើរការទេ');
        }

        $settings = BusinessSetting::current();
        $rate = $settings->exchange_rate ?? 4100;
        $amountKhr = $validated['amount_khr'] ?? (int) round($validated['amount_usd'] * $rate);

        CashDrawerLog::create([
            'period_id' => $activePeriod->id,
            'user_id' => $request->user()->id,
            'type' => $validated['type'],
            'amount_usd' => $validated['amount_usd'],
            'amount_khr' => $amountKhr,
            'reason' => $validated['reason'] ?? null,
        ]);

        return back()->with('success', 'បានកត់ត្រាចលនាសាច់ប្រាក់ក្នុងថតបេឡាបានជោគជ័យ');
    }

    public function exportCsv(): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="expenses_export_' . date('Ymd_His') . '.csv"',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF)); // UTF-8 BOM
            fputcsv($handle, ['ID', 'កាលបរិច្ឆេទ', 'ប្រភេទចំណាយ', 'ចំណងជើង', 'ចំនួនទឹកប្រាក់ USD', 'ចំនួនទឹកប្រាក់ KHR', 'វិធីទូទាត់', 'អ្នកទទួល', 'លេខបុង']);

            Expense::orderByDesc('expense_date')->chunk(200, function ($rows) use ($handle) {
                foreach ($rows as $row) {
                    fputcsv($handle, [
                        $row->id,
                        $row->expense_date->format('Y-m-d'),
                        $row->category,
                        $row->title,
                        $row->amount_usd,
                        $row->amount_khr,
                        $row->payment_method,
                        $row->paid_to,
                        $row->receipt_reference,
                    ]);
                }
            });

            fclose($handle);
        }, 200, $headers);
    }
}
