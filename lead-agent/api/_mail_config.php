<?php

define('MAIL_HOST', getenv('MAIL_HOST') ?: 'smtp.proisp.no');
define('MAIL_PORT', (int)(getenv('MAIL_PORT') ?: 587));
define('MAIL_SECURE', getenv('MAIL_SECURE') ?: 'tls');

define('MAIL_USER', getenv('MAIL_USER') ?: 'ks@setai.no');
define('MAIL_PASS', getenv('MAIL_PASS') ?: 'Trust@No1_227');

define('MAIL_FROM', getenv('MAIL_FROM') ?: 'ks@setai.no');
define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'SETAEI');
