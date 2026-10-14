<?php

namespace Tests\Feature\Approvals;

use App\Enums\ApprovalStatus;
use App\Enums\ApprovalType;
use App\Features\Approvals\Services\ApprovalGuard;
use App\Models\ApprovalRequest;
use App\Models\BusinessSetting;
use App\Models\Document;
use App\Models\Period;
use App\Models\User;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApprovalConsumptionTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $cashier;
    protected Document $document;

    protected function setUp(): void
    {
        parent::setUp();

        BusinessSetting::create([
            'business_name_primary' => 'Jerng Krann POS',
            'currency_code' => 'USD',
            'currency_symbol' => '$',
            'decimal_places' => 2,
            'timezone' => 'Asia/Phnom_Penh',
            'document_language' => 'km_en',
            'active_period_id' => null,
            'entry_controls' => ['require_source_total' => false],
            'print_layouts' => ['show_guest_count' => true],
            'typography' => ['primary_font' => 'Inter'],
        ]);

        $this->admin = User::create([
            'name' => 'Admin Appr',
            'username' => 'admin_appr',
            'password' => bcrypt('secret'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->cashier = User::create([
            'name' => 'Cashier Appr',
            'username' => 'cashier_appr',
            'password' => bcrypt('secret'),
            'role' => 'cashier',
            'is_active' => true,
        ]);

        $location = \App\Models\Location::create([
            'code' => 'LOC-01',
            'name_primary' => 'Main Hall',
            'is_active' => true,
            'created_by' => $this->admin->id,
        ]);

        $period = Period::create([
            'code' => 'P-01',
            'name' => 'Period 1',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-31',
            'status' => 'active',
            'location_id' => $location->id,
            'reconciliation_required_snapshot' => false,
            'numbering_prefix' => 'INV-',
            'sequence_padding' => 4,
            'next_sequence_no' => 1,
            'created_by' => $this->admin->id,
        ]);

        $this->document = Document::create([
            'period_id' => $period->id,
            'created_by' => $this->cashier->id,
            'updated_by' => $this->cashier->id,
            'provisional_order' => 1,
            'business_date' => '2026-10-13',
            'event_time' => '12:00:00',
            'unit_count' => 1,
            'subtotal' => 20.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'grand_total' => 20.00,
            'source_total' => 20.00,
            'source_total_verified' => true,
            'amount_received' => 20.00,
            'change_amount' => 0.00,
            'payment_method' => 'cash',
            'status' => 'finalized',
            'document_number' => 'INV-0001',
            'sequence_no' => 1,
            'version' => 1,
        ]);
    }

    public function test_unapproved_or_pending_token_cannot_be_used(): void
    {
        $approval = ApprovalRequest::create([
            'request_type' => ApprovalType::Void,
            'target_type' => 'document',
            'target_id' => $this->document->id,
            'reason' => 'Customer refunded',
            'requested_by' => $this->cashier->id,
            'status' => ApprovalStatus::Pending,
        ]);

        $guard = app(ApprovalGuard::class);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Approval request is not in approved status');

        $guard->assertUsable($approval, ApprovalType::Void, 'document', $this->document->id);
    }

    public function test_expired_token_is_rejected(): void
    {
        $approval = ApprovalRequest::create([
            'request_type' => ApprovalType::Void,
            'target_type' => 'document',
            'target_id' => $this->document->id,
            'reason' => 'Customer refunded',
            'requested_by' => $this->cashier->id,
            'reviewed_by' => $this->admin->id,
            'status' => ApprovalStatus::Approved,
            'expires_at' => now()->subMinutes(5), // Expired
        ]);

        $guard = app(ApprovalGuard::class);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Approval request has expired');

        $guard->assertUsable($approval, ApprovalType::Void, 'document', $this->document->id);
    }

    public function test_consumed_token_cannot_be_reused(): void
    {
        $approval = ApprovalRequest::create([
            'request_type' => ApprovalType::Void,
            'target_type' => 'document',
            'target_id' => $this->document->id,
            'reason' => 'Customer refunded',
            'requested_by' => $this->cashier->id,
            'reviewed_by' => $this->admin->id,
            'status' => ApprovalStatus::Approved,
            'expires_at' => now()->addMinutes(15),
            'used_at' => now()->subMinute(),
        ]);

        $guard = app(ApprovalGuard::class);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Approval request has already been consumed');

        $guard->assertUsable($approval, ApprovalType::Void, 'document', $this->document->id);
    }

    public function test_valid_approved_token_passes_guard_assertion(): void
    {
        $approval = ApprovalRequest::create([
            'request_type' => ApprovalType::Void,
            'target_type' => 'document',
            'target_id' => $this->document->id,
            'reason' => 'Customer refunded',
            'requested_by' => $this->cashier->id,
            'reviewed_by' => $this->admin->id,
            'status' => ApprovalStatus::Approved,
            'expires_at' => now()->addMinutes(15),
        ]);

        $guard = app(ApprovalGuard::class);

        // Should not throw any exception
        $guard->assertUsable($approval, ApprovalType::Void, 'document', $this->document->id);
        $this->assertTrue(true);
    }
}
