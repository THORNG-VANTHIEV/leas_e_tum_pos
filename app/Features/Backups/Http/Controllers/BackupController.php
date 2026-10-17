<?php

namespace App\Features\Backups\Http\Controllers;

use App\Features\Backups\Services\BackupArchiver;
use App\Http\Controllers\Controller;
use App\Support\Audit\AuditService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BackupController extends Controller
{
    public function __construct(
        protected AuditService $audit,
        protected BackupArchiver $archiver,
    ) {}

    /**
     * Generate and download full JSON backup ZIP archive.
     */
    public function __invoke(Request $request): BinaryFileResponse
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'pos_backup_').'.zip';
        $this->archiver->write($tempFile);

        $this->audit->record(
            'backup.exported',
            'App\Models\BusinessSetting',
            null,
            ['tables_count' => count(BackupArchiver::TABLES)],
            null,
            $request->user()->id,
            'Exported full system backup archive'
        );

        $filename = 'backup-'.now()->format('Y-m-d-His').'.zip';

        return response()->download($tempFile, $filename)->deleteFileAfterSend(true);
    }
}
