<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
require_admin_token();
$pdo = db();

$offers = $pdo->query("
    SELECT so.id, so.subject, so.cta_link, so.recipient_count, so.sent_at,
           COUNT(CASE WHEN sor.opened_at  IS NOT NULL THEN 1 END) AS opened,
           COUNT(CASE WHEN sor.clicked_at IS NOT NULL THEN 1 END) AS clicked,
           COUNT(CASE WHEN sor.send_status = 'sent'   THEN 1 END) AS sent_count
    FROM sent_offers so
    LEFT JOIN sent_offer_recipients sor ON sor.offer_id = so.id
    GROUP BY so.id
    ORDER BY so.sent_at DESC
    LIMIT 100
")->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(['ok' => true, 'offers' => $offers]);
