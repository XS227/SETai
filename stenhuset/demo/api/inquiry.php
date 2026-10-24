<?php
/* "Bestill på mål" requests. POST -> stored in DATA_DIR/inquiries (with up to 3 photos, resized in the browser).
 * GET with the admin token -> list (inquiries-admin.html); ?photo=<file> returns a photo. No e-mail is sent from the
 * demo; hooking this up to Stenhusets inbox is a deliberate later step. */
require __DIR__.'/_lib.php';
$dir=DATA_DIR.'/inquiries';if(!is_dir($dir))@mkdir($dir,0750,true);
$admin=function(){
  $expected=is_file(DATA_DIR.'/admin-token.txt')?trim(strtok(file_get_contents(DATA_DIR.'/admin-token.txt'),"\n")):'';
  $tok=$_SERVER['HTTP_X_ADMIN_TOKEN']??($_GET['k']??'');
  if(strlen($expected)<20||!is_string($tok)||!hash_equals($expected,$tok))out(403,['error'=>'Feil adminnøkkel']);
};
if($_SERVER['REQUEST_METHOD']==='GET'){
  $admin();
  if(isset($_GET['photo'])){
    $f=$_GET['photo'];if(!is_string($f)||!preg_match('/^[0-9]{8}-[A-Za-z0-9]{8}-[0-9]\.jpg$/',$f)||!is_file("$dir/$f")){http_response_code(404);exit;}
    header('Content-Type: image/jpeg');header('Cache-Control: private, max-age=3600');readfile("$dir/$f");exit;
  }
  $list=[];foreach(glob("$dir/*.json")?:[] as $f)$list[]=json_decode(file_get_contents($f),true);
  usort($list,fn($a,$b)=>strcmp($b['created']??'',$a['created']??''));out(200,['inquiries'=>$list]);
}
if($_SERVER['REQUEST_METHOD']!=='POST')out(405,['error'=>'Metode ikke tillatt']);
if(!rate_ok('inquiry',6,3600))out(429,['error'=>'For mange forespørsler. Prøv igjen senere eller ring oss.']);
$d=read_json_body(980000);
if(!empty($d['website']))out(201,['ok'=>true,'ref'=>'OK']); // honeypot: bots get a silent "ok"
$name=clean_str($d['name']??'',90);$email=clean_str($d['email']??'',120);$phone=clean_str($d['phone']??'',30);
if($name===''||($email===''&&$phone===''))out(400,['error'=>'Skriv navn og e-post eller telefon.']);
if($email!==''&&!filter_var($email,FILTER_VALIDATE_EMAIL))out(400,['error'=>'E-postadressen ser ikke riktig ut.']);
$KINDS=['benkeplate','bad','peis','bord','vinduskarm','ute','annet'];
$cfg=null;
if(is_array($d['config']??null)){$c=$d['config'];$cfg=[];
  foreach(['L','D','t','sinkX','hobX','splash'] as $k)if(isset($c[$k]))$cfg[$k]=round((float)$c[$k],3);
  foreach(['sink','hob'] as $k)if(isset($c[$k]))$cfg[$k]=!empty($c[$k]);
  foreach(['stone','edge','slab','slabName'] as $k)if(isset($c[$k]))$cfg[$k]=clean_str((string)$c[$k],80);}
do{$id=new_id();$ref=gmdate('Ymd').'-'.$id;}while(is_file("$dir/$ref.json"));
$photos=[];
foreach(array_slice(is_array($d['photos']??null)?$d['photos']:[],0,3) as $n=>$u){
  if(!is_string($u)||!str_starts_with($u,'data:image/jpeg;base64,'))continue;
  $b=base64_decode(substr($u,23),true);if($b===false||strlen($b)>280000)continue;
  $i=@getimagesizefromstring($b);if(!$i||$i[2]!==IMAGETYPE_JPEG||$i[0]>1400||$i[1]>1400)continue;
  if(write_atomic("$dir/$ref-$n.jpg",$b))$photos[]="$ref-$n.jpg";
}
$rec=[
  'ref'=>$ref,'created'=>gmdate('c'),'status'=>'ny',
  'kinds'=>array_values(array_intersect(is_array($d['kinds']??null)?$d['kinds']:[],$KINDS)),
  'measure'=>in_array($d['measure']??'',['har-mal','befaring','usikker'],true)?$d['measure']:'usikker',
  'size'=>clean_str($d['size']??'',200),'stone'=>clean_str($d['stone']??'',120),'slab'=>clean_str($d['slab']??'',80),
  'timeframe'=>clean_str($d['timeframe']??'',40),'config'=>$cfg,
  'name'=>$name,'company'=>clean_str($d['company']??'',90),'email'=>$email,'phone'=>$phone,'postcode'=>clean_str($d['postcode']??'',10),
  'message'=>clean_str($d['message']??'',2000),'photos'=>$photos,
];
if(!write_atomic("$dir/$ref.json",json_encode($rec,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT)))out(500,['error'=>'Kunne ikke lagre. Prøv igjen eller ring oss.']);
out(201,['ok'=>true,'ref'=>$ref]);
