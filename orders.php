<?php
require __DIR__ . '/config.php';
try {
    $pdo = db();
} catch (Throwable $e) {
    error_log('EasyBuy orders DB: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Database connection failed. Start MySQL and check api/config.php.'], 503);
}
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    $isSeller = !empty($_SESSION['seller_id']) && ($_GET['seller'] ?? '') === '1';
    if ($isSeller) {
        $sellerId = (int)$_SESSION['seller_id'];
        $st = $pdo->prepare('SELECT DISTINCT o.* FROM eb_orders o JOIN eb_order_items i ON i.order_id=o.id WHERE i.seller_id=? ORDER BY o.created_at DESC');
        $st->execute([$sellerId]);
        $orders = $st->fetchAll();
    } else {
        if (empty($_SESSION['buyer_id']) || empty($_SESSION['buyer_email'])) json_out(['ok'=>false,'error'=>'Please log in to your buyer account.'],401);
        $email = strtolower(trim((string)($_GET['email'] ?? $_SESSION['buyer_email'])));
        if (!hash_equals(strtolower((string)$_SESSION['buyer_email']), $email)) json_out(['ok'=>false,'error'=>'You can only view your own orders.'],403);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_out(['ok' => false, 'error' => 'A valid customer email is required.'], 422);
        $st = $pdo->prepare('SELECT * FROM eb_orders WHERE customer_email=? ORDER BY created_at DESC');
        $st->execute([$email]);
        $orders = $st->fetchAll();
    }
    foreach ($orders as &$o) {
        $sql = 'SELECT product_code AS id,product_name AS name,category,image_path AS image,unit_price AS price,quantity AS qty,seller_id FROM eb_order_items WHERE order_id=?';
        if ($isSeller) $sql .= ' AND seller_id=' . (int)$_SESSION['seller_id'];
        $it = $pdo->prepare($sql);
        $it->execute([$o['id']]);
        $o['items'] = $it->fetchAll();
        $ev = $pdo->prepare('SELECT status,note,created_at FROM eb_tracking_events WHERE order_id=? ORDER BY created_at,id');
        $ev->execute([$o['id']]);
        $o['tracking'] = $ev->fetchAll();
        $o['total'] = (float)$o['total'];
        $o['orderNo'] = $o['order_code'];
        $o['date'] = $o['created_at'];
        $o['paymentMethod'] = $o['payment_method'];
        $o['paymentStatus'] = $o['payment_status'];
        $o['deliveryOtp'] = (!empty($o['delivery_otp']) && empty($o['delivery_otp_verified_at'])) ? $o['delivery_otp'] : null;
        $o['deliveryOtpVerified'] = !empty($o['delivery_otp_verified_at']);
        $o['receivedAt'] = $o['received_at'] ?? $o['delivery_otp_verified_at'] ?? null;
        $o['shipperName'] = $o['shipper_name'] ?? '';
        $o['trackingNumber'] = $o['tracking_number'] ?? '';
        $o['trackingUrl'] = $o['tracking_url'] ?? '';
        $rq = $pdo->prepare('SELECT id,status,reason,refund_amount,created_at,updated_at FROM eb_return_requests WHERE order_id=?'); $rq->execute([$o['id']]); $o['returnRequest'] = $rq->fetch() ?: null;
        $o['returnHistory'] = [];
        if ($o['returnRequest']) {
            $rh=$pdo->prepare('SELECT status,note,changed_by,created_at FROM eb_return_history WHERE return_id=? ORDER BY created_at,id');
            $rh->execute([$o['returnRequest']['id']]); $o['returnHistory']=$rh->fetchAll();
        }
        // config.php performs additive schema repair for older databases before this query.
        $fq = $pdo->prepare('SELECT product_code,rating,comment FROM eb_feedback WHERE order_id=? AND customer_email=?');
        $fq->execute([$o['id'], $o['customer_email']]);
        $o['feedback'] = $fq->fetchAll();
        $o['customer'] = ['name' => $o['customer_name'], 'phone' => $o['customer_phone'], 'address' => $o['delivery_address']];
    }
    json_out(['ok' => true, 'orders' => $orders]);
}
if ($method === 'POST') {
    $d = input_json();
    if (empty($_SESSION['buyer_id']) || empty($_SESSION['buyer_email'])) json_out(['ok'=>false,'error'=>'Please log in to your buyer account.'],401);
    $email = strtolower(trim((string)($d['email'] ?? $_SESSION['buyer_email'])));
    if (!hash_equals(strtolower((string)$_SESSION['buyer_email']), $email)) json_out(['ok'=>false,'error'=>'Order email must match your logged-in buyer account.'],403);
    $customer = $d['customer'] ?? [];
    $items = $d['items'] ?? [];
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !is_array($customer) || !is_array($items) || !count($items) || count($items) > 50) json_out(['ok' => false, 'error' => 'Valid customer details and order items are required.'], 422);
    $name = trim((string)($customer['name'] ?? ''));
    $phone = trim((string)($customer['phone'] ?? ''));
    $address = trim((string)($customer['address'] ?? ''));
    $method = trim((string)($d['paymentMethod'] ?? 'Cash on Delivery'));
    $deliverySpeed = (($d['deliverySpeed'] ?? 'standard') === 'fast') ? 'fast' : 'standard';
    $deliveryMinDays = $deliverySpeed === 'fast' ? 5 : 12;
    $deliveryMaxDays = $deliverySpeed === 'fast' ? 7 : 14;
    $deliveryStart = date('Y-m-d', strtotime('+' . $deliveryMinDays . ' days'));
    $deliveryEnd = date('Y-m-d', strtotime('+' . $deliveryMaxDays . ' days'));
    if ($name === '' || strlen($phone) < 8 || $address === '' || strlen($address) > 500) json_out(['ok' => false, 'error' => 'Check customer name, phone and delivery address.'], 422);
    if ($method !== 'Cash on Delivery') json_out(['ok' => false, 'error' => 'Only Cash on Delivery is available in EasyBuy. For GPay/UPI, contact the seller directly outside the app.'], 422);
    $allowed = ['Books', 'Stationery Kits', 'Calculators', 'Lab Equipment', 'Electronics', 'Accessories', 'T-Shirts', 'Bags'];
    $normalized = [];
    $total = 0;
    foreach ($items as $it) {
        $code = trim((string)($it['id'] ?? ''));
        $qty = filter_var($it['qty'] ?? null, FILTER_VALIDATE_INT);
        $price = filter_var($it['price'] ?? null, FILTER_VALIDATE_FLOAT);
        $pname = trim((string)($it['name'] ?? ''));
        if ($code === '' || $qty === false || $qty < 1 || $qty > 99 || $price === false || $price < 0 || $pname === '') json_out(['ok' => false, 'error' => 'An order item is invalid.'], 422);
        $cat = (string)($it['category'] ?? '');
        if (!in_array($cat, $allowed, true)) $cat = 'Accessories';
        $line = round($price * $qty, 2);
        $total += $line;
        $stock = filter_var($it['stock'] ?? 1, FILTER_VALIDATE_INT);
        if ($stock === false || $stock < 0) $stock = 1;
        $normalized[] = ['code' => $code, 'qty' => $qty, 'price' => $price, 'name' => substr($pname, 0, 150), 'category' => $cat, 'image' => substr((string)($it['image'] ?? ''), 0, 255), 'stock' => $stock, 'seller' => null, 'product' => null];
    }
    // Server-calculated delivery charge: do not trust a client-supplied fee.
    $deliveryFee = ($total >= 1500 ? 0 : (preg_match('/college|campus|hostel|nearby/i', $address) ? 25 : 60)) + ($deliverySpeed === 'fast' ? 49 : 0);
    $total = round($total + $deliveryFee, 2);
    $code = 'EB-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
    $payStatus = 'Cash on Delivery — pay on receipt';
    try {
        $pdo->beginTransaction();
        $st = $pdo->prepare("INSERT INTO eb_orders(order_code,customer_email,customer_name,customer_phone,delivery_address,payment_method,payment_status,status,total,delivery_charge,delivery_speed,estimated_delivery_start,estimated_delivery_end,buyer_id) VALUES(?,?,?,?,?,?,?,'Placed',?,?,?,?,?,?)");
        $st->execute([$code, $email, $name, $phone, $address, $method, $payStatus, $total, $deliveryFee, $deliverySpeed, $deliveryStart, $deliveryEnd, (int)$_SESSION['buyer_id']]);
        $oid = (int)$pdo->lastInsertId();
        $ins = $pdo->prepare('INSERT INTO eb_order_items(order_id,product_id,product_code,product_name,category,image_path,unit_price,quantity,seller_id) VALUES(?,?,?,?,?,?,?,?,?)');
        foreach ($normalized as $index => $it) {
            $productId = null;
            $sellerId = null;
            // Default catalogue items (EB101, etc.) must have a real products.id because
            // some existing databases enforce product_id NOT NULL. Attach them to the
            // configured owner seller and create/find a persistent product row without
            // deleting or replacing any existing data.
            // Seeded default-catalogue products (source_id such as EB101) are real rows owned by the owner seller.
            $seeded = null;
            if (!preg_match('/^LIVE-(\d+)$/', $it['code'])) {
                $sq = $pdo->prepare("SELECT id,seller_id,name,category,price,image_path,stock FROM products WHERE source_id=? AND status='active' LIMIT 1 FOR UPDATE");
                $sq->execute([$it['code']]);
                $seeded = $sq->fetch() ?: null;
            }
            if ($seeded) {
                $productId = (int)$seeded['id'];
                if ((int)$seeded['stock'] < $it['qty']) throw new RuntimeException('Not enough stock for ' . $seeded['name'] . '.');
                $sellerId = (int)$seeded['seller_id'];
                $it['name'] = $seeded['name'];
                $it['category'] = $seeded['category'];
                $it['price'] = (float)$seeded['price'];
                $it['image'] = $seeded['image_path'];
                $normalized[$index] = $it;
                $pdo->prepare('UPDATE products SET stock=stock-? WHERE id=?')->execute([$it['qty'], $productId]);
            } elseif (!preg_match('/^LIVE-(\d+)$/', $it['code'])) {
                $owner = $pdo->prepare("SELECT id FROM sellers WHERE LOWER(email)=LOWER(?) AND status='active' LIMIT 1");
                $owner->execute([EASYBUY_OWNER_EMAIL]);
                $ownerId = $owner->fetchColumn();
                if (!$ownerId) throw new RuntimeException('The EasyBuy owner seller account (' . EASYBUY_OWNER_EMAIL . ') is not registered/active yet. Register or log in to that seller account, then retry the order.');
                $sellerId = (int)$ownerId;
                $find = $pdo->prepare('SELECT id,stock FROM products WHERE seller_id=? AND name=? AND category=? AND image_path=? ORDER BY id ASC LIMIT 1 FOR UPDATE');
                $find->execute([$sellerId, $it['name'], $it['category'], $it['image']]);
                $existing = $find->fetch(PDO::FETCH_ASSOC);
                if ($existing) {
                    $productId = (int)$existing['id'];
                    if ((int)$existing['stock'] < $it['qty']) throw new RuntimeException('Not enough stock for ' . $it['name'] . '.');
                    $pdo->prepare('UPDATE products SET stock=stock-? WHERE id=?')->execute([$it['qty'], $productId]);
                } else {
                    $initialStock = max((int)$it['stock'], (int)$it['qty']);
                    $create = $pdo->prepare("INSERT INTO products(seller_id,name,category,price,condition_label,college,description,image_path,stock,status) VALUES(?,?,?,?,?,?,?,?,?,'active')");
                    $create->execute([$sellerId, $it['name'], $it['category'], $it['price'], 'Catalog item', 'SASTRA University', 'Default EasyBuy catalogue item ' . $it['code'], $it['image'], $initialStock]);
                    $productId = (int)$pdo->lastInsertId();
                    $pdo->prepare('UPDATE products SET stock=stock-? WHERE id=?')->execute([$it['qty'], $productId]);
                }
            }
            if (preg_match('/^LIVE-(\d+)$/', $it['code'], $m)) {
                $productId = (int)$m[1];
                $q = $pdo->prepare("SELECT id,seller_id,name,category,price,image_path,stock FROM products WHERE id=? AND status='active' FOR UPDATE");
                $q->execute([$productId]);
                $live = $q->fetch();
                if (!$live) throw new RuntimeException('A live product is no longer available.');
                if ((int)$live['stock'] < $it['qty']) throw new RuntimeException('Not enough stock for ' . $live['name'] . '.');
                $sellerId = (int)$live['seller_id'];
                $it['name'] = $live['name'];
                $it['category'] = $live['category'];
                $it['price'] = (float)$live['price'];
                $it['image'] = $live['image_path'];
                $normalized[$index] = $it;
                $pdo->prepare('UPDATE products SET stock=stock-? WHERE id=?')->execute([$it['qty'], $productId]);
            }
            $ins->execute([$oid, $productId, $it['code'], $it['name'], $it['category'], $it['image'], $it['price'], $it['qty'], $sellerId]);
            if ($sellerId) {
                $pdo->prepare("INSERT INTO eb_product_history(product_id,seller_id,action,details) VALUES(?,?, 'ordered',?)")->execute([$productId, $sellerId, 'Order ' . $code . ' · quantity ' . $it['qty']]);
            }
        }
        // Use the prices the server resolved from the products table, not the browser-supplied ones.
        $subtotal = 0;
        foreach ($normalized as $line) $subtotal += round($line['price'] * $line['qty'], 2);
        $deliveryFee = ($subtotal >= 1500 ? 0 : (preg_match('/college|campus|hostel|nearby/i', $address) ? 25 : 60)) + ($deliverySpeed === 'fast' ? 49 : 0);
        $total = round($subtotal + $deliveryFee, 2);
        $pdo->prepare('UPDATE eb_orders SET total=?,delivery_charge=? WHERE id=?')->execute([$total, $deliveryFee, $oid]);
        $pdo->prepare("INSERT INTO eb_tracking_events(order_id,status,note) VALUES(?,'Placed','Order created successfully')")->execute([$oid]);
        // The order is in MySQL, so the saved cart for this buyer is now empty.
        $pdo->prepare('DELETE FROM eb_cart_items WHERE buyer_id=?')->execute([(int)$_SESSION['buyer_id']]);
        $pdo->commit();
        json_out(['ok' => true, 'order' => ['id' => $oid, 'orderNo' => $code, 'date' => date('c'), 'total' => $total, 'status' => 'Placed', 'paymentMethod' => $method, 'paymentStatus' => $payStatus, 'deliveryCharge' => $deliveryFee, 'delivery_speed' => $deliverySpeed, 'estimated_delivery_start' => $deliveryStart, 'estimated_delivery_end' => $deliveryEnd, 'customer' => $customer, 'items' => $items]], 201);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('EasyBuy create order: ' . $e->getMessage());
        json_out(['ok' => false, 'error' => $e instanceof RuntimeException ? $e->getMessage() : 'Could not save order to database. Check the database tables and PHP error log.'], 500);
    }
}
if ($method === 'PATCH') {
    $d = input_json();
    // Buyer cancellation: allowed only before shipping/delivery and tied to the order email/code.
    if (($d['action'] ?? '') === 'cancel') {
        $buyerSession = require_buyer();
        $email = $buyerSession['email'];
        $code = trim((string)($d['orderCode'] ?? ''));
        $reason = trim((string)($d['reason'] ?? 'Changed my mind'));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $code === '') json_out(['ok' => false, 'error' => 'Customer email and order ID are required.'], 422);
        try {
            $pdo->beginTransaction();
            $q = $pdo->prepare('SELECT * FROM eb_orders WHERE order_code=? AND customer_email=? FOR UPDATE');
            $q->execute([$code, $email]);
            $o = $q->fetch();
            if (!$o) {
                $pdo->rollBack();
                json_out(['ok' => false, 'error' => 'Order not found for this customer.'], 404);
            }
            if (!in_array($o['status'], ['Placed', 'Confirmed'], true)) {
                $pdo->rollBack();
                json_out(['ok' => false, 'error' => 'This order can no longer be cancelled because it is already being shipped or completed.'], 409);
            }
            $pdo->prepare("UPDATE eb_orders SET status='Cancelled',cancelled_at=NOW() WHERE id=?")->execute([$o['id']]);
            $it = $pdo->prepare('SELECT product_id,quantity FROM eb_order_items WHERE order_id=? AND product_id IS NOT NULL');
            $it->execute([$o['id']]);
            foreach ($it->fetchAll() as $row) {
                $pdo->prepare('UPDATE products SET stock=stock+? WHERE id=?')->execute([(int)$row['quantity'], (int)$row['product_id']]);
            }
            $pdo->prepare("INSERT INTO eb_tracking_events(order_id,status,note) VALUES(?,'Cancelled',?)")->execute([$o['id'], 'Cancelled by customer: ' . substr($reason, 0, 350)]);
            $pdo->prepare("INSERT INTO eb_messages(thread_key,order_id,sender_role,sender_email,recipient_email,body) VALUES(?,?,'seller','orders@easybuy.local',?,?)")->execute(['order-' . $o['order_code'], $o['id'], $email, 'Your EasyBuy order ' . $o['order_code'] . ' has been cancelled.']);
            $pdo->commit();
            json_out(['ok' => true, 'message' => 'Order cancelled. The cancellation is visible in My Orders and tracking.']);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            error_log('EasyBuy cancel order: ' . $e->getMessage());
            json_out(['ok' => false, 'error' => 'Could not cancel order. Check the database error log.'], 500);
        }
    }
    // All seller-only order actions must be authenticated and CSRF-protected.
    require_seller();
    csrf_check();
    if (($d['action'] ?? '') === 'verify_delivery_otp') {
        $oid = (int)($d['orderId'] ?? 0);
        $otp = preg_replace('/\D/', '', (string)($d['otp'] ?? ''));
        if (!$oid || strlen($otp) !== 6) json_out(['ok' => false, 'error' => 'Enter the 6-digit delivery OTP supplied by the customer.'], 422);
        $q = $pdo->prepare('SELECT delivery_otp,delivery_otp_verified_at,status FROM eb_orders WHERE id=?');
        $q->execute([$oid]);
        $o = $q->fetch();
        if (!$o || $o['status'] !== 'Shipped') json_out(['ok' => false, 'error' => 'OTP verification is available only for shipped orders.'], 409);
        if (!empty($o['delivery_otp_verified_at'])) json_out(['ok' => true, 'message' => 'Delivery OTP was already verified.']);
        if (empty($o['delivery_otp']) || !hash_equals((string)$o['delivery_otp'], $otp)) json_out(['ok' => false, 'error' => 'Incorrect delivery OTP. Please check with the customer.'], 422);
        $pdo->beginTransaction();
        $pdo->prepare('UPDATE eb_orders SET delivery_otp_verified_at=NOW(),received_at=NOW(),status=\'Delivered\' WHERE id=?')->execute([$oid]);
        $pdo->prepare("INSERT INTO eb_tracking_events(order_id,status,note) VALUES(?,'Delivered','Customer delivery OTP verified by seller')")->execute([$oid]);
        $q = $pdo->prepare('SELECT order_code,customer_email FROM eb_orders WHERE id=?');
        $q->execute([$oid]);
        $o = $q->fetch();
        $seller = require_seller();
        $pdo->prepare("INSERT INTO eb_messages(thread_key,order_id,sender_role,sender_email,recipient_email,body) VALUES(?,?,'seller',?,?,?)")->execute(['order-' . $o['order_code'], $oid, $seller['email'], $o['customer_email'], 'Your EasyBuy order ' . $o['order_code'] . ' has been marked delivered after delivery OTP verification. Thank you!']);
        $pdo->commit();
        json_out(['ok' => true, 'message' => 'OTP verified. Order marked Delivered and customer notification saved.']);
    }
    $status = (string)($d['status'] ?? '');
    $allowed = ['Confirmed', 'Shipped', 'Cancelled'];
    if (!in_array($status, $allowed, true)) json_out(['ok' => false, 'error' => 'For Delivered status, verify the customer OTP instead.'], 422);
    $oid = (int)($d['orderId'] ?? 0);
    if (!$oid) json_out(['ok' => false, 'error' => 'Order ID is required.'], 422);
    try {
        $pdo->beginTransaction();
        $q = $pdo->prepare('SELECT * FROM eb_orders WHERE id=? FOR UPDATE');
        $q->execute([$oid]);
        $o = $q->fetch();
        if (!$o) { $pdo->rollBack(); json_out(['ok' => false, 'error' => 'Order not found in this database. Refresh Seller Studio and check that both pages use the same project folder.'], 404); }
        // Always use the canonical numeric primary key fetched from eb_orders for child rows.
        $realOrderId = (int)$o['id'];
        $otp = null;
        if ($status === 'Shipped' && empty($o['delivery_otp'])) $otp = (string)random_int(100000, 999999);
        if ($otp !== null) $pdo->prepare('UPDATE eb_orders SET status=?,delivery_otp=? WHERE id=?')->execute([$status, $otp, $realOrderId]);
        else $pdo->prepare('UPDATE eb_orders SET status=? WHERE id=?')->execute([$status, $realOrderId]);
        $note = 'Status updated by seller ' . (string)($_SESSION['seller_name'] ?? 'Seller');
        if ($otp !== null) $note .= ' · Demo delivery OTP generated; customer can view it in Track Order.';
        $pdo->prepare('INSERT INTO eb_tracking_events(order_id,status,note) VALUES(?,?,?)')->execute([$realOrderId, $status, $note]);
        $pdo->commit();
        json_out(['ok' => true, 'message' => $otp !== null ? 'Order shipped. A demo delivery OTP is available to the customer in Track Order.' : 'Order status updated.']);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('EasyBuy seller status update: ' . $e->getMessage());
        json_out(['ok' => false, 'error' => 'Status was not saved. Check that this order belongs to the current EasyBuy database and that the schema migration is applied.'], 500);
    }
}
json_out(['ok' => false, 'error' => 'Method not allowed'], 405);
