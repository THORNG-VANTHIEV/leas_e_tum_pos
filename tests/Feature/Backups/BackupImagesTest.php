<?php

namespace Tests\Feature\Backups;

use App\Features\Backups\Actions\RestoreBackupAction;
use App\Features\Backups\Services\BackupArchiver;
use App\Models\User;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

class BackupImagesTest extends TestCase
{
    use RefreshDatabase;

    private string $archivePath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        Storage::fake('public');
        $this->archivePath = sys_get_temp_dir().'/pos-backup-images-'.uniqid().'.zip';
    }

    protected function tearDown(): void
    {
        @unlink($this->archivePath);

        parent::tearDown();
    }

    public function test_menu_photos_are_backed_up_and_restored(): void
    {
        Storage::disk('public')->put('products/prod_1.jpg', 'jpeg-bytes');
        Storage::disk('public')->put('qr_codes/khqr_1.jpg', 'qr-bytes');

        $manifest = app(BackupArchiver::class)->write($this->archivePath);
        $this->assertSame(['products/prod_1.jpg', 'qr_codes/khqr_1.jpg'], array_keys($manifest['files']));

        // Photos lost (e.g. new computer), then restore from the archive
        Storage::disk('public')->delete(['products/prod_1.jpg', 'qr_codes/khqr_1.jpg']);
        app(RestoreBackupAction::class)->handle($this->archivePath, User::where('username', 'admin')->firstOrFail()->id);

        $this->assertSame('jpeg-bytes', Storage::disk('public')->get('products/prod_1.jpg'));
        $this->assertSame('qr-bytes', Storage::disk('public')->get('qr_codes/khqr_1.jpg'));
    }

    public function test_restore_rejects_files_outside_the_image_folders(): void
    {
        app(BackupArchiver::class)->write($this->archivePath);

        $zip = new ZipArchive;
        $zip->open($this->archivePath);
        $manifest = json_decode($zip->getFromName('manifest.json'), true);
        $manifest['files']['../../.env'] = ['byte_size' => 4, 'checksum' => hash('sha256', 'evil')];
        $zip->addFromString('files/../../.env', 'evil');
        $zip->addFromString('manifest.json', json_encode($manifest));
        $zip->close();

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage("Unauthorized file path '../../.env' in backup archive.");

        app(RestoreBackupAction::class)->handle($this->archivePath, User::where('username', 'admin')->firstOrFail()->id);
    }
}
