<?php
// SMTP settings — set env vars on the server or edit constants here.
// If MAIL_HOST is empty, PHPMailer uses PHP's mail() function.
define('MAIL_HOST',      getenv('MAIL_HOST')      ?: '');
define('MAIL_PORT',      (int)(getenv('MAIL_PORT') ?: 587));
define('MAIL_SECURE',    getenv('MAIL_SECURE')    ?: 'tls');
define('MAIL_USER',      getenv('MAIL_USER')      ?: '');
define('MAIL_PASS',      getenv('MAIL_PASS')      ?: '');
define('MAIL_FROM',      getenv('MAIL_FROM')      ?: 'ks@setai.no');
define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'SETAEI');
