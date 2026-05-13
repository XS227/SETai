<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
require_admin_token();

$pdo   = db();
$input = json_input();
$id    = (int)($input['draft_id'] ?? 0);
if (!$id) { echo json_encode(['ok' => false, 'error' => 'draft_id required']); exit; }

$pdo->prepare('DELETE FROM email_drafts WHERE id=?')->execute([$id]);
echo json_encode(['ok' => true]);
