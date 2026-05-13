<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_research.php';
header('Content-Type: application/json');
require_admin_token();

$pdo   = db();
$input = json_input();
$id    = (int)($input['lead_id'] ?? 0);

$stmt = $pdo->prepare('SELECT * FROM leads WHERE id = ?');
$stmt->execute([$id]);
$lead = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$lead) { echo json_encode(['ok' => false, 'error' => 'Lead not found']); exit; }

// 24 h cache
if (!empty($lead['researched_at']) && (time() - strtotime($lead['researched_at'])) < 86400) {
    echo json_encode(['ok' => true, 'cached' => true,
        'status' => $lead['research_status'] ?? 'cached',
        'email'  => $lead['contact_email'],
        'phone'  => $lead['contact_phone']]);
    exit;
}

$result = do_research($pdo, $lead, 8.0);
echo json_encode(array_merge(['ok' => true, 'cached' => false], $result));
