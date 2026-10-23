<?php
/* Share landing page. Social crawlers (Facebook, Messenger, LinkedIn, Slack …) do not run JavaScript, so the preview
 * (og:title / og:image) of a shared showroom setup or Instagram look is written here on the server; people are sent on
 * to the showroom with the same setup.  ?o=<setup id>  or  ?l=<instagram post code> */
require __DIR__.'/api/_lib.php';
$h=fn($s)=>htmlspecialchars((string)$s,ENT_QUOTES,'UTF-8');
$ROOM=['bad'=>'Bad','kjokken'=>'Kjøkken','stue'=>'Stue'];
$title='Digitalt showroom | Stenhuset';$desc='Se Stenhusets natursten i et ekte rom i 3D.';
$image=SITE.'assets/stenhuset-logo.png';$target='./#studio';$w=1200;$hgt=630;
if(isset($_GET['o'])&&($s=load_share($_GET['o']))){
  $id=$_GET['o'];$n=$s['names']??[];
  $title='Mitt '.mb_strtolower($ROOM[$s['room']]??'rom').' i Stenhusets showroom';
  $parts=[];
  foreach(['floor'=>'Gulv','wall'=>'Vegg','sink'=>'Servant','table'=>'Bord','top'=>'Benkeplate'] as $k=>$lab)if(!empty($n[$k]))$parts[]="$lab: ".$n[$k];
  $desc=($parts?implode(' · ',$parts).'. ':'').'Åpne oppsettet og se det i 3D.';
  $image=SITE.'api/img.php?id='.$id;$target='./#studio?oppsett='.$id;
}elseif(isset($_GET['p'])&&ctype_digit((string)$_GET['p'])){
  $pid=(int)$_GET['p'];$pd=json_decode(@file_get_contents(__DIR__.'/assets/products/products-v1.json'),true);
  foreach(($pd['products']??[]) as $p)if($p['id']===$pid){
    $title=$p['n'].' | Stenhuset';$desc=mb_substr($p['intro']?:'Natursten fra Stenhuset.',0,180).' Se i 3D og last ned produktark.';
    if(!empty($p['photos'][0]['f'])){$image=SITE.$p['photos'][0]['f'];[$w,$hgt]=@getimagesize(__DIR__.'/'.$p['photos'][0]['f'])?:[1200,1200];}
    $target='./?produkt='.$pid;break;
  }
}elseif(isset($_GET['l'])&&preg_match('/^[A-Za-z0-9_-]{5,40}$/',$_GET['l'])){
  $code=$_GET['l'];$f=DATA_DIR.'/looks.json';$doc=json_decode(@file_get_contents(is_file($f)?$f:__DIR__.'/looks-seed-v1.json'),true);
  foreach(($doc['looks']??[]) as $l)if($l['id']===$code){
    $title=($l['title']?:'Fra Instagram').' | Stenhuset';$desc=$l['text']?:'Se produktene fra innlegget, i 3D og i showroomet.';
    $cat=json_decode(@file_get_contents(__DIR__.'/catalog-v1.json'),true);
    foreach(($cat['products']??[]) as $p)if(in_array($p['id'],$l['products'],true)){$image=$p['i'];$w=600;$hgt=800;break;}
    $target='./#inspirasjon?look='.$code;break;
  }
}
?><!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title><?=$h($title)?></title><meta name="robots" content="noindex">
<meta property="og:type" content="website"><meta property="og:site_name" content="Stenhuset">
<meta property="og:title" content="<?=$h($title)?>"><meta property="og:description" content="<?=$h($desc)?>">
<meta property="og:image" content="<?=$h($image)?>"><meta property="og:image:width" content="<?=$w?>"><meta property="og:image:height" content="<?=$hgt?>">
<meta property="og:url" content="<?=$h(SITE.'del.php?'.$_SERVER['QUERY_STRING'])?>"><meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=<?=$h($target)?>">
<style>body{font:16px/1.5 Georgia,serif;background:#f6f2ec;color:#2f2b26;display:grid;place-items:center;min-height:100vh;margin:0}a{color:inherit}</style>
</head><body><p><a href="<?=$h($target)?>">Åpner Stenhusets showroom …</a></p>
<script>location.replace(<?=json_encode($target)?>)</script></body></html>
