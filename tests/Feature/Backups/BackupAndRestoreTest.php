<?php

namespace Tests\Feature\Backups;

use App\Models\BusinessSetting;
use App\Models\Location;
use App\Models\Period;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Tests\TestCase;
use ZipArchive;

class BackupAndRestoreTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $cashier;

    protected function setUp(): void
    {
        parent::setUp();

        BusinessSetting::create([
            'business_name_primary' => 'លៀសហាល អ៉ីទុម',
            'business_name_secondary' => 'LEASHAL ETUM POS',
            'currency_code' => 'USD',
            'currency_symbol' => '$',
            'decimal_places' => 2,
            'timezone' => 'Asia/Phnom_Penh',
            'document_language' => 'km_en',
            'entry_controls' => ['require_source_total' => false],
            'print_layouts' => ['show_guest_count' => true],
            'typography' => ['primary_font' => 'Inter'],
        ]);

        $this->admin = User::create([
            'name' => 'System Admin',
            'username' => 'admin_backup',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->cashier = User::create([
            'name' => 'Cashier Test',
            'username' => 'cashier_backup',
            'password' => bcrypt('password'),
            'role' => 'cashier',
            'is_active' => true,
        ]);

        Location::create([
            'code' => 'LOC-01',
            'name_primary' => 'Main Outlet',
            'is_active' => true,
            'created_by' => $this->admin->id,
        ]);
    }

    public function test_admin_can_download_full_backup_archive(): void
    {
        $response = $this->actingAs($this->admin)->post('/settings/backup');

        $response->assertStatus(200);
        $this->assertStringContainsString('attachment; filename=backup-', $response->headers->get('content-disposition'));

        $filePath = $response->getFile()->getPathname();

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($filePath) === true);

        // Verify manifest
        $manifestJson = $zip->getFromName('manifest.json');
        $this->assertNotFalse($manifestJson);

        $manifest = json_decode($manifestJson, true);
        $this->assertEquals('2.0', $manifest['format_version']);
        $this->assertCount(14, $manifest['tables']);

        // Verify users table exists and checksum matches
        $this->assertArrayHasKey('users', $manifest['tables']);
        $usersJson = $zip->getFromName('tables/users.json');
        $this->assertNotFalse($usersJson);
        $this->assertEquals(hash('sha256', $usersJson), $manifest['tables']['users']['checksum']);

        $zip->close();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'backup.exported',
            'actor_id' => $this->admin->id,
        ]);
    }

    public function test_non_admin_cannot_download_backup(): void
    {
        $response = $this->actingAs($this->cashier)->post('/settings/backup');
        $response->assertStatus(403);
    }

    public function test_admin_can_preflight_inspect_valid_backup_archive(): void
    {
        $validZip = $this->generateValidBackupZip();

        $uploadedFile = new UploadedFile(
            $validZip,
            'test_backup.zip',
            'application/zip',
            null,
            true
        );

        $response = $this->actingAs($this->admin)->postJson('/settings/backup/inspect', [
            'backup_file' => $uploadedFile,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'valid' => true,
            'format_version' => '2.0',
            'tables_count' => 14,
        ]);

        @unlink($validZip);
    }

    public function test_preflight_inspection_rejects_archive_with_tampered_checksum(): void
    {
        $corruptZip = $this->generateCorruptedChecksumZip();

        $uploadedFile = new UploadedFile(
            $corruptZip,
            'corrupt_backup.zip',
            'application/zip',
            null,
            true
        );

        $response = $this->actingAs($this->admin)->postJson('/settings/backup/inspect', [
            'backup_file' => $uploadedFile,
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'valid' => false,
        ]);

        @unlink($corruptZip);
    }

    public function test_admin_can_restore_database_from_valid_archive(): void
    {
        // 1. Generate valid backup
        $validZip = $this->generateValidBackupZip();

        // 2. Introduce state change
        Location::create([
            'code' => 'TEMP-LOC',
            'name_primary' => 'Temporary Before Restore',
            'is_active' => true,
            'created_by' => $this->admin->id,
        ]);
        $this->assertDatabaseHas('locations', ['code' => 'TEMP-LOC']);

        // 3. Execute Restore
        $uploadedFile = new UploadedFile(
            $validZip,
            'restore_valid.zip',
            'application/zip',
            null,
            true
        );

        $response = $this->actingAs($this->admin)->post('/settings/restore', [
            'backup_file' => $uploadedFile,
        ]);

        $response->assertSessionHas('success');

        // 4. Assert restored state (TEMP-LOC must no longer exist because it was not in the backup)
        $this->assertDatabaseMissing('locations', ['code' => 'TEMP-LOC']);
        $this->assertDatabaseHas('locations', ['code' => 'LOC-01']);

        // 5. Assert emergency recovery point was created
        $recoveryPoints = File::glob(storage_path('app/backups/recovery_points/*.zip'));
        $this->assertNotEmpty($recoveryPoints);

        // 6. Assert audit log
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'backup.restored',
            'actor_id' => $this->admin->id,
        ]);

        @unlink($validZip);
    }

    protected function generateValidBackupZip(): string
    {
        $tables = [
            'users',
            'business_settings',
            'locations',
            'user_locations',
            'units',
            'product_categories',
            'products',
            'periods',
            'documents',
            'document_items',
            'approval_requests',
            'document_revisions',
            'audit_logs',
            'print_logs',
        ];

        $tempPath = tempnam(sys_get_temp_dir(), 'valid_bk_') . '.zip';
        $zip = new ZipArchive();
        $zip->open($tempPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $manifest = [
            'format_version' => '2.0',
            'app_version' => '2.0.0',
            'generated_at' => now()->toIso8601String(),
            'tables' => [],
        ];

        foreach ($tables as $table) {
            $rows = \Illuminate\Support\Facades\DB::table($table)->get();
            $json = json_encode($rows, JSON_UNESCAPED_UNICODE);
            $zip->addFromString("tables/{$table}.json", $json);

            $manifest['tables'][$table] = [
                'row_count' => $rows->count(),
                'byte_size' => strlen($json),
                'checksum' => hash('sha256', $json),
            ];
        }

        $zip->addFromString('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT));
        $zip->close();

        return $tempPath;
    }

    protected function generateCorruptedChecksumZip(): string
    {
        $tables = [
            'users',
            'business_settings',
            'locations',
            'user_locations',
            'units',
            'product_categories',
            'products',
            'periods',
            'documents',
            'document_items',
            'approval_requests',
            'document_revisions',
            'audit_logs',
            'print_logs',
        ];

        $tempPath = tempnam(sys_get_temp_dir(), 'corrupt_bk_') . '.zip';
        $zip = new ZipArchive();
        $zip->open($tempPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $manifest = [
            'format_version' => '2.0',
            'app_version' => '2.0.0',
            'generated_at' => now()->toIso8601String(),
            'tables' => [],
        ];

        foreach ($tables as $table) {
            $rows = \Illuminate\Support\Facades\DB::table($table)->get();
            $json = json_encode($rows, JSON_UNESCAPED_UNICODE);
            $zip->addFromString("tables/{$table}.json", $json);

            $manifest['tables'][$table] = [
                'row_count' => $rows->count(),
                'byte_size' => strlen($json),
                // Purposely tampered checksum
                'checksum' => '0000000000000000000000000000000000000000000000000000000000000000',
            ];
        }

        $zip->addFromString('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT));
        $zip->close();

        return $tempPath;
    }
}
