<?php
/* Preview image of a shared setup (used as og:image). */
require __DIR__.'/_lib.php';
$id=$_GET['id']??'';$f=DATA_DIR."/shares/$id.jpg";
if(!valid_id($id)||!is_file($f)){http_response_code(404);exit;}
header('Content-Type: image/jpeg');header('Cache-Control: public, max-age=31536000, immutable');header('Content-Length: '.filesize($f));readfile($f);
