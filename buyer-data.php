<?php
/**
 * Buyer profile, cart and wishlist stored in MySQL (tables: buyers, eb_cart_items, eb_wishlist_items).
 *
 *   GET  api/buyer-data.php                 -> {ok, profile, cart:[{id,qty}], wishlist:[id,...]}
 *   POST api/buyer-data.php {action:save_profile, name, phone, address, college, city, pincode}
 *   POST api/buyer-data.php {action:set_cart, items:[{id,qty}]}          (replaces the saved cart)
 *   POST api/buyer-data.php {action:set_wishlist, ids:[...]}             (replaces the saved wishlist)
 *   POST api/buyer-data.php {action:merge, cart:[...], wishlist:[...]}   (union with what is saved; used after login)
 * Every request is tied to the logged-in buyer session; POSTs also need the X-CSRF-Token header.
 */
require __DIR__ . '/config.php';
try {
    $pdo = db();
} catch (Throwable $e) {
    error_log('EasyBuy buyer-data DB: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Database connection failed. Check MySQL and api/config.php.'], 503);
}
$buyer = require_buyer();
const EB_MAX_LINES = 200;

function eb_len(string $v): int { return function_exists('mb_strlen') ? mb_strlen($v, 'UTF-8') : strlen($v); }

function eb_clean_code($v): string
{
    $v = trim((string)$v);
    return ($v !== '' && strlen($v) <= 80 && !preg_match('/[\x00-\x1F<>"\']/', $v)) ? $v : '';
}
/** @return array<string,int> product_code => qty */
function eb_clean_cart($items): array
{
    $out = [];
    if (!is_array($items)) return $out;
    foreach ($items as $it) {
        if (!is_array($it)) continue;
        $code = eb_clean_code($it['id'] ?? ($it['product_code'] ?? ''));
        $qty = filter_var($it['qty'] ?? ($it['quantity'] ?? 1), FILTER_VALIDATE_INT);
        if ($code === '' || $qty === false || $qty < 1) continue;
        $out[$code] = min(99, ($out[$code] ?? 0) + $qty);
        if (count($out) >= EB_MAX_LINES) break;
    }
    return $out;
}
/** @return string[] */
function eb_clean_ids($ids): array
{
    $out = [];
    if (!is_array($ids)) return $out;
    foreach ($ids as $id) {
        if (is_array($id)) $id = $id['id'] ?? ($id['product_id'] ?? '');
        $code = eb_clean_code($id);
        if ($code !== '') $out[$code] = true;
        if (count($out) >= EB_MAX_LINES) break;
    }
    return array_map('strval', array_keys($out));
}
function eb_read_cart(PDO $pdo, int $buyerId): array
{
    $st = $pdo->prepare('SELECT product_code AS id, quantity AS qty FROM eb_cart_items WHERE buyer_id=? ORDER BY added_at, product_code');
    $st->execute([$buyerId]);
    return array_map(static fn($r) => ['id' => (string)$r['id'], 'qty' => (int)$r['qty']], $st->fetchAll());
}
function eb_read_wishlist(PDO $pdo, int $buyerId): array
{
    $st = $pdo->prepare('SELECT product_code FROM eb_wishlist_items WHERE buyer_id=? ORDER BY added_at, product_code');
    $st->execute([$buyerId]);
    return array_map('strval', $st->fetchAll(PDO::FETCH_COLUMN));
}
function eb_write_cart(PDO $pdo, int $buyerId, array $cart): void
{
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM eb_cart_items WHERE buyer_id=?')->execute([$buyerId]);
        $ins = $pdo->prepare('INSERT INTO eb_cart_items(buyer_id,product_code,quantity) VALUES(?,?,?)');
        foreach ($cart as $code => $qty) $ins->execute([$buyerId, (string)$code, $qty]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}
function eb_write_wishlist(PDO $pdo, int $buyerId, array $ids): void
{
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM eb_wishlist_items WHERE buyer_id=?')->execute([$buyerId]);
        $ins = $pdo->prepare('INSERT INTO eb_wishlist_items(buyer_id,product_code) VALUES(?,?)');
        foreach ($ids as $code) $ins->execute([$buyerId, (string)$code]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}
function eb_profile(PDO $pdo, int $buyerId): array
{
    $st = $pdo->prepare('SELECT id,name,email,phone,address,college,city,pincode,created_at FROM buyers WHERE id=?');
    $st->execute([$buyerId]);
    return $st->fetch() ?: [];
}
function eb_state(PDO $pdo, int $buyerId): array
{
    return ['ok' => true, 'profile' => eb_profile($pdo, $buyerId), 'cart' => eb_read_cart($pdo, $buyerId), 'wishlist' => eb_read_wishlist($pdo, $buyerId)];
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') json_out(eb_state($pdo, $buyer['id']));
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
    buyer_csrf_check();
    $d = input_json();
    $action = (string)($d['action'] ?? '');

    if ($action === 'save_profile') {
        $name = trim((string)($d['name'] ?? ''));
        $phone = trim((string)($d['phone'] ?? ''));
        $address = trim((string)($d['address'] ?? ''));
        $college = trim((string)($d['college'] ?? ''));
        $city = trim((string)($d['city'] ?? ''));
        $pincode = trim((string)($d['pincode'] ?? ''));
        if (eb_len($name) < 2 || eb_len($name) > 80) json_out(['ok' => false, 'error' => 'Enter your name (2–80 characters).'], 422);
        $digits = preg_replace('/\D+/', '', $phone);
        if ($phone !== '' && (strlen($digits) < 8 || strlen($digits) > 15)) json_out(['ok' => false, 'error' => 'Enter a valid phone number (8–15 digits).'], 422);
        if (eb_len($address) > 500 || eb_len($college) > 100 || eb_len($city) > 80) json_out(['ok' => false, 'error' => 'Address (500), college (100) or city (80) is too long.'], 422);
        if ($pincode !== '' && !preg_match('/^[0-9A-Za-z \-]{3,12}$/', $pincode)) json_out(['ok' => false, 'error' => 'Enter a valid PIN / postal code.'], 422);
        $pdo->prepare('UPDATE buyers SET name=?,phone=?,address=?,college=?,city=?,pincode=? WHERE id=?')
            ->execute([$name, $phone !== '' ? $phone : null, $address, $college, $city, $pincode, $buyer['id']]);
        $_SESSION['buyer_name'] = $name;
        json_out(['ok' => true, 'message' => 'Profile saved.', 'profile' => eb_profile($pdo, $buyer['id'])]);
    }
    if ($action === 'set_cart') {
        eb_write_cart($pdo, $buyer['id'], eb_clean_cart($d['items'] ?? []));
        json_out(['ok' => true, 'cart' => eb_read_cart($pdo, $buyer['id'])]);
    }
    if ($action === 'set_wishlist') {
        eb_write_wishlist($pdo, $buyer['id'], eb_clean_ids($d['ids'] ?? []));
        json_out(['ok' => true, 'wishlist' => eb_read_wishlist($pdo, $buyer['id'])]);
    }
    if ($action === 'merge') {
        $cart = [];
        foreach (eb_read_cart($pdo, $buyer['id']) as $row) $cart[$row['id']] = $row['qty'];
        foreach (eb_clean_cart($d['cart'] ?? []) as $code => $qty) $cart[$code] = max($cart[$code] ?? 0, $qty);
        $cart = array_slice($cart, 0, EB_MAX_LINES, true);
        $wish = array_slice(array_values(array_unique(array_merge(eb_read_wishlist($pdo, $buyer['id']), eb_clean_ids($d['wishlist'] ?? [])))), 0, EB_MAX_LINES);
        eb_write_cart($pdo, $buyer['id'], $cart);
        eb_write_wishlist($pdo, $buyer['id'], $wish);
        json_out(eb_state($pdo, $buyer['id']));
    }
    json_out(['ok' => false, 'error' => 'Unknown action.'], 400);
} catch (Throwable $e) {
    error_log('EasyBuy buyer-data: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Could not save to the database. Check MySQL and the PHP error log.'], 500);
}
