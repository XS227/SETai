<?php
/* Photos uploaded to the project gallery (stored outside the web root). */
require __DIR__.'/_lib.php';
$f=$_GET['f']??'';
if(!is_string($f)||!preg_match('~^[a-z0-9-]{2,60}/[0-9a-f]{12}(-s)?\.jpg$~',$f)||!is_file(DATA_DIR.'/projects/'.$f)){http_response_code(404);exit;}
header('Content-Type: image/jpeg');header('Cache-Control: public, max-age=31536000, immutable');
header('Content-Length: '.filesize(DATA_DIR.'/projects/'.$f));readfile(DATA_DIR.'/projects/'.$f);
