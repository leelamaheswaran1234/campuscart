<?php
require __DIR__ . '/config.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok'=>false,'error'=>'POST required'],405);
$d = input_json();
$page = trim((string)($d['page'] ?? '/'));
$page = '/' . ltrim(substr($page,0,240), '/');
if (preg_match('/\b(admin|login\.php|setup\.php)\b/i', $page)) json_out(['ok'=>true,'ignored'=>true]);
$visitorKey = session_id();
if ($visitorKey === '') $visitorKey = bin2hex(random_bytes(16));
$sellerId = !empty($_SESSION['seller_id']) ? (int)$_SESSION['seller_id'] : null;
$label = !empty($_SESSION['seller_email']) ? (string)$_SESSION['seller_email'] : null;
try {
  $pdo = db();
  // Limit duplicate reload noise: one page view per visitor/page within 20 seconds.
  $q=$pdo->prepare("SELECT id FROM eb_analytics_events WHERE event_type='page_view' AND visitor_key=? AND page_path=? AND created_at >= DATE_SUB(NOW(), INTERVAL 20 SECOND) LIMIT 1");
  $q->execute([$visitorKey,$page]);
  if (!$q->fetchColumn()) {
    $st=$pdo->prepare("INSERT INTO eb_analytics_events(event_type,visitor_key,page_path,seller_id,visitor_label) VALUES('page_view',?,?,?,?)");
    $st->execute([$visitorKey,$page,$sellerId,$label]);
  }
  json_out(['ok'=>true]);
} catch(Throwable $e) { error_log('EasyBuy track: '.$e->getMessage()); json_out(['ok'=>false],503); }
