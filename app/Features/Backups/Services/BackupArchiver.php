<?php

namespace App\Features\Backups\Services;

use Illuminate\Support\Facades\DB;
use ZipArchive;

/**
 * Writes the V2.0 backup archive (manifest + one JSON file per table) used by manual downloads,
 * scheduled daily backups and pre-restore recovery points.
 */
final class BackupArchiver
{
    /**
     * Every business table, parents first (the order restore inserts in).
     */
    public const TABLES = [
        'users',
        'business_settings',
        'locations',
        'user_locations',
        'units',
        'product_categories',
        'products',
        'customers',
        'suppliers',
        'restaurant_tables',
        'periods',
        'documents',
        'document_items',
        'kitchen_tickets',
        'approval_requests',
        'document_revisions',
        'purchases',
        'purchase_items',
        'expenses',
        'cash_drawer_logs',
        'audit_logs',
        'print_logs',
    ];

    /**
     * @param  array<string, mixed>  $manifestExtras
     * @return array<string, mixed> The manifest written into the archive
     */
    public function write(string $zipPath, array $manifestExtras = []): array
    {
        $zip = new ZipArchive;
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $manifest = [
            'format_version' => '2.0',
            'app_version' => '2.0.0',
            'generated_at' => now()->toIso8601String(),
            'timezone' => config('app.timezone'),
            ...$manifestExtras,
            'tables' => [],
        ];

        foreach (self::TABLES as $tableName) {
            $rows = DB::table($tableName)->get();
            $json = json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            $zip->addFromString("tables/{$tableName}.json", $json);

            $manifest['tables'][$tableName] = [
                'row_count' => $rows->count(),
                'byte_size' => strlen($json),
                'checksum' => hash('sha256', $json),
            ];
        }

        $zip->addFromString('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $zip->close();

        return $manifest;
    }
}
