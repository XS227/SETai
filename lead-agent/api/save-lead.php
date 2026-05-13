<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
$pdo = db();
$input = json_input();
$leads = $input['bulk'] ?? [$input];
$count = 0;
foreach ($leads as $row) {
  $lead = [
    'org_number' => $row['org_number'] ?? $row['organisasjonsnummer'] ?? '',
    'company_name' => $row['company_name'] ?? $row['navn'] ?? '',
    'organization_form' => $row['organization_form'] ?? $row['organisasjonsform'] ?? '',
    'industry_code' => $row['industry_code'] ?? '',
    'industry_name' => $row['industry_name'] ?? $row['naering'] ?? '',
    'city' => $row['city'] ?? $row['forretningsadresse_poststed'] ?? '',
    'municipality' => $row['municipality'] ?? '',
    'county' => $row['county'] ?? '',
    'address' => $row['address'] ?? '',
    'registration_date' => $row['registration_date'] ?? $row['registreringsdatoenhetsregisteret'] ?? date('Y-m-d'),
    'website_url' => $row['website_url'] ?? '',
    'has_website' => !empty($row['website_url']) ? 1 : 0,
    'contact_email' => $row['contact_email'] ?? '',
    'contact_phone' => $row['contact_phone'] ?? ''
  ];
  $lead['lead_score'] = score_lead($lead);
  $stmt = $pdo->prepare('INSERT OR IGNORE INTO leads (org_number,company_name,organization_form,industry_code,industry_name,city,municipality,county,address,registration_date,website_url,has_website,contact_email,contact_phone,lead_score,lead_status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)');
  $stmt->execute([$lead['org_number'],$lead['company_name'],$lead['organization_form'],$lead['industry_code'],$lead['industry_name'],$lead['city'],$lead['municipality'],$lead['county'],$lead['address'],$lead['registration_date'],$lead['website_url'],$lead['has_website'],$lead['contact_email'],$lead['contact_phone'],$lead['lead_score'],'new','Imported from '.($input['source'] ?? 'manual')]);
  $count += $stmt->rowCount();
}
echo json_encode(['ok'=>true,'saved'=>$count]);
