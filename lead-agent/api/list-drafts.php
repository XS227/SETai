<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
require_admin_token();

$pdo = db();
$rows = $pdo->query('
    SELECT d.id, d.lead_id, d.subject, d.body, d.offer_type, d.cta_link, d.tone, d.status, d.created_at, d.updated_at,
           l.company_name, l.city, l.contact_email, l.contact_phone, l.industry_name, l.lead_score, l.website_url
    FROM email_drafts d
    JOIN leads l ON l.id = d.lead_id
    WHERE d.status != "deleted"
    ORDER BY d.created_at DESC
    LIMIT 500
')->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(['ok' => true, 'drafts' => $rows]);
