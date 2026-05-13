<?php
function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $path = __DIR__ . '/../lead_agent.sqlite';
  $pdo = new PDO('sqlite:' . $path);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $sql = file_get_contents(__DIR__ . '/../sql/001_lead_agent.sql');
  $pdo->exec($sql);
  return $pdo;
}
function json_input(): array {
  $raw = file_get_contents('php://input');
  return $raw ? (json_decode($raw, true) ?: []) : [];
}
function score_lead(array $lead): int {
  $score = 0;
  $industry = strtolower($lead['industry_name'] ?? '');
  $city = strtolower($lead['city'] ?? '');
  if (empty($lead['has_website']) || !$lead['has_website']) $score += 30;
  if (!empty($lead['registration_date']) && strtotime($lead['registration_date']) >= strtotime('-60 days')) $score += 20;
  $high = ['beauty','clinic','restaurant','cafe','car wash','cleaning','construction','electrician','plumber','consultant','fitness','retail','therapy','real estate'];
  foreach ($high as $k) { if (str_contains($industry, $k)) { $score += 20; break; } }
  if (($lead['organization_form'] ?? '') === 'AS') $score += 15;
  if (($lead['organization_form'] ?? '') === 'ENK') {
    foreach (['cleaning','construction','plumber','electrician','beauty','retail'] as $k) { if (str_contains($industry, $k)) { $score += 10; break; } }
  }
  foreach (['oslo','akershus','viken','bergen','trondheim','stavanger'] as $loc) { if (str_contains($city, $loc)) { $score += 10; break; } }
  if (!empty($lead['has_website']) && !empty($lead['website_url'])) $score -= 30;
  foreach (['holding','investment','passive','association','branch'] as $low) { if (str_contains($industry, $low)) { $score -= 20; break; } }
  return max(0, min(100, $score));
}
