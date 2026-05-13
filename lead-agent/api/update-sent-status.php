<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
require_admin_token();

$pdo    = db();
$input  = json_input();
$id     = (int)($input['recipient_id'] ?? 0);
$status = $input['manual_status'] ?? '';
$allowed = ['', 'replied', 'interested', 'not_relevant', 'customer'];
if (!$id || !in_array($status, $allowed, true)) {
    echo json_encode(['ok' => false, 'error' => 'Ugyldig recipient_id eller manual_status']);
    exit;
}
$pdo->prepare('UPDATE sent_offer_recipients SET manual_status=? WHERE id=?')->execute([$status ?: null, $id]);
echo json_encode(['ok' => true]);
