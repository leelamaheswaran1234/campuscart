<?php
require __DIR__ . '/config.php';
$pdo = db();
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    $isSeller = !empty($_SESSION['seller_id']) && ($_GET['seller'] ?? '') === '1';
    // Buyers can only read their own conversations: the address always comes from the login session.
    $email = $isSeller ? (string)$_SESSION['seller_email'] : require_buyer()['email'];
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_out(['ok' => false, 'error' => 'Valid email required.'], 422);
    $st = $pdo->prepare('SELECT id,thread_key,order_id,product_code,sender_role,sender_email,recipient_email,body,created_at FROM eb_messages WHERE sender_email=? OR recipient_email=? ORDER BY created_at,id');
    $st->execute([$email, $email]);
    json_out(['ok' => true, 'messages' => $st->fetchAll()]);
}
if ($method === 'POST') {
    $d = input_json();/* Buyer messages explicitly include an email; seller replies omit it and use the authenticated seller session. This prevents a leftover seller session from incorrectly applying seller CSRF validation to the buyer form. */
    $isSellerRequest = !empty($_SESSION['seller_id']) && !array_key_exists('email', $d);
    if ($isSellerRequest) csrf_check();
    // A buyer's sender address is always the logged-in buyer account, never a value typed in the browser.
    $sender = $isSellerRequest ? '' : require_buyer()['email'];
    $to = strtolower(trim((string)($d['to'] ?? '')));
    $body = trim((string)($d['body'] ?? ''));
    $thread = trim((string)($d['threadKey'] ?? ''));
    $product = substr((string)($d['productCode'] ?? ''), 0, 80);
    $order = filter_var($d['orderId'] ?? null, FILTER_VALIDATE_INT);
    $role = 'buyer';
    if ($isSellerRequest) {
        $seller = require_seller();
        $sender = $seller['email'];
        $role = 'seller';
    }
    if (!filter_var($sender, FILTER_VALIDATE_EMAIL)) {
        json_out(['ok' => false, 'error' => 'Your sender email is missing or invalid. Please sign in again.'], 422);
    }
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        json_out(['ok' => false, 'error' => 'Enter a valid recipient email address.'], 422);
    }
    if ($sender === $to) {
        json_out(['ok' => false, 'error' => 'You cannot send a message to your own account. Enter the other student’s email.'], 422);
    }
    if ($body === '' || strlen($body) > 5000) {
        json_out(['ok' => false, 'error' => 'Type a message (up to 5000 characters) before sending.'], 422);
    }
    if ($thread === '') $thread = substr(hash('sha256', min($sender, $to) . '|' . max($sender, $to) . '|' . $product . '|' . ($order ?: '')), 0, 40);
    $st = $pdo->prepare('INSERT INTO eb_messages(thread_key,order_id,product_code,sender_role,sender_email,recipient_email,body) VALUES(?,?,?,?,?,?,?)');
    $st->execute([$thread, $order ?: null, $product ?: null, $role, $sender, $to, $body]);
    json_out(['ok' => true, 'message' => ['id' => (int)$pdo->lastInsertId(), 'thread_key' => $thread, 'sender_role' => $role, 'sender_email' => $sender, 'recipient_email' => $to, 'body' => $body, 'created_at' => date('c')]], 201);
}
json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
