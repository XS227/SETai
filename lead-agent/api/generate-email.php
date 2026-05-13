<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
$pdo = db();
$input = json_input();
$id = (int)($input['lead_id'] ?? 0);
$tone = $input['tone'] ?? 'vennlig';
$lead = $pdo->query('SELECT * FROM leads WHERE id=' . $id)->fetch(PDO::FETCH_ASSOC);
if (!$lead) { echo json_encode(['ok'=>false,'error'=>'Lead not found']); exit; }
$subjectOptions = [
  'Gratulerer med etableringen av '.$lead['company_name'],
  'Rask nettside for '.$lead['company_name'].'?',
  'Forslag til digital start for '.$lead['company_name']
];
$subject = $subjectOptions[array_rand($subjectOptions)];
$name = $lead['owner_name'] ?: $lead['company_name'];
$body = "Hei {$name},\n\n".
"Gratulerer med etableringen av {$lead['company_name']}.\n\n".
"Jeg så at dere nylig er registrert innen {$lead['industry_name']} i {$lead['city']}, og ville sende en kort henvendelse.\n\n".
"Vi i SETAEI hjelper nyetablerte bedrifter med raske, moderne nettsider uten WordPress-rot — med SEO, mobiltilpasning, kontaktskjema og drift inkludert.\n\n".
"Hvis dere ikke har fått på plass nettside ennå, kan vi gi en gratis vurdering av hva som trengs først.\n\n".
"Mvh\nSETAEI\n\n".
"Hvis dette ikke er relevant, svar gjerne «ikke relevant», så kontakter vi dere ikke igjen.";
$pdo->prepare('INSERT INTO email_drafts (lead_id,subject,body,offer_type,tone,status,created_at,updated_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)')
  ->execute([$id,$subject,$body,'SETAEI Starter',$tone,'draft']);
$pdo->prepare('UPDATE leads SET lead_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')->execute(['draft_ready',$id]);
echo json_encode(['ok'=>true,'subject'=>$subject,'body'=>$body,'auto_send'=>false]);
