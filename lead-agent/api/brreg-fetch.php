<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
$input = json_input();
$from = $input['from_date'] ?? date('Y-m-d', strtotime('-7 days'));
$to = $input['to_date'] ?? date('Y-m-d');
$url = 'https://data.brreg.no/enhetsregisteret/api/enheter?size=25';
$data = @file_get_contents($url);
if (!$data) {
  echo json_encode(['ok'=>false,'error'=>'Brreg utilgjengelig, bruk CSV/XLSX fallback','fallback'=>true]); exit;
}
$json = json_decode($data, true);
$items = $json['_embedded']['enheter'] ?? [];
$pdo = db();
$saved = 0;
foreach ($items as $it) {
  $row = [
    'org_number' => $it['organisasjonsnummer'] ?? '',
    'company_name' => $it['navn'] ?? '',
    'organization_form' => $it['organisasjonsform']['kode'] ?? '',
    'industry_name' => $it['naeringskode1']['beskrivelse'] ?? '',
    'city' => $it['forretningsadresse']['poststed'] ?? '',
    'registration_date' => $it['registreringsdatoEnhetsregisteret'] ?? date('Y-m-d')
  ];
  if ($row['registration_date'] < $from || $row['registration_date'] > $to) continue;
  $row['lead_score'] = score_lead($row);
  $stmt = $pdo->prepare('INSERT OR IGNORE INTO leads (org_number,company_name,organization_form,industry_name,city,registration_date,lead_score,lead_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,"new",CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)');
  $stmt->execute([$row['org_number'],$row['company_name'],$row['organization_form'],$row['industry_name'],$row['city'],$row['registration_date'],$row['lead_score']]);
  $saved += $stmt->rowCount();
}
echo json_encode(['ok'=>true,'from'=>$from,'to'=>$to,'imported'=>$saved,'note'=>'Use CSV/XLSX fallback if needed']);
