<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_mail_config.php';
require_once __DIR__ . '/_public_url.php';
require_once __DIR__ . '/_email_template.php';
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

$track_base = public_track_base();
// Sanitize any CTA link that may have leaked the internal :8447 port.
$cta_link = public_url($cta_link);

// Create sent offer record
$pdo->prepare('INSERT INTO sent_offers (subject, message, cta_link, recipient_count, sent_at) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)')->execute([$subject, $message, $cta_link]);
$offer_id = (int)$pdo->lastInsertId();

$tok        = bin2hex(random_bytes(16));
$open_url   = $track_base . '?t=o&tok=' . $tok;
$click_url  = $track_base . '?t=c&tok=' . $tok . '&url=' . urlencode($cta_link);

$html = render_outreach_email_html([
    'subject'            => $subject,
    'message_text'       => $message,
    'company_name'       => $draft['company_name'] ?? '',
    'cta_url'            => $click_url,
    'cta_label'          => 'Se tilbudet',
    'tracking_pixel_url' => $open_url,
]);

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
