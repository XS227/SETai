<?php
declare(strict_types=1);
// PHP port of members/report_engine.py + dating/engine.py (numerologist-dating-v1).
// Keep the arithmetic identical to the Python engine; verified against it 2026-10-27.
if (!defined('DATING')) { http_response_code(404); exit; }

const DV = ['A'=>1,'J'=>1,'S'=>1,'Ø'=>1,'B'=>2,'K'=>2,'T'=>2,'Å'=>2,'C'=>3,'L'=>3,'U'=>3,
            'D'=>4,'M'=>4,'V'=>4,'E'=>5,'N'=>5,'W'=>5,'F'=>6,'O'=>6,'X'=>6,'G'=>7,'P'=>7,'Y'=>7,
            'H'=>8,'Q'=>8,'Z'=>8,'I'=>9,'R'=>9,'Æ'=>9];
const DVOWELS = ['A','E','I','O','U','Æ','Ø','Å'];
const DWEIGHTS = ['life'=>30, 'soul'=>25, 'expression'=>20, 'maturity'=>15, 'timing'=>10];
const DFAMILIES = [[1,5,7], [2,4,8], [3,6,9]];
const DCOMPLEMENTS = [[1,2], [2,6], [3,5], [4,6], [7,9], [8,9]];
const DFRICTION = [[1,8], [4,5], [2,5], [3,4], [6,7]];

function n_root(int $v): int { $v = abs($v); while ($v > 9) $v = array_sum(str_split((string)$v)); return $v; }
function n_master(int $v): int { $v = abs($v); while ($v > 9 && !in_array($v, [11,22,33], true)) $v = array_sum(str_split((string)$v)); return $v; }
function n_notation(int $raw): array {
    $kept = n_master($raw); $root = n_root($kept);
    return ['raw'=>$raw, 'kept'=>$kept, 'root'=>$root, 'label'=>$raw > 9 ? "$raw/$root" : (string)$root];
}
function n_words(string $v): array {
    $out = [];
    foreach (preg_split('/\s+/u', mb_strtoupper($v, 'UTF-8'), -1, PREG_SPLIT_NO_EMPTY) as $w)
        $out[] = preg_replace("/[-'’]/u", '', $w);
    return $out;
}
function n_is_vowel(array $chars, int $i): bool {
    $c = $chars[$i];
    if (in_array($c, DVOWELS, true)) return true;
    if ($c !== 'Y') return false;
    $prev = $i ? $chars[$i-1] : ''; $next = $chars[$i+1] ?? '';
    return !(($i === 0 && in_array($next, DVOWELS, true)) || in_array($prev, DVOWELS, true) || in_array($next, DVOWELS, true));
}
function n_name(string $v, string $mode = 'all'): array {
    $sum = 0;
    foreach (n_words($v) as $w) {
        $chars = mb_str_split($w, 1, 'UTF-8'); $t = 0;
        foreach ($chars as $i => $c) {
            if (!isset(DV[$c])) continue;
            $vow = n_is_vowel($chars, $i);
            if (($mode === 'vowels' && !$vow) || ($mode === 'consonants' && $vow)) continue;
            $t += DV[$c];
        }
        if ($t) $sum += n_master($t);
    }
    return n_notation($sum);
}
function n_date(string $iso): ?array {
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $iso, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) return null;
    return [(int)$m[1], (int)$m[2], (int)$m[3]];
}
function n_life(string $iso): array {
    $d = n_date($iso); if (!$d) return n_notation(0);
    [$y, $mo, $day] = $d;
    return n_notation(n_master($day) + n_master($mo) + n_master(array_sum(str_split((string)$y))));
}
function n_personal_year(string $iso, int $year): int {
    $d = n_date($iso); if (!$d) return 0;
    return n_root(n_root($d[2]) + n_root($d[1]) + n_root(array_sum(str_split((string)$year))));
}
function n_personal_month(string $iso, int $year, int $month): int {
    return n_root(n_personal_year($iso, $year) + n_root($month));
}
function n_age(string $iso, ?DateTimeImmutable $when = null): int {
    $d = n_date($iso); if (!$d) return 0;
    $when = $when ?? new DateTimeImmutable('today');
    $y = (int)$when->format('Y'); $m = (int)$when->format('n'); $day = (int)$when->format('j');
    return max(0, $y - $d[0] - (($m < $d[1] || ($m === $d[1] && $day < $d[2])) ? 1 : 0));
}
function n_pinnacles(string $iso): array {
    $d = n_date($iso); if (!$d) return [];
    [$y, $mo, $day] = $d;
    $dd = n_master($day); $mm = n_master($mo); $yy = n_master(array_sum(str_split((string)$y)));
    $first = n_notation($dd + $mm); $second = n_notation($yy + $dd);
    return [$first, $second, n_notation($first['kept'] + $second['kept']), n_notation($yy + $mm)];
}
function n_valid_name(string $v): bool {
    $v = trim(preg_replace('/\s+/u', ' ', $v));
    if ($v === '' || mb_strlen($v) > 120) return false;
    $letters = 0;
    foreach (mb_str_split(mb_strtoupper($v, 'UTF-8'), 1, 'UTF-8') as $c) {
        if (preg_match('/\p{L}/u', $c)) { if (!isset(DV[$c])) return false; $letters++; }
        elseif (!in_array($c, [' ', '-', "'", '’'], true)) return false;
    }
    return $letters > 0;
}

/** Same fields as dating.engine.profile(). */
function n_profile(string $name, string $iso): array {
    $life = n_life($iso); $expr = n_name($name);
    $now = new DateTimeImmutable('today');
    return [
        'birth_date' => $iso, 'age' => n_age($iso), 'life' => $life, 'expression' => $expr,
        'soul' => n_name($name, 'vowels'), 'personality' => n_name($name, 'consonants'),
        'maturity' => n_notation($expr['kept'] + $life['kept']),
        'personal_year' => n_personal_year($iso, (int)$now->format('Y')),
        'personal_month' => n_personal_month($iso, (int)$now->format('Y'), (int)$now->format('n')),
        'year_root' => n_root(array_sum(str_split(substr($iso, 0, 4)))),
    ];
}

function n_pair_in(array $pairs, int $a, int $b): bool {
    foreach ($pairs as $p) if (($p[0] === $a && $p[1] === $b) || ($p[0] === $b && $p[1] === $a)) return true;
    return false;
}
function n_resonance(int $a, int $b): ?int {
    if (!$a || !$b) return null;
    $a = n_root($a); $b = n_root($b);
    if ($a === $b) return 95;
    if (n_pair_in(DFRICTION, $a, $b)) return 45;
    foreach (DFAMILIES as $f) if (in_array($a, $f, true) && in_array($b, $f, true)) return 85;
    return n_pair_in(DCOMPLEMENTS, $a, $b) ? 78 : 60;
}
/** Index 45..95 mapped linearly to 0..100 %: the share of the possible harmony span. */
function n_pct(float $index): int { return (int)max(0, min(100, round(($index - 45) / 50 * 100))); }

function n_compare(array $l, array $r, bool $full = false): array {
    $comps = []; $sum = 0; $w = 0;
    foreach (DWEIGHTS as $key => $weight) {
        $a = $key === 'timing' ? $l['personal_year'] : $l[$key]['kept'];
        $b = $key === 'timing' ? $r['personal_year'] : $r[$key]['kept'];
        $s = n_resonance($a, $b);
        $comps[] = ['key'=>$key, 'a'=>$a, 'b'=>$b, 'score'=>$s, 'weight'=>$weight];
        if ($s !== null) { $sum += $s * $weight; $w += $weight; }
    }
    $mean = $w ? $sum / $w : 45.0;
    $out = ['index'=>(int)round($mean), 'pct'=>n_pct($mean), 'components'=>$comps,
            'relationship'=>n_root($l['life']['kept'] + $r['life']['kept'])];
    if (!$full) return $out;
    $now = new DateTimeImmutable('first day of this month');
    $y0 = (int)$now->format('Y');
    for ($y = $y0; $y < $y0 + 5; $y++) {
        $a = n_personal_year($l['birth_date'], $y); $b = n_personal_year($r['birth_date'], $y);
        $out['years'][] = ['year'=>$y, 'a'=>$a, 'b'=>$b, 'score'=>n_resonance($a, $b)];
    }
    for ($i = 0; $i < 12; $i++) {
        $d = $now->modify("+$i month"); $yy = (int)$d->format('Y'); $mm = (int)$d->format('n');
        $a = n_personal_month($l['birth_date'], $yy, $mm); $b = n_personal_month($r['birth_date'], $yy, $mm);
        $out['months'][] = ['y'=>$yy, 'm'=>$mm, 'a'=>$a, 'b'=>$b, 'score'=>n_resonance($a, $b)];
    }
    return $out;
}

/** Life-path roots ranked by resonance with mine (what a 100 % partner would carry). */
function n_ideal(int $root): array {
    $out = [];
    for ($n = 1; $n <= 9; $n++) $out[] = ['n'=>$n, 'score'=>n_resonance($root, $n)];
    usort($out, fn($a, $b) => $b['score'] <=> $a['score'] ?: $a['n'] <=> $b['n']);
    return $out;
}
/** Pinnacle periods with ages (first ends at 36 − life path root). */
function n_pinnacle_periods(array $p): array {
    $pins = n_pinnacles($p['birth_date']); if (!$pins) return [];
    $end = 36 - $p['life']['root']; $out = []; $start = 0;
    foreach ($pins as $i => $pin) {
        $stop = $i < 3 ? $end + 9 * $i : null;
        $out[] = ['from'=>$start, 'to'=>$stop, 'n'=>$pin['root'], 'label'=>$pin['label'], 'now'=>$p['age'] >= $start && ($stop === null || $p['age'] <= $stop)];
        $start = ($stop ?? 0) + 1;
    }
    return $out;
}
/** Partner ages whose birth-year number resonates with mine, inside a range. */
function n_generation_ages(array $p, int $min, int $max): array {
    $y0 = (int)date('Y'); $out = [];
    for ($age = max(18, $min); $age <= min(90, $max); $age++) {
        $yr = $y0 - $age; // born this year → this age before/after birthday
        $s = n_resonance($p['year_root'], n_root(array_sum(str_split((string)$yr))));
        $out[$s][] = $age;
    }
    krsort($out);
    return $out;
}
