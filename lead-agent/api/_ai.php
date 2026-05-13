<?php
/**
 * Claude API helper for SETAEI Lead Agent.
 *
 * - ai_enabled() / ai_client(): gated by _ai_config.php
 * - ai_generate_offer($lead): cold-email writer, returns null on failure (caller falls back to templates)
 * - ai_research_summary($lead, $found): short Norwegian summary of what research found
 * - ai_industry_match($industry): returns [offer_type, cta_url, industry_pitch] — used by both AI and template paths
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Anthropic\Client;
use Anthropic\Messages\JSONOutputFormat;
use Anthropic\Messages\OutputConfig;

function ai_config(): array {
    static $cfg = null;
    if ($cfg === null) {
        $path = __DIR__ . '/_ai_config.php';
        $cfg = file_exists($path) ? (require $path) : ['api_key' => '', 'enabled' => false];
        if (!is_array($cfg)) $cfg = ['api_key' => '', 'enabled' => false];
    }
    return $cfg;
}

function ai_enabled(): bool {
    $cfg = ai_config();
    return !empty($cfg['enabled'])
        && !empty($cfg['api_key'])
        && str_starts_with($cfg['api_key'], 'sk-');
}

function ai_client(): ?Client {
    static $client = null;
    if (!ai_enabled()) return null;
    if ($client === null) {
        $cfg = ai_config();
        $client = new Client(apiKey: $cfg['api_key']);
    }
    return $client;
}

/**
 * Industry → (offer_type, landing_url, usp_summary). Used by both AI and templates.
 */
function ai_industry_match(string $industry): array {
    $ind = mb_strtolower($industry, 'UTF-8');
    if (preg_match('/bilvask|bilpleie|bilstell|bilrens/u', $ind)) {
        return ['bilvask', 'https://setai.no/tilbud/bilvask', 'online timebestilling, Vipps-betaling og prisliste på nett'];
    }
    if (preg_match('/frisør|frisering|barbering|salong|skjønnhetspleie|hudpleie|negl|vippe/u', $ind)) {
        return ['frisor', 'https://setai.no/tilbud/frisor', 'online booking, SMS-påminnelser til kunder og digitalt gavekort'];
    }
    if (preg_match('/klinikk|lege|tannlege|tannhelse|fysioter|kiroprak|optiker|psykolog|terapeut|rehabili|helsesent/u', $ind)) {
        return ['klinikk', 'https://setai.no/tilbud/klinikk', 'digital timebestilling 24/7, automatiske påminnelser og GDPR-sikker drift'];
    }
    if (preg_match('/restaurant|kafé|kafe|bar\b|pub|pizza|sushi|thai|takeaway|matservering|serveringssted|spiserest/u', $ind)) {
        return ['restaurant', 'https://setai.no/tilbud/restaurant', 'digital meny, bordreservasjon og Google Maps-integrasjon'];
    }
    return ['general', 'https://setai.no/tilbud', 'profesjonell nettside, Vipps-login, booking, SEO og mobiloptimalisering'];
}

function ai_offer_system_prompt(): string {
    return <<<TXT
Du er en erfaren norsk B2B-selger for SETAEI — et selskap som lager moderne nettsider, digital booking og betalingsløsninger for små og mellomstore norske bedrifter.

Din jobb: skriv korte, personlige cold emails på norsk som faktisk får svar.

Stil:
- Vennlig, profesjonell, naturlig norsk. Aldri amerikanisert hype-språk.
- Maks 130 ord i body. Korte avsnitt på 1-2 setninger.
- Ingen emojis, ingen "spennende muligheter", ingen "synergier".

Struktur (i denne rekkefølgen):
1. Hilsen ("Hei {fornavn}," eller "Hei,").
2. Personlig hook basert på en KONKRET observasjon fra dataene:
   - "Jeg la merke til at {selskap} ikke har en aktiv nettside ennå."
   - "{selskap} sitt domene ser ut til å være parkert."
   - "Nettsiden mangler SSL — Google rangerer slike sider lavere."
   - "Dere bruker {CMS}, en plattform som er kjent for å være treg/utdatert."
   - "{selskap} bruker gratis e-post (gmail) — ikke profesjonelt for kundekommunikasjon."
   Hvis ingen konkret observasjon finnes, bruk by/bransje: "Jeg så at dere driver med {bransje} i {by}."
3. Pitch: hva får bedriften (1-2 setninger med konkret nytte for bransjen deres).
4. Konkret CTA: "Se hva vi tilbyr {bransje}-bedrifter: {CTA URL}"
5. Signatur (eksakt):
   "Mvh
   Khabat Setaei
   SETAEI — Nettside & Digital Vekst
   setai.no | khabat@setai.no"
6. Avslutt med en blank linje og: "—\nSvar «avmeld» for å bli fjernet fra listen vår."

Emnefelt: maks 60 tegn, konkret, ingen clickbait. Eksempler: "Rask nettside for {selskap}?", "Digital start for {selskap} i {by}".

sales_argument: én setning som oppsummerer hovedgrunnen til at akkurat denne bedriften trenger SETAEI nå.
TXT;
}

/**
 * Generate a personalized Norwegian outreach email.
 * Returns [subject, body, sales_argument, offer_type, cta_url] or null on failure.
 */
function ai_generate_offer(array $lead, string $tone = 'vennlig'): ?array {
    $client = ai_client();
    if (!$client) return null;

    $cfg = ai_config();
    $notes = json_decode($lead['research_notes'] ?? '{}', true) ?: [];
    $flags = json_decode($lead['website_flags']  ?? '{}', true) ?: [];

    [$offer_type, $cta_url, $industry_pitch] = ai_industry_match($lead['industry_name'] ?? '');

    $email_low = strtolower($lead['contact_email'] ?? '');
    $free_email = $email_low && (
        str_contains($email_low, '@gmail.')   ||
        str_contains($email_low, '@hotmail.') ||
        str_contains($email_low, '@yahoo.')   ||
        str_contains($email_low, '@outlook.')
    );

    $context = [
        'selskap'           => $lead['company_name']  ?? '',
        'by'                => $lead['city']          ?? '',
        'fornavn'           => $lead['owner_name']    ?? '',
        'bransje'           => $lead['industry_name'] ?? '',
        'orgnr'             => $lead['org_number']    ?? '',
        'har_nettside'      => (bool)($lead['has_website'] ?? 0),
        'nettside_url'      => $lead['website_url']   ?? '',
        'nettside_cms'      => $lead['website_cms']   ?? '',
        'nettside_ssl'      => (bool)($lead['website_has_ssl'] ?? 0),
        'nettside_mobil'    => !empty($flags['mobile_friendly']),
        'nettside_booking'  => !empty($flags['has_booking']),
        'site_status'       => $notes['site_status'] ?? 'active',
        'kontakt_epost'     => $lead['contact_email'] ?? '',
        'gratis_epost'      => $free_email,
        'offer_type'        => $offer_type,
        'cta_url'           => $cta_url,
        'industry_pitch'    => $industry_pitch,
        'tone'              => $tone,
    ];

    $schema = [
        'type' => 'object',
        'properties' => [
            'subject'        => ['type' => 'string', 'description' => 'Emnefelt, maks 60 tegn, ingen emojis'],
            'body'           => ['type' => 'string', 'description' => 'Hele e-postteksten med hilsen, hook, pitch, CTA og signatur. Klartekst med linjeskift.'],
            'sales_argument' => ['type' => 'string', 'description' => 'Én setning som oppsummerer hovedgrunnen til at denne bedriften trenger SETAEI'],
        ],
        'required'             => ['subject', 'body', 'sales_argument'],
        'additionalProperties' => false,
    ];

    $userMsg = "Skriv en cold email basert på denne leadinfoen (JSON):\n\n" .
        json_encode($context, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

    try {
        $response = $client->messages->create(
            maxTokens: 1500,
            messages: [['role' => 'user', 'content' => $userMsg]],
            model: $cfg['model'] ?? 'claude-opus-4-7',
            system: ai_offer_system_prompt(),
            outputConfig: OutputConfig::with(format: JSONOutputFormat::with(schema: $schema)),
        );

        $text = $response->content[0]->text ?? '';
        $data = json_decode($text, true);
        if (!is_array($data) || empty($data['subject']) || empty($data['body'])) return null;

        return [
            'subject'        => trim($data['subject']),
            'body'           => trim($data['body']),
            'sales_argument' => trim($data['sales_argument'] ?? ''),
            'offer_type'     => $offer_type,
            'cta_url'        => $cta_url,
        ];
    } catch (\Throwable $e) {
        error_log('SETAEI AI offer failed: ' . $e->getMessage());
        return null;
    }
}

/**
 * Short Norwegian summary of what research found for a lead. Used to enrich research_notes.
 * Returns a short string or '' on failure.
 */
function ai_research_summary(array $lead, array $found_data): string {
    $client = ai_client();
    if (!$client) return '';

    $cfg = ai_config();
    $payload = [
        'selskap'      => $lead['company_name'] ?? '',
        'bransje'      => $lead['industry_name'] ?? '',
        'by'           => $lead['city'] ?? '',
        'funn'         => $found_data,
    ];

    try {
        $response = $client->messages->create(
            maxTokens: 300,
            messages: [['role' => 'user', 'content' =>
                "Oppsummer i 2-3 korte norske setninger hva research fant for denne bedriften. " .
                "Vær konkret og fokuser på hva som er kjøpssignal for en nettside-/booking-leverandør " .
                "(manglende nettside, dårlig SSL, gammel CMS, ingen booking osv). " .
                "Ingen overskrift, bare prosa.\n\n" .
                json_encode($payload, JSON_UNESCAPED_UNICODE)
            ]],
            model: $cfg['model'] ?? 'claude-opus-4-7',
        );
        return trim($response->content[0]->text ?? '');
    } catch (\Throwable $e) {
        error_log('SETAEI AI research summary failed: ' . $e->getMessage());
        return '';
    }
}
