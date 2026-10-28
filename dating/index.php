<?php
declare(strict_types=1);
// setai.no/dating – numerology dating & friend finder preview. PHP + SQLite, no extra service.
// Earlier versions: /root/backups/setai-dating-index.php.bak-gpt-review-20261027, /root/backups/dating-index-v1-no-20261027.php
define('DATING', 1);
require __DIR__ . '/lib/engine.php';
require __DIR__ . '/lib/db.php';
require __DIR__ . '/lib/avatar.php';
require __DIR__ . '/lib/texts.php';
require __DIR__ . '/lib/i18n.php';
require __DIR__ . '/lib/couples.php';
require __DIR__ . '/lib/landing.php';

header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'");
header('X-Content-Type-Options: nosniff');
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 1200000) { http_response_code(413); exit('Request too large.'); }
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET','HEAD','POST'], true)) { http_response_code(405); header('Allow: GET, HEAD, POST'); exit; }
$post = $method === 'POST';

// ---------- Language (no / en / fa), remembered per browser ----------
$LANG = 'no';
if (is_string($_GET['lang'] ?? null) && in_array($_GET['lang'], ['no','en','fa'], true)) {
    $LANG = $_GET['lang'];
    setcookie('dating_lang', $LANG, ['expires'=>time() + 365 * 86400, 'path'=>'/dating', 'secure'=>true, 'httponly'=>true, 'samesite'=>'Lax']);
} elseif (is_string($_COOKIE['dating_lang'] ?? null) && in_array($_COOKIE['dating_lang'], ['no','en','fa'], true)) $LANG = $_COOKIE['dating_lang'];
$DIR = $LANG === 'fa' ? 'rtl' : 'ltr';

session_name('setaei_dating_review');
session_set_cookie_params(['path'=>'/dating', 'secure'=>true, 'httponly'=>true, 'samesite'=>'Lax']);
session_start();
if (!isset($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
$csrf = $_SESSION['csrf'];
if ($post && (!is_string($_POST['csrfmiddlewaretoken'] ?? null) || !hash_equals($csrf, $_POST['csrfmiddlewaretoken']))) {
    http_response_code(403); exit(t('reload'));
}
function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function lang_links(): string {
    global $LANG; $q = $_GET; unset($q['img']); $o = '';
    foreach (['no'=>'NO', 'en'=>'EN', 'fa'=>'فا'] as $code => $label) {
        $q['lang'] = $code;
        $o .= '<a href="?' . h(http_build_query($q)) . '" hreflang="' . $code . '"' . ($LANG === $code ? ' aria-current="true"' : '') . '>' . $label . '</a>';
    }
    return '<span class="langs">' . $o . '</span>';
}

// ---------- Early-preview gate: the front page of the experiment; code 227 opens the app ----------
$isAdmin = !empty($_SESSION['preview_allowed']);
$db = dating_db();
if (!$isAdmin) {
    header('Cache-Control: private, no-store, max-age=0');
    $error = '';
    if ($post && isset($_POST['preview_code'])) {
        $now = time();
        if (($now - (int)($_SESSION['gate_since'] ?? 0)) > 60) { $_SESSION['gate_since'] = $now; $_SESSION['gate_attempts'] = 0; }
        $_SESSION['gate_attempts'] = (int)($_SESSION['gate_attempts'] ?? 0) + 1;
        if ($_SESSION['gate_attempts'] > 10) { http_response_code(429); $error = t('gate_wait'); }
        elseif (is_string($_POST['preview_code']) && hash_equals('227', trim($_POST['preview_code']))) {
            $_SESSION['preview_allowed'] = true; session_write_close();
            header('Location: /dating/', true, 303); exit;
        } else $error = t('gate_wrong');
    }
    session_write_close();
    echo landing_html($db, $csrf, $error);
    exit;
}

const GENDERS = ['woman', 'man', 'nonbinary'];
const SEEKS = ['any', 'woman', 'man', 'nonbinary'];
const INTENTS = ['longterm', 'explore'];
const SERIES = ['life'=>'--s1', 'soul'=>'--s2', 'expression'=>'--s3', 'maturity'=>'--s4', 'timing'=>'--s5'];

// ---------- Profile images (photo upload, else illustrated portrait) ----------
if (isset($_GET['img'])) {
    session_write_close();
    $u = dating_user((int)$_GET['img']);
    if (!$u) { http_response_code(404); exit; }
    header('Cache-Control: private, max-age=86400');
    $file = $u['photo'] ? DATING_DATA . '/photos/' . basename($u['photo']) : '';
    if ($file !== '' && is_file($file)) { header('Content-Type: image/jpeg'); readfile($file); exit; }
    header('Content-Type: image/svg+xml');
    echo dating_avatar_svg($u, n_profile($u['full_name'], $u['birth_date'])['life']['root']);
    exit;
}
header('Cache-Control: private, no-store, max-age=0');

// ---------- Who am I, and who am I acting as (test mode) ----------
$me = null;
$tok = $_COOKIE['dating_me'] ?? '';
if (is_string($tok) && preg_match('/^[a-f0-9]{64}$/', $tok)) {
    $st = $db->prepare('SELECT * FROM users WHERE token_hash = ? AND is_demo = 0'); $st->execute([hash('sha256', $tok)]);
    $me = $st->fetch() ?: null;
}
$actor = $me;
if ($me && $isAdmin && !empty($_SESSION['act_as'])) {
    $u = dating_user((int)$_SESSION['act_as']);
    if ($u && $u['is_demo']) $actor = $u; else unset($_SESSION['act_as']);
}

function prof(array $u): array { static $c = []; return $c[$u['id']] ??= n_profile($u['full_name'], $u['birth_date']); }
function cmp(array $a, array $b, bool $full = false): array { return n_compare(prof($a), prof($b), $full); }
function age(array $u): int { return prof($u)['age']; }
function seeks(array $u, array $o): bool { return $u['seeking'] === 'any' || $u['seeking'] === $o['gender']; }
function fits(array $u, array $o): bool { return seeks($u, $o) && age($o) >= $u['min_age'] && age($o) <= $u['max_age']; }
function mutual(array $a, array $b): bool { return fits($a, $b) && fits($b, $a); }
function lf_has(array $u, string $mode): bool { return $u['looking_for'] === 'both' || $u['looking_for'] === $mode; }
/** Dating: both open to dating + mutual gender/age choices. Friends: both open to friendship. */
function eligible(array $a, array $b, string $mode): bool { return lf_has($a, $mode) && lf_has($b, $mode) && ($mode === 'friends' || mutual($a, $b)); }
function dec(float $v): string { global $LANG; $s = (string)round($v, 1); return $LANG === 'no' ? str_replace('.', ',', $s) : $s; }
function gl(string $g): string { return t('g_' . $g); }
function sl(string $s): string { return t('s_' . $s); }
function img(array $u, string $cls = 'pic'): string {
    return '<img class="' . $cls . '" src="?img=' . $u['id'] . '&amp;v=' . $u['updated_at'] . '" alt="" loading="lazy" width="200" height="200">';
}
function link_row(int $a, int $b): ?array {
    $st = dating_db()->prepare('SELECT * FROM requests WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?)');
    $st->execute([$a, $b, $b, $a]); $rows = $st->fetchAll();
    foreach ($rows as $r) if ($r['status'] === 'accepted') return $r + ['state'=>'connected'];
    foreach ($rows as $r) if ($r['status'] === 'pending') return $r + ['state'=>(int)$r['from_id'] === $a ? 'out' : 'in'];
    foreach ($rows as $r) if ($r['status'] === 'declined' && (int)$r['from_id'] === $a) return $r + ['state'=>'declined'];
    return null;
}
function link_state(int $a, int $b): string { return link_row($a, $b)['state'] ?? 'none'; }
function csrf_field(): string { global $csrf; return '<input type="hidden" name="csrfmiddlewaretoken" value="' . h($csrf) . '">'; }
function back_field(): string { return '<input type="hidden" name="back" value="' . h('?' . ($_SERVER['QUERY_STRING'] ?? '')) . '">'; }
function action_form(string $action, array $fields, string $label, string $cls = 'button'): string {
    $o = '<form method="post" class="inline">' . csrf_field() . back_field() . '<input type="hidden" name="action" value="' . h($action) . '">';
    foreach ($fields as $k => $v) $o .= '<input type="hidden" name="' . h($k) . '" value="' . h($v) . '">';
    return $o . '<button class="' . h($cls) . '" type="submit">' . h($label) . '</button></form>';
}
function state_actions(array $actor, array $o, string $mode): string {
    return match (link_state((int)$actor['id'], (int)$o['id'])) {
        'connected' => '<a class="button" href="?v=chat&amp;id=' . $o['id'] . '">' . h(t('a_chat')) . '</a>',
        'out' => '<span class="pill wait">' . h(t('a_wait')) . '</span>' . action_form('cancel', ['to'=>$o['id']], t('a_cancel'), 'link'),
        'in' => action_form('respond', ['from'=>$o['id'], 'decision'=>'accept'], t('a_accept')) . action_form('respond', ['from'=>$o['id'], 'decision'=>'decline'], t('a_notnow'), 'link'),
        'declined' => '<span class="pill">' . h(t('a_declined')) . '</span>',
        default => action_form('request', ['to'=>$o['id'], 'mode'=>$mode], $mode === 'friends' ? t('a_request_friend') : t('a_request')),
    };
}
/** Points each component adds to the match %: weight × (score − 45) / 50. They sum to the total. */
function contributions(array $c): array {
    $out = [];
    foreach ($c['components'] as $k) $out[$k['key']] = ['pts'=>$k['score'] === null ? 0.0 : $k['weight'] * ($k['score'] - 45) / 50, 'max'=>$k['weight'], 'score'=>$k['score']];
    return $out;
}

// Demo profiles answer by the numbers.
function demo_would_accept(array $demo, array $from, string $mode): bool {
    if (!lf_has($demo, $mode)) return false;
    $pct = cmp($demo, $from)['pct'];
    return $mode === 'friends' ? $pct >= $demo['accept_pct'] - 10 : fits($demo, $from) && $pct >= $demo['accept_pct'];
}
function demo_tick(): void {
    $db = dating_db();
    $rows = $db->query('SELECT r.id, r.from_id, r.to_id, r.mode FROM requests r JOIN users t ON t.id = r.to_id JOIN users f ON f.id = r.from_id
                        WHERE r.status = "pending" AND t.is_demo = 1 AND f.is_demo = 0 AND r.created_at <= ' . (time() - 12))->fetchAll();
    foreach ($rows as $r) {
        $demo = dating_user((int)$r['to_id']); $from = dating_user((int)$r['from_id']);
        if ($demo && $from && demo_would_accept($demo, $from, $r['mode']))
            $db->prepare('UPDATE requests SET status = "accepted", updated_at = ? WHERE id = ?')->execute([time(), $r['id']]);
    }
}
function demo_reply(array $demo, array $other): string {
    $c = cmp($demo, $other, true); $p = prof($demo); $o = prof($other); $rel = $c['relationship'];
    $st = dating_db()->prepare('SELECT COUNT(*) FROM messages WHERE from_id = ? AND to_id = ?'); $st->execute([$demo['id'], $other['id']]);
    $best = $c['months']; usort($best, fn($a, $b) => $b['score'] <=> $a['score']);
    $lines = tx('chat');
    return strtr($lines[(int)$st->fetchColumn() % count($lines)], [
        '{rel}'=>$rel, '{theme}'=>mb_strtolower(tx('themes')[$rel]), '{lp}'=>$p['life']['label'], '{soul}'=>tx('c_soul')[$p['soul']['root']],
        '{pct}'=>$c['pct'], '{py}'=>$p['personal_year'], '{year}'=>tx('c_year')[$p['personal_year']],
        '{month}'=>tx('months')[$best[0]['m']] . ' ' . $best[0]['y'], '{olp}'=>$o['life']['root'],
        '{type}'=>mb_strtolower(tx('type')[$o['life']['root']][0]), '{city}'=>$demo['city']]);
}

// ---------- Mode: dating or friends (only modes the actor has ticked) ----------
$modes = $actor ? ($actor['looking_for'] === 'both' ? ['dating', 'friends'] : [$actor['looking_for']]) : ['dating'];
if (is_string($_GET['mode'] ?? null) && in_array($_GET['mode'], $modes, true)) $_SESSION['mode'] = $_GET['mode'];
$mode = in_array($_SESSION['mode'] ?? '', $modes, true) ? $_SESSION['mode'] : $modes[0];

// ---------- POST actions ----------
if ($post) {
    $now = time();
    if (($now - (int)($_SESSION['calc_since'] ?? 0)) > 60) { $_SESSION['calc_since'] = $now; $_SESSION['calc_count'] = 0; }
    $_SESSION['calc_count'] = (int)($_SESSION['calc_count'] ?? 0) + 1;
    if ($_SESSION['calc_count'] > 120) { http_response_code(429); exit(t('gate_wait')); }
    $action = is_string($_POST['action'] ?? null) ? $_POST['action'] : '';
    $ajax = isset($_POST['ajax']);
    $back = is_string($_POST['back'] ?? null) && preg_match('/^\?[A-Za-z0-9=&_%.\-]*$/', $_POST['back']) ? $_POST['back'] : '?v=treff';
    $str = fn(string $k, int $max) => is_string($_POST[$k] ?? null) ? mb_substr(trim($_POST[$k]), 0, $max) : '';
    $otherId = (int)($_POST['to'] ?? $_POST['from'] ?? 0);
    $other = $otherId ? dating_user($otherId) : null;
    $json = null;

    if ($action === 'save_profile') {
        $errors = [];
        $lfD = isset($_POST['lf_dating']); $lfF = isset($_POST['lf_friends']);
        $f = ['full_name'=>preg_replace('/\s+/u', ' ', $str('full_name', 120)), 'birth_date'=>$str('birth_date', 10),
              'alias'=>$str('alias', 40), 'city'=>$str('city', 80), 'gender'=>$str('gender', 16), 'seeking'=>$str('seeking', 16),
              'intent'=>$str('intent', 16), 'min_age'=>(int)($_POST['min_age'] ?? 18), 'max_age'=>(int)($_POST['max_age'] ?? 99),
              'bio'=>$str('bio', 600), 'visible'=>isset($_POST['visible']) ? 1 : 0,
              'looking_for'=>$lfD && $lfF ? 'both' : ($lfF ? 'friends' : 'dating')];
        if (!n_valid_name($f['full_name'])) $errors[] = t('e_name');
        $age = n_date($f['birth_date']) ? n_age($f['birth_date']) : -1;
        if ($age < 18 || $age > 120 || $f['birth_date'] > date('Y-m-d')) $errors[] = t('e_birth');
        if ($f['alias'] === '') $errors[] = t('e_alias');
        if (!in_array($f['gender'], GENDERS, true)) $errors[] = t('e_gender');
        if (!in_array($f['seeking'], SEEKS, true)) $errors[] = t('e_seeking');
        if (!in_array($f['intent'], INTENTS, true)) $f['intent'] = 'longterm';
        if (!$lfD && !$lfF) $errors[] = t('e_lf');
        if (!(18 <= $f['min_age'] && $f['min_age'] <= $f['max_age'] && $f['max_age'] <= 120)) $errors[] = t('e_age');
        if (!$actor && !isset($_POST['consent'])) $errors[] = t('e_consent');
        $photo = null; $raw = '';
        if (is_string($_POST['photo_data'] ?? null) && preg_match('#^data:image/(jpeg|png|webp);base64,#', $_POST['photo_data']))
            $raw = (string)base64_decode(substr($_POST['photo_data'], strpos($_POST['photo_data'], ',') + 1), true);
        elseif (($_FILES['photo']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK && $_FILES['photo']['size'] <= 1100000)
            $raw = (string)file_get_contents($_FILES['photo']['tmp_name']);
        if ($raw !== '') {
            $info = @getimagesizefromstring($raw);
            $src = ($info && in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true) && $info[0] * $info[1] <= 40000000) ? @imagecreatefromstring($raw) : false;
            if (!$src) $errors[] = t('e_photo');
            else {
                $side = min(imagesx($src), imagesy($src));
                $dst = imagecreatetruecolor(600, 600);
                imagecopyresampled($dst, $src, 0, 0, intdiv(imagesx($src) - $side, 2), intdiv(imagesy($src) - $side, 2), 600, 600, $side, $side);
                $photo = bin2hex(random_bytes(12)) . '.jpg';
                imagejpeg($dst, DATING_DATA . '/photos/' . $photo, 84);   // re-encoded: strips EXIF/GPS
                imagedestroy($src); imagedestroy($dst);
            }
        }
        if ($errors) {
            $_SESSION['form_errors'] = $errors; $_SESSION['form_old'] = $f;
            if ($photo) @unlink(DATING_DATA . '/photos/' . $photo);
            header('Location: /dating/?v=profil&edit=1', true, 303); exit;
        }
        if ($actor) {
            $db->prepare('UPDATE users SET full_name=?, birth_date=?, alias=?, city=?, gender=?, seeking=?, intent=?, min_age=?, max_age=?, bio=?, visible=?, looking_for=?, updated_at=? WHERE id=?')
               ->execute([$f['full_name'], $f['birth_date'], $f['alias'], $f['city'], $f['gender'], $f['seeking'], $f['intent'], $f['min_age'], $f['max_age'], $f['bio'], $f['visible'], $f['looking_for'], time(), $actor['id']]);
            $uid = (int)$actor['id'];
        } else {
            $token = bin2hex(random_bytes(32));
            $db->prepare('INSERT INTO users (token_hash, is_demo, full_name, birth_date, alias, city, gender, seeking, intent, min_age, max_age, bio, visible, looking_for, created_at, updated_at)
                          VALUES (?,0,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
               ->execute([hash('sha256', $token), $f['full_name'], $f['birth_date'], $f['alias'], $f['city'], $f['gender'], $f['seeking'], $f['intent'], $f['min_age'], $f['max_age'], $f['bio'], $f['visible'], $f['looking_for'], time(), time()]);
            $uid = (int)$db->lastInsertId();
            setcookie('dating_me', $token, ['expires'=>time() + 180 * 86400, 'path'=>'/dating', 'secure'=>true, 'httponly'=>true, 'samesite'=>'Lax']);
            // Three of the best-matching demo profiles reach out first, so both directions can be tested.
            $new = dating_user($uid); $first = $f['looking_for'] === 'friends' ? 'friends' : 'dating'; $cands = [];
            foreach ($db->query('SELECT * FROM users WHERE is_demo = 1')->fetchAll() as $d) if (eligible($new, $d, $first)) $cands[] = [cmp($new, $d)['index'] * 1000 - (int)$d['id'], $d];
            rsort($cands);
            foreach (array_slice($cands, 0, 3) as $k => [, $d])
                $db->prepare('INSERT OR IGNORE INTO requests (from_id, to_id, status, mode, created_at, updated_at) VALUES (?,?,"pending",?,?,?)')->execute([$d['id'], $uid, $first, time() - 60 * ($k + 1), time()]);
        }
        if ($photo) {
            $old = dating_user($uid)['photo'] ?? null;
            if ($old) @unlink(DATING_DATA . '/photos/' . basename($old));
            $db->prepare('UPDATE users SET photo = ? WHERE id = ?')->execute([$photo, $uid]);
        }
        header('Location: /dating/?v=profil&saved=1', true, 303); exit;
    }
    if (!$actor) { header('Location: /dating/', true, 303); exit; }
    $aid = (int)$actor['id'];
    switch ($action) {
        case 'remove_photo':
            if ($actor['photo']) @unlink(DATING_DATA . '/photos/' . basename($actor['photo']));
            $db->prepare('UPDATE users SET photo = NULL, updated_at = ? WHERE id = ?')->execute([time(), $aid]);
            break;
        case 'request':
            if (!$other || (int)$other['id'] === $aid) break;
            $rmode = in_array($_POST['mode'] ?? '', ['dating', 'friends'], true) ? $_POST['mode'] : $mode;
            $state = link_state($aid, (int)$other['id']);
            if ($state === 'in') $db->prepare('UPDATE requests SET status = "accepted", updated_at = ? WHERE from_id = ? AND to_id = ?')->execute([time(), $other['id'], $aid]);
            elseif ($state === 'none') {
                // A demo that would say yes has, in effect, already liked you back – the match shows at once.
                $instant = $other['is_demo'] && !$actor['is_demo'] && demo_would_accept($other, $actor, $rmode);
                $db->prepare('INSERT OR REPLACE INTO requests (from_id, to_id, status, mode, created_at, updated_at) VALUES (?,?,?,?,?,?)')
                   ->execute([$aid, $other['id'], $instant ? 'accepted' : 'pending', $rmode, time(), time()]);
            }
            $db->prepare('DELETE FROM passes WHERE from_id = ? AND to_id = ?')->execute([$aid, $other['id']]);
            $json = ['state'=>link_state($aid, (int)$other['id']), 'id'=>(int)$other['id']];
            break;
        case 'respond':
            if (!$other) break;
            $db->prepare('UPDATE requests SET status = ?, updated_at = ? WHERE from_id = ? AND to_id = ? AND status = "pending"')
               ->execute([($_POST['decision'] ?? '') === 'accept' ? 'accepted' : 'declined', time(), $other['id'], $aid]);
            break;
        case 'cancel':
            if ($other) $db->prepare('DELETE FROM requests WHERE from_id = ? AND to_id = ? AND status = "pending"')->execute([$aid, $other['id']]);
            break;
        case 'message':
            $body = $str('body', 1000);
            if (!$other || $body === '' || link_state($aid, (int)$other['id']) !== 'connected') break;
            $db->prepare('INSERT INTO messages (from_id, to_id, body, created_at) VALUES (?,?,?,?)')->execute([$aid, $other['id'], $body, time()]);
            if ($other['is_demo'] && !$actor['is_demo'])
                $db->prepare('INSERT INTO messages (from_id, to_id, body, is_auto, created_at) VALUES (?,?,?,1,?)')->execute([$other['id'], $aid, demo_reply($other, $actor), time() + 1]);
            $back = '?v=chat&id=' . (int)$other['id'];
            break;
        case 'act_as':
            if (!$isAdmin) break;
            $id = (int)($_POST['id'] ?? 0); $u = $id ? dating_user($id) : null;
            if ($u && $u['is_demo']) $_SESSION['act_as'] = $id; else unset($_SESSION['act_as']);
            unset($_SESSION['mode']);
            $back = $u && $u['is_demo'] ? '?v=forbindelser' : '?v=profil';
            break;
        case 'calibrate':
            if ($me && $isAdmin) dating_calibrate($db, $me, prof($me));
            $back = '?v=treff&mut=1&sort=best';
            break;
        case 'delete_me':
            if ($me) {
                if ($me['photo']) @unlink(DATING_DATA . '/photos/' . basename($me['photo']));
                $db->prepare('DELETE FROM users WHERE id = ?')->execute([$me['id']]);
                setcookie('dating_me', '', ['expires'=>1, 'path'=>'/dating', 'secure'=>true, 'httponly'=>true, 'samesite'=>'Lax']);
                unset($_SESSION['act_as']);
            }
            $back = '?v=profil';
            break;
    }
    if ($ajax) { header('Content-Type: application/json'); echo json_encode($json ?? ['state'=>'ok']); exit; }
    header('Location: /dating/' . $back, true, 303); exit;
}

$formErrors = $_SESSION['form_errors'] ?? []; $formOld = $_SESSION['form_old'] ?? null;
unset($_SESSION['form_errors'], $_SESSION['form_old']);
session_write_close();
demo_tick();

$view = is_string($_GET['v'] ?? null) ? $_GET['v'] : '';
if (!$actor) $view = 'profil';
elseif (!in_array($view, ['profil','treff','person','forbindelser','chat','test'], true) || ($view === 'test' && !$isAdmin)) $view = 'treff';
$pending = 0;
if ($actor) {
    $st = $db->prepare('SELECT COUNT(*) FROM requests WHERE to_id = ? AND status = "pending"'); $st->execute([$actor['id']]);
    $pending = (int)$st->fetchColumn();
}
function mode_switch(array $modes, string $mode, string $view): string {
    if (count($modes) < 2) return '';
    $o = '<div class="modes" role="group">';
    foreach ($modes as $m) $o .= '<a class="mode' . ($m === $mode ? ' on' : '') . '" href="?v=' . $view . '&amp;mode=' . $m . '"' . ($m === $mode ? ' aria-current="true"' : '') . '>' . h(t('mode_' . $m)) . '</a>';
    return $o . '</div>';
}

// ---------- Layout ----------
$titles = ['profil'=>'nav_profile', 'treff'=>'nav_matches', 'person'=>'nav_matches', 'forbindelser'=>'nav_connections', 'chat'=>'messages', 'test'=>'nav_test'];
?><!doctype html>
<html lang="<?= $LANG ?>" dir="<?= $DIR ?>">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title><?= h(t($titles[$view])) ?> · Numerologist</title>
<link rel="stylesheet" href="/dating/assets/dating.css?v=8"><script src="/dating/assets/dating.js?v=8" defer></script></head>
<body class="view-<?= $view ?>">
<header class="nav">
  <a class="brand" href="?v=treff"><span class="brandmark">π</span><span>NUMEROLOGIST<small><?= h(t('brand_sub')) ?></small></span></a>
  <?php if ($actor): ?>
  <nav class="tabs" aria-label="Menu">
    <a href="?v=treff" <?= in_array($view, ['treff','person'], true) ? 'aria-current="page"' : '' ?>><?= h(t('nav_matches')) ?></a>
    <a href="?v=forbindelser" <?= in_array($view, ['forbindelser','chat'], true) ? 'aria-current="page"' : '' ?>><?= h(t('nav_connections')) ?><?= $pending ? ' <b class="badge">' . $pending . '</b>' : '' ?></a>
    <a href="?v=profil" <?= $view === 'profil' ? 'aria-current="page"' : '' ?>><?= h(t('nav_profile')) ?></a>
    <?php if ($isAdmin): ?><a href="?v=test" <?= $view === 'test' ? 'aria-current="page"' : '' ?>><?= h(t('nav_test')) ?></a><?php endif; ?>
  </nav>
  <?php endif; ?>
  <?= lang_links() ?>
</header>
<?php if ($actor && $actor['is_demo']): ?>
<div class="acting"><?= img($actor, 'mini') ?> <?= h(t('acting', ['name'=>$actor['alias']])) ?> <?= action_form('act_as', ['id'=>0], t('back_to_me'), 'link') ?></div>
<?php endif; ?>
<main class="wrap">
<?php
// ======================= PROFILE =======================
if ($view === 'profil'):
    $editing = !$actor || isset($_GET['edit']) || $formErrors;
    $u = $formOld ? array_merge($actor ?? [], $formOld) : ($actor ?? ['full_name'=>'', 'birth_date'=>'', 'alias'=>'', 'city'=>'', 'gender'=>'', 'seeking'=>'any', 'intent'=>'longterm', 'min_age'=>25, 'max_age'=>45, 'bio'=>'', 'visible'=>1, 'looking_for'=>'both']);
    if ($actor && !$editing):
        $p = prof($actor);
?>
  <?php if (isset($_GET['saved'])): ?><p class="notice" role="status"><?= h(t('saved')) ?></p><?php endif; ?>
  <section class="profile-hero">
    <div class="portrait"><?= img($actor, 'pic big') ?><span class="lp"><?= h(t('lp_short')) ?> <?= h($p['life']['label']) ?></span></div>
    <div>
      <p class="kicker"><?= h(t($actor['is_demo'] ? 'kicker_demo' : 'kicker_me')) ?><?= $actor['visible'] ? '' : ' · ' . h(t('hidden')) ?> · <?= h(t('lf_' . $actor['looking_for'])) ?></p>
      <h1><?= h($actor['alias']) ?>, <?= age($actor) ?></h1>
      <p class="muted"><?= h($actor['city'] ?: t('no_city')) ?> · <?= h(gl($actor['gender'])) ?><?php if (lf_has($actor, 'dating')): ?> · <?= h(t('seeks_line', ['who'=>mb_strtolower(sl($actor['seeking'])), 'min'=>(int)$actor['min_age'], 'max'=>(int)$actor['max_age']])) ?> · <?= h(t('i_' . $actor['intent'])) ?><?php endif; ?></p>
      <a class="button" href="?v=profil&amp;edit=1"><?= h(t('edit')) ?></a> <a class="button ghost" href="?v=treff"><?= h(t('see_matches')) ?></a>
    </div>
  </section>

  <section class="grid2">
    <article class="card">
      <h2><?= h(t('about_title')) ?></h2>
      <?php $paras = t_about_me($p); $question = array_pop($paras); ?>
      <?php foreach ($paras as $i => $para): ?><p<?= $i === 0 ? ' class="lead"' : '' ?>><?= h($para) ?></p><?php endforeach; ?>
      <p class="question"><?= h($question) ?></p>
      <?php if ($actor['bio'] !== ''): ?><h3><?= h(t('own_words')) ?></h3><p><?= nl2br(h($actor['bio'])) ?></p><?php endif; ?>
    </article>
    <article class="card">
      <h2><?= h(t('numbers_title')) ?></h2>
      <div class="numbers">
        <?php foreach (['life', 'soul', 'expression', 'maturity', 'personality'] as $k): ?>
          <div class="num"><b><?= h($p[$k]['label']) ?></b><span><?= h(t('n_' . $k)) ?></span></div>
        <?php endforeach; ?>
        <div class="num"><b><?= $p['personal_year'] ?></b><span><?= h(t('n_py', ['y'=>date('Y')])) ?></span></div>
        <div class="num"><b><?= $p['personal_month'] ?></b><span><?= h(t('n_pm')) ?></span></div>
        <div class="num"><b><?= $p['year_root'] ?></b><span><?= h(t('n_gen')) ?></span></div>
      </div>
      <p class="small muted"><?= h(t('privacy')) ?></p>
    </article>
  </section>

  <section class="card">
    <h2><?= h(t('fit_title')) ?></h2>
    <p><?= h(t('fit_p1', ['life'=>$p['life']['root'], 'soul'=>$p['soul']['root'], 'expr'=>$p['expression']['root'], 'mat'=>$p['maturity']['root'], 'py'=>$p['personal_year']])) ?></p>
    <p><?= h(t('fit_p2', ['n'=>$p['life']['root']])) ?></p>
    <div class="ideal">
      <?php foreach (n_ideal($p['life']['root']) as $i): $ty = tx('type')[$i['n']]; ?>
        <div class="ideal-row r<?= $i['score'] ?>"><span class="n"><?= $i['n'] ?></span><span><b><?= h($ty[0]) ?></b> <?= h(tx('ideal')[$i['score']]) ?> – <?= h($ty[1]) ?></span><span class="tag"><?= h(tx('res')[$i['score']]) ?> · <?= $i['score'] ?></span></div>
      <?php endforeach; ?>
    </div>
  </section>

  <section class="grid2">
    <article class="card">
      <h2><?= h(t('age_title')) ?></h2>
      <p><?= h(t('age_p', ['n'=>$p['year_root'], 'min'=>(int)$actor['min_age'], 'max'=>(int)$actor['max_age']])) ?></p>
      <?php foreach (n_generation_ages($p, (int)$actor['min_age'], (int)$actor['max_age']) as $score => $ages): if ($score < 78) continue; ?>
        <p><span class="tag r<?= $score ?>"><?= h(tx('res')[$score]) ?></span> <span dir="ltr"><?= h(implode(', ', $ages)) ?></span> <?= h(t('age_unit')) ?></p>
      <?php endforeach; ?>
      <?php
        $bands = [];
        foreach ($db->query('SELECT * FROM users WHERE visible = 1')->fetchAll() as $o) {
            if ((int)$o['id'] === (int)$actor['id'] || !seeks($actor, $o)) continue;
            $bands[intdiv(age($o), 10) * 10][] = cmp($actor, $o)['pct'];
        }
        ksort($bands);
      ?>
      <?php if ($bands): ?>
      <h3><?= h(t('pool_title')) ?></h3>
      <div class="bars">
        <?php foreach ($bands as $b => $vals): $avg = (int)round(array_sum($vals) / count($vals)); ?>
          <div class="bar"><span dir="ltr"><?= $b ?>–<?= $b + 9 ?></span><i style="--w:<?= $avg ?>%"></i><b><?= $avg ?> %</b><small><?= count($vals) ?> <?= h(t('persons')) ?></small></div>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>
    </article>
    <article class="card">
      <h2><?= h(t('periods_title')) ?></h2>
      <p class="small muted"><?= h(t('periods_note')) ?></p>
      <ol class="periods">
        <?php foreach (n_pinnacle_periods($p) as $per): $love = in_array($per['n'], [2, 6], true); ?>
          <li class="<?= $per['now'] ? 'now' : '' ?>"><b dir="ltr"><?= $per['from'] ?>–<?= $per['to'] ?? '' ?></b> <?= h(t('age_unit')) ?> · <?= h(t('number')) ?> <?= h($per['label']) ?> · <?= h(tx('themes')[$per['n']] ?? '') ?><?= $per['now'] ? ' <em>' . h(t('now')) . '</em>' : '' ?><?= $love ? ' ♡' : '' ?></li>
        <?php endforeach; ?>
      </ol>
    </article>
  </section>
<?php else: // ---------- edit / create form ----------
    $creating = !$actor;
?>
  <section class="intro-block">
    <p class="kicker"><?= h(t($creating ? 'create_kicker' : 'edit_kicker')) ?></p>
    <h1><?= $creating ? t('create_title') : h(t('edit_title')) ?></h1>
    <?php if ($creating): ?><p class="muted"><?= h(t('create_intro')) ?></p><?php endif; ?>
  </section>
  <?php if ($creating) echo couples_html(); ?>
  <?php if ($formErrors): ?><div class="error-box" role="alert"><?php foreach ($formErrors as $e): ?><p><?= h($e) ?></p><?php endforeach; ?></div><?php endif; ?>
  <form method="post" enctype="multipart/form-data" class="card form">
    <?= csrf_field() ?><input type="hidden" name="action" value="save_profile"><input type="hidden" name="photo_data" id="photo_data">
    <div class="photo-edit">
      <?php if ($actor): ?><?= img($actor, 'pic big') ?><?php else: ?><div class="pic big placeholder">♡</div><?php endif; ?>
      <div>
        <label for="photo"><?= h(t('photo')) ?></label>
        <input id="photo" type="file" name="photo" accept="image/jpeg,image/png,image/webp" data-preview>
        <p class="small muted"><?= h(t('photo_note')) ?></p>
      </div>
    </div>
    <fieldset class="lf">
      <legend><?= h(t('lf_label')) ?></legend>
      <label class="lf-opt"><input type="checkbox" name="lf_dating" <?= in_array($u['looking_for'], ['dating', 'both'], true) ? 'checked' : '' ?>><span>♡ <?= h(t('lf_dating')) ?></span></label>
      <label class="lf-opt"><input type="checkbox" name="lf_friends" <?= in_array($u['looking_for'], ['friends', 'both'], true) ? 'checked' : '' ?>><span>☺ <?= h(t('lf_friends')) ?></span></label>
      <p class="small muted"><?= h(t('lf_note')) ?></p>
    </fieldset>
    <div class="fields">
      <label><?= h(t('f_name')) ?> <input name="full_name" required maxlength="120" value="<?= h($u['full_name']) ?>" autocomplete="name" dir="ltr"></label>
      <label><?= h(t('f_birth')) ?> <input type="date" name="birth_date" required value="<?= h($u['birth_date']) ?>" max="<?= date('Y-m-d', strtotime('-18 years')) ?>"></label>
      <label><?= h(t('f_alias')) ?> <input name="alias" required maxlength="40" value="<?= h($u['alias']) ?>"></label>
      <label><?= h(t('f_city')) ?> <input name="city" maxlength="80" value="<?= h($u['city']) ?>"></label>
      <label><?= h(t('f_gender')) ?> <select name="gender" required><option value=""><?= h(t('f_choose')) ?></option><?php foreach (GENDERS as $k): ?><option value="<?= $k ?>" <?= $u['gender'] === $k ? 'selected' : '' ?>><?= h(gl($k)) ?></option><?php endforeach; ?></select></label>
      <label><?= h(t('f_seeking')) ?> <select name="seeking"><?php foreach (SEEKS as $k): ?><option value="<?= $k ?>" <?= $u['seeking'] === $k ? 'selected' : '' ?>><?= h(sl($k)) ?></option><?php endforeach; ?></select></label>
      <label><?= h(t('f_min')) ?> <input type="number" name="min_age" min="18" max="120" value="<?= (int)$u['min_age'] ?>"></label>
      <label><?= h(t('f_max')) ?> <input type="number" name="max_age" min="18" max="120" value="<?= (int)$u['max_age'] ?>"></label>
      <label><?= h(t('f_intent')) ?> <select name="intent"><?php foreach (INTENTS as $k): ?><option value="<?= $k ?>" <?= $u['intent'] === $k ? 'selected' : '' ?>><?= h(t('i_' . $k)) ?></option><?php endforeach; ?></select></label>
    </div>
    <p class="small muted"><?= h(t('f_latin')) ?></p>
    <label><?= h(t('f_bio')) ?> <small class="muted"><?= h(t('f_bio_note')) ?></small><textarea name="bio" maxlength="600" rows="4"><?= h($u['bio']) ?></textarea></label>
    <label class="check"><input type="checkbox" name="visible" <?= !empty($u['visible']) ? 'checked' : '' ?>> <?= h(t('f_visible')) ?></label>
    <?php if ($creating): ?><label class="check"><input type="checkbox" name="consent" required> <?= h(t('f_consent')) ?></label><?php endif; ?>
    <div class="row"><button class="button" type="submit"><?= h(t($creating ? 'f_create' : 'f_save')) ?></button><?php if (!$creating): ?><a class="button ghost" href="?v=profil"><?= h(t('cancel')) ?></a><?php endif; ?></div>
  </form>
  <?php if ($actor && $actor['photo']): ?><p><?= action_form('remove_photo', [], t('remove_photo'), 'link') ?></p><?php endif; ?>
  <?php if ($me && !$actor['is_demo']): ?><section class="card danger-zone"><h3><?= h(t('delete_title')) ?></h3><p class="small muted"><?= h(t('delete_text')) ?></p><form method="post" class="inline" data-confirm="<?= h(t('delete_confirm')) ?>"><?= csrf_field() ?><input type="hidden" name="action" value="delete_me"><button class="link danger" type="submit"><?= h(t('t_delete')) ?></button></form></section><?php endif; ?>
<?php endif;

// ======================= MATCHES (list + filters) =======================
elseif ($view === 'treff'):
    $q = fn(string $k, int $def, int $lo, int $hi) => isset($_GET[$k]) && is_numeric($_GET[$k]) ? max($lo, min($hi, (int)$_GET[$k])) : $def;
    $min = $q('min', 0, 0, 100); $max = $q('max', 100, 0, 100);
    $amin = $q('amin', 18, 18, 120); $amax = $q('amax', 120, 18, 120);
    $lp = $q('lp', 0, 0, 9);
    $mut = ($_GET['mut'] ?? '1') !== '0';
    $sort = in_array($_GET['sort'] ?? '', ['best','worst','young','old'], true) ? $_GET['sort'] : 'best';
    $pool = [];
    foreach ($db->query('SELECT * FROM users WHERE visible = 1')->fetchAll() as $o) {
        if ((int)$o['id'] === (int)$actor['id']) continue;
        if ($mut && !eligible($actor, $o, $mode)) continue;
        $pool[] = ['u'=>$o, 'c'=>cmp($actor, $o)];
    }
    $buckets = [[100,100,'100 %'], [90,99,'90–99'], [75,89,'75–89'], [60,74,'60–74'], [40,59,'40–59'], [0,39,'0–39']];
    $counts = array_fill(0, count($buckets), 0);
    foreach ($pool as $x) foreach ($buckets as $i => $b) if ($x['c']['pct'] >= $b[0] && $x['c']['pct'] <= $b[1]) { $counts[$i]++; break; }
    $list = array_values(array_filter($pool, fn($x) => $x['c']['pct'] >= $min && $x['c']['pct'] <= $max
        && age($x['u']) >= $amin && age($x['u']) <= $amax && (!$lp || prof($x['u'])['life']['root'] === $lp)));
    usort($list, fn($a, $b) => match ($sort) {
        'worst' => $a['c']['pct'] <=> $b['c']['pct'], 'young' => age($a['u']) <=> age($b['u']), 'old' => age($b['u']) <=> age($a['u']),
        default => $b['c']['pct'] <=> $a['c']['pct'] ?: age($a['u']) <=> age($b['u']) });
    $qs = fn(array $o) => '?' . h(http_build_query(array_merge(['v'=>'treff', 'min'=>$min, 'max'=>$max, 'amin'=>$amin, 'amax'=>$amax, 'lp'=>$lp, 'mut'=>$mut ? 1 : 0, 'sort'=>$sort], $o)));
    $maxCount = max(1, max($counts));
?>
  <section class="intro-block">
    <p class="kicker"><?= h(t('m_kicker', ['name'=>mb_strtoupper($actor['alias']), 'lp'=>prof($actor)['life']['label']])) ?></p>
    <h1><?= h(t('m_title')) ?></h1>
    <p class="muted"><?= h(t('m_intro')) ?></p>
    <?= mode_switch($modes, $mode, 'treff') ?>
  </section>
  <section class="card">
    <div class="histogram" role="list" dir="ltr">
      <?php foreach ($buckets as $i => $b): $active = $min === $b[0] && $max === $b[1]; ?>
        <a role="listitem" class="hbar<?= $active ? ' on' : '' ?>" href="<?= $qs(['min'=>$b[0], 'max'=>$b[1]]) ?>"><span class="hcol" style="--h:<?= (int)round($counts[$i] / $maxCount * 100) ?>%"><b><?= $counts[$i] ?></b></span><small><?= $b[2] ?></small></a>
      <?php endforeach; ?>
    </div>
    <div class="chips">
      <?php foreach ([[100,100,'100 %'], [90,100,'90 %+'], [75,100,'75 %+'], [60,100,'60 %+'], [40,100,'40 %+'], [0,39,t('under40')], [0,100,t('all')]] as $c): ?>
        <a class="chip<?= $min === $c[0] && $max === $c[1] ? ' on' : '' ?>" href="<?= $qs(['min'=>$c[0], 'max'=>$c[1]]) ?>"><?= h($c[2]) ?></a>
      <?php endforeach; ?>
    </div>
    <form method="get" class="filters">
      <input type="hidden" name="v" value="treff">
      <label><?= h(t('m_from')) ?> <input type="number" name="min" min="0" max="100" value="<?= $min ?>"> %</label>
      <label><?= h(t('m_to')) ?> <input type="number" name="max" min="0" max="100" value="<?= $max ?>"> %</label>
      <label><?= h(t('m_age')) ?> <input type="number" name="amin" min="18" max="120" value="<?= $amin ?>"></label>
      <label>– <input type="number" name="amax" min="18" max="120" value="<?= $amax ?>"></label>
      <label><?= h(t('m_lp')) ?> <select name="lp"><option value="0"><?= h(t('all')) ?></option><?php for ($n = 1; $n <= 9; $n++): ?><option value="<?= $n ?>" <?= $lp === $n ? 'selected' : '' ?>><?= $n ?></option><?php endfor; ?></select></label>
      <label><?= h(t('m_sort')) ?> <select name="sort"><?php foreach (['best','worst','young','old'] as $k): ?><option value="<?= $k ?>" <?= $sort === $k ? 'selected' : '' ?>><?= h(t('sort_' . $k)) ?></option><?php endforeach; ?></select></label>
      <label class="check"><input type="hidden" name="mut" value="0"><input type="checkbox" name="mut" value="1" <?= $mut ? 'checked' : '' ?>> <?= h(t('m_mutual')) ?></label>
      <button class="button small" type="submit"><?= h(t('m_filter')) ?></button>
    </form>
  </section>
  <p class="muted count"><?= h(t('m_count', ['n'=>count($list), 'total'=>count($pool)])) ?> <?= h(t($mut ? 'm_count_mut' : 'm_count_all')) ?></p>
  <?php if (!$list): ?><div class="card empty"><h2><?= h(t('m_empty')) ?></h2><p class="muted"><?= h(t('m_empty_text')) ?> <?= $min === 100 ? h(t('m_empty_100')) : '' ?> <?= h(t('m_empty_hint')) ?></p></div><?php endif; ?>
  <section class="cards">
    <?php foreach ($list as $x): $o = $x['u']; $c = $x['c']; $po = prof($o); ?>
      <article class="mcard">
        <a class="mlink" href="?v=person&amp;id=<?= $o['id'] ?>"><?= img($o) ?><span class="ring" style="--p:<?= $c['pct'] ?>"><b><?= $c['pct'] ?></b>%</span></a>
        <div class="mbody">
          <h3><a href="?v=person&amp;id=<?= $o['id'] ?>"><?= h($o['alias']) ?>, <?= age($o) ?></a><?= $o['is_demo'] ? ' <span class="demo">' . h(t('demo')) . '</span>' : '' ?></h3>
          <p class="small muted"><?= h($o['city']) ?> · <?= h(t('lp_short')) ?> <?= h($po['life']['label']) ?> · <?= h(t('shared_n', ['n'=>$c['relationship']])) ?></p>
          <p class="label"><?= h(t_label($c['pct'])) ?></p>
          <div class="actions"><?= state_actions($actor, $o, $mode) ?></div>
        </div>
      </article>
    <?php endforeach; ?>
  </section>
<?php
// ======================= PERSON / SHARED FUTURE =======================
elseif ($view === 'person'):
    $o = dating_user((int)($_GET['id'] ?? 0));
    if (!$o || !$o['visible'] && link_state((int)$actor['id'], (int)$o['id']) !== 'connected' || (int)$o['id'] === (int)$actor['id']):
        echo '<div class="card empty"><h2>' . h(t('not_found')) . '</h2><p><a class="button" href="?v=treff">' . h(t('to_matches')) . '</a></p></div>';
    else:
        $c = cmp($actor, $o, true); $po = prof($o); $pa = prof($actor);
        $best = $c['months']; usort($best, fn($a, $b) => $b['score'] <=> $a['score']);
        $calm = $c['months']; usort($calm, fn($a, $b) => $a['score'] <=> $b['score']);
        $mon = tx('months'); $res = tx('res');
?>
  <?php $ref = (string)($_SERVER['HTTP_REFERER'] ?? ''); $backUrl = preg_match('#^https://setai\.no/dating/(\?[A-Za-z0-9=&_%.\-]*)$#', $ref, $mm) && !str_contains($mm[1], 'v=person') ? $mm[1] : '?v=treff'; ?>
  <p><a class="link" href="<?= h($backUrl) ?>"><?= h(t('back_matches')) ?></a></p>
  <section class="pair">
    <div class="who"><?= img($actor, 'pic big') ?><b><?= h($actor['alias']) ?></b></div>
    <div class="score"><span class="ring huge" style="--p:<?= $c['pct'] ?>"><b><?= $c['pct'] ?></b>%</span><p class="label"><?= h(t_label($c['pct'])) ?></p><p class="small muted"><?= h(t('index_line', ['i'=>$c['index']])) ?></p></div>
    <div class="who"><?= img($o, 'pic big') ?><b><?= h($o['alias']) ?>, <?= age($o) ?></b><?= $o['is_demo'] ? '<span class="demo">' . h(t('demo')) . '</span>' : '' ?></div>
  </section>
  <div class="center actions big-actions"><?= state_actions($actor, $o, $mode) ?></div>
  <?php if ($o['is_demo'] && !$actor['is_demo'] && $isAdmin): ?><p class="center small muted"><?= h(t('demo_rule', ['name'=>$o['alias'], 'pct'=>(int)$o['accept_pct'], 'who'=>mb_strtolower(sl($o['seeking'])), 'min'=>(int)$o['min_age'], 'max'=>(int)$o['max_age']])) ?></p><?php endif; ?>

  <section class="grid2">
    <article class="card">
      <h2><?= h(t('about_x', ['name'=>$o['alias']])) ?></h2>
      <p class="lead"><?= h(t_about_other($po, $o)) ?></p>
      <?php if ($o['bio'] !== ''): ?><p>«<?= h($o['bio']) ?>»</p><?php endif; ?>
      <p class="small muted"><?= h($o['city']) ?> · <?= h(gl($o['gender'])) ?> · <?= h(t('lf_' . $o['looking_for'])) ?></p>
    </article>
    <article class="card together">
      <h2><?= h(t('shared_title')) ?> <span class="big-num"><?= $c['relationship'] ?></span></h2>
      <p class="lead"><?= h(tx('rel')[$c['relationship']]) ?></p>
      <p class="small muted"><?= h(t('shared_sub', ['a'=>$pa['life']['kept'], 'b'=>$po['life']['kept'], 'theme'=>tx('themes')[$c['relationship']]])) ?></p>
    </article>
  </section>

  <section class="card">
    <h2><?= h(t('how_title')) ?></h2>
    <table class="comp">
      <thead><tr><th><?= h(t('th_comp')) ?></th><th><?= h($actor['alias']) ?></th><th><?= h($o['alias']) ?></th><th><?= h(t('th_res')) ?></th><th><?= h(t('th_weight')) ?></th></tr></thead>
      <tbody>
      <?php foreach ($c['components'] as $k): ?>
        <tr><td><?= h(tx('comp')[$k['key']]) ?></td><td><?= $k['a'] ?></td><td><?= $k['b'] ?></td>
          <td><span class="meter" style="--w:<?= (int)round((($k['score'] ?? 45) - 45) * 2) ?>%"></span> <?= $k['score'] !== null ? h($res[$k['score']]) . ' · ' . $k['score'] : h(t('unavailable')) ?></td><td><?= $k['weight'] ?> %</td></tr>
      <?php endforeach; ?>
      </tbody>
    </table>
    <p class="small muted"><?= h(t('how_note', ['i'=>$c['index']])) ?></p>
  </section>

  <section class="card">
    <h2><?= h(t('future_title')) ?></h2>
    <div class="years">
      <?php foreach ($c['years'] as $y): ?>
        <div class="year r<?= $y['score'] ?>"><b><?= $y['year'] ?></b><span class="pair-nums" dir="ltr"><?= $y['a'] ?> · <?= $y['b'] ?></span><span class="tag r<?= $y['score'] ?>"><?= h($res[$y['score']]) ?></span>
          <small><?= h(tx('themes')[$y['a']]) ?> / <?= h(tx('themes')[$y['b']]) ?></small><p><?= h(t_year_pair($y['a'], $y['b'], $y['score'], $o, $y['year'])) ?></p></div>
      <?php endforeach; ?>
    </div>
    <h3><?= h(t('twelve')) ?></h3>
    <div class="months">
      <?php foreach ($c['months'] as $m): ?><div class="month r<?= $m['score'] ?>" title="<?= h($res[$m['score']]) ?>"><b><?= h($mon[$m['m']]) ?></b><small dir="ltr"><?= $m['a'] ?>·<?= $m['b'] ?></small></div><?php endforeach; ?>
    </div>
    <div class="grid2 tight">
      <p><b><?= h(t('strongest')) ?></b> <?= h(implode(' · ', array_map(fn($m) => $mon[$m['m']] . ' ' . $m['y'] . ' (' . $res[$m['score']] . ')', array_slice($best, 0, 3)))) ?> – <?= h(t('strongest_tail')) ?></p>
      <p><b><?= h(t('patience')) ?></b> <?= h(implode(' · ', array_map(fn($m) => $mon[$m['m']] . ' ' . $m['y'] . ' (' . $res[$m['score']] . ')', array_slice($calm, 0, 2)))) ?> – <?= h(t('patience_tail')) ?></p>
    </div>
  </section>
  <p class="small muted center"><?= h(t('disclaimer')) ?></p>
<?php endif;

// ======================= CONNECTIONS + comparison chart =======================
elseif ($view === 'forbindelser'):
    $aid = (int)$actor['id'];
    $st = $db->prepare('SELECT u.*, r.mode AS rmode FROM requests r JOIN users u ON u.id = r.from_id WHERE r.to_id = ? AND r.status = "pending" ORDER BY r.created_at DESC'); $st->execute([$aid]); $in = $st->fetchAll();
    $st = $db->prepare('SELECT u.*, r.mode AS rmode FROM requests r JOIN users u ON u.id = r.to_id WHERE r.from_id = ? AND r.status = "pending" ORDER BY r.created_at DESC'); $st->execute([$aid]); $out = $st->fetchAll();
    $st = $db->prepare('SELECT u.*, r.mode AS rmode, MAX(r.updated_at) AS since FROM requests r JOIN users u ON u.id = CASE WHEN r.from_id = ? THEN r.to_id ELSE r.from_id END
                        WHERE (r.from_id = ? OR r.to_id = ?) AND r.status = "accepted" GROUP BY u.id ORDER BY since DESC'); $st->execute([$aid, $aid, $aid]); $con = $st->fetchAll();
    $row = function (array $o, string $actions) use ($actor) {
        $c = cmp($actor, $o);
        return '<div class="crow">' . img($o, 'pic small') . '<div><b><a href="?v=person&amp;id=' . $o['id'] . '">' . h($o['alias']) . ', ' . age($o) . '</a></b>'
            . ($o['is_demo'] ? ' <span class="demo">' . h(t('demo')) . '</span>' : '') . ' <span class="pill mini-pill">' . h(t('badge_' . $o['rmode'])) . '</span>'
            . '<br><span class="small muted">' . $c['pct'] . ' % · ' . h(t_label($c['pct'])) . ' · ' . h(t('shared_n', ['n'=>$c['relationship']])) . '</span></div><div class="actions">' . $actions . '</div></div>';
    };
    // Comparison chart: connected first, then incoming and outgoing requests; one stacked bar per person.
    $people = [];
    foreach ([[$con, 'c'], [$in, 'i'], [$out, 'o']] as [$set, $kind]) foreach ($set as $o) $people[$o['id']] ??= ['u'=>$o, 'c'=>cmp($actor, $o), 'kind'=>$kind];
    uasort($people, fn($a, $b) => $b['c']['pct'] <=> $a['c']['pct']);
    $comp = tx('comp'); $res = tx('res');
?>
  <section class="intro-block"><p class="kicker"><?= h(t('c_kicker')) ?></p><h1><?= h(t('c_title')) ?></h1><p class="muted"><?= h(t('c_intro')) ?></p></section>
  <?php if ($people): ?>
  <section class="card viz">
    <h2><?= h(t('chart_title')) ?></h2>
    <p class="small muted"><?= h(t('chart_intro')) ?></p>
    <ul class="legend">
      <?php foreach (SERIES as $k => $var): ?><li><i style="background:var(<?= $var ?>)"></i><?= h($comp[$k]) ?> <span class="muted" dir="ltr">(<?= DWEIGHTS[$k] ?>)</span></li><?php endforeach; ?>
    </ul>
    <div class="sbars">
      <?php foreach ($people as $x): $o = $x['u']; $con2 = contributions($x['c']); ?>
        <a class="sbar" href="?v=person&amp;id=<?= $o['id'] ?>">
          <span class="sbar-who"><?= img($o, 'pic tiny') ?><span><?= h($o['alias']) ?></span></span>
          <span class="sbar-track" dir="ltr">
            <?php foreach ($con2 as $k => $v): if ($v['pts'] <= 0) continue; ?>
              <i style="width:<?= round($v['pts'], 2) ?>%;background:var(<?= SERIES[$k] ?>)" data-tip="<?= h($o['alias'] . ' · ' . $comp[$k] . ': ' . t('chart_pts', ['n'=>dec($v['pts']), 'max'=>$v['max']]) . ' · ' . $res[$v['score']]) ?>"></i>
            <?php endforeach; ?>
          </span>
          <b class="sbar-total"><?= $x['c']['pct'] ?> %</b>
        </a>
      <?php endforeach; ?>
    </div>
    <details class="viz-table"><summary><?= h(t('chart_table')) ?></summary>
      <table class="comp"><thead><tr><th></th><?php foreach ($comp as $l): ?><th><?= h($l) ?></th><?php endforeach; ?><th><?= h(t('chart_total')) ?></th></tr></thead><tbody>
        <?php foreach ($people as $x): $con2 = contributions($x['c']); ?>
          <tr><td><?= h($x['u']['alias']) ?></td><?php foreach ($con2 as $v): ?><td dir="ltr"><?= dec($v['pts']) ?>/<?= $v['max'] ?></td><?php endforeach; ?><td><b><?= $x['c']['pct'] ?> %</b></td></tr>
        <?php endforeach; ?>
      </tbody></table>
    </details>
    <div class="tip" id="tip" role="tooltip" hidden></div>
  </section>
  <?php endif; ?>
  <section class="card"><h2><?= h(t('c_in', ['n'=>count($in)])) ?></h2>
    <?php if (!$in): ?><p class="muted"><?= h(t('c_none_in')) ?></p><?php endif; ?>
    <?php foreach ($in as $o) echo $row($o, action_form('respond', ['from'=>$o['id'], 'decision'=>'accept'], t('a_accept_short')) . action_form('respond', ['from'=>$o['id'], 'decision'=>'decline'], t('a_notnow'), 'link')); ?>
  </section>
  <section class="card"><h2><?= h(t('c_con', ['n'=>count($con)])) ?></h2>
    <?php if (!$con): ?><p class="muted"><?= h(t('c_none_con')) ?></p><?php endif; ?>
    <?php foreach ($con as $o) echo $row($o, '<a class="button small" href="?v=chat&amp;id=' . $o['id'] . '">' . h(t('messages')) . '</a>'); ?>
  </section>
  <section class="card"><h2><?= h(t('c_out', ['n'=>count($out)])) ?></h2>
    <?php if (!$out): ?><p class="muted"><?= h(t('c_none_out')) ?></p><?php endif; ?>
    <?php foreach ($out as $o) echo $row($o, action_form('cancel', ['to'=>$o['id']], t('a_cancel'), 'link')); ?>
  </section>
<?php
// ======================= CHAT =======================
elseif ($view === 'chat'):
    $o = dating_user((int)($_GET['id'] ?? 0));
    if (!$o || link_state((int)$actor['id'], (int)$o['id']) !== 'connected'):
        echo '<div class="card empty"><h2>' . h(t('not_connected')) . '</h2><p class="muted">' . h(t('not_connected_text')) . '</p>' . ($o ? '<a class="button" href="?v=person&amp;id=' . $o['id'] . '">' . h(t('to_profile')) . '</a>' : '') . '</div>';
    else:
        $c = cmp($actor, $o, true);
        $st = $db->prepare('SELECT * FROM messages WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY created_at, id');
        $st->execute([$actor['id'], $o['id'], $o['id'], $actor['id']]); $msgs = $st->fetchAll();
        $y = $c['years'][0]; $m = $c['months'][0]; $res = tx('res');
?>
  <p><a class="link" href="?v=forbindelser"><?= h(t('back_conn')) ?></a></p>
  <section class="chat-layout">
    <div class="card chat">
      <div class="chat-head"><?= img($o, 'pic small') ?><div><b><a href="?v=person&amp;id=<?= $o['id'] ?>"><?= h($o['alias']) ?>, <?= age($o) ?></a></b><br><span class="small muted"><?= $c['pct'] ?> % · <?= h(t_label($c['pct'])) ?></span></div></div>
      <div class="msgs" id="msgs">
        <?php if (!$msgs): ?><p class="muted center"><?= h(t('chat_empty', ['n'=>$c['relationship']])) ?></p><?php endif; ?>
        <?php foreach ($msgs as $msg): $mine = (int)$msg['from_id'] === (int)$actor['id']; ?>
          <div class="msg <?= $mine ? 'mine' : 'theirs' ?>"><p dir="auto"><?= nl2br(h($msg['body'])) ?></p><small><?= date('d.m H:i', (int)$msg['created_at']) ?><?= $msg['is_auto'] ? ' · ' . h(t('auto_tag')) : '' ?></small></div>
        <?php endforeach; ?>
      </div>
      <form method="post" class="send"><?= csrf_field() ?><input type="hidden" name="action" value="message"><input type="hidden" name="to" value="<?= $o['id'] ?>">
        <textarea name="body" rows="2" maxlength="1000" required dir="auto" placeholder="<?= h(t('write_to', ['name'=>$o['alias']])) ?>"></textarea><button class="button" type="submit"><?= h(t('send')) ?></button></form>
    </div>
    <aside class="card side">
      <h3><?= h(t('side_title')) ?></h3>
      <p><span class="big-num"><?= $c['relationship'] ?></span> <?= h(t('side_shared')) ?><br><span class="small muted"><?= h(tx('rel')[$c['relationship']]) ?></span></p>
      <p><b><?= $y['year'] ?>:</b> <?= h($res[$y['score']]) ?>.<br><span class="small muted"><?= h(t_year_pair($y['a'], $y['b'], $y['score'], $o, $y['year'])) ?></span></p>
      <p><b><?= h(t('this_month')) ?></b> <span dir="ltr"><?= $m['a'] ?> · <?= $m['b'] ?></span> – <?= h($res[$m['score']]) ?>.</p>
      <a class="link" href="?v=person&amp;id=<?= $o['id'] ?>"><?= h(t('see_forecast')) ?></a>
    </aside>
  </section>
<?php endif;

// ======================= TEST MODE =======================
elseif ($view === 'test'):
    $demos = $db->query('SELECT * FROM users WHERE is_demo = 1 ORDER BY alias')->fetchAll();
    $inc = [];
    if ($me) {
        $st = $db->prepare('SELECT to_id FROM requests WHERE from_id = ? AND status = "pending"'); $st->execute([$me['id']]);
        $inc = array_map('intval', array_column($st->fetchAll(), 'to_id'));
    }
?>
  <section class="intro-block"><p class="kicker"><?= h(t('t_kicker')) ?></p><h1><?= h(t('t_title')) ?></h1><p class="muted"><?= h(t('t_intro')) ?></p></section>
  <?php if ($me): ?>
  <section class="card"><h2><?= h(t('t_mine')) ?></h2>
    <div class="crow"><?= img($me, 'pic small') ?><div><b><?= h($me['alias']) ?></b><br><span class="small muted"><?= h(t('t_mine_sub')) ?></span></div>
      <div class="actions"><?= $actor['is_demo'] ? action_form('act_as', ['id'=>0], t('t_use_mine')) : '<span class="pill">' . h(t('t_active')) . '</span>' ?>
        <?= action_form('delete_me', [], t('t_delete'), 'link danger') ?></div></div>
  </section>
  <section class="card"><h2><?= h(t('t_scale')) ?></h2>
    <p class="muted"><?= h(t('t_scale_text')) ?></p>
    <?= action_form('calibrate', [], t('t_scale_btn')) ?>
  </section>
  <?php endif; ?>
  <section class="card"><h2><?= h(t('t_demos', ['n'=>count($demos)])) ?></h2>
    <div class="demo-grid">
      <?php foreach ($demos as $d): $pd = prof($d); $hasReq = in_array((int)$d['id'], $inc, true); ?>
        <div class="crow<?= $hasReq ? ' hl' : '' ?>"><?= img($d, 'pic small') ?><div><b><?= h($d['alias']) ?>, <?= age($d) ?></b><br>
          <span class="small muted"><?= h(gl($d['gender'])) ?> · <?= h(t('lf_' . $d['looking_for'])) ?> · <?= h(t('lp_short')) ?> <?= h($pd['life']['label']) ?> · <?= h(t('t_yes_from', ['n'=>(int)$d['accept_pct']])) ?><?= $hasReq ? ' · <b>' . h(t('t_has_req')) . '</b>' : '' ?></span></div>
          <div class="actions"><?= (int)$actor['id'] === (int)$d['id'] ? '<span class="pill">' . h(t('t_active')) . '</span>' : action_form('act_as', ['id'=>$d['id']], t('t_see_as'), 'button small') ?></div></div>
      <?php endforeach; ?>
    </div>
  </section>
<?php endif; ?>
</main>
<footer class="foot wrap"><p class="small muted"><?= h(t('privacy_foot')) ?></p><p class="small muted"><?= h(t('foot')) ?></p></footer>
</body>
</html>
