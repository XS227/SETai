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

$proto      = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host       = $_SERVER['HTTP_HOST'] ?? 'localhost';
$track_base = $proto . '://' . $host . '/lead-agent/api/track.php';

$pdo->prepare('INSERT INTO sent_offers (subject, message, cta_link, recipient_count, sent_at) VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)')->execute([$subject, $message, $cta_link]);
$offer_id = (int)$pdo->lastInsertId();

$placeholders = implode(',', array_fill(0, count($lead_ids), '?'));
$leads = $pdo->prepare("SELECT id, company_name, contact_email FROM leads WHERE id IN ($placeholders)");
$leads->execute($lead_ids);
$leads = $leads->fetchAll(PDO::FETCH_ASSOC);

$sent = $skipped = $failed = 0;
$ins  = $pdo->prepare('INSERT INTO sent_offer_recipients (offer_id, lead_id, email, company_name, track_token, send_status) VALUES (?, ?, ?, ?, ?, ?)');

foreach ($leads as $lead) {
    $email = trim($lead['contact_email'] ?? '');
    $tok   = bin2hex(random_bytes(16));

    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $ins->execute([$offer_id, $lead['id'], $email ?: '', $lead['company_name'], $tok, 'skipped']);
        $skipped++;
        continue;
    }

    $open_url  = $track_base . '?t=o&tok=' . $tok;
    $click_url = $cta_link ? ($track_base . '?t=c&tok=' . $tok . '&url=' . urlencode($cta_link)) : '';
    $cta_btn   = $click_url
        ? '<p><a href="' . $click_url . '" style="background:#246bff;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">Les mer</a></p>'
        : '';
    $pixel     = '<img src="' . $open_url . '" width="1" height="1" alt="" style="display:none" />';
    $html_body = '<p>' . nl2br(htmlspecialchars($message)) . '</p>' . $cta_btn . $pixel;
    $html      = '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">' . $html_body . '</body></html>';

    $status = 'sent';
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
        $mail->AltBody = $message . ($cta_link ? "\n\n" . $cta_link : '');
        $mail->send();
        $sent++;
    } catch (Exception $e) {
        $status = 'failed';
        $failed++;
    }

    $ins->execute([$offer_id, $lead['id'], $email, $lead['company_name'], $tok, $status]);
}

$pdo->prepare('UPDATE sent_offers SET recipient_count = ? WHERE id = ?')->execute([$sent, $offer_id]);

echo json_encode(['ok' => true, 'offer_id' => $offer_id, 'sent' => $sent, 'skipped' => $skipped, 'failed' => $failed]);
