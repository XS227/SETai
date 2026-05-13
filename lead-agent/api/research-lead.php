<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
$pdo = db();
$input = json_input();
$id = (int)($input['lead_id'] ?? 0);
$lead = $pdo->query('SELECT * FROM leads WHERE id=' . $id)->fetch(PDO::FETCH_ASSOC);
if (!$lead) { echo json_encode(['ok'=>false,'error'=>'Lead not found']); exit; }
$summary = 'Manuell research placeholder: sjekk nettside, Google-profil og SoMe for '.$lead['company_name'].'.';
$pdo->prepare('INSERT INTO lead_research (lead_id,source,data_json,summary,created_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)')
  ->execute([$id,'manual_placeholder',json_encode(['compliance'=>'business-only data']),$summary]);
$pdo->prepare('UPDATE leads SET lead_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute(['researched',$id]);
echo json_encode(['ok'=>true,'summary'=>$summary,'no_auto_send'=>true]);
