<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_mail_config.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json');
require_admin_token();

$pdo   = db();
$input = json_input();
$id    = (int)($input['draft_id'] ?? 0);
if (!$id) { http_response_code(400); echo json_encode(['ok' => false, 'error' => 'draft_id required']); exit; }

$stmt = $pdo->prepare('
    SELECT d.id, d.lead_id, d.subject, d.body, d.offer_type, d.cta_link, d.status,
           l.company_name, l.contact_email
    FROM email_drafts d
    JOIN leads l ON l.id = d.lead_id
    WHERE d.id = ?
');
$stmt->execute([$id]);
$draft = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$draft) { echo json_encode(['ok' => false, 'error' => 'Utkast ikke funnet']); exit; }
if ($draft['status'] === 'sent') { echo json_encode(['ok' => false, 'error' => 'Utkastet er allerede sendt']); exit; }

$email = trim($draft['contact_email'] ?? '');
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['ok' => false, 'error' => 'Lead har ingen gyldig e-postadresse']);
    exit;
}

// CTA map fallback
$cta_map = [
    'bilvask'    => 'https://setai.no/tilbud/bilvask',
    'frisor'     => 'https://setai.no/tilbud/frisor',
    'restaurant' => 'https://setai.no/tilbud/restaurant',
    'klinikk'    => 'https://setai.no/tilbud/klinikk',
];
$cta_link = $draft['cta_link'] ?: ($cta_map[$draft['offer_type']] ?? 'https://setai.no/tilbud');
$subject  = $draft['subject'];
$message  = $draft['body'];

$proto      = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host       = $_SERVER['HTTP_HOST'] ?? 'localhost';
$track_base = $proto . '://' . $host . '/lead-agent/api/track.php';

// Create sent offer record
$pdo->prepare('INSERT INTO sent_offers (subject, message, cta_link, recipient_count, sent_at) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)')->execute([$subject, $message, $cta_link]);
$offer_id = (int)$pdo->lastInsertId();

$tok        = bin2hex(random_bytes(16));
$open_url   = $track_base . '?t=o&tok=' . $tok;
$click_url  = $track_base . '?t=c&tok=' . $tok . '&url=' . urlencode($cta_link);
$pixel      = '<img src="' . $open_url . '" width="1" height="1" alt="" style="display:none" />';
$cta_table  = '<table border="0" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td bgcolor="#246bff" style="border-radius:8px;padding:12px 28px"><a href="' . $click_url . '" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;font-family:Arial,sans-serif">Se tilbudet &#8594;</a></td></tr></table>';
$co_name    = htmlspecialchars($draft['company_name'] ?? '');
$msg_html   = '<p style="margin:0 0 14px">' . implode('</p><p style="margin:0 0 14px">', array_map('htmlspecialchars', explode("\n\n", $message))) . '</p>';

$html = '<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>' . htmlspecialchars($subject) . '</title></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#f5f7fb">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e9f2">
    <tr><td style="background:#246bff;padding:18px 32px">
      <span style="color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,sans-serif">SETAEI</span>
      <span style="color:rgba(255,255,255,0.7);font-size:12px;margin-left:10px;font-family:Arial,sans-serif">Nettside &amp; Digital Vekst</span>
    </td></tr>
    <tr><td style="padding:32px;color:#13223a;font-size:15px;line-height:1.75;font-family:Arial,sans-serif">
      ' . $msg_html . $cta_table . '
    </td></tr>
    <tr><td style="background:#f5f7fb;padding:20px 32px;border-top:1px solid #e4e9f2;font-size:12px;color:#66758f;font-family:Arial,sans-serif">
      <strong style="color:#13223a">SETAEI</strong> &mdash; Nettside og digital vekst for norske bedrifter<br>
      <a href="https://setai.no" style="color:#246bff;text-decoration:none">setai.no</a> &middot;
      <a href="mailto:khabat@setai.no" style="color:#246bff;text-decoration:none">khabat@setai.no</a>
      <br><br>
      <span style="color:#aab0bb;font-size:11px">Du mottar denne e-posten fordi ' . $co_name . ' nylig ble registrert i Br&oslash;nn&oslash;ysundregistrene. Svar &laquo;avmeld&raquo; for &aring; bli fjernet.</span>
    </td></tr>
  </table>
</td></tr>
</table>
' . $pixel . '</body></html>';

$status = 'sent'; $smtp_response = null; $last_error = null;
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
    $mail->addAddress($email, $draft['company_name'] ?? '');
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $html;
    $mail->AltBody = $message . "\n\n" . $cta_link . "\n\n---\nSETAEI | setai.no\nSvar 'avmeld' for å bli fjernet.";
    $mail->send();
    $smtp_response = 'OK';
} catch (Exception $e) {
    $status     = 'failed';
    $last_error = $mail->ErrorInfo;
}

$pdo->prepare('INSERT INTO sent_offer_recipients (offer_id, lead_id, email, company_name, track_token, send_status, smtp_response, last_error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')->execute([$offer_id, $draft['lead_id'], $email, $draft['company_name'], $tok, $status, $smtp_response, $last_error]);

if ($status === 'sent') {
    $pdo->prepare('UPDATE email_drafts SET status="sent", updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$id]);
    $pdo->prepare('UPDATE leads SET lead_status="contacted", updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$draft['lead_id']]);
}

echo json_encode(['ok' => $status === 'sent', 'status' => $status, 'offer_id' => $offer_id, 'error' => $last_error]);
