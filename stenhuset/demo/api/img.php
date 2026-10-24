<?php
/* Moved: preview pictures of shared setups now live under /stenhuset/api/. */
$q=$_SERVER['QUERY_STRING']??'';header('Location: /stenhuset/api/img.php'.($q!==''?'?'.$q:''),true,301);
