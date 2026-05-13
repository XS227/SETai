<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_mail_config.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json');
require_admin_token();

$input    = json_input();
$subject  = trim($input['subject']  ?? '');
$message  = trim($input['message']  ?? '');
$cta_link = trim($input['cta_link'] ?? '');
$lead_ids = array_values(array_filter(array_map('intval', $input['lead_ids'] ?? [])));

if (!$subject || !$message || !$lead_ids) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'subject, message og lead_ids er påkrevd']);
    exit;
}

$pdo = db();

// Rate limiting
$per_min = (int)$pdo->query("
    SELECT COUNT(*) FROM sent_offer_recipients sor
    JOIN sent_offers so ON so.id = sor.offer_id
    WHERE sor.send_status = 'sent'
    AND so.sent_at >= datetime('now', '-1 minute')
")->fetchColumn();
if ($per_min >= 10) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Rate limit: maks 10 e-poster per minutt. Prøv igjen om litt.']);
    exit;
}

$per_hour = (int)$pdo->query("
    SELECT COUNT(*) FROM sent_offer_recipients sor
    JOIN sent_offers so ON so.id = sor.offer_id
    WHERE sor.send_status = 'sent'
    AND so.sent_at >= datetime('now', '-1 hour')
")->fetchColumn();
if ($per_hour >= 100) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'Rate limit: maks 100 e-poster per time. Prøv igjen senere.']);
    exit;
}

$proto      = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host       = $_SERVER['HTTP_HOST'] ?? 'localhost';
$track_base = $proto . '://' . $host . '/lead-agent/api/track.php';

$pdo->prepare('INSERT INTO sent_offers (subject, message, cta_link, recipient_count, sent_at) VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)')->execute([$subject, $message, $cta_link]);
$offer_id = (int)$pdo->lastInsertId();

$placeholders = implode(',', array_fill(0, count($lead_ids), '?'));
$stmt = $pdo->prepare("SELECT id, company_name, contact_email FROM leads WHERE id IN ($placeholders)");
$stmt->execute($lead_ids);
$leads = $stmt->fetchAll(PDO::FETCH_ASSOC);

$sent = $skipped = $failed = 0;
$ins  = $pdo->prepare('INSERT INTO sent_offer_recipients (offer_id, lead_id, email, company_name, track_token, send_status, smtp_response, last_error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

foreach ($leads as $lead) {
    $email = trim($lead['contact_email'] ?? '');
    $tok   = bin2hex(random_bytes(16));

    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $ins->execute([$offer_id, $lead['id'], $email ?: '', $lead['company_name'], $tok, 'skipped', null, null]);
        $skipped++;
        continue;
    }

    $open_url  = $track_base . '?t=o&tok=' . $tok;
    $click_url = $cta_link ? ($track_base . '?t=c&tok=' . $tok . '&url=' . urlencode($cta_link)) : '';
    $pixel     = '<img src="' . $open_url . '" width="1" height="1" alt="" style="display:none" />';
    $cta_table = $click_url
        ? '<table border="0" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td bgcolor="#246bff" style="border-radius:8px;padding:12px 28px"><a href="' . $click_url . '" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;font-family:Arial,sans-serif">Se tilbudet &#8594;</a></td></tr></table>'
        : '';
    $co_name  = htmlspecialchars($lead['company_name'] ?? '');
    $msg_html = '<p style="margin:0 0 14px">' . implode('</p><p style="margin:0 0 14px">', array_map('htmlspecialchars', explode("\n\n", $message))) . '</p>';
    $html = '<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>' . htmlspecialchars($subject) . '</title></head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#f5f7fb">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e9f2">
    <tr><td style="background:#246bff;padding:18px 32px">
      <span style="color:#ffffff;font-size:20px;font-weight:700;font-family:Arial,sans-serif;letter-spacing:-0.3px">SETAEI</span>
      <span style="color:rgba(255,255,255,0.7);font-size:12px;margin-left:10px;font-family:Arial,sans-serif">Nettside &amp; Digital Vekst</span>
    </td></tr>
    <tr><td style="padding:32px;color:#13223a;font-size:15px;line-height:1.75;font-family:Arial,sans-serif">
      ' . $msg_html . '
      ' . $cta_table . '
    </td></tr>
    <tr><td style="background:#f5f7fb;padding:20px 32px;border-top:1px solid #e4e9f2;font-size:12px;color:#66758f;font-family:Arial,sans-serif">
      <strong style="color:#13223a">SETAEI</strong> &mdash; Nettside og digital vekst for norske bedrifter<br>
      <a href="https://setai.no" style="color:#246bff;text-decoration:none">setai.no</a> &middot;
      <a href="mailto:khabat@setai.no" style="color:#246bff;text-decoration:none">khabat@setai.no</a>
      <br><br>
      <span style="color:#aab0bb;font-size:11px">Du mottar denne e-posten fordi ' . $co_name . ' nylig ble registrert i Br&oslash;nn&oslash;ysundregistrene. Svar &laquo;avmeld&raquo; for &aring; bli fjernet fra v&aring;r liste.</span>
    </td></tr>
  </table>
</td></tr>
</table>
' . $pixel . '
</body>
</html>';

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
        $mail->addAddress($email, $lead['company_name'] ?? '');
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $html;
        $mail->AltBody = $message . ($cta_link ? "\n\n" . $cta_link : '') . "\n\n---\nSETAEI | setai.no | khabat@setai.no\nSvar 'avmeld' for å bli fjernet.";
        $mail->send();
        $smtp_response = 'OK';
        $sent++;
    } catch (Exception $e) {
        $status     = 'failed';
        $last_error = $mail->ErrorInfo;
        $failed++;
    }

    $ins->execute([$offer_id, $lead['id'], $email, $lead['company_name'], $tok, $status, $smtp_response, $last_error]);
}

$pdo->prepare('UPDATE sent_offers SET recipient_count = ? WHERE id = ?')->execute([$sent, $offer_id]);

echo json_encode(['ok' => true, 'offer_id' => $offer_id, 'sent' => $sent, 'skipped' => $skipped, 'failed' => $failed]);
