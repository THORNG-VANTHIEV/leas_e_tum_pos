<?php

namespace App\Features\Backups\Http\Controllers;

use App\Features\Backups\Actions\RestoreBackupAction;
use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class RestoreController extends Controller
{
    public function __construct(
        protected RestoreBackupAction $restoreAction,
    ) {}

    /**
     * Inspect uploaded ZIP archive before restore.
     */
    public function inspect(Request $request): JsonResponse
    {
        $request->validate([
            'backup_file' => ['required', 'file', 'mimes:zip', 'max:51200'],
        ]);

        try {
            $report = $this->restoreAction->inspect($request->file('backup_file'));
            return response()->json($report);
        } catch (DomainException $e) {
            return response()->json(['valid' => false, 'error' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            return response()->json(['valid' => false, 'error' => 'System error: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Handle incoming backup archive upload and execute verified restore.
     */
    public function restore(Request $request): RedirectResponse
    {
        $request->validate([
            'backup_file' => ['required', 'file', 'mimes:zip', 'max:51200'], // max 50MB
        ]);

        try {
            $result = $this->restoreAction->handle(
                $request->file('backup_file'),
                $request->user()->id
            );

            return back()->with(
                'success',
                "Database restored successfully ({$result['tables_restored']} tables, {$result['rows_restored']} records). Emergency recovery point: {$result['recovery_point']}"
            );
        } catch (DomainException $e) {
            return back()->with('error', 'Restore rejected: ' . $e->getMessage());
        } catch (\Throwable $e) {
            return back()->with('error', 'System error during restore: ' . $e->getMessage());
        }
    }

    /**
     * Invokable fallback.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        return $this->restore($request);
    }
}
