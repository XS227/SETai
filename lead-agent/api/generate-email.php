<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
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

// Industry → landing page + USP
if (preg_match('/bilvask|bilpleie|bilstell|bilrens/', $ind)) {
    $type = 'bilvask'; $cta_url = 'https://setai.no/tilbud/bilvask';
    $label = 'bilvask';
    $usp   = 'online timebestilling, Vipps-betaling og prisliste på nett';
    $pitch = 'La kundene booke bilvask direkte fra nettsiden — uten telefonkø.';
} elseif (preg_match('/frisør|frisering|barbering|salong|skjønnhetspleie|hudpleie|negl|vippe/', $ind)) {
    $type = 'frisor'; $cta_url = 'https://setai.no/tilbud/frisor';
    $label = 'salong';
    $usp   = 'online booking, SMS-påminnelser til kunder og digital gavekort';
    $pitch = 'Fyll timeboken uten å ta telefonen — kundene booker selv, når det passer dem.';
} elseif (preg_match('/klinikk|lege|tannlege|tannhelse|fysioter|kiroprak|optiker|psykolog|terapeut|rehabili|helsesent/', $ind)) {
    $type = 'klinikk'; $cta_url = 'https://setai.no/tilbud/klinikk';
    $label = 'klinikk';
    $usp   = 'digital timebestilling 24/7, automatiske påminnelser og GDPR-sikker drift';
    $pitch = 'Pasienter booker time selv — uten ventetid i telefonen.';
} elseif (preg_match('/restaurant|kafé|kafe|bar|pub|pizza|sushi|thai|takeaway|matservering|serveringssted|spiserest/', $ind)) {
    $type = 'restaurant'; $cta_url = 'https://setai.no/tilbud/restaurant';
    $label = 'restaurant';
    $usp   = 'digital meny, bordreservasjon og Google Maps-integrasjon';
    $pitch = 'Vis menyen og ta imot bordbooking direkte fra nettsiden.';
} else {
    $type = 'general'; $cta_url = 'https://setai.no/tilbud';
    $label = 'bedrift';
    $usp   = 'profesjonell nettside, Vipps-login, booking, SEO og mobiloptimalisering';
    $pitch = 'Kom raskt og profesjonelt på nett — ferdig på 3–5 virkedager, ingen bindingstid.';
}

// Personalized opening hook
if ($no_web) {
    $hook = "Vi la merke til at {$co} ikke har en nettside ennå.";
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

$pdo->prepare('INSERT INTO email_drafts (lead_id,subject,body,offer_type,tone,status,created_at,updated_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)')
    ->execute([$id, $subject, $body, $type, $tone, 'draft']);
$pdo->prepare('UPDATE leads SET lead_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    ->execute(['draft_ready', $id]);

echo json_encode(['ok'=>true, 'subject'=>$subject, 'body'=>$body, 'cta_url'=>$cta_url, 'offer_type'=>$type, 'auto_send'=>false]);
