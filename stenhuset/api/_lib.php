<?php
/* Shared helpers for the Stenhuset demo API. Data lives outside the web root. */
const DATA_DIR='/var/www/setai-data/stenhuset';
const SITE='https://setai.no/stenhuset/';
if(basename($_SERVER['SCRIPT_FILENAME']??'')==='_lib.php'){http_response_code(404);exit;}
function out($code,$data){http_response_code($code);header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function valid_id($id){return is_string($id)&&preg_match('/^[A-Za-z0-9]{8}$/',$id);}
function new_id(){$a='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';$s='';for($i=0;$i<8;$i++)$s.=$a[random_int(0,strlen($a)-1)];return $s;}
function clean_str($v,$max){if(!is_string($v))return '';$v=trim(preg_replace('/[\x00-\x1F\x7F<>]/u','',$v));return mb_substr($v,0,$max);}
function rate_ok($bucket,$max,$window){
  $f=DATA_DIR.'/rate/'.$bucket.'-'.hash('sha256',($_SERVER['REMOTE_ADDR']??'').'|stenhuset').'.json';
  $now=time();$t=is_file($f)?(json_decode(@file_get_contents($f),true)?:[]):[];
  $t=array_values(array_filter($t,fn($x)=>$x>$now-$window));
  if(count($t)>=$max)return false;$t[]=$now;@file_put_contents($f,json_encode($t),LOCK_EX);return true;
}
function write_atomic($path,$data){$tmp=$path.'.tmp'.bin2hex(random_bytes(4));if(file_put_contents($tmp,$data)===false)return false;return rename($tmp,$path);}
function read_json_body($max){
  $len=(int)($_SERVER['CONTENT_LENGTH']??0);if($len<=0||$len>$max)out(413,['error'=>'For stor forespørsel']);
  $d=json_decode(file_get_contents('php://input'),true);if(!is_array($d))out(400,['error'=>'Ugyldig JSON']);return $d;
}
function load_share($id){
  if(!valid_id($id))return null;$f=DATA_DIR."/shares/$id.json";
  return is_file($f)?json_decode(file_get_contents($f),true):null;
}
