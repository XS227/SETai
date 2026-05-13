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

// 24 h cache
if (!empty($lead['researched_at']) && (time() - strtotime($lead['researched_at'])) < 86400) {
    echo json_encode(['ok' => true, 'cached' => true, 'status' => $lead['research_status'] ?? 'cached',
        'email' => $lead['contact_email'], 'phone' => $lead['contact_phone']]);
    exit;
}

$GLOBALS['deadline'] = microtime(true) + 8.0;

function remaining_secs(): int {
    return max(1, (int)ceil($GLOBALS['deadline'] - microtime(true)));
}

function fetch_page(string $url, bool $verify_ssl = false): array {
    $t = remaining_secs();
    if ($t <= 0) return ['html' => '', 'code' => 0, 'ssl_err' => 99, 'url' => $url];
    $t = min(6, $t);
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $t,
        CURLOPT_CONNECTTIMEOUT => min(3, $t),
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 3,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; SETAEI-Research/1.0)',
        CURLOPT_SSL_VERIFYPEER => $verify_ssl,
        CURLOPT_HTTPHEADER     => ['Accept: text/html,application/xhtml+xml'],
    ]);
    $html = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $serr = curl_errno($ch);
    $eurl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    curl_close($ch);
    return ['html' => is_string($html) ? $html : '', 'code' => $code, 'ssl_err' => $serr, 'url' => $eurl ?: $url];
}

function probe_url(string $url): string {
    if (microtime(true) >= $GLOBALS['deadline'] - 1) return '';
    $t = min(4, remaining_secs());
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => false,
        CURLOPT_NOBODY         => true,
        CURLOPT_TIMEOUT        => $t,
        CURLOPT_CONNECTTIMEOUT => min(3, $t),
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 2,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; SETAEI-Research/1.0)',
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $eurl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    curl_close($ch);
    return ($code >= 200 && $code < 400) ? ($eurl ?: $url) : '';
}

function extract_emails(string $html): array {
    $text = html_entity_decode($html, ENT_QUOTES | ENT_HTML5);
    preg_match_all('/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}/', $text, $m);
    $skip = ['noreply','no-reply','sentry','wix.com','wordpress','schema','example','@2x','@3x','.png','.jpg','.gif','.svg'];
    $out = [];
    foreach (array_unique($m[0]) as $e) {
        $low = strtolower($e); $ok = true;
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
    if (preg_match('|(?:https?://)?(?:www\.)?facebook\.com/((?!sharer|share\b|plugins|dialog|tr/|photo|events|pages/create|groups/|hashtag|watch|video|login|signup)[a-zA-Z0-9._/\-]+)|', $html, $m))
        $fb = 'https://www.facebook.com/' . rtrim($m[1], '/');
    if (preg_match('|(?:https?://)?(?:www\.)?instagram\.com/([a-zA-Z0-9._]+)/?|', $html, $m))
        $ig = 'https://www.instagram.com/' . $m[1];
    return ['facebook_url' => $fb, 'instagram_url' => $ig];
}

function detect_cms(string $html, string $url): string {
    if (str_contains($url, 'wixsite.com') || str_contains($html, 'static.wixstatic.com')) return 'wix';
    if (str_contains($url, 'myshopify.com') || str_contains($html, 'cdn.shopify.com')) return 'shopify';
    if (str_contains($html, 'wp-content/') || str_contains($html, 'wp-includes/')) return 'wordpress';
    if (str_contains($html, '.squarespace.com') || str_contains($html, 'squarespace-cdn.com')) return 'squarespace';
    if (str_contains($html, 'webflow.io') || str_contains($html, 'assets.website-files.com')) return 'webflow';
    return strlen($html) > 200 ? 'other' : 'unknown';
}

function check_ssl(string $url): bool {
    $https = preg_replace('#^https?://#', 'https://', $url);
    $r = fetch_page($https, true);
    return $r['code'] >= 200 && $r['code'] < 400 && $r['ssl_err'] === 0;
}

function analyze_site(string $html): array {
    return [
        'mobile_friendly' => (bool)preg_match('/name=["\']viewport["\']/i', $html),
        'has_booking'     => (bool)preg_match('/calendly|timely|bookingkit|bestill[\s\-]?time|book[\s\-]?en[\s\-]?time|online[\s\-]?booking/i', $html),
    ];
}

function guess_domains(string $company_name): array {
    // Strip common Norwegian legal suffixes
    $legal = ['konkursbo','under avvikling','avvikling','holding','invest','asa','ans','enk','nuf','iks','kf','sf','fil','da','ba','sa','as'];
    $name  = mb_strtolower(trim($company_name), 'UTF-8');
    do {
        $prev = $name;
        foreach ($legal as $s) {
            $name = preg_replace('/\s+' . preg_quote($s, '/') . '\s*$/u', '', $name);
            $name = trim($name);
        }
    } while ($name !== $prev);

    // Norwegian → ASCII
    $name = str_replace(['æ','ø','å','é','è','ê','ü','ö','ä','ó','ú','í','ñ'],
                        ['ae','o','aa','e','e','e','u','o','a','o','u','i','n'], $name);

    $words = preg_split('/[\s\-_\/\.]+/', $name);
    $words = array_values(array_filter($words, fn($w) => strlen($w) >= 2));
    if (!$words) return [];

    $candidates = [];

    // All words joined (no separators)
    $all = preg_replace('/[^a-z0-9]/', '', implode('', $words));
    if (strlen($all) >= 3 && strlen($all) <= 28) $candidates[] = $all . '.no';

    // Hyphen-separated
    $hyph = implode('-', array_map(fn($w) => preg_replace('/[^a-z0-9]/', '', $w), $words));
    $hyph = trim($hyph, '-');
    if (strlen($hyph) >= 3 && $hyph . '.no' !== ($candidates[0] ?? '')) $candidates[] = $hyph . '.no';

    // First two words joined
    if (count($words) >= 2) {
        $two = preg_replace('/[^a-z0-9]/', '', $words[0] . $words[1]);
        if (strlen($two) >= 3 && !in_array($two . '.no', $candidates)) $candidates[] = $two . '.no';
    }

    // First word only
    $first = preg_replace('/[^a-z0-9]/', '', $words[0]);
    if (strlen($first) >= 4 && !in_array($first . '.no', $candidates)) $candidates[] = $first . '.no';

    return array_slice($candidates, 0, 4);
}

function crawl_site(string $base): array {
    $r    = fetch_page($base);
    $html = ($r['code'] >= 200 && $r['code'] < 400) ? $r['html'] : '';
    $all  = $html;
    $eurl = $r['url'] ?: $base;

    $contact_paths = ['/kontakt', '/kontakt-oss', '/contact', '/om-oss', '/about'];
    foreach ($contact_paths as $path) {
        if (microtime(true) >= $GLOBALS['deadline'] - 1.5) break;
        $rc = fetch_page(rtrim($base, '/') . $path);
        if ($rc['code'] >= 200 && $rc['code'] < 400 && strlen($rc['html']) > 300) {
            $all .= $rc['html'];
        }
    }
    return ['html' => $html, 'all' => $all, 'url' => $eurl];
}

// -------------------------
// Main enrichment logic
// -------------------------
$found = [
    'contact_email' => $lead['contact_email'] ?? '',
    'contact_phone' => $lead['contact_phone'] ?? '',
    'facebook_url'  => $lead['facebook_url']  ?? '',
    'instagram_url' => $lead['instagram_url'] ?? '',
    'website_url'   => $lead['website_url']   ?? '',
];
$website_cms     = $lead['website_cms']      ?? '';
$website_has_ssl = (int)($lead['website_has_ssl'] ?? 0);
$website_flags   = json_decode($lead['website_flags'] ?? '{}', true) ?: [];
$research_status = 'no_contact';
$research_notes  = [];

if (!empty($lead['website_url'])) {
    // --- Path A: website known ---
    $base  = $lead['website_url'];
    if (!str_starts_with($base, 'http')) $base = 'https://' . $base;
    $base  = rtrim($base, '/');
    $crawl = crawl_site($base);
    $all   = $crawl['all'];

    if (empty($found['contact_email'])) { $em = extract_emails($all); if ($em) $found['contact_email'] = $em[0]; }
    if (empty($found['contact_phone'])) { $ph = extract_phone($all);  if ($ph) $found['contact_phone'] = $ph; }
    $soc = extract_social($all);
    if (empty($found['facebook_url']))  $found['facebook_url']  = $soc['facebook_url'];
    if (empty($found['instagram_url'])) $found['instagram_url'] = $soc['instagram_url'];
    if ($crawl['html']) {
        $website_cms     = detect_cms($crawl['html'], $base);
        $website_has_ssl = check_ssl($base) ? 1 : 0;
        $website_flags   = analyze_site($crawl['html']);
    }
    $research_status = $found['contact_email'] ? 'found_email' : 'found_website';

} else {
    // --- Path B: no website — guess domain ---
    $candidates = guess_domains($lead['company_name'] ?? '');
    $research_notes['guessed_domains'] = $candidates;

    foreach ($candidates as $domain) {
        if (microtime(true) >= $GLOBALS['deadline'] - 2) break;

        $live = probe_url('https://' . $domain) ?: probe_url('http://' . $domain);
        if (!$live) continue;

        $found['website_url'] = $live;
        $research_notes['found_domain'] = $domain;
        $crawl = crawl_site($live);
        $all   = $crawl['all'];

        if (empty($found['contact_email'])) { $em = extract_emails($all); if ($em) $found['contact_email'] = $em[0]; }
        if (empty($found['contact_phone'])) { $ph = extract_phone($all);  if ($ph) $found['contact_phone'] = $ph; }
        $soc = extract_social($all);
        if (empty($found['facebook_url']))  $found['facebook_url']  = $soc['facebook_url'];
        if (empty($found['instagram_url'])) $found['instagram_url'] = $soc['instagram_url'];
        if ($crawl['html']) {
            $website_cms     = detect_cms($crawl['html'], $live);
            $website_has_ssl = check_ssl($live) ? 1 : 0;
            $website_flags   = analyze_site($crawl['html']);
        }
        $research_status = $found['contact_email'] ? 'found_email' : 'found_website';
        break;
    }
}

// --- Search hints when no email found ---
$search_hints = [];
if (empty($found['contact_email'])) {
    $co   = trim($lead['company_name'] ?? '');
    $city = trim($lead['city'] ?? '');
    $search_hints = [trim("$co $city epost"), trim("$co $city kontakt")];
    $research_notes['search_hints'] = $search_hints;
}

// --- Persist ---
$new_website_url = $found['website_url'] ?: ($lead['website_url'] ?? '');
$new_has_website = !empty($new_website_url) ? 1 : (int)($lead['has_website'] ?? 0);

$pdo->prepare('UPDATE leads SET
    contact_email=?, contact_phone=?, facebook_url=?, instagram_url=?,
    website_url=?, has_website=?,
    website_cms=?, website_has_ssl=?, website_flags=?,
    research_status=?, research_notes=?,
    researched_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
    WHERE id=?'
)->execute([
    $found['contact_email'], $found['contact_phone'],
    $found['facebook_url'],  $found['instagram_url'],
    $new_website_url, $new_has_website,
    $website_cms, $website_has_ssl, json_encode($website_flags),
    $research_status, json_encode($research_notes),
    $id,
]);

$updated_lead = array_merge($lead, $found, [
    'website_url' => $new_website_url, 'has_website' => $new_has_website,
    'website_cms' => $website_cms, 'website_has_ssl' => $website_has_ssl,
    'website_flags' => json_encode($website_flags),
]);
$new_score = score_lead($updated_lead);
$pdo->prepare('UPDATE leads SET lead_score=? WHERE id=?')->execute([$new_score, $id]);
$pdo->prepare("UPDATE leads SET lead_status='researched', updated_at=CURRENT_TIMESTAMP WHERE id=? AND lead_status='new'")->execute([$id]);

$summary = sprintf('status=%s email=%s phone=%s website=%s cms=%s score=%d',
    $research_status,
    $found['contact_email'] ?: 'none', $found['contact_phone'] ?: 'none',
    $new_website_url ?: 'none', $website_cms ?: 'none', $new_score
);
$pdo->prepare('INSERT INTO lead_research (lead_id,source,data_json,summary,created_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP)')
    ->execute([$id, 'web_scrape',
        json_encode(array_merge($found, ['research_status' => $research_status, 'notes' => $research_notes])),
        $summary]);

echo json_encode([
    'ok'           => true,
    'found'        => $found,
    'website'      => ['cms' => $website_cms, 'has_ssl' => (bool)$website_has_ssl, 'flags' => $website_flags, 'url' => $new_website_url],
    'score'        => $new_score,
    'status'       => $research_status,
    'search_hints' => $search_hints,
    'summary'      => $summary,
]);
