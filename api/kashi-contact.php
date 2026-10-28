<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// Reuse the working SMTP settings and PHPMailer that the lead-agent already uses.
require_once __DIR__ . '/../lead-agent/api/_mail_config.php';
require_once __DIR__ . '/../lead-agent/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;

const KASHI_RECIPIENT = 'khabat@setai.no';

function respond(bool $ok, string $error = '', int $status = 200): void
{
    http_response_code($status);
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, 'POST only.', 405);
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !preg_match('#^https://(www\.)?setai\.no$#', $origin)) {
    respond(false, 'Forbidden.', 403);
}

$input = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($input)) {
    respond(false, 'Invalid request.', 400);
}

$clean = static fn($v, int $max) => mb_substr(trim(strip_tags((string) $v)), 0, $max);
$name = $clean($input['name'] ?? '', 120);
$email = filter_var(trim((string) ($input['email'] ?? '')), FILTER_VALIDATE_EMAIL);
$message = $clean($input['message'] ?? '', 4000);
$lang = $clean($input['lang'] ?? 'en', 5);
$source = ($input['source'] ?? '') === 'contact' ? 'Contact page' : 'About page';
$honeypot = $clean($input['website'] ?? '', 120);

if ($honeypot !== '') {
    respond(true); // silently drop bots
}
if ($name === '' || $message === '' || !$email) {
    respond(false, 'Please fill in name, a valid email and a message.', 422);
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$storage = sys_get_temp_dir();
$rateFile = $storage . '/kashi_rate_' . sha1($ip) . '.json';
$now = time();
$attempts = is_file($rateFile) ? (json_decode((string) file_get_contents($rateFile), true) ?: []) : [];
$attempts = array_values(array_filter($attempts, static fn($ts) => ($now - (int) $ts) < 3600));
if (count($attempts) >= 5) {
    respond(false, 'Too many attempts. Please try again later.', 429);
}
$attempts[] = $now;
file_put_contents($rateFile, json_encode($attempts));

$html = '<h2>New KASHI enquiry (' . $source . ')</h2>'
    . '<p><strong>Name:</strong> ' . htmlspecialchars($name) . '</p>'
    . '<p><strong>Email:</strong> ' . htmlspecialchars((string) $email) . '</p>'
    . '<p><strong>Message:</strong><br>' . nl2br(htmlspecialchars($message)) . '</p>'
    . '<hr><p><small>Page language: ' . htmlspecialchars($lang) . ' · ' . gmdate('Y-m-d H:i') . ' UTC · IP ' . htmlspecialchars($ip) . '</small></p>';

try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = MAIL_HOST;
    $mail->Port = MAIL_PORT;
    $mail->SMTPAuth = true;
    $mail->Username = MAIL_USER;
    $mail->Password = MAIL_PASS;
    $mail->SMTPSecure = MAIL_SECURE;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom(MAIL_FROM, 'KASHI website');
    $mail->addAddress(KASHI_RECIPIENT);
    $mail->addReplyTo((string) $email, $name);
    $mail->isHTML(true);
    $mail->Subject = 'KASHI enquiry from ' . $name;
    $mail->Body = $html;
    $mail->AltBody = "Name: $name\nEmail: $email\n\n$message";
    $mail->send();
} catch (Throwable $e) {
    respond(false, 'Could not send the message right now.', 500);
}

respond(true);
