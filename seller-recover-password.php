<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok'=>false,'error'=>'Method not allowed.'],405);
$d=input_json(); $action=(string)($d['action']??'question');
$email=strtolower(trim((string)($d['email']??'')));
if (!filter_var($email,FILTER_VALIDATE_EMAIL)) json_out(['ok'=>false,'error'=>'Enter a valid seller email address.'],422);
try {
 $pdo=db(); ensure_seller_table($pdo);
 if ($action==='question') {
  // Compare case-insensitively so email casing differences do not hide a real account.
  $st=$pdo->prepare("SELECT id,status,password_hash,security_question FROM sellers WHERE LOWER(TRIM(email))=LOWER(?) LIMIT 1");
  $st->execute([$email]);
  $seller=$st->fetch();
  if (!$seller) json_out(['ok'=>false,'error'=>'No seller account exists for this email in the connected database. Open Seller login and choose Create account first, or check that api/config.php points to the correct database.'],404);
  if (($seller['status'] ?? '') !== 'active') json_out(['ok'=>false,'error'=>'This seller account is not active. Contact the site administrator.'],403);
  if ((string)($seller['password_hash'] ?? '') === '!unclaimed-owner-account') json_out(['ok'=>false,'error'=>'This owner seller account has not been claimed yet. Return to Seller login and choose Create account using the owner email configured for this website.'],409);
  $q=trim((string)($seller['security_question'] ?? ''));
  if ($q==='') json_out(['ok'=>false,'error'=>'This seller account has no saved security question. Sign in if you know the password, then update the account recovery details, or contact the site administrator.'],422);
  json_out(['ok'=>true,'question'=>$q,'message'=>'Answer your saved security question to reset the password.']);
 }
 if ($action==='reset') {
  $answer=trim((string)($d['security_answer']??'')); $password=(string)($d['new_password']??''); $confirm=(string)($d['confirm_password']??'');
  if (strlen($answer)<1 || strlen($answer)>120) json_out(['ok'=>false,'error'=>'Enter your security answer.'],422);
  if (strlen($password)<8) json_out(['ok'=>false,'error'=>'New password must contain at least 8 characters.'],422);
  if ($password!==$confirm) json_out(['ok'=>false,'error'=>'Passwords do not match.'],422);
  $st=$pdo->prepare("SELECT id,status,password_hash,security_answer_hash FROM sellers WHERE LOWER(TRIM(email))=LOWER(?) LIMIT 1");
  $st->execute([$email]); $row=$st->fetch();
  if (!$row) json_out(['ok'=>false,'error'=>'No seller account exists for this email in the connected database.'],404);
  if (($row['status'] ?? '') !== 'active') json_out(['ok'=>false,'error'=>'This seller account is not active. Contact the site administrator.'],403);
  if ((string)($row['password_hash'] ?? '') === '!unclaimed-owner-account') json_out(['ok'=>false,'error'=>'This owner seller account has not been claimed yet. Return to Seller login and choose Create account using the owner email configured for this website.'],409);
  $normalized=function_exists('mb_strtolower') ? mb_strtolower(trim($answer),'UTF-8') : strtolower(trim($answer));
  if (empty($row['security_answer_hash']) || !password_verify($normalized,(string)$row['security_answer_hash'])) {
   usleep(400000); json_out(['ok'=>false,'error'=>'Security answer is incorrect, or recovery was not configured for this account. Please check your answer.'],422);
  }
  $pdo->prepare('UPDATE sellers SET password_hash=? WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),(int)$row['id']]);
  json_out(['ok'=>true,'message'=>'Password updated successfully. You can now sign in with your new password.']);
 }
 json_out(['ok'=>false,'error'=>'Invalid request.'],400);
} catch(Throwable $e) { error_log('EasyBuy seller security-question reset: '.$e->getMessage()); json_out(['ok'=>false,'error'=>'Could not reset password. Check database connection and PHP error log.'],500); }
