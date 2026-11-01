<?php
require __DIR__ . '/config.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok'=>false,'error'=>'POST required'],405);
$d=input_json(); $code=trim((string)($d['productId']??''));
if (!preg_match('/^LIVE-(\d+)$/',$code,$m)) json_out(['ok'=>false,'error'=>'Invalid product ID'],422);
try {
  $pdo=db(); ensure_product_columns($pdo);
  $st=$pdo->prepare("UPDATE products SET view_count=view_count+1 WHERE id=? AND status='active'");
  $st->execute([(int)$m[1]]);
  if (!$st->rowCount()) json_out(['ok'=>false,'error'=>'Product not found'],404);
  json_out(['ok'=>true]);
} catch(Throwable $e) { error_log('EasyBuy product view: '.$e->getMessage()); json_out(['ok'=>false,'error'=>'Could not record product view'],503); }
