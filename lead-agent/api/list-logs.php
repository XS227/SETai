<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
require_admin_token();

$pdo = db();
$rows = $pdo->query('
    SELECT r.id, r.lead_id, r.source, r.summary, r.created_at,
           l.company_name, l.city, l.research_status, l.contact_email
    FROM lead_research r
    JOIN leads l ON l.id = r.lead_id
    ORDER BY r.created_at DESC
    LIMIT 500
')->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(['ok' => true, 'logs' => $rows]);
