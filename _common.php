<?php
require_once __DIR__ . '/../api/config.php';
function admin_ready(PDO $pdo): void {
  $pdo->exec("CREATE TABLE IF NOT EXISTS eb_admin_users (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, username VARCHAR(80) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, last_login_at TIMESTAMP NULL DEFAULT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
  $pdo->exec("CREATE TABLE IF NOT EXISTS eb_analytics_events (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, event_type VARCHAR(30) NOT NULL, visitor_key VARCHAR(64) NOT NULL, page_path VARCHAR(255) NOT NULL DEFAULT '/', seller_id BIGINT UNSIGNED NULL, visitor_label VARCHAR(254) NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_analytics_type_date(event_type,created_at), INDEX idx_analytics_visitor(visitor_key,created_at), INDEX idx_analytics_seller(seller_id,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}
function admin_require_login(): void { if (empty($_SESSION['admin_id'])) { header('Location: login.php'); exit; } }
function admin_e($v): string { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }
function admin_money($v): string { return '₹' . number_format((float)$v, 2); }
function admin_order_financials(PDO $pdo): array {
  $q=$pdo->query("SELECT COUNT(*) orders_count, COALESCE(SUM(CASE WHEN status<>'Cancelled' THEN total ELSE 0 END),0) order_value, COALESCE(SUM(CASE WHEN status<>'Cancelled' THEN delivery_charge ELSE 0 END),0) stored_delivery FROM eb_orders");
  $a=$q->fetch() ?: ['orders_count'=>0,'order_value'=>0,'stored_delivery'=>0];
  $a['delivery_total']=(float)$pdo->query("SELECT COALESCE(SUM(CASE WHEN o.status='Cancelled' THEN 0 WHEN o.delivery_charge>0 THEN o.delivery_charge ELSE GREATEST(o.total-COALESCE(i.subtotal,0),0) END),0) FROM eb_orders o LEFT JOIN (SELECT order_id,SUM(unit_price*quantity) subtotal FROM eb_order_items GROUP BY order_id) i ON i.order_id=o.id")->fetchColumn();
  $a['sold_qty']=(int)$pdo->query("SELECT COALESCE(SUM(i.quantity),0) FROM eb_order_items i JOIN eb_orders o ON o.id=i.order_id WHERE o.status<>'Cancelled'")->fetchColumn();
  $a['seller_revenue']=(float)$pdo->query("SELECT COALESCE(SUM(i.unit_price*i.quantity),0) FROM eb_order_items i JOIN eb_orders o ON o.id=i.order_id WHERE o.status<>'Cancelled' AND i.seller_id IS NOT NULL")->fetchColumn();
  return $a;
}
