<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
$pdo = db();
$rows = $pdo->query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 500')->fetchAll(PDO::FETCH_ASSOC);
echo json_encode(['ok'=>true,'leads'=>$rows]);
