<?php
require __DIR__ . '/config.php';
try { $pdo = db(); } catch (Throwable $e) { error_log('EasyBuy order features: '.$e->getMessage()); json_out(['ok'=>false,'error'=>'Database connection failed. Start MySQL and check api/config.php.'],503); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok'=>false,'error'=>'POST required'],405);
$d=input_json(); $action=(string)($d['action']??'');
if ($action === 'return_request' || $action === 'feedback') {
  $email=require_buyer()['email']; $code=trim((string)($d['orderCode']??'')); // buyer identity comes from the login session
  if (!filter_var($email,FILTER_VALIDATE_EMAIL)||$code==='') json_out(['ok'=>false,'error'=>'Customer email and order ID are required.'],422);
  $q=$pdo->prepare('SELECT * FROM eb_orders WHERE order_code=? AND customer_email=?'); $q->execute([$code,$email]); $o=$q->fetch();
  if (!$o) json_out(['ok'=>false,'error'=>'Order not found for this customer.'],404);
  if ($action==='return_request') {
    $reason=trim((string)($d['reason']??''));
    if ($o['status']!=='Delivered' || empty($o['received_at']) && empty($o['delivery_otp_verified_at'])) json_out(['ok'=>false,'error'=>'Return is available only after delivery is confirmed.'],409);
    $received=$o['received_at'] ?: $o['delivery_otp_verified_at'];
    if (time()-strtotime($received)>172800) json_out(['ok'=>false,'error'=>'The 48-hour return window has expired.'],409);
    if (strlen($reason)<5 || strlen($reason)>500) json_out(['ok'=>false,'error'=>'Enter a return reason (5–500 characters).'],422);
    try {
      $st=$pdo->prepare("INSERT INTO eb_return_requests(order_id,customer_email,reason,refund_amount) VALUES(?,?,?,?)"); $st->execute([$o['id'],$email,$reason,$o['total']]);
      $rid=(int)$pdo->lastInsertId();
      $pdo->prepare("INSERT INTO eb_return_history(return_id,order_id,status,note,changed_by) VALUES(?,?,'Requested',?,?)")->execute([$rid,$o['id'],'Customer submitted a return/refund request. Reason: '.$reason,$email]);
      // Notify every seller who supplied an item in this order through the existing Messages inbox.
      $sellers=$pdo->prepare("SELECT DISTINCT s.email FROM eb_order_items i LEFT JOIN products p ON p.id=COALESCE(i.product_id, CASE WHEN i.product_code LIKE 'LIVE-%' THEN CAST(SUBSTRING(i.product_code,6) AS UNSIGNED) ELSE NULL END) LEFT JOIN sellers s ON s.id=COALESCE(i.seller_id,p.seller_id) WHERE i.order_id=? AND s.email IS NOT NULL AND s.email<>?");
      $sellers->execute([$o['id'],$email]);
      $thread=substr(hash('sha256','refund|'.$o['id'].'|'.$email),0,40);
      $sellerEmails = $sellers->fetchAll(PDO::FETCH_COLUMN);
      foreach($sellerEmails as $sellerEmail) {
        $body='🔔 NEW REFUND REQUEST · Order '.$code.'. Requested amount ₹'.number_format((float)$o['total'],2,'.','').'. Reason: '.$reason;
        $pdo->prepare('INSERT INTO eb_messages(thread_key,order_id,product_code,sender_role,sender_email,recipient_email,body) VALUES(?,?,NULL,?,?,?,?)')->execute([$thread,$o['id'],'buyer',$email,$sellerEmail,$body]);
      }
    } catch(Throwable $e) { error_log('EasyBuy return request: '.$e->getMessage()); json_out(['ok'=>false,'error'=>'Could not save the return request. Check the database error log.'],500); }
    json_out(['ok'=>true,'message'=>'Return request saved. Seller notification and refund history added.']);
  }
  $rating=(int)($d['rating']??0); $comment=trim((string)($d['comment']??'')); $productCode=trim((string)($d['productCode']??''));
  if ($o['status']!=='Delivered') json_out(['ok'=>false,'error'=>'Feedback is available after delivery.'],409);
  if ($rating<1||$rating>5||$productCode==='') json_out(['ok'=>false,'error'=>'Choose a 1–5 star rating for a product.'],422);
  $q=$pdo->prepare('SELECT COUNT(*) FROM eb_order_items WHERE order_id=? AND product_code=?'); $q->execute([$o['id'],$productCode]);
  if (!(int)$q->fetchColumn()) json_out(['ok'=>false,'error'=>'That product is not in this order.'],403);
  try { $st=$pdo->prepare('INSERT INTO eb_feedback(order_id,product_code,customer_email,rating,comment) VALUES(?,?,?,?,?)'); $st->execute([$o['id'],$productCode,$email,$rating,substr($comment,0,1000)]); }
  catch(Throwable $e) { json_out(['ok'=>false,'error'=>'Feedback for this product and order has already been submitted.'],409); }
  json_out(['ok'=>true,'message'=>'Your rating and feedback have been saved.']);
}
if ($action==='shipper_update') {
  $seller=require_seller(); csrf_check(); $oid=(int)($d['orderId']??0);
  $name=trim((string)($d['shipperName']??'')); $number=trim((string)($d['trackingNumber']??'')); $url=trim((string)($d['trackingUrl']??''));
  if (!$oid||strlen($name)<2||strlen($name)>100||strlen($number)>100||($url!==''&&(!filter_var($url,FILTER_VALIDATE_URL)||!preg_match('#^https?://#i',$url)))) json_out(['ok'=>false,'error'=>'Enter shipper name and valid optional tracking details.'],422);
  $q=$pdo->prepare('SELECT o.id,o.status,o.order_code,o.customer_email FROM eb_orders o JOIN eb_order_items i ON i.order_id=o.id WHERE o.id=? AND i.seller_id=?'); $q->execute([$oid,$seller['id']]); $o=$q->fetch();
  if (!$o) json_out(['ok'=>false,'error'=>'Order not found for this seller.'],404);
  if (!in_array($o['status'],['Confirmed','Shipped'],true)) json_out(['ok'=>false,'error'=>'Shipper details can be updated after order confirmation.'],409);
  $pdo->beginTransaction(); $pdo->prepare('UPDATE eb_orders SET shipper_name=?,tracking_number=?,tracking_url=? WHERE id=?')->execute([$name,$number?:null,$url?:null,$oid]);
  $pdo->prepare("INSERT INTO eb_tracking_events(order_id,status,note) VALUES(?,?,?)")->execute([$oid,$o['status'],'Shipper: '.$name.($number?' · Tracking: '.$number:'').($url?' · '.$url:'')]); $pdo->commit();
  json_out(['ok'=>true,'message'=>'Shipper and tracking details saved to MySQL.']);
}
if ($action==='sync_refund_messages') {
  $seller=require_seller(); csrf_check();
  $q=$pdo->prepare("SELECT DISTINCT r.id AS return_id,r.order_id,r.customer_email,r.reason,r.refund_amount,r.status,o.order_code FROM eb_return_requests r JOIN eb_orders o ON o.id=r.order_id JOIN eb_order_items i ON i.order_id=o.id LEFT JOIN products p ON p.id=COALESCE(i.product_id, CASE WHEN i.product_code LIKE 'LIVE-%' THEN CAST(SUBSTRING(i.product_code,6) AS UNSIGNED) ELSE NULL END) WHERE COALESCE(i.seller_id,p.seller_id)=?");
  $q->execute([$seller['id']]); $rows=$q->fetchAll(); $added=0;
  foreach($rows as $r) {
    $exists=$pdo->prepare("SELECT id FROM eb_messages WHERE order_id=? AND recipient_email=? AND sender_role='buyer' AND body LIKE '%REFUND REQUEST%' LIMIT 1");
    $exists->execute([$r['order_id'],$seller['email']]);
    if ($exists->fetchColumn()) continue;
    $thread=substr(hash('sha256','refund|'.$r['order_id'].'|'.$r['customer_email']),0,40);
    $body='🔔 REFUND REQUEST · Order '.$r['order_code'].' · Status: '.$r['status'].' · Amount ₹'.number_format((float)$r['refund_amount'],2,'.','').'. Reason: '.$r['reason'];
    $pdo->prepare('INSERT INTO eb_messages(thread_key,order_id,product_code,sender_role,sender_email,recipient_email,body) VALUES(?,?,NULL,?,?,?,?)')->execute([$thread,$r['order_id'],'buyer',$r['customer_email'],$seller['email'],$body]);
    $added++;
  }
  json_out(['ok'=>true,'synced'=>$added,'message'=>$added ? 'Missing refund notifications restored.' : 'Refund messages are already up to date.']);
}
if ($action==='return_status') {
  $seller=require_seller(); csrf_check(); $rid=(int)($d['returnId']??0); $status=(string)($d['status']??'');
  if (!in_array($status,['Approved','Rejected','Refunded'],true)) json_out(['ok'=>false,'error'=>'Invalid return status.'],422);
  $q=$pdo->prepare('SELECT r.id FROM eb_return_requests r JOIN eb_order_items i ON i.order_id=r.order_id WHERE r.id=? AND i.seller_id=?'); $q->execute([$rid,$seller['id']]);
  if (!$q->fetch()) json_out(['ok'=>false,'error'=>'Return request not found for this seller.'],404);
  $q=$pdo->prepare('SELECT r.id,r.order_id,r.customer_email,r.refund_amount,o.order_code FROM eb_return_requests r JOIN eb_orders o ON o.id=r.order_id WHERE r.id=?'); $q->execute([$rid]); $r=$q->fetch();
  if (!$r) json_out(['ok'=>false,'error'=>'Return request not found.'],404);
  $notes = ['Approved'=>'Seller approved your return request.','Rejected'=>'Seller rejected your return request. Contact the seller if you need clarification.','Refunded'=>'Seller marked your refund as processed.'];
  $note=$notes[$status].' Order '.$r['order_code'].' · Refund amount ₹'.number_format((float)$r['refund_amount'],2,'.','');
  $pdo->beginTransaction();
  $pdo->prepare('UPDATE eb_return_requests SET status=? WHERE id=?')->execute([$status,$rid]);
  $pdo->prepare('INSERT INTO eb_return_history(return_id,order_id,status,note,changed_by) VALUES(?,?,?,?,?)')->execute([$rid,$r['order_id'],$status,$note,$seller['email']]);
  $thread=substr(hash('sha256','refund|'.$r['order_id'].'|'.$r['customer_email']),0,40);
  $pdo->prepare('INSERT INTO eb_messages(thread_key,order_id,product_code,sender_role,sender_email,recipient_email,body) VALUES(?,?,NULL,?,?,?,?)')->execute([$thread,$r['order_id'],'seller',$seller['email'],$r['customer_email'],$note]);
  $pdo->commit(); json_out(['ok'=>true,'message'=>'Refund status updated. Buyer message and history saved.']);
}
json_out(['ok'=>false,'error'=>'Unknown action'],422);
