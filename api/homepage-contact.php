<?php
/**
 * Public endpoint — homepage slide-up contact form.
 *
 * Receives submissions from setai.no/index.html's "Get in touch" modal,
 * sends to khabat@setai.no via the same PHPMailer config used by the
 * Lead Agent admin mailer (lead-agent/api/_mail_config.php). Persists
 * the inquiry to lead-agent/lead_agent.sqlite (landing_contacts table)
 * so all inbound contact is in one place.
 *
 * Security:
 *  - Public POST endpoint, no token required.
 *  - Validates email + basic phone, caps every field.
 *  - Honeypot ("website" field).
 *  - Per-IP rate limit (5/hour, 20/day).
 *  - SMTP errors logged server-side; clients only see a generic message.
 */

require_once __DIR__ . '/../lead-agent/api/_db.php';
require_once __DIR__ . '/../lead-agent/api/_mail_config.php';
require_once __DIR__ . '/../lead-agent/api/_public_url.php';
require_once __DIR__ . '/../lead-agent/vendor/autoload.php';

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
$name    = trim((string)($input['name']    ?? ''));
$company = trim((string)($input['company'] ?? ''));
$email   = trim((string)($input['email']   ?? ''));
$phone   = trim((string)($input['phone']   ?? ''));
$message = trim((string)($input['message'] ?? ''));
$source  = trim((string)($input['source']  ?? 'homepage'));

// Honeypot
if (!empty(trim((string)($input['website'] ?? '')))) {
    echo json_encode(['ok' => true]);
    exit;
}

if ($name === '' || mb_strlen($name) < 2) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Please provide your name.']);
    exit;
}
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Please provide a valid email address.']);
    exit;
}
if ($message === '' || mb_strlen($message) < 5) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Please tell us a bit about what you need.']);
    exit;
}
if ($phone !== '' && !preg_match('/^[0-9 +()\-.]{4,}$/', $phone)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'That phone number does not look valid.']);
    exit;
}

// Caps
$name    = mb_substr($name,    0, 200);
$company = mb_substr($company, 0, 200);
$phone   = mb_substr($phone,   0, 40);
$message = mb_substr($message, 0, 4000);
$source  = preg_replace('/[^a-zA-Z0-9_\-]/', '', $source) ?: 'homepage';

$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
if (str_contains($ip, ',')) $ip = trim(explode(',', $ip)[0]);
$ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');

$pdo = db();

// Per-IP rate limit, sharing the landing_contacts table.
if ($ip) {
    $rate1h = (int)$pdo->query("SELECT COUNT(*) FROM landing_contacts
        WHERE ip = " . $pdo->quote(substr($ip, 0, 45)) . "
        AND created_at >= datetime('now', '-1 hour')")->fetchColumn();
    if ($rate1h >= 5) {
        http_response_code(429);
        echo json_encode(['ok' => false, 'error' => 'Too many requests. Please try again in an hour, or email us directly.']);
        exit;
    }
    $rate24h = (int)$pdo->query("SELECT COUNT(*) FROM landing_contacts
        WHERE ip = " . $pdo->quote(substr($ip, 0, 45)) . "
        AND created_at >= datetime('now', '-1 day')")->fetchColumn();
    if ($rate24h >= 20) {
        http_response_code(429);
        echo json_encode(['ok' => false, 'error' => 'Daily request limit reached. Please try again tomorrow.']);
        exit;
    }
}

// Compose stored message (include company since landing_contacts has no separate column).
$stored_message = $message;
if ($company !== '') {
    $stored_message = "Company: {$company}\n\n" . $message;
}

$insert = $pdo->prepare('INSERT INTO landing_contacts (page, name, email, phone, message, ip, user_agent, send_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
$insert->execute([$source, $name, $email, $phone, $stored_message, substr($ip, 0, 45), substr($ua, 0, 250), 'pending']);
$contact_id = (int)$pdo->lastInsertId();

$inbox    = 'khabat@setai.no';
$site_url = public_url('/');
$subject  = 'New inquiry from setai.no: ' . ($company ?: $name);

$body_text  = "New inquiry from setai.no\n";
$body_text .= str_repeat('-', 48) . "\n";
$body_text .= "Name:    {$name}\n";
$body_text .= "Company: " . ($company ?: '—') . "\n";
$body_text .= "Email:   {$email}\n";
$body_text .= "Phone:   " . ($phone ?: '—') . "\n";
$body_text .= "Source:  {$source}\n";
$body_text .= "Time:    " . date('Y-m-d H:i') . "\n";
$body_text .= "IP:      " . ($ip ?: '—') . "\n";
$body_text .= str_repeat('-', 48) . "\n";
$body_text .= "Message:\n{$message}\n";

$h_name    = htmlspecialchars($name,            ENT_QUOTES, 'UTF-8');
$h_company = htmlspecialchars($company ?: '—',  ENT_QUOTES, 'UTF-8');
$h_email   = htmlspecialchars($email,           ENT_QUOTES, 'UTF-8');
$h_phone   = htmlspecialchars($phone   ?: '—',  ENT_QUOTES, 'UTF-8');
$h_message = nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));
$h_source  = htmlspecialchars($source,          ENT_QUOTES, 'UTF-8');
$h_site    = htmlspecialchars($site_url,        ENT_QUOTES, 'UTF-8');

$body_html = <<<HTML
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>New inquiry from setai.no</title></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#13223a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f7fb">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;background:#fff;border:1px solid #e4e9f2;border-radius:12px;overflow:hidden">
<tr><td style="background:#07080e;padding:18px 28px;color:#fff">
  <strong style="font-size:13px;letter-spacing:0.5px;color:#f47c20">SETAEI · setai.no inquiry</strong>
  <div style="font-size:18px;font-weight:700;margin-top:2px">{$h_name}</div>
</td></tr>
<tr><td style="padding:24px 28px;font-size:14px;line-height:1.65">
  <table cellpadding="6" cellspacing="0" border="0" style="width:100%;border-collapse:collapse">
    <tr><td style="color:#66758f;width:110px;font-size:12px">Name</td><td><strong>{$h_name}</strong></td></tr>
    <tr><td style="color:#66758f;font-size:12px">Company</td><td>{$h_company}</td></tr>
    <tr><td style="color:#66758f;font-size:12px">Email</td><td><a href="mailto:{$h_email}" style="color:#246bff;text-decoration:none">{$h_email}</a></td></tr>
    <tr><td style="color:#66758f;font-size:12px">Phone</td><td>{$h_phone}</td></tr>
    <tr><td style="color:#66758f;font-size:12px">Source</td><td>{$h_source}</td></tr>
  </table>
  <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e4e9f2;color:#66758f;font-size:12px">Message</div>
  <div style="margin-top:8px;background:#f9fafd;border:1px solid #eaeef5;border-radius:8px;padding:14px;font-size:14px;line-height:1.65;color:#13223a;white-space:pre-wrap">{$h_message}</div>
</td></tr>
<tr><td style="background:#f5f7fb;padding:14px 28px;border-top:1px solid #e4e9f2;color:#66758f;font-size:11px">
  Received automatically from <a href="{$h_site}" style="color:#246bff;text-decoration:none">setai.no</a> · Lead ID #{$contact_id}
</td></tr>
</table></td></tr></table></body></html>
HTML;

$status     = 'sent';
$last_error = null;
$smtp_error = null;
$mail       = null;

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
    if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $mail->addReplyTo($email, $name);
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
    echo json_encode(['ok' => true, 'message' => "Thanks — we'll get back to you within 24 hours."]);
} else {
    error_log('SETAEI homepage-contact SMTP failed (contact_id=' . $contact_id . '): ' . $smtp_error);
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => "Couldn't send the message right now. Please email " . $inbox . " directly."]);
}
