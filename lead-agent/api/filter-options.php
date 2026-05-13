<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
$pdo = db();

$industries = $pdo->query("SELECT DISTINCT industry_name FROM leads WHERE industry_name != '' ORDER BY industry_name")->fetchAll(PDO::FETCH_COLUMN);
$cities     = $pdo->query("SELECT DISTINCT city FROM leads WHERE city != '' ORDER BY city")->fetchAll(PDO::FETCH_COLUMN);

echo json_encode(['ok' => true, 'industries' => $industries, 'cities' => $cities]);
