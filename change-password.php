<?php
require __DIR__ . '/config.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok'=>false,'error'=>'Method not allowed.'],405);
if (empty($_SESSION['seller_id'])) json_out(['ok'=>false,'error'=>'Please sign in to your seller account first.'],401);
csrf_check();
$data = input_json();
$current = (string)($data['current_password'] ?? '');
$new = (string)($data['new_password'] ?? '');
$confirm = (string)($data['confirm_password'] ?? '');
if ($current === '' || $new === '' || $confirm === '') json_out(['ok'=>false,'error'=>'Fill in all password fields.'],422);
if (strlen($new) < 8) json_out(['ok'=>false,'error'=>'New password must be at least 8 characters.'],422);
if ($new !== $confirm) json_out(['ok'=>false,'error'=>'New password and confirmation do not match.'],422);
if ($current === $new) json_out(['ok'=>false,'error'=>'Choose a different password from your current one.'],422);
try {
  $pdo = db();
  ensure_seller_table($pdo);
  $st = $pdo->prepare('SELECT password_hash FROM sellers WHERE id=? LIMIT 1');
  $st->execute([(int)$_SESSION['seller_id']]);
  $hash = $st->fetchColumn();
  if (!$hash || !password_verify($current, (string)$hash)) json_out(['ok'=>false,'error'=>'Current password is incorrect.'],422);
  $newHash = password_hash($new, PASSWORD_DEFAULT);
  $up = $pdo->prepare('UPDATE sellers SET password_hash=? WHERE id=?');
  $up->execute([$newHash, (int)$_SESSION['seller_id']]);
  json_out(['ok'=>true,'message'=>'Password changed successfully.']);
} catch (Throwable $e) {
  error_log('EasyBuy change password: '.$e->getMessage());
  json_out(['ok'=>false,'error'=>'Could not change password. Check the PHP error log and database connection.'],500);
}
