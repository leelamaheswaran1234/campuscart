<?php
require __DIR__ . '/config.php';
$pdo = db();
ensure_seller_table($pdo);
$seller = require_seller();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
csrf_check();
$d = input_json();
$raw = trim((string)($d['phone'] ?? ''));
$digits = preg_replace('/\D+/', '', $raw);
if ($raw !== '' && (strlen($digits) < 10 || strlen($digits) > 15)) json_out(['ok' => false, 'error' => 'Enter a valid phone number with 10–15 digits, including country code if needed.'], 422);
$phone = $raw === '' ? '' : ('+' . (strlen($digits) === 10 ? '91' . $digits : $digits));
$st = $pdo->prepare('UPDATE sellers SET phone=? WHERE id=?');
$st->execute([$phone !== '' ? $phone : null, $seller['id']]);
$_SESSION['seller_phone'] = $phone;
json_out(['ok' => true, 'message' => 'Seller contact number saved.', 'phone' => $phone]);
