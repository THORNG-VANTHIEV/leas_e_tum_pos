<?php

namespace Tests\Feature\Documents;

use App\Enums\DocumentStatus;
use App\Features\Documents\Actions\PurgeDraftDocumentAction;
use App\Features\Documents\Actions\VoidDocumentAction;
use App\Models\AuditLog;
use App\Models\BusinessSetting;
use App\Models\Document;
use App\Models\Period;
use App\Models\PrintLog;
use App\Models\User;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DocumentPurgeAndVoidTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Period $period;

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
            'name' => 'Admin Test 2',
            'username' => 'admin_test2',
            'password' => bcrypt('secret'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $location = \App\Models\Location::create([
            'code' => 'LOC-01',
            'name_primary' => 'Main Hall',
            'is_active' => true,
            'created_by' => $this->admin->id,
        ]);

        $this->period = Period::create([
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
    }

    public function test_draft_document_can_be_purged_with_audit_trail(): void
    {
        $draft = Document::create([
            'period_id' => $this->period->id,
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
            'provisional_order' => 1,
            'business_date' => '2026-10-13',
            'event_time' => '12:00:00',
            'unit_count' => 1,
            'subtotal' => 10.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'grand_total' => 10.00,
            'source_total' => 10.00,
            'source_total_verified' => true,
            'amount_received' => 10.00,
            'change_amount' => 0.00,
            'payment_method' => 'cash',
            'status' => DocumentStatus::Draft,
            'version' => 1,
        ]);

        $draftId = $draft->id;

        $purgeAction = app(PurgeDraftDocumentAction::class);
        $purgeAction->handle($draftId, $this->admin->id);

        $this->assertDatabaseMissing('documents', ['id' => $draftId]);

        // Audit log must record the purge event
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'document.draft_purged',
            'actor_id' => $this->admin->id,
        ]);
    }

    public function test_finalized_document_cannot_be_purged(): void
    {
        $finalized = Document::create([
            'period_id' => $this->period->id,
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
            'provisional_order' => 1,
            'business_date' => '2026-10-13',
            'event_time' => '12:00:00',
            'unit_count' => 1,
            'subtotal' => 10.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'grand_total' => 10.00,
            'source_total' => 10.00,
            'source_total_verified' => true,
            'amount_received' => 10.00,
            'change_amount' => 0.00,
            'payment_method' => 'cash',
            'status' => DocumentStatus::Finalized,
            'document_number' => 'INV-0001',
            'sequence_no' => 1,
            'finalized_at' => now(),
            'version' => 1,
        ]);

        $purgeAction = app(PurgeDraftDocumentAction::class);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Only an unnumbered draft may be purged');

        $purgeAction->handle($finalized->id, $this->admin->id);
    }

    public function test_void_finalized_document_preserves_sequence_number(): void
    {
        $finalized = Document::create([
            'period_id' => $this->period->id,
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
            'provisional_order' => 1,
            'business_date' => '2026-10-13',
            'event_time' => '12:00:00',
            'unit_count' => 1,
            'subtotal' => 10.00,
            'tax_amount' => 0.00,
            'discount_amount' => 0.00,
            'grand_total' => 10.00,
            'source_total' => 10.00,
            'source_total_verified' => true,
            'amount_received' => 10.00,
            'change_amount' => 0.00,
            'payment_method' => 'cash',
            'status' => DocumentStatus::Finalized,
            'document_number' => 'INV-0001',
            'sequence_no' => 1,
            'finalized_at' => now(),
            'version' => 1,
        ]);

        $voidAction = app(VoidDocumentAction::class);
        $voidAction->handle($finalized->id, 'Mistake in guest pax', $this->admin->id, null);

        $finalized->refresh();

        $this->assertEquals(DocumentStatus::Void, $finalized->status);
        $this->assertEquals('INV-0001', $finalized->document_number);
        $this->assertEquals(1, $finalized->sequence_no);
        $this->assertStringContainsString('Mistake in guest pax', $finalized->note);
    }
}
