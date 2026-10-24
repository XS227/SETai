<?php
/* Instagram "shop the look" list. GET -> looks; POST with the admin token -> replace the list.
 * The token is the first line of DATA_DIR/admin-token.txt (outside the web root, not in git). No file = editing is off. */
require __DIR__.'/_lib.php';
$file=DATA_DIR.'/looks.json';$seed=__DIR__.'/../looks-seed-v1.json';
if($_SERVER['REQUEST_METHOD']==='GET'){
  header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-cache');
  readfile(is_file($file)?$file:$seed);exit;
}
if($_SERVER['REQUEST_METHOD']!=='POST')out(405,['error'=>'Metode ikke tillatt']);
if(!rate_ok('looks',30,3600))out(429,['error'=>'For mange forsøk']);
$expected=is_file(DATA_DIR.'/admin-token.txt')?trim(strtok(file_get_contents(DATA_DIR.'/admin-token.txt'),"\n")):'';
$tok=$_SERVER['HTTP_X_ADMIN_TOKEN']??'';
if(strlen($expected)<20)out(503,['error'=>'Redigering er ikke slått på (mangler adminnøkkel på serveren)']);
if(!is_string($tok)||!hash_equals($expected,$tok))out(403,['error'=>'Feil adminnøkkel']);
$d=read_json_body(200000);$in=$d['looks']??null;if(!is_array($in)||count($in)>80)out(400,['error'=>'Ugyldig liste']);
$looks=[];$seen=[];
foreach($in as $l){
  if(!is_array($l))continue;
  $u=trim((string)($l['url']??''));
  if(preg_match('~^https://(www\.)?instagram\.com/(p|reel|tv)/([A-Za-z0-9_-]{5,40})/?~',$u,$m)){
    $code=$m[3];$src='instagram';$kind=$m[2]==='reel'?'reel':'p';$url='https://www.instagram.com/'.$kind.'/'.$code.'/';
  }elseif(strlen($u)<=300&&preg_match('~^https://(www\.|m\.|web\.)?facebook\.com/([A-Za-z0-9._\-/?=&%]+)$~',$u,$m)){
    // Facebook post, photo or video from the page; embedded with Facebook's own post/video plugin
    $url='https://www.facebook.com/'.$m[2];$code='fb'.substr(sha1($url),0,10);$src='facebook';
    $kind=preg_match('~/(videos|reel|watch)~',$url)?'video':'post';
  }else out(400,['error'=>'Ugyldig lenke (bruk et Instagram- eller Facebook-innlegg): '.clean_str($u,80)]);
  if(isset($seen[$code]))continue;$seen[$code]=1;
  $prods=array_values(array_unique(array_filter(array_map('intval',is_array($l['products']??null)?$l['products']:[]),fn($x)=>$x>0)));
  $looks[]=['id'=>$code,'source'=>$src,'kind'=>$kind,'url'=>$url,
    'title'=>clean_str($l['title']??'',120),'text'=>clean_str($l['text']??'',400),
    'room'=>in_array($l['room']??'',['bad','kjokken','stue'],true)?$l['room']:'',
    'products'=>array_slice($prods,0,12)];
}
$doc=['updated'=>gmdate('c'),'account'=>'stenhuset_no','facebook'=>'https://www.facebook.com/stenhuset.no','looks'=>$looks];
if(is_file($file))@copy($file,DATA_DIR.'/looks.backup-'.gmdate('Ymd-His').'.json');
if(!write_atomic($file,json_encode($doc,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT)))out(500,['error'=>'Kunne ikke lagre']);
out(200,['ok'=>true,'count'=>count($looks)]);
