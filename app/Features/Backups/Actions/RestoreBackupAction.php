<?php

namespace App\Features\Backups\Actions;

use App\Support\Audit\AuditService;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use ZipArchive;

class RestoreBackupAction
{
    public const ALLOWLIST = [
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

    public const DELETE_ORDER = [
        'print_logs',
        'document_revisions',
        'document_items',
        'approval_requests',
        'documents',
        'periods',
        'products',
        'product_categories',
        'units',
        'user_locations',
        'locations',
        'audit_logs',
        'business_settings',
        'users',
    ];

    public const INSERT_ORDER = [
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

    public function __construct(
        protected AuditService $audit,
    ) {}

    /**
     * Staged, verified, and recoverable restore from a V2.0 backup archive ZIP.
     *
     * @return array{recovery_point: string, tables_restored: int, rows_restored: int}
     */
    public function handle(string|UploadedFile $archive, int $adminId): array
    {
        $filePath = $archive instanceof UploadedFile ? $archive->getRealPath() : $archive;

        if (! file_exists($filePath)) {
            throw new DomainException('Backup archive file not found.');
        }

        $zip = new ZipArchive();
        if ($zip->open($filePath) !== true) {
            throw new DomainException('Corrupt or invalid ZIP archive file.');
        }

        // 1. Inspect archive & validate manifest
        $manifestContent = $zip->getFromName('manifest.json');
        if ($manifestContent === false) {
            $zip->close();
            throw new DomainException('Archive is missing manifest.json specification header.');
        }

        $manifest = json_decode($manifestContent, true);
        if (! is_array($manifest) || ($manifest['format_version'] ?? '') !== '2.0') {
            $zip->close();
            throw new DomainException('Unsupported archive format version. Expected V2.0 manifest.');
        }

        $tableInventory = $manifest['tables'] ?? [];
        if (empty($tableInventory)) {
            $zip->close();
            throw new DomainException('Manifest contains empty or invalid table inventory.');
        }

        // 2. Validate paths, checksums, and JSON integrity before touching live data
        $stagedData = [];
        $totalRows = 0;

        foreach ($tableInventory as $tableName => $meta) {
            if (! in_array($tableName, self::ALLOWLIST, true)) {
                $zip->close();
                throw new DomainException("Unauthorized table '{$tableName}' in backup archive.");
            }

            // Path Traversal Guard
            $entryName = "tables/{$tableName}.json";
            $entryIndex = $zip->locateName($entryName);
            if ($entryIndex === false) {
                $zip->close();
                throw new DomainException("Archive missing table payload: {$entryName}");
            }

            $rawJson = $zip->getFromIndex($entryIndex);
            if ($rawJson === false) {
                $zip->close();
                throw new DomainException("Failed to decompress {$entryName}.");
            }

            // Verify SHA-256 Checksum
            $calculatedChecksum = hash('sha256', $rawJson);
            if ($calculatedChecksum !== ($meta['checksum'] ?? '')) {
                $zip->close();
                throw new DomainException("Integrity check failed: Checksum mismatch for {$tableName}.");
            }

            // Verify JSON Shape
            $rows = json_decode($rawJson, true);
            if (! is_array($rows)) {
                $zip->close();
                throw new DomainException("Corrupted JSON array data in {$tableName}.");
            }

            if (count($rows) !== ($meta['row_count'] ?? 0)) {
                $zip->close();
                throw new DomainException("Row count mismatch in manifest for {$tableName}.");
            }

            $stagedData[$tableName] = $rows;
            $totalRows += count($rows);
        }

        $zip->close();

        // 3. Prepare Pre-Restore Recovery Point
        $recoveryPointId = 'recovery_point_' . now()->format('Ymd_His') . '_' . bin2hex(random_bytes(4));
        $recoveryDir = storage_path('app/backups/recovery_points');
        File::ensureDirectoryExists($recoveryDir);
        $recoveryZipPath = "{$recoveryDir}/{$recoveryPointId}.zip";

        $this->createRecoveryPoint($recoveryZipPath);

        // 4. Atomic Database Swap
        $driver = DB::connection()->getDriverName();

        try {
            DB::transaction(function () use ($driver, $stagedData) {
                if ($driver === 'mysql') {
                    DB::statement('SET FOREIGN_KEY_CHECKS=0;');
                }

                // Delete child tables first in dependency order
                foreach (self::DELETE_ORDER as $table) {
                    if (isset($stagedData[$table])) {
                        DB::table($table)->delete();
                    }
                }

                // Insert in parent-first dependency order
                foreach (self::INSERT_ORDER as $table) {
                    if (! empty($stagedData[$table])) {
                        // Insert in chunks of 200 for memory safety
                        $chunks = array_chunk($stagedData[$table], 200);
                        foreach ($chunks as $chunk) {
                            DB::table($table)->insert($chunk);
                        }
                    }
                }

                if ($driver === 'mysql') {
                    DB::statement('SET FOREIGN_KEY_CHECKS=1;');
                }
            });
        } catch (\Throwable $e) {
            if ($driver === 'mysql') {
                DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            }
            throw new DomainException('Restore database transaction failed: ' . $e->getMessage(), 0, $e);
        }

        // 5. Record Audit Log for the restore event
        $this->audit->record(
            'backup.restored',
            'App\Models\BusinessSetting',
            null,
            [
                'tables_restored' => count($stagedData),
                'rows_restored' => $totalRows,
                'recovery_point' => $recoveryPointId,
            ],
            null,
            $adminId,
            "Restored full system database from archive with recovery point {$recoveryPointId}"
        );

        return [
            'recovery_point' => $recoveryPointId,
            'tables_restored' => count($stagedData),
            'rows_restored' => $totalRows,
        ];
    }

    /**
     * Create an emergency pre-restore snapshot archive.
     */
    protected function createRecoveryPoint(string $zipPath): void
    {
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $manifest = [
            'format_version' => '2.0',
            'app_version' => '2.0.0',
            'type' => 'pre_restore_recovery_point',
            'generated_at' => now()->toIso8601String(),
            'tables' => [],
        ];

        foreach (self::ALLOWLIST as $tableName) {
            $rows = DB::table($tableName)->get();
            $json = json_encode($rows, JSON_UNESCAPED_UNICODE);
            $zip->addFromString("tables/{$tableName}.json", $json);

            $manifest['tables'][$tableName] = [
                'row_count' => $rows->count(),
                'byte_size' => strlen($json),
                'checksum' => hash('sha256', $json),
            ];
        }

        $zip->addFromString('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT));
        $zip->close();
    }

    /**
     * Inspect backup archive manifest and payload integrity without touching live database.
     *
     * @return array{valid: bool, format_version: string, generated_at: ?string, app_version: ?string, tables_count: int, total_rows: int, total_bytes: int, tables: array<int, array<string, mixed>>}
     */
    public function inspect(string|UploadedFile $archive): array
    {
        $filePath = $archive instanceof UploadedFile ? $archive->getRealPath() : $archive;

        if (! file_exists($filePath)) {
            throw new DomainException('Backup archive file not found.');
        }

        $zip = new ZipArchive();
        if ($zip->open($filePath) !== true) {
            throw new DomainException('Corrupt or invalid ZIP archive file.');
        }

        $manifestContent = $zip->getFromName('manifest.json');
        if ($manifestContent === false) {
            $zip->close();
            throw new DomainException('Archive is missing manifest.json header.');
        }

        $manifest = json_decode($manifestContent, true);
        if (! is_array($manifest) || ($manifest['format_version'] ?? '') !== '2.0') {
            $zip->close();
            throw new DomainException('Unsupported archive format version. Expected V2.0 manifest.');
        }

        $tableInventory = $manifest['tables'] ?? [];
        $inspectedTables = [];
        $totalRows = 0;
        $totalBytes = 0;

        foreach ($tableInventory as $tableName => $meta) {
            if (! in_array($tableName, self::ALLOWLIST, true)) {
                $zip->close();
                throw new DomainException("Unauthorized table '{$tableName}' in backup archive.");
            }

            $entryName = "tables/{$tableName}.json";
            $entryIndex = $zip->locateName($entryName);
            if ($entryIndex === false) {
                $zip->close();
                throw new DomainException("Archive missing table payload: {$entryName}");
            }

            $rawJson = $zip->getFromIndex($entryIndex);
            if ($rawJson === false) {
                $zip->close();
                throw new DomainException("Failed to read {$entryName}.");
            }

            $calculatedChecksum = hash('sha256', $rawJson);
            if ($calculatedChecksum !== ($meta['checksum'] ?? '')) {
                $zip->close();
                throw new DomainException("Integrity error: SHA-256 checksum mismatch for {$tableName}.");
            }

            $rows = json_decode($rawJson, true);
            $rowCount = is_array($rows) ? count($rows) : 0;
            $byteSize = strlen($rawJson);

            $inspectedTables[] = [
                'name' => $tableName,
                'row_count' => $rowCount,
                'byte_size' => $byteSize,
                'checksum_valid' => true,
            ];

            $totalRows += $rowCount;
            $totalBytes += $byteSize;
        }

        $zip->close();

        return [
            'valid' => true,
            'format_version' => $manifest['format_version'],
            'generated_at' => $manifest['generated_at'] ?? null,
            'app_version' => $manifest['app_version'] ?? null,
            'tables_count' => count($inspectedTables),
            'total_rows' => $totalRows,
            'total_bytes' => $totalBytes,
            'tables' => $inspectedTables,
        ];
    }
}
