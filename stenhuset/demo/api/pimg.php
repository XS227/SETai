<?php
/* Moved: preview pictures of shared setups now live under /stenhuset/api/. */
$q=$_SERVER['QUERY_STRING']??'';header('Location: /stenhuset/api/pimg.php'.($q!==''?'?'.$q:''),true,301);
