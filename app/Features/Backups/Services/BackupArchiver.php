<?php

namespace App\Features\Backups\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

/**
 * Writes the V2.0 backup archive (manifest, one JSON file per table, uploaded images) used by manual downloads,
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
     * Uploaded files on the public disk that the database points at (menu photos, KHQR image).
     */
    public const FILE_DIRECTORIES = ['products', 'qr_codes'];

    /**
     * A restorable file path: one of the directories above plus a plain file name (no traversal).
     */
    public const FILE_PATH_PATTERN = '#^(products|qr_codes)/[A-Za-z0-9._-]+$#';

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
            'files' => [],
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

        $disk = Storage::disk('public');
        foreach (self::FILE_DIRECTORIES as $directory) {
            foreach ($disk->files($directory) as $path) {
                if (! preg_match(self::FILE_PATH_PATTERN, $path)) {
                    continue;
                }

                $contents = $disk->get($path);
                $zip->addFromString("files/{$path}", $contents);
                $manifest['files'][$path] = [
                    'byte_size' => strlen($contents),
                    'checksum' => hash('sha256', $contents),
                ];
            }
        }

        $zip->addFromString('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        $zip->close();

        return $manifest;
    }
}
