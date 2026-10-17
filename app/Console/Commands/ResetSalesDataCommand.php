<?php

namespace App\Console\Commands;

use App\Features\Backups\Services\BackupArchiver;
use App\Models\Customer;
use App\Models\RestaurantTable;
use App\Support\Audit\AuditService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

#[Signature('pos:reset-sales {--force : Skip the confirmation question}')]
#[Description('Go-live: delete all sales/test transactions but keep menu, tables, customers, staff and settings (backs up first)')]
class ResetSalesDataCommand extends Command
{
    /**
     * Transaction tables, children first so foreign keys are respected.
     */
    public const CLEARED_TABLES = [
        'kitchen_tickets',
        'print_logs',
        'document_revisions',
        'approval_requests',
        'document_items',
        'documents',
        'purchase_items',
        'purchases',
        'expenses',
        'cash_drawer_logs',
        'periods',
        'audit_logs',
    ];

    public function handle(BackupArchiver $archiver, AuditService $audit): int
    {
        $database = DB::connection()->getDatabaseName();
        $counts = collect(self::CLEARED_TABLES)->mapWithKeys(fn (string $table) => [$table => DB::table($table)->count()]);

        $this->warn("Database: {$database}");
        $this->table(['Table to clear', 'Rows'], $counts->map(fn ($rows, $table) => [$table, $rows])->values());

        if (! $this->option('force') && ! $this->confirm('Delete all of these sales/test records? (a backup is written first)')) {
            $this->info('Cancelled. Nothing was changed.');

            return self::FAILURE;
        }

        $directory = storage_path('app/backups/pre-reset');
        File::ensureDirectoryExists($directory);
        $backupPath = $directory.'/backup-before-reset-'.now()->format('Y-m-d-His').'.zip';
        $archiver->write($backupPath, ['type' => 'pre_reset']);
        $this->info("Backup written: {$backupPath}");

        DB::transaction(function () {
            foreach (self::CLEARED_TABLES as $table) {
                DB::table($table)->delete();
            }

            // Counters earned from test sales start again from zero
            Customer::query()->update(['loyalty_points' => 0, 'visits_count' => 0, 'total_spent_usd' => 0]);
            RestaurantTable::query()->update(['status' => 'available']);
        });

        $audit->record(
            'system.sales_reset',
            'App\Models\BusinessSetting',
            $counts->all(),
            null,
            ['backup' => basename($backupPath)],
            null,
            'Cleared sales and test transactions for go-live'
        );

        $this->info('Done. Menu, tables, customers, staff and settings were kept.');

        return self::SUCCESS;
    }
}
