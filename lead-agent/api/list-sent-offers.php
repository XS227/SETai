<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
require_admin_token();
$pdo = db();

$rows = $pdo->query("
    SELECT
        so.subject,
        so.sent_at,
        sor.company_name,
        sor.email,
        sor.opened_at,
        sor.clicked_at,
        sor.send_status
    FROM sent_offer_recipients sor
    JOIN sent_offers so ON so.id = sor.offer_id
    ORDER BY so.sent_at DESC, sor.id DESC
    LIMIT 500
")->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(['ok' => true, 'rows' => $rows]);
