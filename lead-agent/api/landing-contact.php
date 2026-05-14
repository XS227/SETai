<?php
/**
 * Public endpoint — landing-page contact form.
 *
 * Receives form submissions from /tilbud/{bilvask,frisor,restaurant,klinikk},
 * sends an email to LANDING_INBOX via the same PHPMailer config used by
 * send-test-email.php, and persists the inquiry to the landing_contacts
 * table.
 *
 * Security:
 *  - PUBLIC endpoint (no admin token; the landing pages are anonymous).
 *  - Validates email, basic phone shape, message length caps.
 *  - Per-IP rate limit: 5 / hour, 20 / 24h.
 *  - SMTP errors logged server-side; clients see a generic message.
 */

require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_mail_config.php';
require_once __DIR__ . '/_public_url.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$input   = json_input();
$page    = trim((string)($input['page']    ?? ''));
$name    = trim((string)($input['name']    ?? ''));
$email   = trim((string)($input['email']   ?? ''));
$phone   = trim((string)($input['phone']   ?? ''));
$message = trim((string)($input['message'] ?? ''));

// Honeypot — any value here = bot. Silently accept and discard.
if (!empty(trim((string)($input['website'] ?? '')))) {
    echo json_encode(['ok' => true]);
    exit;
}

$allowed_pages = ['bilvask', 'frisor', 'restaurant', 'klinikk', 'tilbud', 'general'];
$page = preg_replace('/[^a-zA-Z0-9_\-]/', '', $page);
if (!$page || !in_array($page, $allowed_pages, true)) $page = 'general';

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Vennligst oppgi en gyldig e-postadresse.']);
    exit;
}
if ($name && mb_strlen($name) > 200)     $name    = mb_substr($name, 0, 200);
if ($phone && mb_strlen($phone) > 40)    $phone   = mb_substr($phone, 0, 40);
if ($message && mb_strlen($message) > 4000) $message = mb_substr($message, 0, 4000);
// Phone may be empty; if present, ensure it's plausible (digits/+/space/-/().
if ($phone !== '' && !preg_match('/^[0-9 +()\-.]{4,}$/', $phone)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Telefonnummeret ser ikke gyldig ut.']);
    exit;
}

$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
if (str_contains($ip, ',')) $ip = trim(explode(',', $ip)[0]); // first hop
$ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');

$pdo = db();

// Rate limit per IP — 5/hour, 20/day.
if ($ip) {
    $rate1h = (int)$pdo->query("SELECT COUNT(*) FROM landing_contacts
        WHERE ip = " . $pdo->quote(substr($ip, 0, 45)) . "
        AND created_at >= datetime('now', '-1 hour')")->fetchColumn();
    if ($rate1h >= 5) {
        http_response_code(429);
        echo json_encode(['ok' => false, 'error' => 'For mange henvendelser. Prøv igjen om en time, eller send oss en e-post direkte.']);
        exit;
    }
    $rate24h = (int)$pdo->query("SELECT COUNT(*) FROM landing_contacts
        WHERE ip = " . $pdo->quote(substr($ip, 0, 45)) . "
        AND created_at >= datetime('now', '-1 day')")->fetchColumn();
    if ($rate24h >= 20) {
        http_response_code(429);
        echo json_encode(['ok' => false, 'error' => 'For mange henvendelser i dag. Prøv igjen i morgen.']);
        exit;
    }
}

$page_labels = [
    'bilvask'    => 'Bilvask',
    'frisor'     => 'Frisør / salong',
    'restaurant' => 'Restaurant',
    'klinikk'    => 'Klinikk',
    'tilbud'     => 'Tilbud (oversikt)',
    'general'    => 'Generell',
];
$page_label = $page_labels[$page] ?? 'Generell';

$insert = $pdo->prepare('INSERT INTO landing_contacts (page, name, email, phone, message, ip, user_agent, send_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
$insert->execute([$page, $name, $email, $phone, $message, substr($ip, 0, 45), substr($ua, 0, 250), 'pending']);
$contact_id = (int)$pdo->lastInsertId();

$inbox    = defined('LANDING_INBOX') ? LANDING_INBOX : 'ks@setai.no';
$site_url = public_url('/');
$subject  = "Ny henvendelse fra {$page_label}: " . ($name ?: $email);

$body_text  = "Ny henvendelse fra landingssiden {$page_label}\n";
$body_text .= str_repeat('-', 48) . "\n";
$body_text .= "Navn/firma: " . ($name ?: '—') . "\n";
$body_text .= "E-post:     {$email}\n";
$body_text .= "Telefon:    " . ($phone ?: '—') . "\n";
$body_text .= "Landing:    " . public_url('/tilbud/' . $page) . "\n";
$body_text .= "Mottatt:    " . date('Y-m-d H:i') . "\n";
$body_text .= "IP:         " . ($ip ?: '—') . "\n";
$body_text .= "Side:       {$page_label}\n";
$body_text .= str_repeat('-', 48) . "\n";
$body_text .= "Melding:\n" . ($message ?: '(ingen melding)') . "\n";

$h_name    = htmlspecialchars($name    ?: '—', ENT_QUOTES, 'UTF-8');
$h_email   = htmlspecialchars($email,         ENT_QUOTES, 'UTF-8');
$h_phone   = htmlspecialchars($phone   ?: '—', ENT_QUOTES, 'UTF-8');
$h_message = nl2br(htmlspecialchars($message ?: '(ingen melding)', ENT_QUOTES, 'UTF-8'));
$h_label   = htmlspecialchars($page_label, ENT_QUOTES, 'UTF-8');
$landing_url = public_url('/tilbud/' . $page);
$h_landing = htmlspecialchars($landing_url, ENT_QUOTES, 'UTF-8');
$h_site    = htmlspecialchars($site_url, ENT_QUOTES, 'UTF-8');

$body_html = <<<HTML
<!DOCTYPE html>
<html lang="no"><head><meta charset="UTF-8"><title>Ny henvendelse: {$h_label}</title></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#13223a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f7fb">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;background:#fff;border:1px solid #e4e9f2;border-radius:12px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#246bff,#1855d6);padding:18px 28px;color:#fff">
  <strong style="font-size:14px;letter-spacing:0.5px">SETAEI · Landing inquiry</strong>
  <div style="font-size:18px;font-weight:700;margin-top:2px">{$h_label}</div>
</td></tr>
<tr><td style="padding:24px 28px;font-size:14px;line-height:1.65">
  <table cellpadding="6" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">
    <tr><td style="color:#66758f;width:110px;font-size:12px">Navn / firma</td><td><strong>{$h_name}</strong></td></tr>
    <tr><td style="color:#66758f;font-size:12px">E-post</td><td><a href="mailto:{$h_email}" style="color:#246bff;text-decoration:none">{$h_email}</a></td></tr>
    <tr><td style="color:#66758f;font-size:12px">Telefon</td><td>{$h_phone}</td></tr>
    <tr><td style="color:#66758f;font-size:12px">Landing</td><td><a href="{$h_landing}" style="color:#246bff;text-decoration:none">{$h_landing}</a></td></tr>
  </table>
  <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e4e9f2;color:#66758f;font-size:12px">Melding fra kunden</div>
  <div style="margin-top:8px;background:#f9fafd;border:1px solid #eaeef5;border-radius:8px;padding:14px;font-size:14px;line-height:1.65;color:#13223a;white-space:pre-wrap">{$h_message}</div>
</td></tr>
<tr><td style="background:#f5f7fb;padding:14px 28px;border-top:1px solid #e4e9f2;color:#66758f;font-size:11px">
  Mottatt automatisk fra <a href="{$h_site}" style="color:#246bff;text-decoration:none">setai.no</a> · Lead ID #{$contact_id}
</td></tr>
</table></td></tr></table></body></html>
HTML;

$status      = 'sent';
$last_error  = null;
$smtp_error  = null;
$mail        = null;

try {
    $mail = new PHPMailer(true);
    if (MAIL_HOST) {
        $mail->isSMTP();
        $mail->Host       = MAIL_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = MAIL_USER;
        $mail->Password   = MAIL_PASS;
        $mail->SMTPSecure = MAIL_SECURE;
        $mail->Port       = MAIL_PORT;
    } else {
        $mail->isMail();
    }
    $mail->CharSet = 'UTF-8';
    $mail->setFrom(MAIL_FROM, MAIL_FROM_NAME);
    $mail->addAddress($inbox);
    if ($email && filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $mail->addReplyTo($email, $name ?: $email);
    }
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $body_html;
    $mail->AltBody = $body_text;
    $mail->send();
} catch (Exception $e) {
    $status     = 'failed';
    $smtp_error = $mail ? ($mail->ErrorInfo ?: $e->getMessage()) : $e->getMessage();
    $last_error = $smtp_error;
} catch (\Throwable $e) {
    $status     = 'failed';
    $smtp_error = $e->getMessage();
    $last_error = $smtp_error;
}

$pdo->prepare('UPDATE landing_contacts SET send_status = ?, last_error = ? WHERE id = ?')
    ->execute([$status, $last_error, $contact_id]);

if ($status === 'sent') {
    // Mirror in landing_events for funnel analytics.
    @$pdo->prepare('INSERT INTO landing_events (page, event_type, ip, user_agent) VALUES (?, ?, ?, ?)')
        ->execute([$page, 'form_submit', substr($ip, 0, 45), substr($ua, 0, 200)]);
    echo json_encode(['ok' => true, 'message' => 'Takk! Vi tar kontakt innen 24 timer.']);
} else {
    error_log('SETAEI landing-contact SMTP failed (contact_id=' . $contact_id . '): ' . $smtp_error);
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Kunne ikke sende meldingen akkurat nå. Send oss en e-post direkte til ' . $inbox . '.']);
}
