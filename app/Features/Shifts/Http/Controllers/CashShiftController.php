<?php

namespace App\Features\Shifts\Http\Controllers;

use App\Features\Shifts\Services\CashShiftCalculator;
use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\CashShift;
use App\Models\User;
use App\Support\Audit\AuditService;
use App\Support\Money\Money;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CashShiftController extends Controller
{
    public function __construct(
        private readonly CashShiftCalculator $calculator,
        private readonly AuditService $audit,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $cashierId = $request->integer('cashier_id') ?: null;
        $current = CashShift::open()->where('user_id', $user->id)->first();

        $history = CashShift::query()
            ->visibleTo($user, $cashierId)
            ->whereNotNull('closed_at')
            ->with('user:id,name,username')
            ->latest('closed_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('shifts/index', [
            'current_shift' => $current ? [
                'id' => $current->id,
                'opened_at' => $current->opened_at->format('Y-m-d H:i'),
                'summary' => $this->calculator->summarize($current, now()),
            ] : null,
            'history' => $history,
            'exchange_rate' => BusinessSetting::current()->khrExchangeRate(),
            'cashiers' => $user->canViewAllRecords() ? User::filterOptions() : [],
            'filters' => ['cashier_id' => $cashierId],
        ]);
    }

    public function open(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'opening_float_usd' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:999999'],
        ]);
        $user = $request->user();

        if (CashShift::open()->where('user_id', $user->id)->exists()) {
            return back()->with('error', 'អ្នកមានវេនកំពុងបើករួចហើយ។');
        }

        $shift = CashShift::create([
            'user_id' => $user->id,
            'opened_at' => now(),
            'opening_float_usd' => $validated['opening_float_usd'],
        ]);

        $this->audit->record('shift.opened', $shift, null, ['opening_float_usd' => $shift->opening_float_usd], null, $user->id, 'Opened cash drawer shift');

        return back()->with('success', "បានបើកវេន ជាមួយលុយដើម \${$shift->opening_float_usd}");
    }

    public function close(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'counted_usd' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:999999'],
            'counted_khr' => ['nullable', 'integer', 'min:0', 'max:999999999'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);
        $user = $request->user();
        $shift = CashShift::open()->where('user_id', $user->id)->first();

        if (! $shift) {
            return back()->with('error', 'មិនមានវេនកំពុងបើកទេ។');
        }

        $closedAt = now();
        $summary = $this->calculator->summarize($shift, $closedAt);
        $rate = BusinessSetting::current()->khrExchangeRate();
        $countedKhr = (int) ($validated['counted_khr'] ?? 0);

        // Riel in the drawer is converted to dollars at the Settings rate
        $countedTotalCents = Money::toCents((string) $validated['counted_usd']) + (int) round($countedKhr / $rate * 100);
        $varianceCents = $countedTotalCents - Money::toCents($summary['expected_cash_usd']);

        $shift->update([
            'closed_at' => $closedAt,
            'cash_sales_usd' => $summary['cash_sales_usd'],
            'cash_in_usd' => $summary['cash_in_usd'],
            'cash_out_usd' => $summary['cash_out_usd'],
            'cash_expenses_usd' => $summary['cash_expenses_usd'],
            'expected_cash_usd' => $summary['expected_cash_usd'],
            'counted_usd' => $validated['counted_usd'],
            'counted_khr' => $countedKhr,
            'exchange_rate_khr' => $rate,
            'counted_total_usd' => Money::fromCents($countedTotalCents),
            'variance_usd' => Money::fromCents($varianceCents),
            'note' => $validated['note'] ?? null,
        ]);

        $this->audit->record(
            'shift.closed',
            $shift,
            null,
            $shift->only(['expected_cash_usd', 'counted_total_usd', 'variance_usd']),
            null,
            $user->id,
            'Closed cash drawer shift'
        );

        $variance = Money::fromCents($varianceCents);
        $result = match (true) {
            $varianceCents === 0 => 'ត្រូវគ្នា',
            $varianceCents < 0 => 'ខ្វះ $'.ltrim($variance, '-'),
            default => "លើស \${$variance}",
        };

        return back()->with('success', "បានបិទវេន៖ លុយគួរមាន \${$summary['expected_cash_usd']}, រាប់បាន \$".Money::fromCents($countedTotalCents)." — {$result}");
    }
}
