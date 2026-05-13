<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$input = json_input();
$page  = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['page']  ?? ($_GET['page']  ?? ''));
$event = preg_replace('/[^a-zA-Z0-9_\-]/', '', $input['event'] ?? ($_GET['event'] ?? ''));
$allowed_events = ['visit', 'cta_click', 'form_submit'];

if (!$page || !$event || !in_array($event, $allowed_events)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Ugyldig event']);
    exit;
}

$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

$pdo = db();
$pdo->prepare('INSERT INTO landing_events (page, event_type, ip, user_agent) VALUES (?, ?, ?, ?)')
    ->execute([$page, $event, substr($ip, 0, 45), substr($ua, 0, 200)]);

echo json_encode(['ok' => true]);
