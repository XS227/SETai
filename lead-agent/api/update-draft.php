<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
require_admin_token();

$pdo   = db();
$input = json_input();
$id    = (int)($input['draft_id'] ?? 0);
if (!$id) { echo json_encode(['ok' => false, 'error' => 'draft_id required']); exit; }

$allowed_status = ['draft', 'approved', 'sent', 'deleted'];
$sets = []; $params = [];

if (isset($input['subject']))  { $sets[] = 'subject=?';  $params[] = trim($input['subject']); }
if (isset($input['body']))     { $sets[] = 'body=?';     $params[] = trim($input['body']); }
if (isset($input['cta_link'])) { $sets[] = 'cta_link=?'; $params[] = trim($input['cta_link']); }
if (isset($input['status']) && in_array($input['status'], $allowed_status, true)) {
    $sets[] = 'status=?'; $params[] = $input['status'];
}

if (!$sets) { echo json_encode(['ok' => false, 'error' => 'Ingen felt å oppdatere']); exit; }

$params[] = $id;
$pdo->prepare('UPDATE email_drafts SET ' . implode(',', $sets) . ', updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute($params);
echo json_encode(['ok' => true]);
