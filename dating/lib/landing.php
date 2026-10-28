<?php
declare(strict_types=1);
// Front page of the dating experiment (shown before the early-preview code): live numbers,
// why join, how it works, the famous-couples test, and the code field.
if (!defined('DATING')) { http_response_code(404); exit; }

function landing_stats(PDO $db): array {
    $q = fn(string $sql) => (int)$db->query($sql)->fetchColumn();
    return [
        'members'     => $q('SELECT COUNT(*) FROM users WHERE is_demo = 0'),
        'new_week'    => $q('SELECT COUNT(*) FROM users WHERE is_demo = 0 AND created_at > ' . (time() - 7 * 86400)),
        'demo'        => $q('SELECT COUNT(*) FROM users WHERE is_demo = 1'),
        'connections' => $q('SELECT COUNT(*) FROM requests WHERE status = "accepted"'),
        'messages'    => $q('SELECT COUNT(*) FROM messages WHERE is_auto = 0'),
        'friends'     => $q('SELECT COUNT(*) FROM users WHERE is_demo = 0 AND looking_for IN ("friends", "both")'),
    ];
}

function landing_html(PDO $db, string $csrf, string $error): string {
    global $LANG, $DIR;
    $s = landing_stats($db);
    $fmt = fn(int $n) => number_format($n, 0, ',', $LANG === 'en' ? ',' : ' ');
    $form = '<form method="post" class="ld-code"><input type="hidden" name="csrfmiddlewaretoken" value="' . h($csrf) . '">'
          . '<label for="code">' . h(t('gate_label')) . '</label><div class="ld-code-row">'
          . '<input id="code" class="code" name="preview_code" inputmode="numeric" pattern="[0-9]{3}" maxlength="3" required autocomplete="off" dir="ltr" placeholder="• • •">'
          . '<button class="button" type="submit">' . h(t('ld_join')) . '</button></div>'
          . ($error !== '' ? '<p class="error" role="alert">' . h($error) . '</p>' : '')
          . '<p class="small muted">' . h(t('ld_code_note')) . '</p></form>';
    $stat = fn(int $n, string $label, string $cls = '') => '<div class="ld-stat ' . $cls . '"><b>' . $fmt($n) . '</b><span>' . h($label) . '</span></div>';
    $early = $s['members'] < 100;
    $o = '<!doctype html><html lang="' . $LANG . '" dir="' . $DIR . '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<meta name="robots" content="noindex,nofollow"><title>' . h(t('ld_title_tag')) . '</title><meta name="description" content="' . h(t('ld_sub')) . '">'
       . '<link rel="stylesheet" href="/dating/assets/dating.css?v=8"><script src="/dating/assets/dating.js?v=8" defer></script></head><body class="landing">'
       . '<header class="nav"><span class="brand"><span class="brandmark">π</span><span>NUMEROLOGIST<small>' . h(t('brand_sub')) . '</small></span></span>' . lang_links() . '</header>'
       . '<main class="wrap">'
       // Hero
       . '<section class="ld-hero"><div class="ld-copy"><p class="kicker">' . h(t('ld_kicker')) . '</p>'
       . '<h1>' . t('create_title') . '</h1><p class="lead ld-sub">' . h(t('ld_sub')) . '</p>' . $form . '</div>'
       . '<div class="ld-orbit" aria-hidden="true"><span class="o o1"></span><span class="o o2"></span><span class="o o3"></span>'
       . '<span class="n n1">7</span><span class="n n2">2</span><span class="n n3">11</span><span class="n n4">5</span><span class="n n5">9</span><span class="ld-heart">♡</span></div></section>'
       // Live numbers
       . '<section class="ld-stats" aria-label="' . h(t('ld_stats_label')) . '">'
       . $stat($s['members'], t('ld_members'), 'main') . $stat($s['connections'], t('ld_connections')) . $stat($s['messages'], t('ld_messages')) . $stat(count(COUPLES), t('ld_couples'))
       . '</section><p class="small muted ld-stats-note">'
       . h($early ? t('ld_early', ['n'=>$fmt(max(0, 100 - $s['members']))]) : t('ld_week', ['n'=>$fmt($s['new_week'])]))
       . ' ' . h(t('ld_demo_note', ['n'=>$s['demo']])) . '</p>'
       // Why join
       . '<section class="ld-why"><h2>' . h(t('ld_why_title')) . '</h2><div class="ld-grid">';
    foreach ([['✶', 'why1'], ['%', 'why2'], ['☺', 'why3'], ['∑', 'why4']] as [$icon, $k])
        $o .= '<article class="ld-card"><span class="ld-icon">' . $icon . '</span><h3>' . h(t('ld_' . $k . '_t')) . '</h3><p>' . h(t('ld_' . $k)) . '</p></article>';
    $o .= '</div></section>'
       // How it works
       . '<section class="ld-how"><h2>' . h(t('ld_how_title')) . '</h2><ol class="ld-steps">';
    foreach ([1, 2, 3] as $i) $o .= '<li><b>' . $i . '</b><div><h3>' . h(t('ld_step' . $i . '_t')) . '</h3><p class="muted">' . h(t('ld_step' . $i)) . '</p></div></li>';
    $o .= '</ol></section>'
       // Honest science pitch + couples test
       . '<section class="ld-science"><p class="lead">' . h(t('ld_science')) . '</p></section>'
       . couples_html(6)
       // Closing call to action
       . '<section class="ld-cta"><h2>' . h(t('ld_cta_title')) . '</h2><p class="muted">' . h(t('ld_cta')) . '</p>' . str_replace('id="code"', 'id="code2"', str_replace('for="code"', 'for="code2"', $form)) . '</section>'
       . '</main><footer class="foot wrap"><p class="small muted">' . h(t('privacy_foot')) . '</p><p class="small muted">' . h(t('foot')) . '</p></footer></body></html>';
    return $o;
}
