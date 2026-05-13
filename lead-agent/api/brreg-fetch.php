<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
require_admin_token();

$input = json_input();
$from = $input['from_date'] ?? date('Y-m-d', strtotime('-30 days'));
$to = $input['to_date'] ?? date('Y-m-d');

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Ugyldig datoformat. Bruk YYYY-MM-DD.']);
  exit;
}

function build_address(array $addr): string {
  $parts = [];
  if (!empty($addr['adresse']) && is_array($addr['adresse'])) $parts[] = implode(', ', $addr['adresse']);
  $post = trim(($addr['postnummer'] ?? '') . ' ' . ($addr['poststed'] ?? ''));
  if ($post !== '') $parts[] = $post;
  return trim(implode(', ', $parts));
}

function is_active_and_relevant(array $it): bool {
  if (!empty($it['slettedato'])) return false;
  if (!empty($it['konkurs']) || !empty($it['underAvvikling']) || !empty($it['underTvangsavviklingEllerTvangsopplosning'])) return false;

  $form = strtoupper($it['organisasjonsform']['kode'] ?? '');
  $industry = strtolower($it['naeringskode1']['beskrivelse'] ?? '');
  if (!in_array($form, ['AS', 'ENK'], true)) {
    if (in_array($form, ['FLI', 'SA', 'BA'], true)) return false;
  }

  foreach (['holding', 'investment', 'investering', 'forening', 'association'] as $low) {
    if (str_contains($industry, $low)) return false;
  }
  return true;
}

function normalize_lead(array $it): array {
  $addr = $it['forretningsadresse'] ?? [];
  $website = $it['hjemmeside'] ?? '';
  return [
    'org_number' => $it['organisasjonsnummer'] ?? '',
    'company_name' => $it['navn'] ?? '',
    'organization_form' => $it['organisasjonsform']['kode'] ?? '',
    'organization_form_description' => $it['organisasjonsform']['beskrivelse'] ?? '',
    'industry_code' => $it['naeringskode1']['kode'] ?? '',
    'industry_name' => $it['naeringskode1']['beskrivelse'] ?? '',
    'city' => $addr['kommune'] ?? ($addr['poststed'] ?? ''),
    'county' => $addr['fylke'] ?? '',
    'address' => build_address($addr),
    'registration_date' => $it['registreringsdatoEnhetsregisteret'] ?? '',
    'website_url' => is_string($website) ? trim($website) : '',
    'has_website' => !empty($website)
  ];
}

function in_range(string $date, string $from, string $to): bool {
  if ($date === '') return false;
  return $date >= $from && $date <= $to;
}

function fetch_brreg_page(int $page, int $size, string $from, string $to, bool $withFilters = true): ?array {
  $params = ['page' => $page, 'size' => $size];
  if ($withFilters) {
    $params['fraRegistreringsdatoEnhetsregisteret'] = $from;
    $params['tilRegistreringsdatoEnhetsregisteret'] = $to;
  }
  $url = 'https://data.brreg.no/enhetsregisteret/api/enheter?' . http_build_query($params);
  $ctx = stream_context_create(['http' => ['timeout' => 20]]);
  $raw = @file_get_contents($url, false, $ctx);
  if (!$raw) return null;
  return json_decode($raw, true);
}

$pdo = db();
$inserted = 0;
$existing = 0;
$newLeads = [];
$size = 100;
$maxPages = 10;
$filteredMode = true;

$first = fetch_brreg_page(0, $size, $from, $to, true);
if (!$first) {
  http_response_code(502);
  echo json_encode(['ok' => false, 'error' => 'Brreg utilgjengelig akkurat nå.']);
  exit;
}

$firstItems = $first['_embedded']['enheter'] ?? [];
$needsFallback = false;
foreach ($firstItems as $item) {
  $d = $item['registreringsdatoEnhetsregisteret'] ?? '';
  if ($d !== '' && !$needsFallback && !in_range($d, $from, $to)) $needsFallback = true;
}
if ($needsFallback) $filteredMode = false;

for ($page = 0; $page < $maxPages; $page++) {
  $json = fetch_brreg_page($page, $size, $from, $to, $filteredMode);
  if (!$json) break;
  $items = $json['_embedded']['enheter'] ?? [];
  if (!$items) break;

  foreach ($items as $it) {
    $row = normalize_lead($it);
    if (!in_range($row['registration_date'], $from, $to)) continue;
    if (!is_active_and_relevant($it)) continue;
    if (empty($row['org_number']) || empty($row['company_name'])) continue;

    $row['lead_score'] = score_lead($row);
    $stmt = $pdo->prepare('INSERT OR IGNORE INTO leads (org_number,company_name,organization_form,industry_name,city,registration_date,website_url,has_website,lead_score,lead_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,"new",CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)');
    $stmt->execute([
      $row['org_number'],
      $row['company_name'],
      $row['organization_form'],
      $row['industry_name'],
      $row['city'],
      $row['registration_date'],
      $row['website_url'],
      $row['has_website'] ? 1 : 0,
      $row['lead_score']
    ]);

    if ($stmt->rowCount() > 0) {
      $inserted++;
      $row['id'] = (int)$pdo->lastInsertId();
      $newLeads[] = $row;
    } else {
      $existing++;
    }
  }

  if (count($items) < $size) break;
}

echo json_encode([
  'ok' => true,
  'from' => $from,
  'to' => $to,
  'imported' => $inserted,
  'existing' => $existing,
  'used_fallback_filtering' => !$filteredMode,
  'new_leads' => $newLeads
]);
