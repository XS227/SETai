<?php
/* Prosjektgalleri. GET -> projects. POST (admin token, same as looks.php):
 *   {action:"save", projects:[…]}                         replace the list
 *   {action:"upload", project:"<id>", image, thumb}        add a photo (JPEG data URLs, resized in the browser to fit
 *                                                          the server's 1 MB request limit) -> {f,s,w,h}
 * Uploaded photos live in DATA_DIR/projects/<id>/ and are served by pimg.php. */
require __DIR__.'/_lib.php';
$file=DATA_DIR.'/projects.json';$seed=__DIR__.'/../projects-seed-v1.json';
if($_SERVER['REQUEST_METHOD']==='GET'){
  header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-cache');
  readfile(is_file($file)?$file:$seed);exit;
}
if($_SERVER['REQUEST_METHOD']!=='POST')out(405,['error'=>'Metode ikke tillatt']);
if(!rate_ok('projects',120,3600))out(429,['error'=>'For mange forsøk']);
$expected=is_file(DATA_DIR.'/admin-token.txt')?trim(strtok(file_get_contents(DATA_DIR.'/admin-token.txt'),"\n")):'';
$tok=$_SERVER['HTTP_X_ADMIN_TOKEN']??'';
if(strlen($expected)<20)out(503,['error'=>'Redigering er ikke slått på (mangler adminnøkkel på serveren)']);
if(!is_string($tok)||!hash_equals($expected,$tok))out(403,['error'=>'Feil adminnøkkel']);
$d=read_json_body(1000000);
$slug=fn($v)=>is_string($v)&&preg_match('/^[a-z0-9-]{2,60}$/',$v);

if(($d['action']??'')==='upload'){
  $pid=$d['project']??'';if(!$slug($pid))out(400,['error'=>'Ugyldig prosjekt-id']);
  $decode=function($u,$maxW){
    if(!is_string($u)||!str_starts_with($u,'data:image/jpeg;base64,'))return null;
    $b=base64_decode(substr($u,23),true);if($b===false||strlen($b)>700000)return null;
    $i=@getimagesizefromstring($b);if(!$i||$i[2]!==IMAGETYPE_JPEG||$i[0]>$maxW||$i[1]>$maxW||$i[0]<200)return null;
    return [$b,$i[0],$i[1]];
  };
  $big=$decode($d['image']??'',1600);$small=$decode($d['thumb']??'',700);
  if(!$big||!$small)out(400,['error'=>'Ugyldig bilde (JPEG, maks 1600 px)']);
  $dir=DATA_DIR.'/projects/'.$pid;if(!is_dir($dir)&&!mkdir($dir,0750,true))out(500,['error'=>'Kunne ikke lagre']);
  $n=bin2hex(random_bytes(6));
  if(!write_atomic("$dir/$n.jpg",$big[0])||!write_atomic("$dir/$n-s.jpg",$small[0]))out(500,['error'=>'Kunne ikke lagre']);
  out(201,['f'=>"api/pimg.php?f=$pid/$n.jpg",'s'=>"api/pimg.php?f=$pid/$n-s.jpg",'w'=>$big[1],'h'=>$big[2]]);
}

$in=$d['projects']??null;if(!is_array($in)||count($in)>100)out(400,['error'=>'Ugyldig liste']);
$ROOMS=['bad','kjokken','stue','ute','produksjon'];$MATS=['floor','wall'];
$photoOk=fn($f)=>is_string($f)&&(preg_match('~^assets/projects/[a-z0-9-]+/[0-9a-z-]+\.jpg$~',$f)||preg_match('~^api/pimg\.php\?f=[a-z0-9-]+/[0-9a-f]{12}(-s)?\.jpg$~',$f));
$outp=[];$seen=[];
foreach($in as $p){
  if(!is_array($p)||!$slug($p['id']??null)||isset($seen[$p['id']]))continue;$seen[$p['id']]=1;
  $photos=[];
  foreach(($p['photos']??[]) as $ph){if(is_array($ph)&&$photoOk($ph['f']??null)&&$photoOk($ph['s']??null))$photos[]=['f'=>$ph['f'],'s'=>$ph['s'],'w'=>(int)($ph['w']??0),'h'=>(int)($ph['h']??0)];}
  $studio=null;
  if(is_array($p['studio']??null)){
    $s=$p['studio'];$studio=['room'=>in_array($s['room']??'',['bad','kjokken','stue'],true)?$s['room']:'bad'];
    foreach($MATS as $m)if(!empty($s[$m]))$studio[$m]=clean_str($s[$m],40);
    foreach(['fire','coffee'] as $k)if(!empty($s[$k])&&preg_match('/^sk-[a-z]{2,20}$/',$s[$k]))$studio[$k]=$s[$k];
    if(is_array($s['top']??null))$studio['top']=['stone'=>clean_str($s['top']['stone']??'',40),'t'=>max(.02,min(.06,(float)($s['top']['t']??.03)))];
  }
  $outp[]=[
    'id'=>$p['id'],'title'=>clean_str($p['title']??'',120),'text'=>clean_str($p['text']??'',900),
    'rooms'=>array_values(array_intersect(is_array($p['rooms']??null)?$p['rooms']:[],$ROOMS)),
    'stone'=>[clean_str($p['stone'][0]??'',40),clean_str($p['stone'][1]??'',40)],
    'products'=>array_slice(array_values(array_unique(array_filter(array_map('intval',is_array($p['products']??null)?$p['products']:[]),fn($x)=>$x>0))),0,12),
    'studio'=>$studio,'countertop'=>clean_str($p['countertop']??'',40)?:null,
    'cover'=>max(0,min(count($photos)-1,(int)($p['cover']??0))),'hidden'=>!empty($p['hidden']),'photos'=>array_slice($photos,0,40),
  ];
}
$doc=['updated'=>gmdate('c'),'projects'=>$outp];
if(is_file($file))@copy($file,DATA_DIR.'/projects.backup-'.gmdate('Ymd-His').'.json');
if(!write_atomic($file,json_encode($doc,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT)))out(500,['error'=>'Kunne ikke lagre']);
out(200,['ok'=>true,'count'=>count($outp)]);
