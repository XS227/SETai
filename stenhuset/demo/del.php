<?php
/* The site moved from /stenhuset/demo/ to /stenhuset/; links that were already shared keep working. */
$q=$_SERVER['QUERY_STRING']??'';header('Location: /stenhuset/del.php'.($q!==''?'?'.$q:''),true,301);
