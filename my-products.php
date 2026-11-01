<?php
require __DIR__ . '/config.php';
$seller = require_seller();
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['history'] ?? '') === '1') {
    $st = db()->prepare('SELECT h.id,h.product_id,p.name AS product_name,h.action,h.details,h.created_at FROM eb_product_history h JOIN products p ON p.id=h.product_id WHERE h.seller_id=? ORDER BY h.created_at DESC LIMIT 100');
    $st->execute([$seller['id']]);
    json_out(['ok' => true, 'history' => $st->fetchAll()]);
}
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $st = db()->prepare('SELECT p.id,p.name,p.category,p.price,p.condition_label AS `condition`,p.college,p.stock,COALESCE(p.view_count,0) AS views,p.status,p.image_path AS image,p.created_at,COALESCE(rv.avg_rating,0) AS rating,COALESCE(rv.review_count,0) AS reviews FROM products p LEFT JOIN (SELECT product_code,ROUND(AVG(rating),1) AS avg_rating,COUNT(*) AS review_count FROM eb_feedback GROUP BY product_code) rv ON rv.product_code=CONCAT(CHAR(76,73,86,69,45),p.id) WHERE p.seller_id=? ORDER BY p.created_at DESC');
    $st->execute([$seller['id']]);
    json_out(['ok' => true, 'products' => $st->fetchAll()]);
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $d = input_json();
    $id = filter_var($d['id'] ?? null, FILTER_VALIDATE_INT);
    $action = $d['action'] ?? '';
    if (!$id || !in_array($action, ['remove', 'restore'], true)) json_out(['ok' => false, 'error' => 'Invalid product action.'], 422);
    $status = $action === 'remove' ? 'removed' : 'active';
    $st = db()->prepare('UPDATE products SET status=? WHERE id=? AND seller_id=?');
    $st->execute([$status, $id, $seller['id']]);
    if ($st->rowCount()) db()->prepare('INSERT INTO eb_product_history(product_id,seller_id,action,details) VALUES(?,?,?,?)')->execute([$id, $seller['id'], $status === 'removed' ? 'unpublished' : 'republished', 'Seller changed listing status to ' . $status]);
    json_out(['ok' => true, 'message' => $st->rowCount() ? 'Listing updated.' : 'No listing changed.']);
}
json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
