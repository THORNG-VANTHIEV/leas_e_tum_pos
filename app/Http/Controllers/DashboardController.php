<?php

namespace App\Http\Controllers;

use App\Enums\DocumentStatus;
use App\Enums\PeriodStatus;
use App\Models\AuditLog;
use App\Models\BusinessSetting;
use App\Models\Document;
use App\Models\Location;
use App\Models\Period;
use App\Models\User;
use App\Support\Money\Money;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user->isAdmin();
        $cashierId = $request->integer('cashier_id') ?: null;

        $docQuery = Document::query()->visibleTo($user, $cashierId);

        $documentsCount = (clone $docQuery)->count();
        $unitCount = (clone $docQuery)->sum('unit_count');
        $voidCount = (clone $docQuery)->where('status', DocumentStatus::Void)->count();

        // Calculate gross revenue in integer cents
        $grossCents = 0;
        foreach ((clone $docQuery)->where('status', DocumentStatus::Finalized)->pluck('grand_total') as $total) {
            $grossCents += Money::toCents((string) $total);
        }

        $activePeriod = Period::where('status', PeriodStatus::Active)->first();

        $stats = [
            'gross_revenue' => Money::fromCents($grossCents),
            'documents_count' => $documentsCount,
            'unit_count' => (int) $unitCount,
            'void_count' => $voidCount,
            'active_period' => $activePeriod ? [
                'id' => $activePeriod->id,
                'code' => $activePeriod->code,
                'name' => $activePeriod->name,
                'start_date' => $activePeriod->start_date->toDateString(),
                'end_date' => $activePeriod->end_date->toDateString(),
            ] : null,
            'is_admin' => $isAdmin,
        ];

        // System overview metrics for Admin
        $systemMetrics = $isAdmin ? [
            'total_users' => User::count(),
            'active_users' => User::where('is_active', true)->count(),
            'total_locations' => Location::count(),
            'recent_audits' => AuditLog::with('actor:id,name,username')
                ->latest()
                ->take(8)
                ->get()
                ->map(fn ($log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'actor_name' => $log->actor?->name ?? 'System',
                    'reason' => $log->reason,
                    'created_at' => $log->created_at->diffForHumans(),
                ]),
        ] : null;

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'system_metrics' => $systemMetrics,
            'business' => BusinessSetting::current(),
            'cashiers' => $user->canViewAllRecords() ? User::filterOptions() : [],
            'filters' => ['cashier_id' => $cashierId],
        ]);
    }
}
