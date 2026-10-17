<?php

namespace Tests\Feature\Backups;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;
use ZipArchive;

class BackupDailyCommandTest extends TestCase
{
    use RefreshDatabase;

    private string $storagePath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->storagePath = sys_get_temp_dir().'/pos-backup-test-'.uniqid();
        $this->app->useStoragePath($this->storagePath);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->storagePath);

        parent::tearDown();
    }

    public function test_daily_backup_writes_a_complete_archive(): void
    {
        $this->artisan('backup:daily')->assertSuccessful();

        $archives = File::glob($this->storagePath.'/app/backups/daily/backup-*.zip');
        $this->assertCount(1, $archives);

        $zip = new ZipArchive;
        $zip->open($archives[0]);
        $manifest = json_decode($zip->getFromName('manifest.json'), true);
        $zip->close();

        $this->assertSame('scheduled_daily', $manifest['type']);
        $this->assertArrayHasKey('customers', $manifest['tables']);
        $this->assertArrayHasKey('expenses', $manifest['tables']);
    }

    public function test_daily_backup_keeps_only_the_newest_archives(): void
    {
        $directory = $this->storagePath.'/app/backups/daily';
        File::ensureDirectoryExists($directory);
        foreach (['2026-01-01-000000', '2026-01-02-000000', '2026-01-03-000000'] as $stamp) {
            File::put("{$directory}/backup-{$stamp}.zip", 'old');
        }

        $this->artisan('backup:daily', ['--keep' => 2])->assertSuccessful();

        $remaining = collect(File::glob("{$directory}/backup-*.zip"))->map(fn ($file) => basename($file))->values();
        $this->assertCount(2, $remaining);
        $this->assertSame('backup-2026-01-03-000000.zip', $remaining[0]);
    }
}
