<?php

namespace App\Features\Backups\Actions;

use App\Features\Backups\Services\BackupArchiver;
use App\Support\Audit\AuditService;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class RestoreBackupAction
{
    public const ALLOWLIST = BackupArchiver::TABLES;

    /**
     * Children first, so rows are removed before the rows they reference.
     */
    public const DELETE_ORDER = [
        'print_logs',
        'audit_logs',
        'cash_drawer_logs',
        'expenses',
        'purchase_items',
        'purchases',
        'document_revisions',
        'approval_requests',
        'kitchen_tickets',
        'document_items',
        'documents',
        'periods',
        'restaurant_tables',
        'suppliers',
        'customers',
        'products',
        'product_categories',
        'units',
        'user_locations',
        'locations',
        'business_settings',
        'users',
    ];

    public const INSERT_ORDER = BackupArchiver::TABLES;

    public function __construct(
        protected AuditService $audit,
        protected BackupArchiver $archiver,
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
            throw new DomainException('រកមិនឃើញ file backup ទេ។');
        }

        $zip = new ZipArchive;
        if ($zip->open($filePath) !== true) {
            throw new DomainException('file ZIP ខូច ឬមិនត្រឹមត្រូវ។');
        }

        // 1. Inspect archive & validate manifest
        $manifestContent = $zip->getFromName('manifest.json');
        if ($manifestContent === false) {
            $zip->close();
            throw new DomainException('file backup ខ្វះ manifest.json។');
        }

        $manifest = json_decode($manifestContent, true);
        if (! is_array($manifest) || ($manifest['format_version'] ?? '') !== '2.0') {
            $zip->close();
            throw new DomainException('ទម្រង់ file backup មិនគាំទ្រ (ត្រូវការ V2.0)។');
        }

        $tableInventory = $manifest['tables'] ?? [];
        if (empty($tableInventory)) {
            $zip->close();
            throw new DomainException('បញ្ជីតារាងក្នុង manifest ទទេ ឬមិនត្រឹមត្រូវ។');
        }

        // 2. Validate paths, checksums, and JSON integrity before touching live data
        $stagedData = [];
        $totalRows = 0;

        foreach ($tableInventory as $tableName => $meta) {
            if (! in_array($tableName, self::ALLOWLIST, true)) {
                $zip->close();
                throw new DomainException("តារាង '{$tableName}' មិនត្រូវបានអនុញ្ញាតក្នុង file backup ទេ។");
            }

            // Path Traversal Guard
            $entryName = "tables/{$tableName}.json";
            $entryIndex = $zip->locateName($entryName);
            if ($entryIndex === false) {
                $zip->close();
                throw new DomainException("file backup ខ្វះទិន្នន័យ៖ {$entryName}");
            }

            $rawJson = $zip->getFromIndex($entryIndex);
            if ($rawJson === false) {
                $zip->close();
                throw new DomainException("មិនអាចពន្លា {$entryName} បានទេ។");
            }

            // Verify SHA-256 Checksum
            $calculatedChecksum = hash('sha256', $rawJson);
            if ($calculatedChecksum !== ($meta['checksum'] ?? '')) {
                $zip->close();
                throw new DomainException("ទិន្នន័យ {$tableName} ត្រូវបានកែប្រែ ឬខូច (checksum មិនត្រូវគ្នា)។");
            }

            // Verify JSON Shape
            $rows = json_decode($rawJson, true);
            if (! is_array($rows)) {
                $zip->close();
                throw new DomainException("ទិន្នន័យ JSON ក្នុង {$tableName} ខូច។");
            }

            if (count($rows) !== ($meta['row_count'] ?? 0)) {
                $zip->close();
                throw new DomainException("ចំនួនជួរក្នុង {$tableName} មិនត្រូវនឹង manifest។");
            }

            $stagedData[$tableName] = $rows;
            $totalRows += count($rows);
        }

        // Uploaded images (archives made before images were included simply have none)
        $stagedFiles = [];
        foreach ($manifest['files'] ?? [] as $path => $meta) {
            if (! is_string($path) || ! preg_match(BackupArchiver::FILE_PATH_PATTERN, $path)) {
                $zip->close();
                throw new DomainException("ទីតាំង file '{$path}' ក្នុង backup មិនត្រូវបានអនុញ្ញាតទេ។");
            }

            $contents = $zip->getFromName("files/{$path}");
            if ($contents === false || hash('sha256', $contents) !== ($meta['checksum'] ?? '')) {
                $zip->close();
                throw new DomainException("file {$path} ត្រូវបានកែប្រែ ឬខូច។");
            }

            $stagedFiles[$path] = $contents;
        }

        $zip->close();

        // 3. Prepare Pre-Restore Recovery Point
        $recoveryPointId = 'recovery_point_'.now()->format('Ymd_His').'_'.bin2hex(random_bytes(4));
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
            throw new DomainException('ការ Restore database បរាជ័យ៖ '.$e->getMessage(), 0, $e);
        }

        // Images are written after the database swap succeeds; existing files not in the backup are kept
        foreach ($stagedFiles as $path => $contents) {
            Storage::disk('public')->put($path, $contents);
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
        $this->archiver->write($zipPath, ['type' => 'pre_restore_recovery_point']);
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
            throw new DomainException('រកមិនឃើញ file backup ទេ។');
        }

        $zip = new ZipArchive;
        if ($zip->open($filePath) !== true) {
            throw new DomainException('file ZIP ខូច ឬមិនត្រឹមត្រូវ។');
        }

        $manifestContent = $zip->getFromName('manifest.json');
        if ($manifestContent === false) {
            $zip->close();
            throw new DomainException('file backup ខ្វះ manifest.json។');
        }

        $manifest = json_decode($manifestContent, true);
        if (! is_array($manifest) || ($manifest['format_version'] ?? '') !== '2.0') {
            $zip->close();
            throw new DomainException('ទម្រង់ file backup មិនគាំទ្រ (ត្រូវការ V2.0)។');
        }

        $tableInventory = $manifest['tables'] ?? [];
        $inspectedTables = [];
        $totalRows = 0;
        $totalBytes = 0;

        foreach ($tableInventory as $tableName => $meta) {
            if (! in_array($tableName, self::ALLOWLIST, true)) {
                $zip->close();
                throw new DomainException("តារាង '{$tableName}' មិនត្រូវបានអនុញ្ញាតក្នុង file backup ទេ។");
            }

            $entryName = "tables/{$tableName}.json";
            $entryIndex = $zip->locateName($entryName);
            if ($entryIndex === false) {
                $zip->close();
                throw new DomainException("file backup ខ្វះទិន្នន័យ៖ {$entryName}");
            }

            $rawJson = $zip->getFromIndex($entryIndex);
            if ($rawJson === false) {
                $zip->close();
                throw new DomainException("មិនអាចអាន {$entryName} បានទេ។");
            }

            $calculatedChecksum = hash('sha256', $rawJson);
            if ($calculatedChecksum !== ($meta['checksum'] ?? '')) {
                $zip->close();
                throw new DomainException("ទិន្នន័យ {$tableName} ត្រូវបានកែប្រែ ឬខូច (SHA-256 មិនត្រូវគ្នា)។");
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
