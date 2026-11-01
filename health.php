<?php
require __DIR__ . '/config.php';
try {
  $pdo = db();
  $tables = ['sellers', 'products', 'eb_orders', 'eb_order_items', 'eb_tracking_events', 'eb_messages', 'buyers', 'eb_cart_items', 'eb_wishlist_items'];
  $present = [];
  foreach ($tables as $table) {
    $safeTable = preg_replace('/[^a-zA-Z0-9_]/', '', $table);
    $q = $pdo->query("SHOW TABLES LIKE '" . $safeTable . "'");
    $present[$table] = (bool)$q->fetchColumn();
  }
  $catalogue = ['owner_email' => EASYBUY_OWNER_EMAIL, 'owner_products' => 0, 'owner_account_claimed' => null];
  try {
    $q = $pdo->prepare('SELECT s.id, s.password_hash FROM sellers s WHERE LOWER(s.email)=LOWER(?) LIMIT 1');
    $q->execute([EASYBUY_OWNER_EMAIL]);
    if ($owner = $q->fetch()) {
      $c = $pdo->prepare("SELECT COUNT(*) FROM products WHERE seller_id=? AND source_id IS NOT NULL AND status='active'");
      $c->execute([(int)$owner['id']]);
      $catalogue['owner_products'] = (int)$c->fetchColumn();
      $catalogue['owner_account_claimed'] = $owner['password_hash'] !== EASYBUY_UNCLAIMED_HASH;
    }
  } catch (Throwable $e) { error_log('EasyBuy health catalogue: ' . $e->getMessage()); }
  json_out(['ok' => true, 'database' => 'connected', 'database_name' => 'easybuy', 'tables' => $present, 'default_catalogue' => $catalogue, 'message' => 'Database connection is working.']);
} catch (Throwable $e) {
  error_log('EasyBuy health check: ' . $e->getMessage());
  json_out(['ok' => false, 'database' => 'failed', 'message' => 'Database connection failed. In XAMPP, start MySQL, then confirm api/config.php uses host 127.0.0.1, database easybuy, user root and your local MySQL password. Details are written to the PHP error log.'], 503);
}
