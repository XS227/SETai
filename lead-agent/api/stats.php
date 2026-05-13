<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
require_admin_token();
$pdo = db();
echo json_encode(['ok' => true, 'stats' => [
    'total'        => (int)$pdo->query("SELECT COUNT(*) FROM leads")->fetchColumn(),
    'with_email'   => (int)$pdo->query("SELECT COUNT(*) FROM leads WHERE contact_email != '' AND contact_email IS NOT NULL")->fetchColumn(),
    'with_website' => (int)$pdo->query("SELECT COUNT(*) FROM leads WHERE has_website = 1")->fetchColumn(),
    'researched'   => (int)$pdo->query("SELECT COUNT(*) FROM leads WHERE research_status IS NOT NULL AND research_status != ''")->fetchColumn(),
    'ready'        => (int)$pdo->query("SELECT COUNT(*) FROM leads WHERE lead_status IN ('approved','draft_ready') AND contact_email != '' AND contact_email IS NOT NULL")->fetchColumn(),
    'sent'         => (int)$pdo->query("SELECT COUNT(*) FROM sent_offer_recipients WHERE send_status = 'sent'")->fetchColumn(),
    'opened'       => (int)$pdo->query("SELECT COUNT(*) FROM sent_offer_recipients WHERE opened_at IS NOT NULL")->fetchColumn(),
    'clicked'      => (int)$pdo->query("SELECT COUNT(*) FROM sent_offer_recipients WHERE clicked_at IS NOT NULL")->fetchColumn(),
]]);
