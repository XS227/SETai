<?php
declare(strict_types=1);
if (!defined('DATING')) { http_response_code(404); exit; }

const DATING_DATA = '/var/lib/setai-dating';

function dating_db(): PDO {
    static $db = null;
    if ($db) return $db;
    $db = new PDO('sqlite:' . DATING_DATA . '/dating.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $db->exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;');
    $db->exec('CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY, token_hash TEXT UNIQUE, is_demo INTEGER NOT NULL DEFAULT 0,
        full_name TEXT NOT NULL, birth_date TEXT NOT NULL, alias TEXT NOT NULL, city TEXT NOT NULL DEFAULT "",
        gender TEXT NOT NULL, seeking TEXT NOT NULL, intent TEXT NOT NULL DEFAULT "longterm",
        min_age INTEGER NOT NULL DEFAULT 18, max_age INTEGER NOT NULL DEFAULT 99, bio TEXT NOT NULL DEFAULT "",
        photo TEXT, accept_pct INTEGER NOT NULL DEFAULT 0, visible INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY, from_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT "pending",
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(from_id, to_id));
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY, from_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL,
        is_auto INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS msg_pair ON messages(from_id, to_id);');
    if ((int)$db->query('SELECT COUNT(*) FROM users WHERE is_demo = 1')->fetchColumn() === 0) dating_seed($db);
    // v2: dating / friends / both, request mode, swipe passes.
    $db->exec('CREATE TABLE IF NOT EXISTS passes (from_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, PRIMARY KEY (from_id, to_id))');
    if (!in_array('looking_for', array_column($db->query('PRAGMA table_info(users)')->fetchAll(), 'name'), true)) {
        $db->exec("ALTER TABLE users ADD COLUMN looking_for TEXT NOT NULL DEFAULT 'dating'");
        $db->exec("UPDATE users SET looking_for = CASE id % 7 WHEN 0 THEN 'friends' WHEN 1 THEN 'both' WHEN 2 THEN 'both' ELSE 'dating' END WHERE is_demo = 1");
    }
    if (!in_array('mode', array_column($db->query('PRAGMA table_info(requests)')->fetchAll(), 'name'), true))
        $db->exec("ALTER TABLE requests ADD COLUMN mode TEXT NOT NULL DEFAULT 'dating'");
    return $db;
}

function dating_user(int $id): ?array {
    $st = dating_db()->prepare('SELECT * FROM users WHERE id = ?'); $st->execute([$id]);
    return $st->fetch() ?: null;
}

function dating_pools(): array {
    $women = ['Ingrid','Sofie','Nora','Emma','Maja','Ida','Thea','Sara','Hanna','Leah','Amalie','Selma','Tiril','Mari',
              'Kristin','Hilde','Camilla','Silje','Marte','Astrid','Leila','Yasmin','Aurora'];
    $men = ['Jonas','Magnus','Henrik','Aksel','Emil','Sander','Mathias','Tobias','Kristian','Ole','Lars','Eirik','Håkon',
            'Sindre','Martin','Arash','Daniel','Fredrik','Omar','Even','Jørgen','Vegard','Kian'];
    $nb = ['Kim','Robin','Alex','Sam'];
    $last = ['Hansen','Johansen','Olsen','Larsen','Andersen','Pedersen','Nilsen','Kristiansen','Jensen','Karlsen','Berg',
             'Haugen','Hagen','Bakke','Dahl','Lie','Moen','Solberg','Strand','Lund','Rahimi','Karimi','Nordby','Holm','Vik',
             'Sæther','Aas','Ødegård'];
    $cities = ['Oslo','Oslo','Oslo','Bergen','Trondheim','Stavanger','Lillestrøm','Drammen','Fredrikstad','Tromsø',
               'Kristiansand','Bodø','Ålesund','Hamar','Sandnes','Asker','Bærum'];
    $likes = ['fjellturer','surdeigsbaking','jazzklubber','padling','gamle filmer','yoga','klatring','brettspill','persisk poesi',
              'langrenn','vinylplater','hagearbeid','fotografi','salsa','sjakk','hytteliv','street food','podkaster','maling',
              'løping','kaffebarer','fridykking','stjernekikking','loppemarked','teater','sykkelturer','kokkekurs','meditasjon'];
    $openers = ['Jeg tror på gode samtaler og lange middager.', 'Halvveis eventyrer, halvveis sofakrok.',
                'Ærlig, nysgjerrig og litt for glad i kaffe.', 'Leter etter noen å dele både hverdag og fjelltopper med.',
                'Tallene sa jeg skulle prøve dette – så her er jeg.', 'Rolig på overflaten, mye som skjer under.',
                'Liker folk som ler høyt og lytter godt.', 'Ny i byen og klar for nye kapitler.'];
    $bios = [
        'Sykepleier på dagtid, amatørkokk på kveldstid. Jeg lager for mye mat og inviterer for mange venner.',
        'Jeg har nettopp flyttet hjem etter fire år i Lisboa, og savner havet mer enn jeg trodde.',
        'Bokklubbsjef, langdistanseløper og ganske dårlig til å svare på meldinger raskt. Men jeg svarer.',
        'Jeg tror de beste samtalene skjer på tur, ikke ved et bord.',
        'Har to katter, én plante som overlever og en stor drøm om en hytte ved sjøen.',
        'Arkitekt. Jeg legger merke til dører, trapper og lys – og folk som legger merke til ting.',
        'Liker søndager uten plan og lørdager med altfor mange.',
        'Jeg synger i kor og danser på kjøkkenet. Ikke nødvendigvis samtidig.',
        'Lærer på ungdomsskolen. Tålmodigheten min er godt trent, humoren også.',
        'Jeg skriver dikt ingen får lese ennå. Kanskje du?',
        'Halvt fra Teheran, halvt fra Tromsø. Te om morgenen, nordlys om kvelden.',
        'Min ideelle kveld: lang middag, god vin og en diskusjon vi ikke blir enige om.',
        'Fotograf som heller ser verden gjennom søkeren enn på skjermen.',
        'Jeg er den som husker bursdagen din og glemmer hvor jeg la nøklene.',
        'Søker noen som vil lære meg å seile. Jeg kan lære deg å bake brød.',
        'Rolig på overflaten, ganske mye som skjer under.',
        'Jeg jobber med klima og håper fortsatt. Det er kanskje min mest romantiske egenskap.',
        'Elsker loppemarked, gamle møbler og historiene som følger med dem.',
        'Tidligere turnér, nå fysioterapeut. Jeg kan fortsatt stå på hendene.',
        'Musikk er mitt morsmål. Jeg spiller piano og lytter mer enn jeg snakker.',
        'Jeg tror på gode spørsmål mer enn raske svar.',
        'Har reist i 40 land, men det beste stedet er fortsatt hytta til bestemor.',
        'Ingeniør med sansen for detaljer – og for folk som ikke bryr seg om dem.',
        'Jeg går på ski til jobben om vinteren og sykler resten av året.',
        'Trebarnsfar til to hunder. Søker noen som tåler hundehår og dårlige ordspill.',
        'Kokk. Hvis du liker mat, kommer vi godt overens. Hvis ikke, lærer jeg deg.',
        'Snekker med en svakhet for jazz og gamle verktøy.',
        'Jeg leser filosofi på bussen og tegneserier i senga.',
        'Driver en liten kaffebar. Jeg husker bestillingen din etter andre gang.',
        'Klatrer, både på vegger og på karrierestigen. Mest på vegger.',
        'Har nylig begynt å male. Det er stygt, men jeg elsker det.',
        'Søker en å gå fjelltur med som ikke klager på været.',
        'Advokat på jobb, ganske uorganisert hjemme. Det balanserer.',
        'Jeg tror at alle har en historie som er verdt å høre. Fortell meg din.',
        'Fridykker og havnerd. Jeg kan snakke om blekksprut lenger enn du vil.',
        'Ganske stille i store grupper, ganske høylytt med de jeg er glad i.',
        'Pappa til en tenåring som synes jeg er pinlig. Han har sannsynligvis rett.',
        'Elektriker og hobbyastronom. Jeg viser deg gjerne Saturn en klar kveld.',
        'Vokst opp på et småbruk. Jeg kan melke ei ku, men foretrekker havremelk.',
        'Jeg spiller sjakk på nett og taper med stil.',
        'Leter etter noen å dele både hverdag og fjelltopper med.',
        'Programmerer som drømmer om å åpne et bakeri en dag.',
        'Har bodd i tre land og lært meg at hjem er mennesker, ikke steder.',
        'Jeg er glad i lange mail, korte meldinger og ærlige samtaler.',
        'Seniorrådgiver, juniorgartner. Tomatene mine er bedre enn powerpointene.',
        'Elsker teater, salsa og folk som ler høyt.',
        'Liker å planlegge reiser like mye som å dra på dem.',
        'Kunstner og kurator. Jeg ser etter farger overalt – også i mennesker.',
        'Jeg mediterer om morgenen og mister tålmodigheten i kø om ettermiddagen.',
        'Ny i byen og klar for nye kapitler.',
    ];
    return [$women, $men, $nb, $last, $cities, $likes, $openers, $bios];
}

/** 50 clearly marked demo profiles. Deterministic, so the pool is the same after a reset. */
function dating_seed(PDO $db): void {
    mt_srand(227);
    [$women, $men, $nb, $last, $cities, $likes, , $bios] = dating_pools();
    $people = [];
    foreach ($women as $n) $people[] = [$n, 'woman'];
    foreach ($men as $n) $people[] = [$n, 'man'];
    foreach ($nb as $n) $people[] = [$n, 'nonbinary'];
    $now = time(); $today = new DateTimeImmutable('today');
    $ins = $db->prepare('INSERT INTO users (is_demo, full_name, birth_date, alias, city, gender, seeking, intent, min_age, max_age,
        bio, accept_pct, visible, created_at, updated_at) VALUES (1,?,?,?,?,?,?,?,?,?,?,?,1,?,?)');
    $db->beginTransaction();
    foreach ($people as $i => [$first, $gender]) {
        $age = 20 + (($i * 17 + mt_rand(0, 6)) % 44);              // spread 20–63
        $born = $today->modify("-$age years")->modify('-' . mt_rand(1, 360) . ' days');
        $r = mt_rand(1, 100);
        $seeking = $gender === 'nonbinary' ? 'any'
            : ($r <= 72 ? ($gender === 'woman' ? 'man' : 'woman') : ($r <= 86 ? $gender : 'any'));
        $min = max(18, $age - mt_rand(6, 14)); $max = $age + mt_rand(6, 16);
        $l = $likes; shuffle($l);
        $bio = $bios[$i] . " Liker også {$l[0]} og {$l[1]}.";
        $ins->execute([$first . ' ' . $last[mt_rand(0, count($last) - 1)], $born->format('Y-m-d'), $first,
            $cities[mt_rand(0, count($cities) - 1)], $gender, $seeking, mt_rand(0, 3) ? 'longterm' : 'explore',
            $min, $max, $bio, 20 + mt_rand(0, 9) * 5, $now, $now]);
    }
    $db->commit();
    mt_srand();
}

/**
 * Test-mode calibration: searches real name × date combinations until the engine scores
 * ≈100/90/75/40/15 % against $me, then adds them as demo profiles that fit $me's choices.
 * The numbers are still calculated by the engine; only the search is targeted.
 */
function dating_calibrate(PDO $db, array $me, array $mp): int {
    [$women, $men, $nb, $last, $cities, $likes] = dating_pools();
    $genders = $me['seeking'] === 'any' ? ['woman', 'man', 'nonbinary'] : [$me['seeking']];
    $year = (int)date('Y'); $added = 0; $today = new DateTimeImmutable('today');
    $myAge = $mp['age'];
    foreach ([100, 90, 75, 40, 15] as $target) {
        $gender = $genders[array_rand($genders)];
        $firsts = $gender === 'woman' ? $women : ($gender === 'man' ? $men : $nb);
        $best = null; $bestDiff = 999;
        for ($i = 0; $i < 6000 && $bestDiff > 0; $i++) {
            $name = $firsts[array_rand($firsts)] . ' ' . $last[array_rand($last)];
            $age = mt_rand(max(18, (int)$me['min_age']), min(80, (int)$me['max_age']));
            $iso = $today->modify("-$age years")->modify('-' . mt_rand(1, 360) . ' days')->format('Y-m-d');
            $life = n_life($iso); $expr = n_name($name); $soul = n_name($name, 'vowels');
            $sum = 0;
            foreach ([[$mp['life']['kept'], $life['kept'], 30], [$mp['soul']['kept'], $soul['kept'], 25], [$mp['expression']['kept'], $expr['kept'], 20],
                      [$mp['maturity']['kept'], $expr['kept'] + $life['kept'], 15], [$mp['personal_year'], n_personal_year($iso, $year), 10]] as [$a, $b, $w])
                $sum += (n_resonance($a, $b) ?? 45) * $w;
            $diff = abs(n_pct($sum / 100) - $target);
            if ($diff < $bestDiff) { $bestDiff = $diff; $best = [$name, $iso]; }
        }
        [$name, $iso] = $best;
        $age = n_age($iso);
        $l = $likes; shuffle($l);
        $db->prepare('INSERT INTO users (is_demo, full_name, birth_date, alias, city, gender, seeking, intent, min_age, max_age, bio, accept_pct, visible, created_at, updated_at, looking_for)
                      VALUES (1,?,?,?,?,?,?,"longterm",?,?,?,?,1,?,?,"both")')
           ->execute([$name, $iso, explode(' ', $name)[0], $cities[array_rand($cities)], $gender, $me['gender'],
                      max(18, min($age, $myAge) - 10), max($age, $myAge) + 10,
                      "Kalibreringsprofil (mål: $target %). Elsker {$l[0]} og {$l[1]}.", 30, time(), time()]);
        $added++;
    }
    return $added;
}
