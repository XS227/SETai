<?php
require_once __DIR__ . '/_db.php';
require_admin_token();

$pdo    = db();
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

$stmt = $pdo->prepare('SELECT * FROM leads WHERE ' . implode(' AND ', $where) . ' ORDER BY lead_score DESC LIMIT 5000');
$stmt->execute($params);
$leads = $stmt->fetchAll(PDO::FETCH_ASSOC);

header('Content-Type: text/csv; charset=UTF-8');
header('Content-Disposition: attachment; filename="setaei-leads-' . date('Y-m-d') . '.csv"');
header('Cache-Control: no-cache, no-store');
header('Pragma: no-cache');

$out = fopen('php://output', 'w');
fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF)); // UTF-8 BOM for Excel
fputcsv($out, ['ID','Selskap','Org.nr','Org-form','Bransje','By','Fylke','Registrert','E-post','Tlf','Nettside','CMS','SSL','Facebook','Instagram','Score','Status','Research-status','Researched at','Opprettet']);
foreach ($leads as $l) {
    fputcsv($out, [
        $l['id']                ?? '',
        $l['company_name']      ?? '',
        $l['org_number']        ?? '',
        $l['organization_form'] ?? '',
        $l['industry_name']     ?? '',
        $l['city']              ?? '',
        $l['county']            ?? '',
        $l['registration_date'] ?? '',
        $l['contact_email']     ?? '',
        $l['contact_phone']     ?? '',
        $l['website_url']       ?? '',
        $l['website_cms']       ?? '',
        isset($l['website_has_ssl']) ? ($l['website_has_ssl'] ? 'Ja' : 'Nei') : '',
        $l['facebook_url']      ?? '',
        $l['instagram_url']     ?? '',
        $l['lead_score']        ?? '',
        $l['lead_status']       ?? '',
        $l['research_status']   ?? '',
        $l['researched_at']     ?? '',
        $l['created_at']        ?? '',
    ]);
}
fclose($out);
