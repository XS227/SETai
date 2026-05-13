<?php
/**
 * Shared research utilities.
 * Callers must require _db.php first (for score_lead()).
 */

function r_dl_set(float $s): void  { $GLOBALS['_r_dl'] = microtime(true) + $s; }
function r_dl_left(): int          { return max(1, (int)ceil(($GLOBALS['_r_dl'] ?? microtime(true) + 5) - microtime(true))); }
function r_dl_expired(): bool      { return microtime(true) >= ($GLOBALS['_r_dl'] ?? INF) - 0.2; }

function r_fetch(string $url, bool $ssl = false): array {
    $t = r_dl_left(); if ($t <= 0) return ['html'=>'','code'=>0,'serr'=>99,'url'=>$url];
    $t = min(6, $t);
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $t,   CURLOPT_CONNECTTIMEOUT => min(3, $t),
        CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS      => 3,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; SETAEI-Research/1.0)',
        CURLOPT_SSL_VERIFYPEER => $ssl, CURLOPT_HTTPHEADER     => ['Accept: text/html,application/xhtml+xml'],
    ]);
    $html = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $serr = curl_errno($ch);
    $eurl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    curl_close($ch);
    return ['html' => is_string($html) ? $html : '', 'code' => $code, 'serr' => $serr, 'url' => $eurl ?: $url];
}

function r_probe(string $url): string {
    if (r_dl_expired()) return '';
    $t = min(4, r_dl_left());
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url, CURLOPT_RETURNTRANSFER => false, CURLOPT_NOBODY => true,
        CURLOPT_TIMEOUT        => $t,   CURLOPT_CONNECTTIMEOUT => min(3, $t),
        CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS      => 2,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (compatible; SETAEI-Research/1.0)',
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $eurl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
    curl_close($ch);
    return ($code >= 200 && $code < 400) ? ($eurl ?: $url) : '';
}

function r_emails(string $html): array {
    $text = html_entity_decode($html, ENT_QUOTES | ENT_HTML5);
    preg_match_all('/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}/', $text, $m);
    $skip = ['noreply','no-reply','sentry','wix.com','wordpress','schema','example','@2x','@3x','.png','.jpg','.gif','.svg'];
    $out  = [];
    foreach (array_unique($m[0]) as $e) {
        $low = strtolower($e); $ok = true;
        foreach ($skip as $s) { if (str_contains($low, $s)) { $ok = false; break; } }
        if ($ok) $out[] = $e;
    }
    return $out;
}

function r_phone(string $html): string {
    $text = strip_tags($html);
    if (preg_match('/(?:\+47|0047)[\s.\-]?([2-9]\d{7})/', $text, $m)) return '+47' . $m[1];
    if (preg_match('/\b([2-9]\d{7})\b/', $text, $m)) return $m[1];
    return '';
}

function r_social(string $html): array {
    $fb = $ig = '';
    if (preg_match('|(?:https?://)?(?:www\.)?facebook\.com/((?!sharer|share\b|plugins|dialog|tr/|photo|events|pages/create|groups/|hashtag|watch|video|login|signup)[a-zA-Z0-9._/\-]+)|', $html, $m))
        $fb = 'https://www.facebook.com/' . rtrim($m[1], '/');
    if (preg_match('|(?:https?://)?(?:www\.)?instagram\.com/([a-zA-Z0-9._]+)/?|', $html, $m))
        $ig = 'https://www.instagram.com/' . $m[1];
    return ['facebook_url' => $fb, 'instagram_url' => $ig];
}

function r_cms(string $html, string $url): string {
    if (str_contains($url,  'wixsite.com')         || str_contains($html, 'static.wixstatic.com'))      return 'wix';
    if (str_contains($url,  'myshopify.com')        || str_contains($html, 'cdn.shopify.com'))           return 'shopify';
    if (str_contains($html, 'wp-content/')          || str_contains($html, 'wp-includes/'))              return 'wordpress';
    if (str_contains($html, '.squarespace.com')     || str_contains($html, 'squarespace-cdn.com'))       return 'squarespace';
    if (str_contains($html, 'webflow.io')           || str_contains($html, 'assets.website-files.com'))  return 'webflow';
    return strlen($html) > 200 ? 'other' : 'unknown';
}

function r_ssl(string $url): bool {
    $https = preg_replace('#^https?://#', 'https://', $url);
    $r = r_fetch($https, true);
    return $r['code'] >= 200 && $r['code'] < 400 && $r['serr'] === 0;
}

function r_site_flags(string $html): array {
    return [
        'mobile_friendly' => (bool)preg_match('/name=["\']viewport["\']/i', $html),
        'has_booking'     => (bool)preg_match('/calendly|timely|bookingkit|bestill[\s\-]?time|book[\s\-]?en[\s\-]?time|online[\s\-]?booking/i', $html),
    ];
}

function r_site_status(string $html): string {
    if (!$html || strlen($html) < 100) return 'empty';
    if (preg_match('/coming[\s_-]?soon|under[\s_-]?construction|under[\s_-]?arbeid|launching[\s_-]?soon|åpner[\s_-]?snart|vi[\s_-]?åpner snart/i', $html)) return 'under_construction';
    $lower = strtolower($html);
    if (preg_match('/domenet[\s\w]*registrert|parked[\s\w]*domain|this[\s\w]*domain[\s\w]*for[\s\w]*sale|domain[\s\w]*parked/i', $lower)) return 'parked';
    if (strlen($html) < 3500) {
        foreach (['one.com/parkering', 'domenekjøp', 'domain-parking', 'sedo.com', 'namecheap parking', 'loopia.no'] as $p) {
            if (str_contains($lower, $p)) return 'parked';
        }
    }
    return 'active';
}

function r_guess_domains(string $name): array {
    $legal = ['konkursbo','under avvikling','avvikling','holding','invest','asa','ans','enk','nuf','iks','kf','sf','fil','da','ba','sa','as'];
    $n = mb_strtolower(trim($name), 'UTF-8');
    do { $p = $n; foreach ($legal as $s) $n = trim(preg_replace('/\s+' . preg_quote($s, '/') . '\s*$/u', '', $n)); } while ($n !== $p);
    $n = str_replace(['æ','ø','å','é','è','ê','ü','ö','ä','ó','ú','í','ñ'], ['ae','o','aa','e','e','e','u','o','a','o','u','i','n'], $n);
    $words = array_values(array_filter(preg_split('/[\s\-_\/\.]+/', $n), fn($w) => strlen($w) >= 2));
    if (!$words) return [];
    $c = [];
    $all = preg_replace('/[^a-z0-9]/', '', implode('', $words));
    if (strlen($all) >= 3 && strlen($all) <= 28) $c[] = $all . '.no';
    $hyph = trim(implode('-', array_map(fn($w) => preg_replace('/[^a-z0-9]/', '', $w), $words)), '-');
    if (strlen($hyph) >= 3 && $hyph . '.no' !== ($c[0] ?? '')) $c[] = $hyph . '.no';
    if (count($words) >= 2) { $two = preg_replace('/[^a-z0-9]/', '', $words[0] . $words[1]); if (strlen($two) >= 3 && !in_array($two . '.no', $c)) $c[] = $two . '.no'; }
    $first = preg_replace('/[^a-z0-9]/', '', $words[0]);
    if (strlen($first) >= 4 && !in_array($first . '.no', $c)) $c[] = $first . '.no';
    return array_slice($c, 0, 4);
}

function r_mx_emails(string $domain): array {
    $mx = @dns_get_record($domain, DNS_MX);
    if (empty($mx)) return [];
    $prefixes = ['post', 'kontakt', 'hei', 'info', 'booking', 'kundeservice'];
    return array_map(fn($p) => "$p@$domain", $prefixes);
}

function r_crawl(string $base): array {
    $r    = r_fetch($base);
    $html = ($r['code'] >= 200 && $r['code'] < 400) ? $r['html'] : '';
    $all  = $html;
    $eurl = $r['url'] ?: $base;
    foreach (['/kontakt', '/kontakt-oss', '/contact', '/om-oss', '/about'] as $path) {
        if (r_dl_expired()) break;
        $rc = r_fetch(rtrim($base, '/') . $path);
        if ($rc['code'] >= 200 && $rc['code'] < 400 && strlen($rc['html']) > 300) $all .= $rc['html'];
    }
    return ['html' => $html, 'all' => $all, 'url' => $eurl];
}

/**
 * Run full research on a lead and persist to DB.
 * Requires _db.php (score_lead) to be included by the caller.
 */
function do_research(PDO $pdo, array $lead, float $timeout = 8.0): array {
    r_dl_set($timeout);
    $id = (int)$lead['id'];

    $found = [
        'contact_email' => $lead['contact_email'] ?? '',
        'contact_phone' => $lead['contact_phone'] ?? '',
        'facebook_url'  => $lead['facebook_url']  ?? '',
        'instagram_url' => $lead['instagram_url'] ?? '',
        'website_url'   => $lead['website_url']   ?? '',
    ];
    $cms         = $lead['website_cms']    ?? '';
    $ssl         = (int)($lead['website_has_ssl'] ?? 0);
    $flags       = json_decode($lead['website_flags'] ?? '{}', true) ?: [];
    $site_status = 'active';
    $res_status  = 'no_contact';
    $notes       = [];

    if (!empty($lead['website_url'])) {
        $base = $lead['website_url'];
        if (!str_starts_with($base, 'http')) $base = 'https://' . $base;
        $base = rtrim($base, '/');
        $crawl = r_crawl($base); $all = $crawl['all']; $html = $crawl['html'];
        $site_status = $html ? r_site_status($html) : 'empty';
        if (empty($found['contact_email'])) { $em = r_emails($all); if ($em) $found['contact_email'] = $em[0]; }
        if (empty($found['contact_phone'])) { $ph = r_phone($all);  if ($ph) $found['contact_phone'] = $ph; }
        $soc = r_social($all);
        if (empty($found['facebook_url']))  $found['facebook_url']  = $soc['facebook_url'];
        if (empty($found['instagram_url'])) $found['instagram_url'] = $soc['instagram_url'];
        if ($html) { $cms = r_cms($html, $base); $ssl = r_ssl($base) ? 1 : 0; $flags = r_site_flags($html); }
        if (empty($found['contact_email']) && $site_status === 'active') {
            $domain = parse_url($base, PHP_URL_HOST) ?: '';
            if ($domain) {
                $cands = r_mx_emails($domain);
                if ($cands) { $found['contact_email'] = $cands[0]; $notes['email_source'] = 'mx_guess'; $notes['mx_candidates'] = $cands; }
            }
        }
        $res_status = $found['contact_email'] ? 'found_email' : (in_array($site_status, ['parked','under_construction','empty']) ? $site_status : 'found_website');
    } else {
        $candidates = r_guess_domains($lead['company_name'] ?? '');
        $notes['guessed_domains'] = $candidates;
        foreach ($candidates as $domain) {
            if (r_dl_expired()) break;
            $live = r_probe('https://' . $domain) ?: r_probe('http://' . $domain);
            if (!$live) continue;
            $found['website_url'] = $live; $notes['found_domain'] = $domain;
            $crawl = r_crawl($live); $all = $crawl['all']; $html = $crawl['html'];
            $site_status = $html ? r_site_status($html) : 'empty';
            if (empty($found['contact_email'])) { $em = r_emails($all); if ($em) $found['contact_email'] = $em[0]; }
            if (empty($found['contact_phone'])) { $ph = r_phone($all);  if ($ph) $found['contact_phone'] = $ph; }
            $soc = r_social($all);
            if (empty($found['facebook_url']))  $found['facebook_url']  = $soc['facebook_url'];
            if (empty($found['instagram_url'])) $found['instagram_url'] = $soc['instagram_url'];
            if ($html) { $cms = r_cms($html, $live); $ssl = r_ssl($live) ? 1 : 0; $flags = r_site_flags($html); }
            if (empty($found['contact_email']) && $site_status === 'active') {
                $cands = r_mx_emails($domain);
                if ($cands) { $found['contact_email'] = $cands[0]; $notes['email_source'] = 'mx_guess'; $notes['mx_candidates'] = $cands; }
            }
            $res_status = $found['contact_email'] ? 'found_email' : (in_array($site_status, ['parked','under_construction','empty']) ? $site_status : 'found_website');
            break;
        }
    }

    $search_hints = [];
    if (empty($found['contact_email'])) {
        $co = trim($lead['company_name'] ?? ''); $city = trim($lead['city'] ?? '');
        $search_hints = [trim("$co $city epost"), trim("$co $city kontakt")];
        $notes['search_hints'] = $search_hints;
    }
    $notes['site_status'] = $site_status;

    $new_url = $found['website_url'] ?: ($lead['website_url'] ?? '');
    $new_has = !empty($new_url) ? 1 : (int)($lead['has_website'] ?? 0);

    $pdo->prepare('UPDATE leads SET
        contact_email=?,contact_phone=?,facebook_url=?,instagram_url=?,
        website_url=?,has_website=?,website_cms=?,website_has_ssl=?,website_flags=?,
        research_status=?,research_notes=?,researched_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
        WHERE id=?')->execute([
        $found['contact_email'], $found['contact_phone'], $found['facebook_url'], $found['instagram_url'],
        $new_url, $new_has, $cms, $ssl, json_encode($flags),
        $res_status, json_encode($notes), $id,
    ]);

    $updated = array_merge($lead, $found, ['website_url'=>$new_url,'has_website'=>$new_has,'website_cms'=>$cms,'website_has_ssl'=>$ssl,'website_flags'=>json_encode($flags)]);
    $score   = score_lead($updated);
    $pdo->prepare('UPDATE leads SET lead_score=? WHERE id=?')->execute([$score, $id]);
    $pdo->prepare("UPDATE leads SET lead_status='researched',updated_at=CURRENT_TIMESTAMP WHERE id=? AND lead_status='new'")->execute([$id]);
    $pdo->prepare('INSERT INTO lead_research(lead_id,source,data_json,summary,created_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)')
        ->execute([$id, 'web_research',
            json_encode(array_merge($found, ['status'=>$res_status,'site_status'=>$site_status,'notes'=>$notes])),
            "status=$res_status site=$site_status email=" . ($found['contact_email'] ?: 'none') . " score=$score"]);

    return [
        'found'        => $found,
        'website'      => ['cms'=>$cms,'has_ssl'=>(bool)$ssl,'flags'=>$flags,'url'=>$new_url,'status'=>$site_status],
        'score'        => $score,
        'status'       => $res_status,
        'site_status'  => $site_status,
        'search_hints' => $search_hints,
    ];
}
