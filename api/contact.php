<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$config = require __DIR__ . '/../inc/config.php';
require_once __DIR__ . '/../inc/mailer.php';

function respond(bool $ok, string $error = '', int $status = 200): void
{
    http_response_code($status);
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Kun POST er tillatt.', 405);
}

$input = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($input)) {
    respond(false, 'Ugyldig forespørsel.', 400);
}

$sanitize = static fn($v, $max = 255) => mb_substr(trim(strip_tags((string) $v)), 0, $max);

$name = $sanitize($input['name'] ?? '', 120);
$company = $sanitize($input['company'] ?? '', 160);
$org = $sanitize($input['org_number'] ?? '', 30);
$email = filter_var(trim((string) ($input['email'] ?? '')), FILTER_VALIDATE_EMAIL);
$phone = $sanitize($input['phone'] ?? '', 40);
$websiteStatus = $sanitize($input['website_status'] ?? '', 50);
$message = $sanitize($input['message'] ?? '', 4000);
$csrfToken = $sanitize($input['csrf_token'] ?? '', 120);
$honeypot = $sanitize($input['website'] ?? '', 120);

if ($honeypot !== '') {
    respond(false, 'Spam oppdaget.', 400);
}
if ($csrfToken === '') {
    respond(false, 'Mangler sikkerhetstoken.', 400);
}
if ($name === '' || $company === '' || !$email) {
    respond(false, 'Fyll ut påkrevde felt og bruk gyldig e-post.', 422);
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$storage = $config['storage_path'];
if (!is_dir($storage)) {
    mkdir($storage, 0775, true);
}
$rateFile = $storage . '/starter_rate_' . sha1($ip) . '.json';
$now = time();
$window = (int) $config['rate_limit']['window_seconds'];
$maxAttempts = (int) $config['rate_limit']['max_attempts'];
$attempts = [];
if (is_file($rateFile)) {
    $attempts = json_decode((string) file_get_contents($rateFile), true) ?: [];
}
$attempts = array_values(array_filter($attempts, static fn($ts) => ($now - (int) $ts) < $window));
if (count($attempts) >= $maxAttempts) {
    respond(false, 'For mange forsøk. Prøv igjen senere.', 429);
}
$attempts[] = $now;
file_put_contents($rateFile, json_encode($attempts));

$timestamp = gmdate('Y-m-d H:i:s') . ' UTC';
$subject = 'Ny SETAEI Starter forespørsel - ' . $company;
$html = '<h2>Ny SETAEI Starter forespørsel</h2>'
    . '<p><strong>Navn:</strong> ' . htmlspecialchars($name) . '</p>'
    . '<p><strong>Bedrift:</strong> ' . htmlspecialchars($company) . '</p>'
    . '<p><strong>Organisasjonsnummer:</strong> ' . htmlspecialchars($org) . '</p>'
    . '<p><strong>E-post:</strong> ' . htmlspecialchars((string) $email) . '</p>'
    . '<p><strong>Telefon:</strong> ' . htmlspecialchars($phone) . '</p>'
    . '<p><strong>Har nettside:</strong> ' . htmlspecialchars($websiteStatus) . '</p>'
    . '<p><strong>Beskrivelse:</strong><br>' . nl2br(htmlspecialchars($message)) . '</p>'
    . '<hr><p><strong>Tidspunkt:</strong> ' . $timestamp . '<br><strong>IP:</strong> ' . htmlspecialchars($ip) . '</p>';

try {
    $mail = build_mailer($config['smtp']);
    $mail->addAddress($config['contact_recipient']);
    $mail->addReplyTo((string) $email, $name);
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $html;
    $mail->AltBody = strip_tags(str_replace('<br>', "\n", $html));
    $mail->send();
} catch (Throwable $e) {
    respond(false, 'Kunne ikke sende e-post akkurat nå.', 500);
}

if (!empty($config['db_dsn'])) {
    try {
        $pdo = new PDO($config['db_dsn'], $config['db_user'], $config['db_pass']);
        $sql = 'INSERT INTO starter_leads (name, company, org_number, email, phone, website_status, message, ip_address, created_at)
                VALUES (:name, :company, :org_number, :email, :phone, :website_status, :message, :ip_address, NOW())';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':name' => $name, ':company' => $company, ':org_number' => $org, ':email' => $email,
            ':phone' => $phone, ':website_status' => $websiteStatus, ':message' => $message, ':ip_address' => $ip,
        ]);
    } catch (Throwable $e) {
    }
}

respond(true);
