<?php

namespace App\Features\Backups\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\Audit\AuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class BackupController extends Controller
{
    public function __construct(
        protected AuditService $audit,
    ) {}

    /**
     * Generate and download full JSON backup ZIP archive.
     */
    public function __invoke(Request $request): BinaryFileResponse
    {
        $allowlist = [
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

        $tempFile = tempnam(sys_get_temp_dir(), 'pos_backup_') . '.zip';
        $zip = new ZipArchive();
        $zip->open($tempFile, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $manifest = [
            'format_version' => '2.0',
            'app_version' => '2.0.0',
            'generated_at' => now()->toIso8601String(),
            'timezone' => config('app.timezone', 'Asia/Phnom_Penh'),
            'tables' => [],
            'inventory' => [],
        ];

        foreach ($allowlist as $tableName) {
            $rows = DB::table($tableName)->get();
            $json = json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            $zip->addFromString("tables/{$tableName}.json", $json);

            $manifest['tables'][$tableName] = [
                'row_count' => $rows->count(),
                'byte_size' => strlen($json),
                'checksum' => hash('sha256', $json),
            ];
        }

        $manifestJson = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $zip->addFromString('manifest.json', $manifestJson);
        $zip->close();

        $this->audit->record(
            'backup.exported',
            'App\Models\BusinessSetting',
            null,
            ['tables_count' => count($allowlist)],
            null,
            $request->user()->id,
            'Exported full system backup archive'
        );

        $filename = 'backup-' . now()->format('Y-m-d-His') . '.zip';

        return response()->download($tempFile, $filename)->deleteFileAfterSend(true);
    }
}
