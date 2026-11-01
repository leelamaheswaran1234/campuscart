<?php

declare(strict_types=1);
require __DIR__ . '/config.php';

$email = strtolower(trim((string)($_GET['email'] ?? '')));
$code = trim((string)($_GET['order'] ?? ''));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $code === '') {
    http_response_code(400);
    exit('Order email and order code are required.');
}
try {
    $pdo = db();
    $st = $pdo->prepare('SELECT * FROM eb_orders WHERE order_code = ? AND customer_email = ? LIMIT 1');
    $st->execute([$code, $email]);
    $order = $st->fetch();
    if (!$order) {
        http_response_code(404);
        exit('Order not found for this customer.');
    }
    // Only the buyer who placed the order, or a seller with an item in it, may download the invoice.
    $sessionBuyer = current_buyer();
    if (!($sessionBuyer && hash_equals($sessionBuyer['email'], $email))) {
        $allowed = false;
        if (!empty($_SESSION['seller_id'])) {
            $chk = $pdo->prepare('SELECT COUNT(*) FROM eb_order_items WHERE order_id = ? AND seller_id = ?');
            $chk->execute([$order['id'], (int)$_SESSION['seller_id']]);
            $allowed = (int)$chk->fetchColumn() > 0;
        }
        if (!$allowed) {
            http_response_code(401);
            exit('Please log in to the account that placed this order.');
        }
    }
    $it = $pdo->prepare('SELECT product_name, quantity, unit_price FROM eb_order_items WHERE order_id = ? ORDER BY id');
    $it->execute([$order['id']]);
    $items = $it->fetchAll();

    // Minimal built-in PDF writer: no external library required; outputs a true A4 PDF.
    function eb_pdf_text(string $s): string
    {
        $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: '';
        $s = preg_replace('/[^\x20-\x7E]/', '', $s) ?? '';
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $s);
    }
    function eb_num(float $n): string
    {
        return 'Rs ' . number_format($n, 2, '.', ',');
    }
    $commands = [];
    $text = function (float $x, float $y, string $s, int $size = 10, string $font = 'F1', array $rgb = [0.12, 0.17, 0.27]) use (&$commands) {
        $commands[] = sprintf("BT /%s %d Tf %.3f %.3f %.3f rg 1 0 0 1 %.2f %.2f Tm (%s) Tj ET", $font, $size, $rgb[0], $rgb[1], $rgb[2], $x, $y, eb_pdf_text($s));
    };
    $line = function (float $x1, float $y1, float $x2, float $y2, array $rgb = [0.84, 0.88, 0.94], float $w = 0.7) use (&$commands) {
        $commands[] = sprintf("%.3f %.3f %.3f RG %.2f w %.2f %.2f m %.2f %.2f l S", $rgb[0], $rgb[1], $rgb[2], $w, $x1, $y1, $x2, $y2);
    };
    $rect = function (float $x, float $y, float $w, float $h, array $rgb) use (&$commands) {
        $commands[] = sprintf("%.3f %.3f %.3f rg %.2f %.2f %.2f %.2f re f", $rgb[0], $rgb[1], $rgb[2], $x, $y, $w, $h);
    };

    // A4 canvas: 595 x 842 pt, 42 pt margins.
    $blue = [0.08, 0.27, 0.67];
    $ink = [0.12, 0.17, 0.27];
    $muted = [0.38, 0.43, 0.52];
    $pale = [0.93, 0.96, 1.0];
    $rect(0, 744, 595, 98, $blue);
    $text(42, 798, 'EasyBuy', 25, 'F2', [1, 1, 1]);
    $text(42, 778, 'STUDENT MARKETPLACE', 8, 'F2', [0.88, 0.92, 1]);
    $text(405, 803, 'INVOICE', 18, 'F2', [1, 1, 1]);
    $text(405, 783, 'Invoice / Order: ' . (string)$order['order_code'], 9, 'F1', [1, 1, 1]);
    $text(405, 766, 'Order date: ' . (string)$order['created_at'], 8, 'F1', [1, 1, 1]);

    $text(42, 716, 'BILL TO', 9, 'F2', $blue);
    $text(42, 697, (string)($order['customer_name'] ?? 'Customer'), 11, 'F2', $ink);
    $text(42, 680, 'Email: ' . (string)($order['customer_email'] ?? 'Not provided'), 8, 'F1', $muted);
    $text(42, 665, 'Phone: ' . (string)($order['customer_phone'] ?? 'Not provided'), 8, 'F1', $muted);
    $text(315, 716, 'DELIVERY DETAILS', 9, 'F2', $blue);
    $addr = trim((string)($order['delivery_address'] ?? ''));
    $addrLines = $addr === '' ? ['Not provided'] : explode("\n", wordwrap($addr, 43, "\n", true));
    foreach (array_slice($addrLines, 0, 3) as $i => $a) $text(315, 696 - 14 * $i, $a, 8, 'F1', $muted);
    $text(315, 648, 'Payment: ' . (string)($order['payment_method'] ?? 'Not specified'), 8, 'F1', $ink);
    $text(315, 633, 'Payment status: ' . (string)($order['payment_status'] ?? 'Not specified'), 8, 'F1', $ink);
    $text(315, 618, 'Order status: ' . (string)($order['status'] ?? 'Not specified'), 8, 'F1', $ink);

    $tableTop = 590;
    $tableBottom = $tableTop - 28;
    $rect(42, $tableBottom, 511, 28, $pale);
    $text(51, $tableBottom + 10, 'PRODUCT', 8, 'F2', $blue);
    $text(340, $tableBottom + 10, 'QTY', 8, 'F2', $blue);
    $text(392, $tableBottom + 10, 'UNIT PRICE', 8, 'F2', $blue);
    $text(486, $tableBottom + 10, 'LINE TOTAL', 8, 'F2', $blue);
    $y = $tableBottom - 22;
    foreach ($items as $item) {
        if ($y < 165) break; // Keep totals and footer within the A4 page.
        $name = mb_substr((string)$item['product_name'], 0, 42);
        $qty = (int)$item['quantity'];
        $unit = (float)$item['unit_price'];
        $sum = $qty * $unit;
        $text(51, $y, $name, 8, 'F1', $ink);
        $text(344, $y, (string)$qty, 8, 'F1', $ink);
        $text(392, $y, number_format($unit, 2), 8, 'F1', $ink);
        $text(486, $y, number_format($sum, 2), 8, 'F1', $ink);
        $line(42, $y - 8, 553, $y - 8);
        $y -= 25;
    }
    $total = (float)($order['total'] ?? 0);
    $subtotal = 0.0;
    foreach ($items as $item) $subtotal += (int)$item['quantity'] * (float)$item['unit_price'];
    $totY = max(140, $y - 6);
    $text(342, $totY, 'Subtotal', 9, 'F1', $muted);
    $text(472, $totY, eb_num($subtotal), 9, 'F1', $ink);
    $rect(330, $totY - 39, 223, 28, $blue);
    $text(342, $totY - 29, 'TOTAL AMOUNT', 9, 'F2', [1, 1, 1]);
    $text(454, $totY - 29, eb_num($total), 10, 'F2', [1, 1, 1]);
    $text(42, 78, 'Thank you for choosing EasyBuy!', 10, 'F2', $blue);
    $text(42, 62, 'We appreciate your support for student-to-student reuse.', 8, 'F1', $muted);
    $line(42, 48, 553, 48, [0.82, 0.86, 0.92], 0.8);
    $text(42, 33, 'EasyBuy  |  Keep this invoice for your records.', 7, 'F1', $muted);

    $content = implode("\n", $commands) . "\n";
    $objects = [];
    $objects[] = '<< /Type /Catalog /Pages 2 0 R >>';
    $objects[] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
    $objects[] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>';
    $objects[] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    $objects[] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
    $objects[] = '<< /Length ' . strlen($content) . " >>\nstream\n" . $content . "endstream";
    $pdf = "%PDF-1.4\n";
    $offsets = [0];
    foreach ($objects as $i => $obj) {
        $offsets[] = strlen($pdf);
        $pdf .= ($i + 1) . " 0 obj\n" . $obj . "\nendobj\n";
    }
    $xref = strlen($pdf);
    $pdf .= "xref\n0 " . (count($objects) + 1) . "\n0000000000 65535 f \n";
    for ($i = 1; $i <= count($objects); $i++) $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
    $pdf .= "trailer\n<< /Size " . (count($objects) + 1) . " /Root 1 0 R >>\nstartxref\n" . $xref . "\n%%EOF";
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="EasyBuy-Invoice-' . preg_replace('/[^A-Za-z0-9_-]/', '', $code) . '.pdf"');
    header('Content-Length: ' . strlen($pdf));
    echo $pdf;
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Unable to generate invoice right now. Please try again later.');
}
