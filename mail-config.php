<?php
declare(strict_types=1);

/* EasyBuy SMTP configuration for real password-reset emails.
 * Gmail: enable 2-Step Verification and create a Google App Password.
 * Use the same Gmail address for EASYBUY_SMTP_USER and EASYBUY_SMTP_FROM.
 */
const EASYBUY_SMTP_HOST = 'smtp.gmail.com';
const EASYBUY_SMTP_PORT = 465; // implicit TLS
const EASYBUY_SMTP_USER = 'YOUR_GMAIL@gmail.com';
const EASYBUY_SMTP_PASS = 'YOUR_16_CHARACTER_GOOGLE_APP_PASSWORD';
const EASYBUY_SMTP_FROM = 'YOUR_GMAIL@gmail.com';
const EASYBUY_SMTP_FROM_NAME = 'EasyBuy';

function easybuy_smtp_send(string $to, string $subject, string $body): array {
    $host = EASYBUY_SMTP_HOST;
    $port = EASYBUY_SMTP_PORT;
    $user = EASYBUY_SMTP_USER;
    $pass = EASYBUY_SMTP_PASS;
    $from = EASYBUY_SMTP_FROM;
    if (str_contains($user, 'YOUR_') || str_contains($pass, 'YOUR_') || str_contains($from, 'YOUR_')) {
        return ['ok' => false, 'error' => 'SMTP is not configured. Edit api/mail-config.php and add your Gmail address and Google App Password.'];
    }
    if (!filter_var($user, FILTER_VALIDATE_EMAIL) || !filter_var($from, FILTER_VALIDATE_EMAIL) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => 'SMTP sender or recipient email address is invalid.'];
    }
    $errno = 0; $errstr = '';
    $socket = @stream_socket_client("ssl://{$host}:{$port}", $errno, $errstr, 15, STREAM_CLIENT_CONNECT);
    if (!$socket) return ['ok' => false, 'error' => "Cannot connect to Gmail SMTP ({$errno}): {$errstr}. Check internet/firewall and SMTP settings."];
    stream_set_timeout($socket, 15);
    $read = static function() use ($socket): array {
        $response = '';
        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') break;
        }
        $code = (int)substr($response, 0, 3);
        return [$code, trim($response)];
    };
    $send = static function(string $line) use ($socket): void { fwrite($socket, $line . "\r\n"); };
    $expect = static function(array $allowed, string $step) use ($read): ?string {
        [$code, $response] = $read();
        return in_array($code, $allowed, true) ? null : "Gmail SMTP {$step} failed ({$code}): {$response}";
    };
    $err = $expect([220], 'greeting');
    if ($err) { fclose($socket); return ['ok'=>false,'error'=>$err]; }
    $send('EHLO localhost'); $err = $expect([250], 'EHLO');
    if (!$err) { $send('AUTH LOGIN'); $err = $expect([334], 'AUTH'); }
    if (!$err) { $send(base64_encode($user)); $err = $expect([334], 'username'); }
    if (!$err) { $send(base64_encode($pass)); $err = $expect([235], 'password authentication'); }
    if (!$err) { $send('MAIL FROM:<' . $from . '>'); $err = $expect([250], 'MAIL FROM'); }
    if (!$err) { $send('RCPT TO:<' . $to . '>'); $err = $expect([250, 251], 'RCPT TO'); }
    if (!$err) { $send('DATA'); $err = $expect([354], 'DATA'); }
    if (!$err) {
        $cleanSubject = trim(str_replace(["\r", "\n"], '', $subject));
        $headers = 'From: ' . EASYBUY_SMTP_FROM_NAME . ' <' . $from . ">\r\n" .
            'To: <' . $to . ">\r\n" .
            'Subject: ' . $cleanSubject . "\r\n" .
            "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n" .
            "Content-Transfer-Encoding: 8bit\r\n";
        $message = $headers . "\r\n" . str_replace(["\r\n", "\r"], "\n", $body);
        $message = str_replace("\n", "\r\n", $message);
        $message = preg_replace('/(^|\r\n)\./', '$1..', $message) ?? $message;
        $send($message . "\r\n."); $err = $expect([250], 'message delivery');
    }
    if (!$err) { $send('QUIT'); $read(); }
    fclose($socket);
    return $err ? ['ok'=>false,'error'=>$err] : ['ok'=>true];
}
