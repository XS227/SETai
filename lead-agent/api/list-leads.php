<?php
require_once __DIR__ . '/_db.php';
header('Content-Type: application/json');
$pdo = db();

$where  = ['1=1'];
$params = [];

$industry    = trim($_GET['industry']    ?? '');
$city        = trim($_GET['city']        ?? '');
$min_score   = ($_GET['min_score'] ?? '') !== '' ? (int)$_GET['min_score'] : null;
$has_email   = $_GET['has_email']   ?? '';
$has_website = $_GET['has_website'] ?? '';

if ($industry !== '')       { $where[] = 'LOWER(industry_name) LIKE ?'; $params[] = '%' . strtolower($industry) . '%'; }
if ($city !== '')           { $where[] = 'LOWER(city) LIKE ?';          $params[] = '%' . strtolower($city) . '%'; }
if ($min_score !== null)    { $where[] = 'lead_score >= ?';             $params[] = $min_score; }
if ($has_email === 'yes')   { $where[] = "contact_email != '' AND contact_email IS NOT NULL"; }
if ($has_website === 'yes') { $where[] = 'has_website = 1'; }
if ($has_website === 'no')  { $where[] = 'has_website = 0'; }

$stmt = $pdo->prepare('SELECT * FROM leads WHERE ' . implode(' AND ', $where) . ' ORDER BY created_at DESC LIMIT 500');
$stmt->execute($params);
echo json_encode(['ok' => true, 'leads' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
