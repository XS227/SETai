<?php
require_once __DIR__ . '/_db.php';
require_once __DIR__ . '/_ai.php';
header('Content-Type: application/json');
require_admin_token();
$pdo  = db();
$input = json_input();
$id   = (int)($input['lead_id'] ?? 0);
$tone = $input['tone'] ?? 'vennlig';
$lead = $pdo->query('SELECT * FROM leads WHERE id=' . $id)->fetch(PDO::FETCH_ASSOC);
if (!$lead) { echo json_encode(['ok'=>false,'error'=>'Lead not found']); exit; }

$co     = $lead['company_name'] ?? '';
$city   = $lead['city'] ?? 'din by';
$owner  = $lead['owner_name'] ?? '';
$ind    = strtolower($lead['industry_name'] ?? '');
$cms    = strtolower($lead['website_cms'] ?? '');
$no_web = empty($lead['has_website']) || !(int)$lead['has_website'];
$bad_ssl = !$no_web && isset($lead['website_has_ssl']) && !(int)$lead['website_has_ssl'];
$old_cms = in_array($cms, ['wordpress', 'wix']);

$r_notes    = json_decode($lead['research_notes'] ?? '{}', true) ?: [];
$site_status = $r_notes['site_status'] ?? 'active';
$parked      = ($site_status === 'parked');
$under_const = ($site_status === 'under_construction');

[$type, $cta_url, $usp] = ai_industry_match($lead['industry_name'] ?? '');
$labels = [
    'bilvask'    => 'bilvask',
    'frisor'     => 'salong',
    'klinikk'    => 'klinikk',
    'restaurant' => 'restaurant',
    'general'    => 'bedrift',
];
$label = $labels[$type] ?? 'bedrift';
$pitches = [
    'bilvask'    => 'La kundene booke bilvask direkte fra nettsiden — uten telefonkø.',
    'frisor'     => 'Fyll timeboken uten å ta telefonen — kundene booker selv, når det passer dem.',
    'klinikk'    => 'Pasienter booker time selv — uten ventetid i telefonen.',
    'restaurant' => 'Vis menyen og ta imot bordbooking direkte fra nettsiden.',
    'general'    => 'Kom raskt og profesjonelt på nett — ferdig på 3–5 virkedager, ingen bindingstid.',
];
$pitch = $pitches[$type] ?? $pitches['general'];

// 1) Try Claude first
$ai_used = false;
$subject = $body = $sales_argument = '';

if (ai_enabled()) {
    $ai = ai_generate_offer($lead, $tone);
    if ($ai && !empty($ai['subject']) && !empty($ai['body'])) {
        $subject        = $ai['subject'];
        $body           = $ai['body'];
        $sales_argument = $ai['sales_argument'] ?? '';
        $cta_url        = $ai['cta_url']        ?: $cta_url;
        $type           = $ai['offer_type']     ?: $type;
        $ai_used        = true;
    }
}

// 2) Fallback: template-based generator (kept intact so the tool still works without API key)
if (!$ai_used) {
    if ($no_web) {
        $hook = "Vi la merke til at {$co} ikke har en nettside ennå.";
    } elseif ($parked) {
        $hook = "Vi la merke til at {$co} sitt domene ser ut til å være parkert — ingen aktiv nettside ennå.";
    } elseif ($under_const) {
        $hook = "Vi la merke til at {$co} sin nettside er under utbygging — vi kan hjelpe dere å komme raskt i mål.";
    } elseif ($old_cms && $bad_ssl) {
        $hook = "Vi la merke til at {$co} bruker " . ucfirst($cms) . " uten SSL — Google straffer slike sider med lavere rangering.";
    } elseif ($old_cms) {
        $hook = "Vi la merke til at {$co} bruker " . ucfirst($cms) . " — vi kan hjelpe med en raskere og enklere løsning.";
    } elseif ($bad_ssl) {
        $hook = "Vi la merke til at {$co} sin nettside mangler SSL, noe som skader synligheten i Google.";
    } else {
        $hook = "Vi fulgte med på nyregistreringer i {$city} og la merke til {$co}.";
    }

    $greeting = $owner ? "Hei {$owner}," : "Hei,";
    $subjects = [
        "Rask nettside for {$co}?",
        "Digital start for {$co} i {$city}",
        $pitch,
    ];
    $subject = $subjects[array_rand($subjects)];

    $body = "{$greeting}\n\n" .
        "{$hook}\n\n" .
        "{$pitch}\n\n" .
        "Med SETAEI får dere {$usp} — satt opp på 3–5 virkedager, ingen bindingstid.\n\n" .
        "Se hva vi tilbyr {$label}-bedrifter:\n{$cta_url}\n\n" .
        "Mvh\nKhabat Setaei\nSETAEI — Nettside & Digital Vekst\n" .
        "setai.no | khabat@setai.no\n\n" .
        "—\nSvar «avmeld» for å bli fjernet fra listen vår.";

    $sales_argument = $hook . ' ' . $pitch;
}

$pdo->prepare('INSERT INTO email_drafts (lead_id,subject,body,offer_type,cta_link,tone,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)')
    ->execute([$id, $subject, $body, $type, $cta_url, $tone, 'draft']);
$draft_id = (int)$pdo->lastInsertId();
$pdo->prepare('UPDATE leads SET lead_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    ->execute(['draft_ready', $id]);

echo json_encode([
    'ok'             => true,
    'subject'        => $subject,
    'body'           => $body,
    'cta_url'        => $cta_url,
    'offer_type'     => $type,
    'auto_send'      => false,
    'sales_argument' => $sales_argument,
    'draft_id'       => $draft_id,
    'ai_used'        => $ai_used,
]);
