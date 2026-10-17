<?php

namespace App\Console\Commands;

use App\Features\Backups\Services\BackupArchiver;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

#[Signature('backup:daily {--keep=30 : Number of most recent daily backups to keep}')]
#[Description('Write a full backup archive to storage/app/backups/daily and prune old ones')]
class BackupDailyCommand extends Command
{
    public function handle(BackupArchiver $archiver): int
    {
        $directory = storage_path('app/backups/daily');
        File::ensureDirectoryExists($directory);

        $path = $directory.'/backup-'.now()->format('Y-m-d-His').'.zip';
        $manifest = $archiver->write($path, ['type' => 'scheduled_daily']);
        $rows = array_sum(array_column($manifest['tables'], 'row_count'));

        $this->info("Backup written: {$path} ({$rows} rows)");

        // Keep only the newest N archives (names sort chronologically)
        $archives = collect(File::glob($directory.'/backup-*.zip'))->sort()->values();
        $stale = $archives->slice(0, max(0, $archives->count() - (int) $this->option('keep')));
        $stale->each(fn (string $file) => File::delete($file));

        if ($stale->isNotEmpty()) {
            $this->line("Pruned {$stale->count()} old backup(s).");
        }

        return self::SUCCESS;
    }
}
