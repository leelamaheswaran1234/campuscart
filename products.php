<?php
require __DIR__ . '/config.php';
function eb_text_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $pdo = db();
        ensure_seller_table($pdo);
        ensure_product_columns($pdo);
        $q = $pdo->query("SELECT p.id,p.source_id,p.seller_id,p.name,p.category,p.price,p.condition_label AS `condition`,p.college,p.description,p.image_path AS image,p.stock,p.pickup_location,p.pickup_map_url,COALESCE(p.view_count,0) AS views,p.available_sizes,p.measurements,p.customization_options,p.created_at,s.name AS seller_name,s.email AS seller_email,COALESCE(s.phone,'') AS contact,COALESCE(rv.avg_rating,0) AS rating,COALESCE(rv.review_count,0) AS reviews FROM products p JOIN sellers s ON s.id=p.seller_id LEFT JOIN (SELECT product_code,ROUND(AVG(rating),1) AS avg_rating,COUNT(*) AS review_count FROM eb_feedback GROUP BY product_code) rv ON rv.product_code=COALESCE(NULLIF(p.source_id,''),CONCAT(CHAR(76,73,86,69,45),p.id)) WHERE p.status='active' ORDER BY p.created_at DESC");
        $rows = $q->fetchAll();
        foreach ($rows as &$r) {
            // Default-catalogue products (seeded under the owner seller) keep their storefront id (EB101 ...)
            // so they replace the bundled static entry instead of appearing twice.
            $seeded = !empty($r['source_id']);
            $r['db_id'] = (int)$r['id'];
            $r['id'] = $seeded ? (string)$r['source_id'] : 'LIVE-' . $r['id'];
            unset($r['source_id']);
            $r['price'] = (float)$r['price'];
            if (!$seeded) $r['oldPrice'] = $r['price'];
            $r['stock'] = (int)$r['stock'];
            $r['available_sizes'] = $r['available_sizes'] ?? ''; $r['measurements'] = $r['measurements'] ?? ''; $r['customization_options'] = $r['customization_options'] ?? ''; 
            $r['rating'] = (float)($r['rating'] ?? 0);
            $r['reviews'] = (int)($r['reviews'] ?? 0);
            if ($seeded) {
                // Keep the existing storefront design data (old price, subtitle, specs, rating) for starter products;
                // only real buyer feedback from the database overrides the rating.
                if ($r['reviews'] === 0) unset($r['rating'], $r['reviews']);
                continue;
            }
            $r['subtitle'] = 'Verified database listing';
            $r['specs'] = ['Seller' => $r['seller_name'], 'Condition' => $r['condition']];
        }
        json_out(['ok' => true, 'products' => $rows]);
    } catch (Throwable $e) {
        error_log('EasyBuy products: ' . $e->getMessage());
        json_out(['ok' => false, 'error' => 'Could not load live products. Check that MySQL is running and the EasyBuy products table is available.', 'products' => []], 503);
    }
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $pdo = db();
        ensure_seller_table($pdo);
        ensure_product_columns($pdo);
    } catch (Throwable $e) {
        error_log('EasyBuy product DB connection: ' . $e->getMessage());
        $msg = (stripos($e->getMessage(), 'access denied') !== false) ? 'MySQL access denied. Check EASYBUY_DB_USER and EASYBUY_DB_PASS in api/config.php.' : 'Could not connect to the EasyBuy database. Start MySQL in XAMPP and check api/config.php settings.';
        json_out(['ok' => false, 'error' => $msg], 503);
    }
    $seller = require_seller();
    csrf_check();
    $name = trim((string)($_POST['name'] ?? ''));
    $category = trim((string)($_POST['category'] ?? ''));
    $price = filter_var($_POST['price'] ?? null, FILTER_VALIDATE_FLOAT);
    $condition = trim((string)($_POST['condition'] ?? 'Second-hand · Good'));
    $college = trim((string)($_POST['college'] ?? ''));
    $description = trim((string)($_POST['description'] ?? ''));
    $stock = filter_var($_POST['stock'] ?? 1, FILTER_VALIDATE_INT);
    $sizes = trim((string)($_POST['available_sizes'] ?? ''));
    $measurements = trim((string)($_POST['measurements'] ?? ''));
    $customization = trim((string)($_POST['customization_options'] ?? ''));
    $pickupLocation = trim((string)($_POST['pickup_location'] ?? ''));
    $pickupMapUrl = trim((string)($_POST['pickup_map_url'] ?? ''));
    if (strlen($pickupLocation) > 255 || strlen($pickupMapUrl) > 500 || ($pickupMapUrl !== '' && (!filter_var($pickupMapUrl, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $pickupMapUrl)))) json_out(['ok'=>false,'error'=>'Enter a valid pickup location and optional Google Maps URL.'],422);
    $categories = ['Books', 'Stationery Kits', 'Calculators', 'Lab Equipment', 'Electronics', 'Accessories', 'T-Shirts', 'Bags'];
    if (eb_text_length($name) < 3 || eb_text_length($name) > 100 || !in_array($category, $categories, true) || $price === false || $price <= 0 || $price > 100000 || eb_text_length($college) < 2 || $stock === false || $stock < 1 || $stock > 999) json_out(['ok' => false, 'error' => 'Check product name, category, price, college and stock fields.'], 422);
    if (eb_text_length($sizes)>255 || eb_text_length($measurements)>1000 || eb_text_length($customization)>1000) json_out(['ok'=>false,'error'=>'Sizes max 255 characters; measurements/customization max 1,000 each.'],422);
    if (eb_text_length($description) > 2000) json_out(['ok' => false, 'error' => 'Description must be 2,000 characters or fewer.'], 422);
    if (empty($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) json_out(['ok' => false, 'error' => 'Upload a product photo.'], 422);
    $f = $_FILES['photo'];
    if ($f['size'] > 4 * 1024 * 1024) json_out(['ok' => false, 'error' => 'Photo must be 4 MB or smaller.'], 422);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($allowed[$mime]) || !@getimagesize($f['tmp_name'])) json_out(['ok' => false, 'error' => 'Use a valid JPG, PNG or WEBP photo.'], 422);
    $dir = dirname(__DIR__) . '/uploads/products';
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) json_out(['ok' => false, 'error' => 'Upload directory could not be created.'], 500);
    $file = bin2hex(random_bytes(16)) . '.' . $allowed[$mime];
    if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $file)) json_out(['ok' => false, 'error' => 'Could not save photo.'], 500);
    $rel = 'uploads/products/' . $file;
    try {
        $st = $pdo->prepare("INSERT INTO products(seller_id,name,category,price,condition_label,college,description,image_path,stock,available_sizes,measurements,customization_options,pickup_location,pickup_map_url,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active')");
        $st->execute([$seller['id'], $name, $category, $price, $condition, $college, $description, $rel, $stock, $sizes, $measurements, $customization, $pickupLocation, $pickupMapUrl]);
        $newId = (int)db()->lastInsertId();
        db()->prepare("INSERT INTO eb_product_history(product_id,seller_id,action,details) VALUES(?,?, 'published',?)")->execute([$newId, $seller['id'], 'Published listing ' . $name]);
        json_out(['ok' => true, 'message' => 'Product published to the shared EasyBuy catalogue.', 'id' => $newId]);
    } catch (Throwable $e) {
        @unlink($dir . '/' . $file);
        error_log('EasyBuy product create: ' . $e->getMessage());
        $local = in_array(strtolower((string)($_SERVER['HTTP_HOST'] ?? '')), ['localhost', '127.0.0.1', 'localhost:80', '127.0.0.1:80'], true);
        $payload = ['ok' => false, 'error' => 'Could not save product. The database rejected the insert. Check api/config.php and the products table.'];
        if ($local) $payload['error'] .= ' Details: ' . $e->getMessage();
        json_out($payload, 500);
    }
}
json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
