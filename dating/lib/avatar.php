<?php
declare(strict_types=1);
// Illustrated portraits for demo profiles: deterministic per user, no real faces.
if (!defined('DATING')) { http_response_code(404); exit; }

function dating_avatar_svg(array $u, int $lifeRoot): string {
    $h = crc32($u['full_name'] . '|' . $u['id']);
    $pick = function (array $a, int $shift) use ($h) { return $a[($h >> $shift) % count($a)]; };
    $bgs = [1=>['#f8a77b','#c4567a'], 2=>['#9ec5e8','#6a5acd'], 3=>['#ffd36e','#f07c58'], 4=>['#8fc9a3','#2f6b5a'],
            5=>['#7fd6d0','#3a6fb0'], 6=>['#f3a6c0','#a2477d'], 7=>['#a99ae0','#33285a'], 8=>['#e6c07a','#6b4a2b'], 9=>['#d1a4ef','#b45a4a']];
    [$c1, $c2] = $bgs[$lifeRoot] ?? $bgs[7];
    $skin = $pick(['#f6d3b8','#eec09b','#d9a27c','#b97b55','#8d5a3b','#5f3b27','#f1c7a6'], 0);
    $hair = $pick(['#2a1d17','#4a2f22','#7a4a2a','#b9874f','#e3c178','#1c1c24','#8c3b2a','#a8a5a0'], 3);
    $shirt = $pick(['#2d2a3e','#efe6da','#3e6b8a','#8a3f52','#4f7a5c','#d98e4a','#5a4b8a'], 6);
    $g = $u['gender'];
    $styles = $g === 'woman' ? ['long','bob','bun','curly','long'] : ($g === 'man' ? ['short','side','buzz','curly','short'] : ['bob','curly','side','short']);
    $style = $pick($styles, 9);
    $beard = $g === 'man' && (($h >> 12) % 5) < 2;
    $glasses = (($h >> 15) % 4) === 0;
    $old = n_age($u['birth_date']) >= 52;
    if ($old && (($h >> 18) % 2)) $hair = '#b9b6b0';
    $id = 'g' . $u['id'];
    $s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="' . $id . '" x1="0" y1="0" x2="1" y2="1">'
       . "<stop offset=\"0\" stop-color=\"$c1\"/><stop offset=\"1\" stop-color=\"$c2\"/></linearGradient></defs>"
       . "<rect width=\"200\" height=\"200\" fill=\"url(#$id)\"/>"
       . '<circle cx="160" cy="40" r="46" fill="#fff" opacity=".08"/>';
    if ($style === 'long') $s .= "<path d=\"M58 96C54 54 80 40 100 40s46 14 42 56l8 72c-20 12-80 12-100 0z\" fill=\"$hair\"/>";
    if ($style === 'curly') $s .= "<g fill=\"$hair\"><circle cx=\"64\" cy=\"104\" r=\"16\"/><circle cx=\"136\" cy=\"104\" r=\"16\"/><circle cx=\"62\" cy=\"124\" r=\"13\"/><circle cx=\"138\" cy=\"124\" r=\"13\"/></g>";
    $s .= "<path d=\"M28 200c8-42 38-58 72-58s64 16 72 58z\" fill=\"$shirt\"/>"
        . "<rect x=\"88\" y=\"118\" width=\"24\" height=\"30\" rx=\"10\" fill=\"$skin\"/><rect x=\"88\" y=\"126\" width=\"24\" height=\"8\" fill=\"#000\" opacity=\".08\"/>"
        . "<circle cx=\"66\" cy=\"96\" r=\"8\" fill=\"$skin\"/><circle cx=\"134\" cy=\"96\" r=\"8\" fill=\"$skin\"/>"
        . "<ellipse cx=\"100\" cy=\"92\" rx=\"34\" ry=\"40\" fill=\"$skin\"/>";
    $s .= match ($style) {
        'long' => "<path d=\"M66 92c-2-30 14-46 34-46s38 14 34 46c-8-14-24-22-40-24-12 4-22 12-28 24z\" fill=\"$hair\"/>",
        'bob' => "<path d=\"M62 104c-4-40 16-58 38-58s42 18 38 58v16c-6-8-8-30-16-44-16 8-36 8-50 0-6 14-8 34-10 44z\" fill=\"$hair\"/>",
        'bun' => "<circle cx=\"100\" cy=\"42\" r=\"15\" fill=\"$hair\"/><path d=\"M66 90c-2-28 14-42 34-42s36 14 34 42c-8-14-20-20-34-20s-26 6-34 20z\" fill=\"$hair\"/>",
        'curly' => "<g fill=\"$hair\"><circle cx=\"72\" cy=\"70\" r=\"15\"/><circle cx=\"90\" cy=\"56\" r=\"16\"/><circle cx=\"112\" cy=\"56\" r=\"16\"/><circle cx=\"130\" cy=\"70\" r=\"15\"/><circle cx=\"68\" cy=\"86\" r=\"10\"/><circle cx=\"133\" cy=\"86\" r=\"10\"/></g>",
        'side' => "<path d=\"M66 90c-4-28 12-44 34-44 24 0 38 14 34 40-10-10-26-16-48-14-8 4-14 10-20 18z\" fill=\"$hair\"/>",
        'buzz' => "<path d=\"M67 84c0-24 14-38 33-38s33 14 33 38c-8-12-20-18-33-18s-25 6-33 18z\" fill=\"$hair\" opacity=\".75\"/>",
        default => "<path d=\"M66 86c-2-26 14-40 34-40s36 14 34 40c-6-12-18-20-34-20s-28 8-34 20z\" fill=\"$hair\"/>",
    };
    if ($beard) $s .= "<path d=\"M68 98c2 32 18 38 32 38s30-6 32-38c-6 18-16 22-32 22s-26-4-32-22z\" fill=\"$hair\"/>";
    $s .= '<g fill="#2a2230"><ellipse cx="87" cy="95" rx="3.4" ry="4"/><ellipse cx="113" cy="95" rx="3.4" ry="4"/></g>'
        . "<path d=\"M80 84q7-4 14 0M106 84q7-4 14 0\" stroke=\"$hair\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/>"
        . '<circle cx="80" cy="108" r="6" fill="#e05a6a" opacity=".18"/><circle cx="120" cy="108" r="6" fill="#e05a6a" opacity=".18"/>'
        . '<path d="M90 112q10 9 20 0" stroke="#5a2e2e" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    if ($glasses) $s .= '<g stroke="#1b1824" stroke-width="2.4" fill="none"><circle cx="87" cy="95" r="10"/><circle cx="113" cy="95" r="10"/><path d="M97 95h6"/></g>';
    return $s . '</svg>';
}
