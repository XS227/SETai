<?php
declare(strict_types=1);
// Famous couples as an open test of the engine. Birth names/dates checked against public sources 2026-10-27.
// Groups were fixed BEFORE the scores were looked at:
//   long  = together ≥ 25 years, or until one partner died
//   short = divorced or separated within 10 years
// Royals are excluded (divorce is hardly an option for them). Name suffixes (Jr, II, III, IV) are dropped.
// The test compares long vs short couples and both against random re-pairings (permutation test).
if (!defined('DATING')) { http_response_code(404); exit; }

const COUPLES = [
    // [shown name, birth name, birth date] × 2, together from, until (null = still together), category, group
    [['Jimmy Carter', 'James Earl Carter', '1924-10-01'], ['Rosalynn Carter', 'Eleanor Rosalynn Smith', '1927-08-18'], 1946, 2023, 'politics', 'long'],
    [['George H. W. Bush', 'George Herbert Walker Bush', '1924-06-12'], ['Barbara Bush', 'Barbara Pierce', '1925-06-08'], 1945, 2018, 'politics', 'long'],
    [['Bill Clinton', 'William Jefferson Blythe', '1946-08-19'], ['Hillary Clinton', 'Hillary Diane Rodham', '1947-10-26'], 1975, null, 'politics', 'long'],
    [['Barack Obama', 'Barack Hussein Obama', '1961-08-04'], ['Michelle Obama', 'Michelle LaVaughn Robinson', '1964-01-17'], 1992, null, 'politics', 'long'],
    [['Andre Agassi', 'Andre Kirk Agassi', '1970-04-29'], ['Steffi Graf', 'Stefanie Maria Graf', '1969-06-14'], 2001, null, 'sport', 'long'],
    [['Roger Federer', 'Roger Federer', '1981-08-08'], ['Mirka Federer', 'Miroslava Vavrinec', '1978-04-01'], 2000, null, 'sport', 'long'],
    [['David Beckham', 'David Robert Joseph Beckham', '1975-05-02'], ['Victoria Beckham', 'Victoria Caroline Adams', '1974-04-17'], 1999, null, 'sport', 'long'],
    [['Paul Newman', 'Paul Leonard Newman', '1925-01-26'], ['Joanne Woodward', 'Joanne Gignilliat Trimmier Woodward', '1930-02-27'], 1958, 2008, 'film', 'long'],
    [['Kurt Russell', 'Kurt Vogel Russell', '1951-03-17'], ['Goldie Hawn', 'Goldie Jeanne Hawn', '1945-11-21'], 1983, null, 'film', 'long'],
    [['Tom Hanks', 'Thomas Jeffrey Hanks', '1956-07-09'], ['Rita Wilson', 'Margarita Ibrahimoff', '1956-10-26'], 1988, null, 'film', 'long'],
    [['Kevin Bacon', 'Kevin Norwood Bacon', '1958-07-08'], ['Kyra Sedgwick', 'Kyra Minturn Sedgwick', '1965-08-19'], 1988, null, 'film', 'long'],
    [['Ozzy Osbourne', 'John Michael Osbourne', '1948-12-03'], ['Sharon Osbourne', 'Sharon Rachel Levy', '1952-10-09'], 1982, 2025, 'music', 'long'],
    [['Bruce Springsteen', 'Bruce Frederick Joseph Springsteen', '1949-09-23'], ['Patti Scialfa', 'Vivienne Patricia Scialfa', '1953-07-29'], 1991, null, 'music', 'long'],
    [['David Bowie', 'David Robert Jones', '1947-01-08'], ['Iman', 'Zara Mohamed Abdulmajid', '1955-07-25'], 1992, 2016, 'music', 'long'],
    [['Elton John', 'Reginald Kenneth Dwight', '1947-03-25'], ['David Furnish', 'David James Furnish', '1962-10-25'], 1993, null, 'music', 'long'],
    [['Tom Cruise', 'Thomas Cruise Mapother', '1962-07-03'], ['Katie Holmes', 'Katherine Noelle Holmes', '1978-12-18'], 2006, 2012, 'film', 'short'],
    [['Johnny Depp', 'John Christopher Depp', '1963-06-09'], ['Amber Heard', 'Amber Laura Heard', '1986-04-22'], 2015, 2016, 'film', 'short'],
    [['Demi Moore', 'Demi Gene Guynes', '1962-11-11'], ['Ashton Kutcher', 'Christopher Ashton Kutcher', '1978-02-07'], 2005, 2011, 'film', 'short'],
    [['Nicolas Cage', 'Nicolas Kim Coppola', '1964-01-07'], ['Lisa Marie Presley', 'Lisa Marie Presley', '1968-02-01'], 2002, 2002, 'film', 'short'],
    [['Madonna', 'Madonna Louise Ciccone', '1958-08-16'], ['Sean Penn', 'Sean Justin Penn', '1960-08-17'], 1985, 1989, 'music', 'short'],
    [['Katy Perry', 'Katheryn Elizabeth Hudson', '1984-10-25'], ['Russell Brand', 'Russell Edward Brand', '1975-06-04'], 2010, 2012, 'music', 'short'],
    [['Tiger Woods', 'Eldrick Tont Woods', '1975-12-30'], ['Elin Nordegren', 'Elin Maria Pernilla Nordegren', '1980-01-01'], 2004, 2010, 'sport', 'short'],
];
const COUPLE_CATS = ['politics', 'sport', 'film', 'music'];

/** Profile read at the year the couple got together (year rhythm in their own time). */
function couple_profile(array $p, int $from): array {
    $x = n_profile($p[1], $p[2]); $x['personal_year'] = n_personal_year($p[2], $from); return $x;
}
function couples_rows(): array {
    $y0 = (int)date('Y'); $rows = [];
    foreach (COUPLES as [$a, $b, $from, $to, $cat, $group]) {
        $pa = couple_profile($a, $from); $pb = couple_profile($b, $from);
        $rows[] = ['a'=>$a, 'b'=>$b, 'from'=>$from, 'to'=>$to, 'cat'=>$cat, 'group'=>$group, 'years'=>($to ?? $y0) - $from,
                   'pa'=>$pa, 'pb'=>$pb, 'c'=>n_compare($pa, $pb)];
    }
    usort($rows, fn($x, $y) => $y['c']['pct'] <=> $x['c']['pct'] ?: $y['years'] <=> $x['years']);
    return $rows;
}

/**
 * Two permutation tests, cached until the couple list changes:
 *  1. random pairs: everyone re-paired with someone else's partner (baseline for "any two people")
 *  2. group labels: long/short labels shuffled across couples (is long − short bigger than chance?)
 */
function couples_test(): array {
    $key = md5(serialize(COUPLES) . 'v1');
    $file = DATING_DATA . '/couples-test.json';
    $cached = is_file($file) ? json_decode((string)file_get_contents($file), true) : null;
    if (($cached['key'] ?? '') === $key) return $cached;
    $rows = couples_rows();
    $mean = fn(array $v) => array_sum($v) / max(1, count($v));
    $long = array_values(array_map(fn($r) => $r['c']['pct'], array_filter($rows, fn($r) => $r['group'] === 'long')));
    $short = array_values(array_map(fn($r) => $r['c']['pct'], array_filter($rows, fn($r) => $r['group'] === 'short')));
    $all = array_merge($long, $short);
    mt_srand(227);
    // 1. Random re-pairing of the same people.
    $lefts = array_map(fn($r) => $r['pa'], $rows); $rights = array_map(fn($r) => $r['pb'], $rows);
    $n = count($rows); $randMeans = []; $randAll = [];
    for ($i = 0; $i < 2000; $i++) {
        $perm = range(0, $n - 1); shuffle($perm);
        $s = 0;
        foreach ($perm as $k => $j) {
            if ($j === $k) $j = ($j + 1) % $n;               // never the real partner
            $p = n_compare($lefts[$k], $rights[$j])['pct']; $s += $p;
            if ($i < 200) $randAll[] = $p;
        }
        $randMeans[] = $s / $n;
    }
    sort($randMeans);
    // 2. Label shuffle: how often does chance give a long−short gap at least as large?
    $obsDiff = $mean($long) - $mean($short); $hits = 0; $runs = 10000; $nl = count($long);
    for ($i = 0; $i < $runs; $i++) {
        $x = $all; shuffle($x);
        if ($mean(array_slice($x, 0, $nl)) - $mean(array_slice($x, $nl)) >= $obsDiff) $hits++;
    }
    mt_srand();
    $longAboveRandom = count(array_filter($randMeans, fn($m) => $m >= $mean($long))) / count($randMeans);
    $out = ['key'=>$key, 'n_long'=>count($long), 'n_short'=>count($short),
            'long'=>round($mean($long), 1), 'short'=>round($mean($short), 1), 'random'=>round($mean($randMeans), 1),
            'random_lo'=>round($randMeans[(int)(0.025 * count($randMeans))], 1), 'random_hi'=>round($randMeans[(int)(0.975 * count($randMeans)) - 1], 1),
            'p_groups'=>round(($hits + 1) / ($runs + 1), 3), 'p_long_vs_random'=>round($longAboveRandom, 3)];
    @file_put_contents($file, json_encode($out));
    return $out;
}

function couples_test_html(): string {
    $t = couples_test(); $rows = couples_rows();
    $num = fn($v) => $GLOBALS['LANG'] === 'no' ? str_replace('.', ',', (string)$v) : (string)$v;
    $sig = $t['p_groups'] < 0.05 && $t['long'] > $t['short'];
    $o = '<div class="cp-test"><h3>' . h(t('cp_test_title')) . '</h3><p class="small muted">' . h(t('cp_test_intro')) . '</p>'
       . '<div class="cp-stats">'
       . '<div class="cp-stat"><i style="background:var(--s1)"></i><b>' . $num($t['long']) . ' %</b><span>' . h(t('cp_g_long', ['n'=>$t['n_long']])) . '</span></div>'
       . '<div class="cp-stat"><i style="background:var(--s2)"></i><b>' . $num($t['short']) . ' %</b><span>' . h(t('cp_g_short', ['n'=>$t['n_short']])) . '</span></div>'
       . '<div class="cp-stat"><i class="band"></i><b>' . $num($t['random']) . ' %</b><span>' . h(t('cp_g_random', ['a'=>$num($t['random_lo']), 'b'=>$num($t['random_hi'])])) . '</span></div></div>'
       // Dot strip: every couple on one 0–100 axis, random-pair 95 % band behind.
       . '<div class="strip" dir="ltr" role="img" aria-label="' . h(t('cp_test_title')) . '"><span class="strip-band" style="left:' . $t['random_lo'] . '%;width:' . ($t['random_hi'] - $t['random_lo']) . '%"></span>';
    foreach ($rows as $r) {
        $o .= '<span class="dot ' . $r['group'] . '" style="left:' . $r['c']['pct'] . '%" data-tip="' . h($r['a'][0] . ' & ' . $r['b'][0] . ': ' . $r['c']['pct'] . ' %') . '"></span>';
    }
    $o .= '<span class="mean long" style="left:' . $t['long'] . '%"></span><span class="mean short" style="left:' . $t['short'] . '%"></span>'
        . '</div><div class="strip-axis" dir="ltr"><span>0 %</span><span>50 %</span><span>100 %</span></div>'
        . '<p class="cp-verdict ' . ($sig ? 'yes' : 'no') . '">' . h(t($sig ? 'cp_verdict_yes' : 'cp_verdict_no', ['p'=>$num($t['p_groups'])]))
        . ($t['p_long_vs_random'] < 0.05 ? ' ' . h(t('cp_hint_random', ['share'=>$num(round((1 - $t['p_long_vs_random']) * 100, 1))])) : '') . '</p>'
        . '<details class="small muted"><summary>' . h(t('cp_method_title')) . '</summary><p>' . h(t('cp_method', ['p2'=>$num($t['p_long_vs_random'])])) . '</p></details></div>';
    return $o;
}

/** $limit > 0: teaser (test + best few); 0: test + all couples with filters. */
function couples_html(int $limit = 0): string {
    $rows = couples_rows();
    $series = ['life'=>'--s1', 'soul'=>'--s2', 'expression'=>'--s3', 'maturity'=>'--s4', 'timing'=>'--s5'];
    $comp = tx('comp');
    $ini = fn(string $n) => mb_strtoupper(implode('', array_map(fn($w) => mb_substr($w, 0, 1), array_slice(preg_split('/[\s-]+/u', $n), 0, 2))));
    $o = '<section class="couples" id="couples"><p class="kicker">' . h(t('cp_kicker')) . '</p><h2 class="cp-title">' . h(t('cp_title')) . '</h2>'
       . '<p class="muted cp-intro">' . h(t('cp_intro')) . '</p>' . couples_test_html();
    if (!$limit) {
        $o .= '<div class="cp-controls"><div class="chips" role="group">'
            . '<button type="button" class="chip on" data-cat="all">' . h(t('all')) . '</button>'
            . '<button type="button" class="chip" data-cat="long">' . h(t('cp_f_long')) . '</button>'
            . '<button type="button" class="chip" data-cat="short">' . h(t('cp_f_short')) . '</button>';
        foreach (COUPLE_CATS as $cat) $o .= '<button type="button" class="chip" data-cat="' . $cat . '">' . h(t('cp_cat_' . $cat)) . '</button>';
        $o .= '</div><div class="modes" role="group"><button type="button" class="mode on" data-sort="match">' . h(t('cp_sort_match')) . '</button>'
            . '<button type="button" class="mode" data-sort="years">' . h(t('cp_sort_years')) . '</button></div></div>';
    }
    $o .= '<ul class="legend">';
    foreach ($series as $k => $v) $o .= '<li><i style="background:var(' . $v . ')"></i>' . h($comp[$k]) . '</li>';
    $o .= '</ul><div class="cp-grid">';
    $show = $limit ? array_merge(array_slice(array_values(array_filter($rows, fn($r) => $r['group'] === 'long')), 0, $limit - 2),
                                 array_slice(array_values(array_filter($rows, fn($r) => $r['group'] === 'short')), 0, 2)) : $rows;
    foreach ($show as $r) {
        $span = $r['group'] === 'short'
            ? ($r['years'] < 1 ? t('cp_short_same', ['y'=>$r['from']]) : t('cp_short', ['a'=>$r['from'], 'b'=>$r['to'], 'n'=>$r['years']]))
            : ($r['to'] ? t('cp_until', ['a'=>$r['from'], 'b'=>$r['to'], 'n'=>$r['years']]) : t('cp_since', ['y'=>$r['from'], 'n'=>$r['years']]));
        $o .= '<article class="cp-card ' . $r['group'] . '" data-cat="' . $r['cat'] . '" data-group="' . $r['group'] . '" data-pct="' . $r['c']['pct'] . '" data-years="' . $r['years'] . '">'
            . '<span class="cp-cat">' . h(t('cp_cat_' . $r['cat'])) . ' · ' . h(t('cp_f_' . $r['group'])) . '</span><div class="cp-duo">'
            . '<span class="cp-med" style="--hue:' . ($r['pa']['life']['root'] * 40) . '"><b>' . h($ini($r['a'][0])) . '</b><small>' . h($r['pa']['life']['label']) . '</small></span>'
            . '<span class="ring cp-ring" style="--p:' . $r['c']['pct'] . '"><b>' . $r['c']['pct'] . '</b>%</span>'
            . '<span class="cp-med" style="--hue:' . ($r['pb']['life']['root'] * 40) . '"><b>' . h($ini($r['b'][0])) . '</b><small>' . h($r['pb']['life']['label']) . '</small></span></div>'
            . '<h3>' . h($r['a'][0]) . ' <span class="muted">&amp;</span> ' . h($r['b'][0]) . '</h3>'
            . '<p class="small muted">' . h($span) . '</p><div class="stack" title="' . h(t_label($r['c']['pct'])) . '">';
        foreach ($r['c']['components'] as $k) if ($k['score'] !== null && $k['score'] > 45)
            $o .= '<i style="width:' . round($k['weight'] * ($k['score'] - 45) / 50, 2) . '%;background:var(' . $series[$k['key']] . ')" data-tip="' . h($comp[$k['key']] . ': ' . $k['a'] . ' · ' . $k['b'] . ' – ' . tx('res')[$k['score']]) . '"></i>';
        $o .= '</div><p class="cp-nums" dir="ltr">';
        foreach ($r['c']['components'] as $k) $o .= '<span title="' . h($comp[$k['key']]) . '">' . $k['a'] . '·' . $k['b'] . '</span>';
        $o .= '</p><p class="small"><b>' . h(t_label($r['c']['pct'])) . '</b> · ' . h(t('shared_n', ['n'=>$r['c']['relationship']])) . ' – ' . h(mb_strtolower(tx('themes')[$r['c']['relationship']])) . '</p>'
            . '<p class="small muted cp-birth" dir="ltr">' . h($r['a'][1] . ' · ' . $r['b'][1]) . '</p></article>';
    }
    return $o . '</div><p class="small muted cp-note">' . h(t('cp_note')) . '</p><div class="tip" id="tip" role="tooltip" hidden></div></section>';
}
