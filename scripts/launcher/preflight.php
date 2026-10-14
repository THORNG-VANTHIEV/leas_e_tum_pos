<?php

/**
 * Modular Business System V2.0 - Standalone Preflight Diagnostics Checker
 * Verifies system readiness, PHP extensions, database connectivity, and assets.
 */

declare(strict_types=1);

$appRoot = dirname(__DIR__, 2);
$errors = [];
$warnings = [];

echo "========================================================\n";
echo " LEASHAL ETUM POS (លៀសហាល អ៉ីទុម) - PREFLIGHT SYSTEM\n";
echo " Modular Business System Blueprint V2.0\n";
echo "========================================================\n\n";

// 1. PHP Version
$minPhp = '8.2.0';
if (version_compare(PHP_VERSION, $minPhp, '<')) {
    $errors[] = "PHP version {$minPhp} or higher required (current: " . PHP_VERSION . ")";
} else {
    echo "[PASS] PHP Version: " . PHP_VERSION . "\n";
}

// 2. Extensions check
$requiredExtensions = ['pdo', 'pdo_mysql', 'zip', 'json', 'mbstring', 'bcmath', 'curl', 'openssl'];
foreach ($requiredExtensions as $ext) {
    if (!extension_loaded($ext)) {
        $errors[] = "Required PHP extension '{$ext}' is missing.";
    } else {
        echo "[PASS] PHP Extension '{$ext}' loaded\n";
    }
}

// 3. Writable Directories
$writableDirs = [
    $appRoot . '/storage',
    $appRoot . '/storage/framework/views',
    $appRoot . '/storage/framework/sessions',
    $appRoot . '/storage/logs',
    $appRoot . '/bootstrap/cache',
];

foreach ($writableDirs as $dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    if (!is_writable($dir)) {
        $errors[] = "Directory not writable: {$dir}";
    } else {
        echo "[PASS] Writable directory: " . basename($dir) . "\n";
    }
}

// 4. Built Frontend Assets Check
$manifestPath = $appRoot . '/public/build/manifest.json';
if (!file_exists($manifestPath)) {
    $warnings[] = "Frontend production bundle not found at public/build/manifest.json (run 'npm run build').";
} else {
    echo "[PASS] Production Vite Assets detected\n";
}

// 5. Database Connectivity
$envFile = $appRoot . '/.env';
if (file_exists($envFile)) {
    $envContent = file_get_contents($envFile);
    preg_match('/DB_CONNECTION=([^\r\n]+)/', $envContent, $dbConn);
    preg_match('/DB_HOST=([^\r\n]+)/', $envContent, $dbHost);
    preg_match('/DB_PORT=([^\r\n]+)/', $envContent, $dbPort);
    preg_match('/DB_DATABASE=([^\r\n]+)/', $envContent, $dbName);
    preg_match('/DB_USERNAME=([^\r\n]+)/', $envContent, $dbUser);
    preg_match('/DB_PASSWORD=([^\r\n]+)/', $envContent, $dbPass);

    $connection = trim($dbConn[1] ?? 'mysql');
    $host = trim($dbHost[1] ?? '127.0.0.1');
    $port = trim($dbPort[1] ?? '8889');
    $db = trim($dbName[1] ?? 'leashal_etum_pos');
    $user = trim($dbUser[1] ?? 'root');
    $pass = trim($dbPass[1] ?? 'root');

    try {
        $dsn = "{$connection}:host={$host};port={$port};dbname={$db}";
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT => 2,
        ]);
        echo "[PASS] Database Connection to {$db}@{$host}:{$port} succeeded\n";
    } catch (PDOException $e) {
        $warnings[] = "Database connectivity notice: " . $e->getMessage();
    }
} else {
    $errors[] = "Application .env file not found.";
}

echo "\n--------------------------------------------------------\n";
if (!empty($warnings)) {
    echo "Warnings:\n";
    foreach ($warnings as $w) {
        echo "  - [WARN] {$w}\n";
    }
}

if (!empty($errors)) {
    echo "\nPreflight Failed with Errors:\n";
    foreach ($errors as $err) {
        echo "  - [FAIL] {$err}\n";
    }
    exit(1);
}

echo "Preflight check completed successfully! System is ready.\n";
echo "========================================================\n";
exit(0);
