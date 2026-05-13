<?php
const LEAD_AGENT_ADMIN_TOKEN = '0227';

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $path = __DIR__ . '/../lead_agent.sqlite';
  $pdo = new PDO('sqlite:' . $path);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->exec(file_get_contents(__DIR__ . '/../sql/001_lead_agent.sql'));
  $pdo->exec(file_get_contents(__DIR__ . '/../sql/002_sent_offers.sql'));

  // Incremental migrations (try/catch — SQLite has no ADD COLUMN IF NOT EXISTS)
  $alters = [
    'ALTER TABLE leads ADD COLUMN researched_at TEXT',
    'ALTER TABLE leads ADD COLUMN website_cms TEXT',
    'ALTER TABLE leads ADD COLUMN website_has_ssl INTEGER DEFAULT 0',
    'ALTER TABLE leads ADD COLUMN website_flags TEXT',
    'ALTER TABLE leads ADD COLUMN research_status TEXT',
    'ALTER TABLE leads ADD COLUMN research_notes TEXT',
    'ALTER TABLE sent_offer_recipients ADD COLUMN smtp_response TEXT',
    'ALTER TABLE sent_offer_recipients ADD COLUMN last_error TEXT',
  ];
  foreach ($alters as $sql) {
    try { $pdo->exec($sql); } catch (PDOException $e) { /* column already exists */ }
  }

  $pdo->exec("CREATE TABLE IF NOT EXISTS landing_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page TEXT NOT NULL,
    event_type TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )");

  return $pdo;
}

function json_input(): array {
  $raw = file_get_contents('php://input');
  return $raw ? (json_decode($raw, true) ?: []) : [];
}

function require_admin_token(): void {
  $token = $_SERVER['HTTP_X_LEAD_AGENT_TOKEN'] ?? '';
  if ($token !== LEAD_AGENT_ADMIN_TOKEN) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => 'Ugyldig eller manglende admin-token']);
    exit;
  }
}

function score_lead(array $lead): int {
  $score    = 0;
  $industry = strtolower($lead['industry_name'] ?? '');
  $city     = strtolower($lead['city'] ?? '');

  // Base signals
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

  // Post-research signals (only applied when research data present)
  $cms = strtolower($lead['website_cms'] ?? '');
  if ($cms === 'wordpress' || $cms === 'wix')        $score += 5;   // older/weak tech
  if ($cms === 'shopify'   || $cms === 'webflow')    $score -= 20;  // modern, less need
  if (!empty($lead['has_website']) && isset($lead['website_has_ssl']) && !(int)$lead['website_has_ssl']) $score += 8;
  $email_low = strtolower($lead['contact_email'] ?? '');
  if ($email_low && (str_contains($email_low,'@gmail.') || str_contains($email_low,'@hotmail.') || str_contains($email_low,'@yahoo.'))) $score += 10;
  $flags = json_decode($lead['website_flags'] ?? '{}', true) ?: [];
  if (!empty($lead['has_website']) && isset($flags['has_booking']) && !$flags['has_booking']) $score += 5;

  return max(0, min(100, $score));
}
