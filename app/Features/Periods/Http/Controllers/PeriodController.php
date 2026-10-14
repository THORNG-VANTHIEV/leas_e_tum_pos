<?php

namespace App\Features\Periods\Http\Controllers;

use App\Enums\DocumentStatus;
use App\Enums\PeriodStatus;
use App\Features\Periods\Actions\FinalizePeriodDocuments;
use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Models\Document;
use App\Models\Location;
use App\Models\Period;
use App\Support\Audit\AuditService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PeriodController extends Controller
{
    public function __construct(
        protected FinalizePeriodDocuments $finalizeAction,
        protected AuditService $audit,
    ) {}

    /**
     * Periods list.
     */
    public function index(Request $request): Response
    {
        $periods = Period::with(['location', 'creator:id,name,username', 'closer:id,name,username'])
            ->withCount([
                'documents as total_docs',
                'documents as draft_docs' => fn ($q) => $q->where('status', DocumentStatus::Draft),
                'documents as finalized_docs' => fn ($q) => $q->where('status', DocumentStatus::Finalized),
            ])
            ->latest()
            ->get();

        $locations = Location::where('is_active', true)->get();

        return Inertia::render('periods/index', [
            'periods' => $periods,
            'locations' => $locations,
        ]);
    }

    /**
     * Store a new draft period.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'location_id' => ['required', 'integer', 'exists:locations,id'],
            'code' => ['required', 'string', 'max:20', 'unique:periods,code'],
            'name' => ['required', 'string', 'max:150'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'document_prefix' => ['required', 'string', 'max:10'],
            'starting_sequence' => ['required', 'integer', 'min:1', 'max:9999'],
        ]);

        $period = Period::create([
            ...$validated,
            'status' => PeriodStatus::Draft,
            'created_by' => $request->user()->id,
        ]);

        $this->audit->record(
            'period.created',
            $period,
            null,
            $validated,
            null,
            $request->user()->id,
            'Created draft period'
        );

        return back()->with('success', "Period '{$period->code}' created as draft.");
    }

    /**
     * Activate a period (captures entry/print settings snapshots).
     */
    public function activate(Request $request, Period $period): RedirectResponse
    {
        if ($period->status !== PeriodStatus::Draft && $period->status !== PeriodStatus::Review) {
            return back()->with('error', 'Only draft periods or periods in review can be activated.');
        }

        $setting = BusinessSetting::current();

        $period->update([
            'status' => PeriodStatus::Active,
            'activated_by' => $request->user()->id,
            'activated_at' => now(),
            'entry_settings_snapshot' => $setting->entry_settings,
            'print_settings_snapshot' => $setting->print_settings,
            'lock_version' => $period->lock_version + 1,
        ]);

        $this->audit->record(
            'period.activated',
            $period,
            null,
            ['status' => 'active', 'entry_settings_snapshot' => $setting->entry_settings],
            null,
            $request->user()->id,
            'Activated period and snapshotted entry policy'
        );

        return back()->with('success', "Period '{$period->code}' is now ACTIVE for cashier entry.");
    }

    /**
     * Lock entry and begin review.
     */
    public function review(Request $request, Period $period): RedirectResponse
    {
        if ($period->status !== PeriodStatus::Active) {
            return back()->with('error', 'Only active periods can be placed under review.');
        }

        $period->update([
            'status' => PeriodStatus::Review,
            'lock_version' => $period->lock_version + 1,
        ]);

        $this->audit->record(
            'period.review_started',
            $period,
            null,
            ['status' => 'review'],
            null,
            $request->user()->id,
            'Locked period entry for variance reconciliation'
        );

        return redirect()->route('periods.review-view', $period->id)
            ->with('success', "Period '{$period->code}' entry locked for review.");
    }

    /**
     * Render the period review screen.
     */
    public function reviewView(Request $request, Period $period): Response
    {
        $period->load(['location']);

        $documents = Document::with(['items', 'creator:id,name,username'])
            ->where('period_id', $period->id)
            ->whereNull('sequence_no')
            ->orderBy('business_date')
            ->orderBy('event_time')
            ->orderBy('provisional_order')
            ->orderBy('id')
            ->get();

        return Inertia::render('periods/review', [
            'period' => $period,
            'documents' => $documents,
        ]);
    }

    /**
     * Finalize period and stamp gapless numbers.
     */
    public function finalize(Request $request, Period $period): RedirectResponse
    {
        try {
            $finalized = $this->finalizeAction->handle($period->id, $request->user()->id);
            return redirect()->route('periods.index')
                ->with('success', "Period '{$finalized->code}' finalized successfully. Sequence up to #{$finalized->last_sequence_no} stamped.");
        } catch (DomainException $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
