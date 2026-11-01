<?php
require_once __DIR__ . '/../api/config.php';
header('Content-Type: text/html; charset=utf-8');
function item($label, $ok, $detail = '')
{
    echo '<li><strong>' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . ':</strong> ' . ($ok ? 'PASS' : 'CHECK') . ' ' . htmlspecialchars($detail, ENT_QUOTES, 'UTF-8') . '</li>';
}
?>
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>EasyBuy Setup Check</title>

<body style="font:16px/1.6 Arial,sans-serif;max-width:760px;margin:40px auto;padding:0 18px;color:#17243a">
    <h1>EasyBuy setup check</h1>
    <p>This page checks database connectivity and safely creates only the missing sellers table. It does not delete or alter existing EasyBuy tables or product data.</p>
    <ul><?php
        item('PHP version', version_compare(PHP_VERSION, '8.0.0', '>='), PHP_VERSION);
        try {
            $pdo = db();
            item('MySQL connection', true, 'Connected to configured database.');
            ensure_seller_table($pdo);
            ensure_product_columns($pdo);
            $st = $pdo->prepare('SHOW TABLES LIKE ?');
            $st->execute(['sellers']);
            $found = (bool)$st->fetchColumn();
            item('sellers table', $found, $found ? 'Ready for seller registration' : 'Could not create seller table. Check database permissions.');
            $st = $pdo->prepare('SHOW TABLES LIKE ?');
            $st->execute(['products']);
            $productsFound = (bool)$st->fetchColumn();
            item('products table', $productsFound, $productsFound ? 'Found; missing seller-publishing columns were safely added where needed' : 'Not found; database initialization did not create the table.');
            if ($productsFound) {
                $cols = $pdo->query('SHOW COLUMNS FROM products')->fetchAll();
                $names = array_column($cols, 'Field');
                $need = ['seller_id', 'name', 'category', 'price', 'condition_label', 'college', 'description', 'image_path', 'stock', 'status'];
                $missing = array_values(array_diff($need, $names));
                item('Product columns', count($missing) === 0, $missing ? 'Still missing: ' . implode(', ', $missing) : 'All required seller-publishing columns are present.');
            }
        } catch (Throwable $e) {
            item('MySQL connection', false, 'Cannot connect. Confirm MySQL is running and database name/credentials in api/config.php.');
            error_log('EasyBuy setup check: ' . $e->getMessage());
        }
        item('mbstring extension', function_exists('mb_strlen'), function_exists('mb_strlen') ? 'Enabled' : 'Not enabled; registration fallback is included.');
        ?></ul>
    <p><a href="index.php">Return to Seller Studio</a></p>
    <p><strong>Security:</strong> Delete this setup-check.php file after diagnosing on a public server.</p>
</body>

</html>
