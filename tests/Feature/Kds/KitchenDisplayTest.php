<?php

namespace Tests\Feature\Kds;

use App\Enums\DocumentStatus;
use App\Enums\UserRole;
use App\Models\Document;
use App\Models\Location;
use App\Models\Period;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KitchenDisplayTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Period $period;

    private Location $location;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => UserRole::Admin,
            'is_active' => true,
        ]);

        $this->location = Location::create([
            'code' => 'LOC-01',
            'name_primary' => 'Main Stall',
            'name_secondary' => 'តូបធំ',
            'address' => 'Street 123',
            'is_active' => true,
            'created_by' => $this->admin->id,
        ]);

        $this->period = Period::resolveActive($this->location->id, $this->admin->id);
    }

    public function test_kds_can_be_accessed_and_status_updated(): void
    {
        $document = Document::create([
            'period_id' => $this->period->id,
            'sequence_no' => 1,
            'document_number' => 'DOC-0001',
            'business_date' => now()->toDateString(),
            'event_time' => now()->format('H:i:s'),
            'reference_identifier' => 'តុ ០១',
            'unit_count' => 1,
            'source_total' => '5.00',
            'source_total_verified' => true,
            'subtotal' => '5.00',
            'grand_total' => '5.00',
            'amount_received' => '5.00',
            'change_amount' => '0.00',
            'payment_method' => 'cash',
            'status' => DocumentStatus::Finalized,
            'kitchen_status' => 'pending',
            'created_by' => $this->admin->id,
            'updated_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->get('/kds');
        $response->assertOk();

        // Update to cooking
        $updateResponse = $this->actingAs($this->admin)->post("/kds/orders/{$document->id}/status", [
            'status' => 'cooking',
        ]);
        $updateResponse->assertRedirect();
        $this->assertEquals('cooking', $document->fresh()->kitchen_status);
        $this->assertNotNull($document->fresh()->kitchen_started_at);

        // Update to ready
        $this->actingAs($this->admin)->post("/kds/orders/{$document->id}/status", [
            'status' => 'ready',
        ]);
        $this->assertEquals('ready', $document->fresh()->kitchen_status);

        // Update to served
        $this->actingAs($this->admin)->post("/kds/orders/{$document->id}/status", [
            'status' => 'served',
        ]);
        $this->assertEquals('served', $document->fresh()->kitchen_status);
    }
}
