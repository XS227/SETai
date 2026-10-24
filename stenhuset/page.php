<?php
/* Serves the Stenhuset app (app.html) for one page URL with that page's <head>: title, description, canonical,
 * robots, Open Graph / Twitter preview, and structured data. Each page folder has an index.php that sets $slug.
 * The app reads window.__PAGE to open the right view; links between pages are real URLs. */
require __DIR__.'/seo-config.php';
$slug=isset($slug)?$slug:'';
if(!isset(PAGES[$slug])){http_response_code(404);$slug='';}
$p=PAGES[$slug];
$h=fn($s)=>htmlspecialchars((string)$s,ENT_QUOTES,'UTF-8');
$url=CANONICAL_BASE.($slug!==''?$slug.'/':'');
$img=CANONICAL_BASE.($p['image']??DEFAULT_IMAGE);
$imgPath=__DIR__.'/'.($p['image']??DEFAULT_IMAGE);
[$iw,$ih]=@getimagesize($imgPath)?:[1200,630];

$ld=[['@context'=>'https://schema.org']+BUSINESS];
if($slug!==''){
  $ld[]=['@context'=>'https://schema.org','@type'=>'BreadcrumbList','itemListElement'=>[
    ['@type'=>'ListItem','position'=>1,'name'=>'Stenhuset','item'=>CANONICAL_BASE],
    ['@type'=>'ListItem','position'=>2,'name'=>$p['name'],'item'=>$url]]];
}
if(!empty($p['faq'])){
  // the questions shown on the page (single source: made-v1.js)
  $js=@file_get_contents(__DIR__.'/made-v1.js');$faq=[];
  if($js&&preg_match('/const FAQ=\[(.*?)\];/s',$js,$m)&&preg_match_all("/\['([^']+)','([^']+)'\]/",$m[1],$qs,PREG_SET_ORDER))
    foreach($qs as $q)$faq[]=['@type'=>'Question','name'=>$q[1],'acceptedAnswer'=>['@type'=>'Answer','text'=>$q[2]]];
  if($faq)$ld[]=['@context'=>'https://schema.org','@type'=>'FAQPage','mainEntity'=>$faq];
}
$head='<meta name="robots" content="'.(INDEXABLE?'index,follow,max-image-preview:large':'noindex,nofollow').'">'
 .'<title>'.$h($p['title']).'</title><meta name="description" content="'.$h($p['desc']).'">'
 .'<link rel="canonical" href="'.$h($url).'">'
 .'<meta property="og:type" content="website"><meta property="og:site_name" content="Stenhuset"><meta property="og:locale" content="nb_NO">'
 .'<meta property="og:title" content="'.$h($p['title']).'"><meta property="og:description" content="'.$h($p['desc']).'">'
 .'<meta property="og:url" content="'.$h($url).'"><meta property="og:image" content="'.$h($img).'"><meta property="og:image:width" content="'.(int)$iw.'"><meta property="og:image:height" content="'.(int)$ih.'">'
 .'<meta name="twitter:card" content="summary_large_image">'
 .'<script type="application/ld+json">'.json_encode(count($ld)===1?$ld[0]:$ld,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).'</script>'
 .'<script>window.__PAGE='.json_encode(['slug'=>$slug,'route'=>$p['route'],'base'=>BASE_PATH,'pages'=>array_map(fn($x)=>$x['route'],PAGES),'titles'=>array_map(fn($x)=>$x['title'],PAGES),'descs'=>array_map(fn($x)=>$x['desc'],PAGES)],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).'</script>';
$html=file_get_contents(__DIR__.'/app.html');
$html=preg_replace('/<!--seo-->.*?<!--\/seo-->/s',str_replace(['\\','$'],['\\\\','\\$'],$head),$html,1);
// pages live in folders: resolve the app's relative paths from the site root
$html=preg_replace('/<head>/','<head><base href="'.$h(BASE_PATH).'">',$html,1);
header('Content-Type: text/html; charset=utf-8');header('Cache-Control: no-cache');
if(!INDEXABLE)header('X-Robots-Tag: noindex, nofollow');
echo $html;
