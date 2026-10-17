<?php

namespace App\Features\Approvals\Http\Controllers;

use App\Enums\ApprovalStatus;
use App\Enums\ApprovalType;
use App\Http\Controllers\Controller;
use App\Models\ApprovalRequest;
use App\Models\BusinessSetting;
use App\Support\Audit\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ApprovalController extends Controller
{
    public function __construct(
        protected AuditService $audit,
    ) {}

    /**
     * Approvals Inbox view.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $user->isAdmin();

        $query = ApprovalRequest::with(['requester:id,name,username', 'reviewer:id,name,username', 'document:id,document_number,reference_identifier'])
            ->when(! $isAdmin, fn ($q) => $q->where('requested_by', $user->id));

        $requests = (clone $query)->latest()->get();

        return Inertia::render('approvals/index', [
            'approvals' => $requests,
        ]);
    }

    /**
     * Submit an approval request.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'document_id' => ['nullable', 'integer', 'exists:documents,id'],
            'request_type' => ['required', Rule::enum(ApprovalType::class)],
            'target_type' => ['required', 'string', 'in:document,document_item,period'],
            'target_id' => ['required', 'integer'],
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
            'requested_changes' => ['nullable', 'array'],
        ]);

        $approval = ApprovalRequest::create([
            ...$validated,
            'requested_by' => $request->user()->id,
            'status' => ApprovalStatus::Pending,
        ]);

        $this->audit->record(
            'approval.requested',
            $approval,
            null,
            $validated,
            null,
            $request->user()->id,
            $validated['reason']
        );

        return back()->with('success', __('បានផ្ញើសំណើសុំការអនុម័តរួចហើយ។'));
    }

    /**
     * Approve request (Admin only).
     */
    public function approve(Request $request, ApprovalRequest $approval): RedirectResponse
    {
        if ($approval->status !== ApprovalStatus::Pending) {
            return back()->with('error', __('អាចអនុម័តបានតែសំណើដែលកំពុងរង់ចាំប៉ុណ្ណោះ។'));
        }

        $setting = BusinessSetting::current();
        $expiryMinutes = $setting->approval_expiry_minutes ?? 30;

        $approval->update([
            'status' => ApprovalStatus::Approved,
            'reviewed_by' => $request->user()->id,
            'review_note' => $request->input('review_note', 'Approved by administrator'),
            'reviewed_at' => now(),
            'expires_at' => now()->addMinutes($expiryMinutes),
        ]);

        $this->audit->record(
            'approval.approved',
            $approval,
            ['status' => 'pending'],
            ['status' => 'approved', 'expires_at' => $approval->expires_at->toIso8601String()],
            null,
            $request->user()->id,
            'Approved exception request'
        );

        return back()->with('success', __('បានអនុម័ត។ មានសុពលភាព :expiryMinutes នាទី។', ['expiryMinutes' => $expiryMinutes]));
    }

    /**
     * Reject request (Admin only).
     */
    public function reject(Request $request, ApprovalRequest $approval): RedirectResponse
    {
        $validated = $request->validate([
            'review_note' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $approval->update([
            'status' => ApprovalStatus::Rejected,
            'reviewed_by' => $request->user()->id,
            'review_note' => $validated['review_note'],
            'reviewed_at' => now(),
        ]);

        $this->audit->record(
            'approval.rejected',
            $approval,
            ['status' => 'pending'],
            ['status' => 'rejected', 'review_note' => $validated['review_note']],
            null,
            $request->user()->id,
            $validated['review_note']
        );

        return back()->with('success', __('បានបដិសេធសំណើ។'));
    }
}
