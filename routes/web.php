<?php

use App\Features\Approvals\Http\Controllers\ApprovalController;
use App\Features\Backups\Http\Controllers\BackupController;
use App\Features\Backups\Http\Controllers\RestoreController;
use App\Features\Catalog\Http\Controllers\CatalogController;
use App\Features\Customers\Http\Controllers\CustomerController;
use App\Features\Documents\Http\Controllers\DocumentController;
use App\Features\Documents\Http\Controllers\DocumentPrintController;
use App\Features\Expenses\Http\Controllers\ExpenseController;
use App\Features\Floor\Http\Controllers\FloorTableController;
use App\Features\Kds\Http\Controllers\KdsController;
use App\Features\Periods\Http\Controllers\PeriodController;
use App\Features\Purchases\Http\Controllers\PurchaseController;
use App\Features\Reports\Http\Controllers\ReportController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\SettingsController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

// Guest entry / redirection
Route::get('/', function () {
    return Auth::check() ? redirect('/dashboard') : redirect('/login');
})->name('home');

// Authentication routes
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:5,1')
        ->name('login.store');
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

// Authenticated and active user routes
Route::middleware(['auth', 'active'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    // 03. Floor & Tables Visual Management
    Route::get('/tables', [FloorTableController::class, 'index'])->name('tables.index');
    Route::post('/tables', [FloorTableController::class, 'store'])->name('tables.store');
    Route::patch('/tables/{table}/status', [FloorTableController::class, 'updateStatus'])->name('tables.status');

    // 04. Kitchen Display System (KDS)
    Route::get('/kds', [KdsController::class, 'index'])->name('kds.index');
    Route::post('/kds/orders/{document}/status', [KdsController::class, 'updateStatus'])->name('kds.status');
    Route::post('/kds/items/{item}/status', [KdsController::class, 'updateItemStatus'])->name('kds.items.status');

    // 09. Customers & Loyalty (CRM)
    Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index');
    Route::post('/customers', [CustomerController::class, 'store'])->name('customers.store');
    Route::patch('/customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
    Route::post('/customers/{customer}/toggle', [CustomerController::class, 'toggle'])->name('customers.toggle');
    Route::post('/customers/{customer}/adjust-points', [CustomerController::class, 'adjustPoints'])->name('customers.adjust-points');
    Route::get('/customers/lookup', [CustomerController::class, 'lookup'])->name('customers.lookup');

    // 10. Cash & Operating Expenses
    Route::get('/expenses', [ExpenseController::class, 'index'])->name('expenses.index');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');
    Route::post('/expenses/drawer-log', [ExpenseController::class, 'storeDrawerLog'])->name('expenses.drawer-log');
    Route::get('/expenses/export/csv', [ExpenseController::class, 'exportCsv'])->name('expenses.export.csv');

    // POS Live Terminal, Fast Checkout & Table Management
    Route::get('/invoices', [DocumentController::class, 'index'])->name('invoices.index');
    Route::get('/invoices/create', [DocumentController::class, 'create'])->name('invoices.create');
    Route::post('/invoices', [DocumentController::class, 'store'])->name('invoices.store');
    Route::post('/invoices/checkout', [DocumentController::class, 'checkout'])->name('invoices.checkout');
    Route::post('/invoices/hold-table', [DocumentController::class, 'holdTable'])->name('invoices.hold-table');
    Route::delete('/invoices/{invoice}/cancel-table', [DocumentController::class, 'cancelTable'])->name('invoices.cancel-table');
    Route::post('/invoices/{invoice}/void', [DocumentController::class, 'void'])->middleware('role:admin,supervisor')->name('invoices.void');

    // Hardware Continuous Range Print Engine (Section 12.1)
    Route::get('/invoices/print-range/preview', [DocumentPrintController::class, 'previewRange'])->name('invoices.print-range.preview');
    Route::get('/invoices/print-range', [DocumentPrintController::class, 'printRange'])->name('invoices.print-range');
    Route::post('/invoices/print-range/print-requests', [DocumentPrintController::class, 'storeRangePrintRequest'])->name('invoices.print-range.requests');

    Route::get('/invoices/{invoice}', [DocumentController::class, 'show'])->name('invoices.show');

    // Hardware Print Views & Requests
    Route::get('/invoices/{invoice}/preview/80mm', [DocumentPrintController::class, 'previewThermal'])->name('invoices.preview.thermal');
    Route::get('/invoices/{invoice}/preview/a5', [DocumentPrintController::class, 'previewA5'])->name('invoices.preview.a5');
    Route::post('/invoices/{invoice}/print-requests', [DocumentPrintController::class, 'storePrintRequest'])->name('invoices.print-requests');

    // Approvals Inbox
    Route::get('/approvals', [ApprovalController::class, 'index'])->name('approvals.index');
    Route::post('/approvals', [ApprovalController::class, 'store'])->name('approvals.store');
    Route::post('/approvals/{approval}/approve', [ApprovalController::class, 'approve'])->middleware('role:admin')->name('approvals.approve');
    Route::post('/approvals/{approval}/reject', [ApprovalController::class, 'reject'])->middleware('role:admin')->name('approvals.reject');

    // Period Lifecycle & Finalization
    Route::get('/periods/{period}/review', [PeriodController::class, 'reviewView'])->middleware('role:admin')->name('periods.review-view');

    // Operational Reports & Sales Register
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/reports/export/csv', [ReportController::class, 'exportCsv'])->name('reports.export.csv');

    // Items, Units & Categories Catalog Management
    Route::prefix('catalog')->name('catalog.')->group(function () {
        Route::get('/', [CatalogController::class, 'index'])->name('index');
        Route::post('/upload-image', [CatalogController::class, 'uploadImage'])->name('upload-image');
        Route::post('/products', [CatalogController::class, 'storeProduct'])->name('products.store');
        Route::patch('/products/{product}', [CatalogController::class, 'updateProduct'])->name('products.update');
        Route::post('/products/{product}/toggle', [CatalogController::class, 'toggleProduct'])->name('products.toggle');

        Route::post('/units', [CatalogController::class, 'storeUnit'])->name('units.store');
        Route::patch('/units/{unit}', [CatalogController::class, 'updateUnit'])->name('units.update');
        Route::post('/units/{unit}/toggle', [CatalogController::class, 'toggleUnit'])->name('units.toggle');

        Route::post('/categories', [CatalogController::class, 'storeCategory'])->name('categories.store');
        Route::patch('/categories/{category}', [CatalogController::class, 'updateCategory'])->name('categories.update');
        Route::post('/categories/{category}/toggle', [CatalogController::class, 'toggleCategory'])->name('categories.toggle');
    });

    // Purchases & Suppliers Management Hub
    Route::prefix('purchases')->name('purchases.')->group(function () {
        Route::get('/', [PurchaseController::class, 'index'])->name('index');
        Route::post('/', [PurchaseController::class, 'store'])->name('store');
        Route::patch('/{purchase}/status', [PurchaseController::class, 'updateStatus'])->name('status');

        Route::post('/suppliers', [PurchaseController::class, 'storeSupplier'])->name('suppliers.store');
        Route::patch('/suppliers/{supplier}', [PurchaseController::class, 'updateSupplier'])->name('suppliers.update');
        Route::post('/suppliers/{supplier}/toggle', [PurchaseController::class, 'toggleSupplier'])->name('suppliers.toggle');
    });

    // Admin Master Settings Hub
    Route::middleware('role:admin')->prefix('settings')->name('settings.')->group(function () {
        Route::get('/', [SettingsController::class, 'index'])->name('index');
        Route::patch('/business', [SettingsController::class, 'updateBusiness'])->name('business.update');
        Route::patch('/entry-controls', [SettingsController::class, 'updateEntryControls'])->name('entry-controls.update');
        Route::patch('/print', [SettingsController::class, 'updatePrintSettings'])->name('print.update');
        Route::post('/upload-qr', [SettingsController::class, 'uploadQrCode'])->name('qr.upload');

        // Locations
        Route::post('/locations', [SettingsController::class, 'storeLocation'])->name('locations.store');
        Route::patch('/locations/{location}', [SettingsController::class, 'updateLocation'])->name('locations.update');

        // Users & Access Control
        Route::post('/users', [SettingsController::class, 'storeUser'])->name('users.store');
        Route::patch('/users/{user}', [SettingsController::class, 'updateUser'])->name('users.update');
        Route::post('/users/{user}/archive', [SettingsController::class, 'archiveUser'])->name('users.archive');
        Route::post('/users/{user}/restore', [SettingsController::class, 'restoreUser'])->name('users.restore');

        // Periods Management
        Route::get('/periods', [PeriodController::class, 'index'])->name('periods.index');
        Route::post('/periods', [PeriodController::class, 'store'])->name('periods.store');
        Route::post('/periods/{period}/activate', [PeriodController::class, 'activate'])->name('periods.activate');
        Route::post('/periods/{period}/review', [PeriodController::class, 'review'])->name('periods.review');
        Route::post('/periods/{period}/finalize', [PeriodController::class, 'finalize'])->name('periods.finalize');

        // Full Backup & Disaster Recovery (Section 11)
        Route::match(['get', 'post'], '/backup', BackupController::class)->name('backup.download');
        Route::post('/backup/inspect', [RestoreController::class, 'inspect'])->name('backup.inspect');
        Route::post('/backup/restore', [RestoreController::class, 'restore'])->name('backup.restore');
        Route::post('/restore', [RestoreController::class, 'restore']);
    });
});
