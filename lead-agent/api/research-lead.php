<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
require_admin_token();

$pdo   = db();
$input = json_input();
$id    = (int)($input['lead_id'] ?? 0);

$stmt = $pdo->prepare('SELECT * FROM leads WHERE id = ?');
$stmt->execute([$id]);
$lead = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$lead) { echo json_encode(['ok' => false, 'error' => 'Lead not found']); exit; }

// Skip if researched within last 24 hours
if (!empty($lead['researched_at']) && (time() - strtotime($lead['researched_at'])) < 86400) {
    echo json_encode(['ok' => true, 'cached' => true, 'message' => 'Already researched within 24h', 'email' => $lead['contact_email'], 'phone' => $lead['contact_phone']]);
    exit;
}

function fetch_page(string $url): string {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 3,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; SETAEI-Research/1.0)',
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_HTTPHEADER     => ['Accept: text/html,application/xhtml+xml'],
    ]);
    $html = curl_exec($ch);
    curl_close($ch);
    return is_string($html) ? $html : '';
}

function extract_emails(string $html): array {
    $text = html_entity_decode($html, ENT_QUOTES | ENT_HTML5);
    preg_match_all('/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}/', $text, $m);
    $skip = ['noreply','no-reply','sentry','wix.com','wordpress','schema','example','@2x','@3x'];
    $out = [];
    foreach (array_unique($m[0]) as $e) {
        $low = strtolower($e);
        $ok = true;
        foreach ($skip as $s) { if (str_contains($low, $s)) { $ok = false; break; } }
        if ($ok) $out[] = $e;
    }
    return $out;
}

function extract_phone(string $html): string {
    $text = strip_tags($html);
    if (preg_match('/(?:\+47|0047)[\s.\-]?([2-9]\d{7})/', $text, $m)) return '+47' . $m[1];
    if (preg_match('/\b([2-9]\d{7})\b/', $text, $m)) return $m[1];
    return '';
}

function extract_social(string $html): array {
    $fb = $ig = '';
    if (preg_match('|(?:https?://)?(?:www\.)?facebook\.com/((?!sharer|share\b|plugins|dialog|tr/|photo|events|pages/create|groups/|hashtag|watch|video|login|signup)[a-zA-Z0-9._/\-]+)|', $html, $m)) {
        $fb = 'https://www.facebook.com/' . rtrim($m[1], '/');
    }
    if (preg_match('|(?:https?://)?(?:www\.)?instagram\.com/([a-zA-Z0-9._]+)/?|', $html, $m)) {
        $ig = 'https://www.instagram.com/' . $m[1];
    }
    return ['facebook_url' => $fb, 'instagram_url' => $ig];
}

$found = [
    'contact_email' => $lead['contact_email'] ?? '',
    'contact_phone' => $lead['contact_phone'] ?? '',
    'facebook_url'  => $lead['facebook_url']  ?? '',
    'instagram_url' => $lead['instagram_url'] ?? '',
];

if (!empty($lead['website_url'])) {
    $base = $lead['website_url'];
    if (!str_starts_with($base, 'http')) $base = 'https://' . $base;
    $base = rtrim($base, '/');

    $html         = fetch_page($base);
    $contact_html = '';
    foreach (['/kontakt', '/contact', '/om-oss', '/about'] as $path) {
        $c = fetch_page($base . $path);
        if (strlen($c) > 300) { $contact_html = $c; break; }
    }
    $all = $html . $contact_html;

    if (empty($found['contact_email'])) {
        $emails = extract_emails($all);
        if ($emails) $found['contact_email'] = $emails[0];
    }
    if (empty($found['contact_phone'])) {
        $phone = extract_phone($all);
        if ($phone) $found['contact_phone'] = $phone;
    }
    $social = extract_social($all);
    if (empty($found['facebook_url']))  $found['facebook_url']  = $social['facebook_url'];
    if (empty($found['instagram_url'])) $found['instagram_url'] = $social['instagram_url'];
}

$pdo->prepare('UPDATE leads SET contact_email=?, contact_phone=?, facebook_url=?, instagram_url=?, researched_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    ->execute([$found['contact_email'], $found['contact_phone'], $found['facebook_url'], $found['instagram_url'], $id]);

$pdo->prepare("UPDATE leads SET lead_status='researched', updated_at=CURRENT_TIMESTAMP WHERE id=? AND lead_status='new'")->execute([$id]);

$summary = sprintf('email=%s phone=%s fb=%s ig=%s',
    $found['contact_email'] ?: 'none',
    $found['contact_phone'] ?: 'none',
    $found['facebook_url']  ?: 'none',
    $found['instagram_url'] ?: 'none'
);
$pdo->prepare('INSERT INTO lead_research (lead_id,source,data_json,summary,created_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)')
    ->execute([$id, 'web_scrape', json_encode($found), $summary]);

echo json_encode(['ok' => true, 'found' => $found, 'summary' => $summary]);
