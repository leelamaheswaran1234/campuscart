<?php
// Re-runnable, idempotent import of the default 250 products (owner-products-seed.json) into MySQL under the
// Owner Seller account. This already happens automatically on the first database request; open this URL only
// if you replaced owner-products-seed.json and want the new rows imported. Existing rows are never changed or deleted.
require __DIR__ . '/config.php';
try {
    $pdo = db();
    $stats = eb_seed_owner_catalogue($pdo, true);
    if ($stats === null) json_out(['ok' => false, 'error' => 'owner-products-seed.json is missing/invalid, or the import failed. Check the PHP error log.'], 500);
    json_out(['ok' => true, 'owner_email' => EASYBUY_OWNER_EMAIL] + $stats);
} catch (Throwable $e) {
    error_log('EasyBuy seed endpoint: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Database connection failed. Check api/config.php.'], 503);
}
