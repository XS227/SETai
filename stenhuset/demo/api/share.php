<?php
/* Shared showroom setups. POST {state, image: JPEG data URL} -> {id,url}; GET ?id= -> state. */
require __DIR__.'/_lib.php';
$dir=DATA_DIR.'/shares';
if($_SERVER['REQUEST_METHOD']==='GET'){
  $s=load_share($_GET['id']??'');if(!$s)out(404,['error'=>'Fant ikke oppsettet']);
  header('Content-Type: application/json; charset=utf-8');header('Cache-Control: public, max-age=86400');
  echo json_encode($s,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;
}
if($_SERVER['REQUEST_METHOD']!=='POST')out(405,['error'=>'Metode ikke tillatt']);
if(!rate_ok('share',20,3600))out(429,['error'=>'For mange delinger. Prøv igjen senere.']);
$d=read_json_body(900000);$s=$d['state']??null;if(!is_array($s))out(400,['error'=>'Mangler oppsett']);
/* countertop from the designer: only known fields, in sane ranges */
function clean_top($t){
  $o=['stone'=>clean_str($t['stone']??'',40),'t'=>max(.02,min(.06,(float)($t['t']??.03)))];
  if(isset($t['L'])){
    $o+=['L'=>max(.4,min(4.5,(float)$t['L'])),'D'=>max(.3,min(1.3,(float)($t['D']??.62))),
      'edge'=>in_array($t['edge']??'',['rett','fas','avrundet','halvrund'],true)?$t['edge']:'rett',
      'sink'=>!empty($t['sink']),'sinkX'=>max(-2,min(2,(float)($t['sinkX']??0))),
      'hob'=>!empty($t['hob']),'hobX'=>max(-2,min(2,(float)($t['hobX']??0))),
      'splash'=>max(0,min(.7,(float)($t['splash']??0)))];
  }
  return $o;
}
$rooms=['bad','kjokken','stue'];$views=['door','product','window','floor','wall','dollhouse'];
$state=[
  'v'=>1,
  'room'=>in_array($s['room']??'',$rooms,true)?$s['room']:'bad',
  'floor'=>clean_str($s['floor']??'',40),'wall'=>clean_str($s['wall']??'',40),
  'light'=>max(15,min(100,(int)($s['light']??80))),
  'sink'=>max(0,(int)($s['sink']??0)),'table'=>max(0,(int)($s['table']??0)),
  'top'=>is_array($s['top']??null)?clean_top($s['top']):null,
  'view'=>in_array($s['view']??'',$views,true)?$s['view']:'door',
  'names'=>[],'created'=>gmdate('c'),
];
foreach(['floor','wall','sink','table','top'] as $k){$n=clean_str($s['names'][$k]??'',90);if($n!=='')$state['names'][$k]=$n;}
$img=$d['image']??'';
if(!is_string($img)||!str_starts_with($img,'data:image/jpeg;base64,'))out(400,['error'=>'Mangler bilde']);
$bin=base64_decode(substr($img,23),true);
if($bin===false||strlen($bin)>650000)out(400,['error'=>'Ugyldig bilde']);
$info=@getimagesizefromstring($bin);
if(!$info||$info[2]!==IMAGETYPE_JPEG||$info[0]>1600||$info[1]>1600||$info[0]<200)out(400,['error'=>'Ugyldig bilde']);
do{$id=new_id();}while(is_file("$dir/$id.json"));
if(!write_atomic("$dir/$id.jpg",$bin)||!write_atomic("$dir/$id.json",json_encode($state,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)))out(500,['error'=>'Kunne ikke lagre']);
out(201,['id'=>$id,'url'=>SITE.'del.php?o='.$id]);
