<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
require_admin_token();
$pdo = db();
$input = json_input();
$id = (int)($input['lead_id'] ?? 0);
$status = $input['status'] ?? 'new';
$allowed = ['new','researched','draft_ready','approved','contacted','rejected'];
if (!in_array($status,$allowed,true)) { echo json_encode(['ok'=>false,'error'=>'Invalid status']); exit; }
$pdo->prepare('UPDATE leads SET lead_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute([$status,$id]);
if ($status === 'approved') {
  $pdo->prepare('UPDATE email_drafts SET status=?,updated_at=CURRENT_TIMESTAMP WHERE lead_id=? AND status="draft"')->execute(['approved',$id]);
}
echo json_encode(['ok'=>true,'lead_id'=>$id,'status'=>$status]);
