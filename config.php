<?php

declare(strict_types=1);
// Keep PHP warnings/fatal HTML out of API responses; details go to the XAMPP PHP error log.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
if (strpos(str_replace('\\', '/', (string)($_SERVER['SCRIPT_NAME'] ?? '')), '/api/') !== false) {
    register_shutdown_function(static function (): void {
        $last = error_get_last();
        if ($last && in_array($last['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)
            && !headers_sent()) {
            while (ob_get_level() > 0) { ob_end_clean(); }
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['ok' => false, 'error' => 'A PHP fatal error occurred. Check XAMPP PHP error log.']);
        }
    });
}
// Safer session cookie defaults; Secure is enabled automatically on HTTPS production hosts.
$isHttps = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
    || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
// Default catalogue owner. Every bundled starter product belongs to this seller account.
// Override with the EASYBUY_OWNER_EMAIL environment variable if the owner uses another address.
if (!defined('EASYBUY_OWNER_EMAIL')) define('EASYBUY_OWNER_EMAIL', strtolower(getenv('EASYBUY_OWNER_EMAIL') ?: '227027089@sastra.ac.in'));
// Placeholder stored in sellers.password_hash until the owner registers once to claim the seeded account.
// It is not a valid password hash, so password_verify() can never succeed against it.
if (!defined('EASYBUY_UNCLAIMED_HASH')) define('EASYBUY_UNCLAIMED_HASH', '!unclaimed-owner-account');
function db(): PDO
{
    static $pdo = null;
    static $schemaReady = false;
    if ($pdo instanceof PDO) return $pdo;
    // Local XAMPP defaults; set InfinityFree values in the production branch below.
    $isLocalHost = in_array(strtolower((string)($_SERVER['HTTP_HOST'] ?? '')), ['localhost', '127.0.0.1'], true);
    if ($isLocalHost) {
        $host = getenv('EASYBUY_DB_HOST') ?: '127.0.0.1';
        $name = getenv('EASYBUY_DB_NAME') ?: 'easybuy';
        $user = getenv('EASYBUY_DB_USER') ?: 'root';
        $pass = getenv('EASYBUY_DB_PASS') ?: '';
    } else {
        // Replace only the password placeholder with the MySQL password from InfinityFree.
       $host = getenv('EASYBUY_DB_HOST') ?: '';
       $name = getenv('EASYBUY_DB_NAME') ?: '';
       $user = getenv('EASYBUY_DB_USER') ?: '';
       $pass = getenv('EASYBUY_DB_PASS') ?: ''; // Set this to your hosting MySQL password before deployment.
    }
    $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false];
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4", $user, $pass, $options);
    } catch (PDOException $e) {
        // XAMPP first-run recovery: create only the configured database if it is missing.
        if (stripos($e->getMessage(), 'Unknown database') === false) throw $e;
        $safeName = preg_replace('/[^A-Za-z0-9_]/', '', $name);
        if ($safeName === '' || $safeName !== $name) throw $e;
        $bootstrap = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, $options);
        $bootstrap->exec("CREATE DATABASE IF NOT EXISTS `{$safeName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4", $user, $pass, $options);
    }
    if (!$schemaReady) {
        // Create missing seller tables safely. Existing rows/tables are never dropped.
        // Persistent buyer accounts. Existing seller/product/order data is preserved.
        $pdo->exec("CREATE TABLE IF NOT EXISTS buyers (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(80) NOT NULL,
          email VARCHAR(254) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          phone VARCHAR(24) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $pdo->exec("CREATE TABLE IF NOT EXISTS sellers (
   id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
   name VARCHAR(80) NOT NULL,
   email VARCHAR(254) NOT NULL UNIQUE,
   phone VARCHAR(20) NULL,
   password_hash VARCHAR(255) NOT NULL,
   status ENUM('active','suspended') NOT NULL DEFAULT 'active',
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $cols = $pdo->query("SHOW COLUMNS FROM sellers LIKE 'phone'")->fetch();
        if (!$cols) $pdo->exec("ALTER TABLE sellers ADD COLUMN phone VARCHAR(20) NULL AFTER email");
        $pdo->exec("CREATE TABLE IF NOT EXISTS products (
   id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
   seller_id BIGINT UNSIGNED NULL,
   name VARCHAR(100) NOT NULL DEFAULT 'Untitled product',
   category VARCHAR(80) NOT NULL DEFAULT 'Accessories',
   price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
   condition_label VARCHAR(60) NOT NULL DEFAULT 'Second-hand · Good',
   college VARCHAR(100) NOT NULL DEFAULT 'Not specified',
   description VARCHAR(2000) NOT NULL DEFAULT '',
   image_path VARCHAR(255) NOT NULL DEFAULT '',
   stock INT UNSIGNED NOT NULL DEFAULT 1,
   status VARCHAR(20) NOT NULL DEFAULT 'active',
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   INDEX idx_products_status_created(status,created_at),
   INDEX idx_products_seller(seller_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        ensure_product_columns($pdo);
        // Additive schema for persistent orders, tracking, product history and buyer/seller messages.
        $pdo->exec("CREATE TABLE IF NOT EXISTS eb_orders (
   id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
   order_code VARCHAR(32) NOT NULL UNIQUE,
   customer_email VARCHAR(254) NOT NULL,
   customer_name VARCHAR(100) NOT NULL,
   customer_phone VARCHAR(24) NOT NULL,
   delivery_address VARCHAR(500) NOT NULL,
   payment_method VARCHAR(40) NOT NULL,
   payment_status VARCHAR(60) NOT NULL DEFAULT 'Not processed',
   status ENUM('Placed','Confirmed','Shipped','Delivered','Cancelled') NOT NULL DEFAULT 'Placed',
   total DECIMAL(10,2) NOT NULL DEFAULT 0,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   INDEX idx_eb_orders_customer(customer_email,created_at), INDEX idx_eb_orders_status(status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        // Additive delivery-estimate fields for existing installations; never drops order data.
        try { $pdo->exec("ALTER TABLE eb_orders ADD COLUMN delivery_speed VARCHAR(16) NOT NULL DEFAULT 'standard'"); } catch (Throwable $e) { }
        try { $pdo->exec("ALTER TABLE eb_orders ADD COLUMN estimated_delivery_start DATE NULL"); } catch (Throwable $e) { }
        try { $pdo->exec("ALTER TABLE eb_orders ADD COLUMN estimated_delivery_end DATE NULL"); } catch (Throwable $e) { }
        $pdo->exec("CREATE TABLE IF NOT EXISTS eb_order_items (
   id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
   order_id BIGINT UNSIGNED NOT NULL,
   product_id BIGINT UNSIGNED NULL,
   product_code VARCHAR(80) NOT NULL,
   product_name VARCHAR(150) NOT NULL,
   category VARCHAR(80) NOT NULL DEFAULT '',
   image_path VARCHAR(255) NOT NULL DEFAULT '',
   unit_price DECIMAL(10,2) NOT NULL,
   quantity INT UNSIGNED NOT NULL,
   seller_id BIGINT UNSIGNED NULL,
   INDEX idx_eb_items_order(order_id), INDEX idx_eb_items_seller(seller_id),
   CONSTRAINT fk_eb_items_order FOREIGN KEY(order_id) REFERENCES eb_orders(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $pdo->exec("CREATE TABLE IF NOT EXISTS eb_tracking_events (
   id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
   order_id BIGINT UNSIGNED NOT NULL,
   status VARCHAR(40) NOT NULL,
   note VARCHAR(500) NOT NULL DEFAULT '',
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   INDEX idx_eb_tracking_order(order_id,created_at),
   CONSTRAINT fk_eb_tracking_order FOREIGN KEY(order_id) REFERENCES eb_orders(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $pdo->exec("CREATE TABLE IF NOT EXISTS eb_messages (
   id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
   thread_key VARCHAR(80) NOT NULL,
   order_id BIGINT UNSIGNED NULL,
   product_code VARCHAR(80) NULL,
   sender_role ENUM('buyer','seller') NOT NULL,
   sender_email VARCHAR(254) NOT NULL,
   recipient_email VARCHAR(254) NOT NULL,
   body TEXT NOT NULL,
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   INDEX idx_eb_messages_thread(thread_key,created_at), INDEX idx_eb_messages_recipient(recipient_email,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $pdo->exec("CREATE TABLE IF NOT EXISTS eb_product_history (
   id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
   product_id BIGINT UNSIGNED NOT NULL,
   seller_id BIGINT UNSIGNED NOT NULL,
   action VARCHAR(40) NOT NULL,
   details VARCHAR(500) NOT NULL DEFAULT '',
   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   INDEX idx_eb_product_history(product_id,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        // Additive delivery/cancellation fields for the order lifecycle. Existing orders are preserved.
        foreach (
            [
                'delivery_otp' => "VARCHAR(6) NULL",
                'delivery_otp_verified_at' => "TIMESTAMP NULL DEFAULT NULL",
                'cancelled_at' => "TIMESTAMP NULL DEFAULT NULL"
            ] as $column => $definition
        ) {
            $present = $pdo->query("SHOW COLUMNS FROM eb_orders LIKE '" . $column . "'")->fetch();
            if (!$present) $pdo->exec('ALTER TABLE eb_orders ADD COLUMN `' . $column . '` ' . $definition);
        }
        // Return/refund, feedback, shipping details and product customization (additive; preserve existing data).
        $pdo->exec("CREATE TABLE IF NOT EXISTS eb_return_requests (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, order_id BIGINT UNSIGNED NOT NULL,
          customer_email VARCHAR(254) NOT NULL, reason VARCHAR(500) NOT NULL,
          status ENUM('Requested','Approved','Rejected','Refunded') NOT NULL DEFAULT 'Requested',
          refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_return_order(order_id), INDEX idx_return_customer(customer_email),
          CONSTRAINT fk_return_order FOREIGN KEY(order_id) REFERENCES eb_orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $pdo->exec("CREATE TABLE IF NOT EXISTS eb_return_history (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, return_id BIGINT UNSIGNED NOT NULL,
          order_id BIGINT UNSIGNED NOT NULL, status VARCHAR(30) NOT NULL, note VARCHAR(500) NOT NULL DEFAULT '',
          changed_by VARCHAR(254) NOT NULL DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_return_history(return_id,created_at),
          CONSTRAINT fk_return_history_request FOREIGN KEY(return_id) REFERENCES eb_return_requests(id) ON DELETE CASCADE,
          CONSTRAINT fk_return_history_order FOREIGN KEY(order_id) REFERENCES eb_orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $pdo->exec("CREATE TABLE IF NOT EXISTS eb_feedback (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, order_id BIGINT UNSIGNED NOT NULL,
          product_code VARCHAR(80) NOT NULL, customer_email VARCHAR(254) NOT NULL,
          rating TINYINT UNSIGNED NOT NULL, comment VARCHAR(1000) NOT NULL DEFAULT '',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_feedback_order_product(order_id,product_code), INDEX idx_feedback_product(product_code),
          CONSTRAINT fk_feedback_order FOREIGN KEY(order_id) REFERENCES eb_orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        // Repair older feedback tables created before the comment field was introduced.
        $feedbackComment = $pdo->query("SHOW COLUMNS FROM eb_feedback LIKE 'comment'")->fetch();
        if (!$feedbackComment) $pdo->exec("ALTER TABLE eb_feedback ADD COLUMN comment VARCHAR(1000) NOT NULL DEFAULT '' AFTER rating");
        // Ensure legacy tracking tables have the expected note field too.
        $trackingNote = $pdo->query("SHOW COLUMNS FROM eb_tracking_events LIKE 'note'")->fetch();
        if (!$trackingNote) $pdo->exec("ALTER TABLE eb_tracking_events ADD COLUMN note VARCHAR(500) NOT NULL DEFAULT '' AFTER status");
        foreach ([
          'shipper_name' => "VARCHAR(100) NULL", 'tracking_number' => "VARCHAR(100) NULL", 'tracking_url' => "VARCHAR(500) NULL",
          'received_at' => "TIMESTAMP NULL DEFAULT NULL"
        ] as $column => $definition) {
          $present = $pdo->query("SHOW COLUMNS FROM eb_orders LIKE '" . $column . "'")->fetch();
          if (!$present) $pdo->exec('ALTER TABLE eb_orders ADD COLUMN `' . $column . '` ' . $definition);
        }
        foreach ([
          'available_sizes' => "VARCHAR(255) NOT NULL DEFAULT ''", 'measurements' => "VARCHAR(1000) NOT NULL DEFAULT ''",
          'customization_options' => "VARCHAR(1000) NOT NULL DEFAULT ''"
        ] as $column => $definition) {
          $present = $pdo->query("SHOW COLUMNS FROM products LIKE '" . $column . "'")->fetch();
          if (!$present) $pdo->exec('ALTER TABLE products ADD COLUMN `' . $column . '` ' . $definition);
        }
        // Admin dashboard and privacy-conscious visit analytics.
        $pdo->exec("CREATE TABLE IF NOT EXISTS eb_admin_users (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(80) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMP NULL DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $pdo->exec("CREATE TABLE IF NOT EXISTS eb_analytics_events (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          event_type VARCHAR(30) NOT NULL,
          visitor_key VARCHAR(64) NOT NULL,
          page_path VARCHAR(255) NOT NULL DEFAULT '/',
          seller_id BIGINT UNSIGNED NULL,
          visitor_label VARCHAR(254) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_analytics_type_date(event_type,created_at),
          INDEX idx_analytics_visitor(visitor_key,created_at),
          INDEX idx_analytics_seller(seller_id,created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $deliveryCol = $pdo->query("SHOW COLUMNS FROM eb_orders LIKE 'delivery_charge'")->fetch();
        if (!$deliveryCol) $pdo->exec("ALTER TABLE eb_orders ADD COLUMN delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total");
        // Buyer profile/cart/wishlist tables, order<->buyer link and the default owner catalogue (additive, idempotent).
        try { ensure_buyer_data_schema($pdo); } catch (Throwable $e) { error_log('EasyBuy buyer-data schema: ' . $e->getMessage()); }
        $schemaReady = true;
    }
    return $pdo;
}
function json_out(array $data, int $status = 200)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/** Safely add columns required by the seller product publisher to an older products table.
 * Existing rows are retained. No table is dropped and no existing column is overwritten.
 */
function ensure_product_columns(PDO $pdo): void
{
    $required = [
        'seller_id' => "BIGINT UNSIGNED NULL",
        'name' => "VARCHAR(100) NOT NULL DEFAULT 'Untitled product'",
        'category' => "VARCHAR(80) NOT NULL DEFAULT 'Accessories'",
        'price' => "DECIMAL(10,2) NOT NULL DEFAULT 0.00",
        'condition_label' => "VARCHAR(60) NOT NULL DEFAULT 'Second-hand · Good'",
        'college' => "VARCHAR(100) NOT NULL DEFAULT 'Not specified'",
        'description' => "VARCHAR(2000) NOT NULL DEFAULT ''",
        'image_path' => "VARCHAR(255) NOT NULL DEFAULT ''",
        'stock' => "INT UNSIGNED NOT NULL DEFAULT 1",
        'pickup_location' => "VARCHAR(255) NOT NULL DEFAULT ''",
        'pickup_map_url' => "VARCHAR(500) NOT NULL DEFAULT ''",
        'view_count' => "BIGINT UNSIGNED NOT NULL DEFAULT 0",
        'status' => "VARCHAR(20) NOT NULL DEFAULT 'active'",
        'created_at' => "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    ];
    $present = [];
    foreach ($pdo->query('SHOW COLUMNS FROM products')->fetchAll() as $column) $present[$column['Field']] = true;
    foreach ($required as $column => $definition) {
        if (!isset($present[$column])) {
            $pdo->exec('ALTER TABLE products ADD COLUMN `' . $column . '` ' . $definition);
        }
    }
}

/** Create only the seller-auth table when absent; never drop or alter existing EasyBuy tables. */
function ensure_seller_table(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS sellers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $col = $pdo->query("SHOW COLUMNS FROM sellers LIKE 'phone'")->fetch();
    if (!$col) $pdo->exec("ALTER TABLE sellers ADD COLUMN phone VARCHAR(20) NULL AFTER email");
    $qcol = $pdo->query("SHOW COLUMNS FROM sellers LIKE 'security_question'")->fetch();
    if (!$qcol) $pdo->exec("ALTER TABLE sellers ADD COLUMN security_question VARCHAR(160) NULL AFTER password_hash");
    $acol = $pdo->query("SHOW COLUMNS FROM sellers LIKE 'security_answer_hash'")->fetch();
    if (!$acol) $pdo->exec("ALTER TABLE sellers ADD COLUMN security_answer_hash VARCHAR(255) NULL AFTER security_question");
}

function input_json(): array
{
    $d = json_decode(file_get_contents('php://input'), true);
    return is_array($d) ? $d : $_POST;
}
function require_seller(): array
{
    if (empty($_SESSION['seller_id'])) json_out(['ok' => false, 'error' => 'Please sign in to your seller account.'], 401);
    return ['id' => (int)$_SESSION['seller_id'], 'name' => (string)$_SESSION['seller_name'], 'email' => (string)$_SESSION['seller_email']];
}
function csrf_check(): void
{
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!$sent || !hash_equals($_SESSION['csrf'] ?? '', $sent)) json_out(['ok' => false, 'error' => 'Security token expired. Refresh and try again.'], 419);
}

/** Add a column only when it does not exist yet. Never alters or drops existing data. */
function eb_add_column(PDO $pdo, string $table, string $column, string $definition): void
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table) || !preg_match('/^[A-Za-z0-9_]+$/', $column)) return;
    $present = $pdo->query('SHOW COLUMNS FROM `' . $table . '` LIKE \'' . $column . '\'')->fetch();
    if (!$present) $pdo->exec('ALTER TABLE `' . $table . '` ADD COLUMN `' . $column . '` ' . $definition);
}

/** Tables/columns for buyer profile, cart, wishlist, plus default-catalogue seeding. Additive and idempotent. */
function ensure_buyer_data_schema(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS eb_settings (
      k VARCHAR(60) NOT NULL PRIMARY KEY,
      v VARCHAR(255) NOT NULL DEFAULT '',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $flag = $pdo->prepare('SELECT v FROM eb_settings WHERE k=?');
    $flag->execute(['buyer_schema_v1']);
    if ($flag->fetchColumn() === false) {
        // Buyer profile fields (the buyers table itself is created above in db()).
        eb_add_column($pdo, 'buyers', 'address', "VARCHAR(500) NOT NULL DEFAULT ''");
        eb_add_column($pdo, 'buyers', 'college', "VARCHAR(100) NOT NULL DEFAULT ''");
        eb_add_column($pdo, 'buyers', 'city', "VARCHAR(80) NOT NULL DEFAULT ''");
        eb_add_column($pdo, 'buyers', 'pincode', "VARCHAR(12) NOT NULL DEFAULT ''");
        $pdo->exec("CREATE TABLE IF NOT EXISTS eb_cart_items (
          buyer_id BIGINT UNSIGNED NOT NULL,
          product_code VARCHAR(80) NOT NULL,
          quantity INT UNSIGNED NOT NULL DEFAULT 1,
          added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (buyer_id, product_code),
          CONSTRAINT fk_eb_cart_buyer FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $pdo->exec("CREATE TABLE IF NOT EXISTS eb_wishlist_items (
          buyer_id BIGINT UNSIGNED NOT NULL,
          product_code VARCHAR(80) NOT NULL,
          added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (buyer_id, product_code),
          CONSTRAINT fk_eb_wish_buyer FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        // Link orders to the buyer account (customer_email stays for older rows and for sellers).
        eb_add_column($pdo, 'eb_orders', 'buyer_id', 'BIGINT UNSIGNED NULL');
        // Starter-catalogue id (EB101 ...) so seeded products keep the same id the storefront already uses.
        eb_add_column($pdo, 'products', 'source_id', 'VARCHAR(40) NULL');
        $idx = $pdo->query("SHOW INDEX FROM products WHERE Key_name='uq_products_source_id'")->fetch();
        if (!$idx) $pdo->exec('ALTER TABLE products ADD UNIQUE KEY uq_products_source_id (source_id)');
        // Attach existing orders to buyer accounts that already share the order e-mail.
        $pdo->exec('UPDATE eb_orders o JOIN buyers b ON LOWER(b.email)=LOWER(o.customer_email) SET o.buyer_id=b.id WHERE o.buyer_id IS NULL');
        $pdo->prepare("INSERT INTO eb_settings(k,v) VALUES('buyer_schema_v1','1') ON DUPLICATE KEY UPDATE v='1'")->execute();
    }
    // Buyer password recovery (security question), added in a later revision.
    $flag2 = $pdo->prepare('SELECT v FROM eb_settings WHERE k=?');
    $flag2->execute(['buyer_schema_v2']);
    if ($flag2->fetchColumn() === false) {
        eb_add_column($pdo, 'buyers', 'security_question', 'VARCHAR(160) NULL');
        eb_add_column($pdo, 'buyers', 'security_answer_hash', 'VARCHAR(255) NULL');
        $pdo->prepare("INSERT INTO eb_settings(k,v) VALUES('buyer_schema_v2','1') ON DUPLICATE KEY UPDATE v='1'")->execute();
    }
    $seeded = $pdo->prepare('SELECT v FROM eb_settings WHERE k=?');
    $seeded->execute(['owner_catalogue_v1']);
    if ($seeded->fetchColumn() === false) eb_seed_owner_catalogue($pdo);
}

/**
 * Seed the default 250-product catalogue (owner-products-seed.json) under the Owner Seller account.
 * Idempotent: products are matched by source_id, existing rows are adopted instead of duplicated,
 * and no existing product, order or seller is changed or deleted.
 * @return array{owner_id:int,inserted:int,adopted:int,skipped:int}|null
 */
function eb_seed_owner_catalogue(PDO $pdo, bool $markDone = true): ?array
{
    $file = dirname(__DIR__) . '/owner-products-seed.json';
    if (!is_file($file)) return null;
    $rows = json_decode((string)file_get_contents($file), true);
    if (!is_array($rows) || !$rows) return null;
    $stats = ['owner_id' => 0, 'inserted' => 0, 'adopted' => 0, 'skipped' => 0];
    $pdo->beginTransaction();
    try {
        $q = $pdo->prepare('SELECT id FROM sellers WHERE LOWER(email)=LOWER(?) LIMIT 1');
        $q->execute([EASYBUY_OWNER_EMAIL]);
        $ownerId = (int)$q->fetchColumn();
        if (!$ownerId) {
            $pdo->prepare("INSERT INTO sellers(name,email,password_hash,status) VALUES('EasyBuy Owner',?,?,'active')")
                ->execute([EASYBUY_OWNER_EMAIL, EASYBUY_UNCLAIMED_HASH]);
            $ownerId = (int)$pdo->lastInsertId();
        }
        $stats['owner_id'] = $ownerId;
        $find = $pdo->prepare('SELECT id FROM products WHERE source_id=? LIMIT 1');
        $adopt = $pdo->prepare('UPDATE products SET source_id=? WHERE seller_id=? AND source_id IS NULL AND name=? AND category=? AND image_path=? ORDER BY id ASC LIMIT 1');
        $ins = $pdo->prepare("INSERT IGNORE INTO products(seller_id,name,category,price,condition_label,college,description,image_path,stock,status,source_id) VALUES(?,?,?,?,?,?,?,?,?,'active',?)");
        foreach ($rows as $r) {
            $sid = trim((string)($r['source_id'] ?? ''));
            $name = trim((string)($r['name'] ?? ''));
            $category = trim((string)($r['category'] ?? ''));
            $image = trim((string)($r['image'] ?? ''));
            if ($sid === '' || strlen($sid) > 40 || $name === '' || $category === '' || $image === '') { $stats['skipped']++; continue; }
            $find->execute([$sid]);
            if ($find->fetchColumn()) { $stats['skipped']++; continue; }
            $adopt->execute([$sid, $ownerId, $name, $category, $image]);
            if ($adopt->rowCount()) { $stats['adopted']++; continue; }
            $ins->execute([
                $ownerId, mb_substr($name, 0, 100, 'UTF-8'), $category, (float)($r['price'] ?? 0),
                mb_substr((string)($r['condition'] ?? 'Second-hand · Good'), 0, 60, 'UTF-8'),
                mb_substr((string)($r['college'] ?? 'SASTRA University'), 0, 100, 'UTF-8'),
                mb_substr((string)($r['description'] ?? ''), 0, 2000, 'UTF-8'),
                substr($image, 0, 255), max(0, (int)($r['stock'] ?? 1)), $sid,
            ]);
            $stats['inserted'] += $ins->rowCount() ? 1 : 0;
        }
        if ($markDone) {
            $pdo->prepare("INSERT INTO eb_settings(k,v) VALUES('owner_catalogue_v1',?) ON DUPLICATE KEY UPDATE v=VALUES(v)")
                ->execute([(string)count($rows)]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('EasyBuy owner catalogue seed: ' . $e->getMessage());
        return null;
    }
    return $stats;
}

/** Current buyer from the PHP session, or null. */
function current_buyer(): ?array
{
    if (empty($_SESSION['buyer_id']) || empty($_SESSION['buyer_email'])) return null;
    return ['id' => (int)$_SESSION['buyer_id'], 'email' => strtolower((string)$_SESSION['buyer_email']), 'name' => (string)($_SESSION['buyer_name'] ?? '')];
}
/** Require a logged-in buyer (401 otherwise). */
function require_buyer(): array
{
    $b = current_buyer();
    if (!$b) json_out(['ok' => false, 'error' => 'Please log in to your buyer account.'], 401);
    return $b;
}
/** CSRF check for buyer-session POST/PATCH requests (X-CSRF-Token header). */
function buyer_csrf_check(): void
{
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['buyer_csrf']) || !$sent || !hash_equals($_SESSION['buyer_csrf'], $sent)) json_out(['ok' => false, 'error' => 'Refresh and try again.'], 419);
}
