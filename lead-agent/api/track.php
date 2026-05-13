<?php
require_once __DIR__ . '/_db.php';

$type = $_GET['t']   ?? '';
$tok  = $_GET['tok'] ?? '';

if (!$tok) { http_response_code(400); exit; }

$pdo = db();

if ($type === 'o') {
    $pdo->prepare("UPDATE sent_offer_recipients SET opened_at = CURRENT_TIMESTAMP WHERE track_token = ? AND opened_at IS NULL")->execute([$tok]);
    header('Content-Type: image/gif');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    // 1×1 transparent GIF
    echo base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    exit;
}

if ($type === 'c') {
    $pdo->prepare("UPDATE sent_offer_recipients SET clicked_at = CURRENT_TIMESTAMP WHERE track_token = ? AND clicked_at IS NULL")->execute([$tok]);
    $url = $_GET['url'] ?? '';
    if ($url) {
        header('Location: ' . $url, true, 302);
    } else {
        http_response_code(204);
    }
    exit;
}

http_response_code(400);
