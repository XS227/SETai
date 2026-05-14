<?php

define('MAIL_HOST', getenv('MAIL_HOST') ?: 'smtp.proisp.no');
define('MAIL_PORT', (int)(getenv('MAIL_PORT') ?: 587));
define('MAIL_SECURE', getenv('MAIL_SECURE') ?: 'tls');

define('MAIL_USER', getenv('MAIL_USER') ?: 'ks@setai.no');
define('MAIL_PASS', getenv('MAIL_PASS') ?: 'Trust@No1_227');

define('MAIL_FROM', getenv('MAIL_FROM') ?: 'ks@setai.no');
define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'SETAEI');

// Contact inbox for landing-page form submissions.
define('LANDING_INBOX', getenv('SETAEI_LANDING_INBOX') ?: 'ks@setai.no');

// Public canonical site URL. ALL outbound URLs must use this — never derive
// from $_SERVER['HTTP_HOST']/SERVER_PORT, which leaks the proxy port (:8447)
// and breaks every email/tracking redirect.
define('PUBLIC_BASE_URL', rtrim(getenv('SETAEI_PUBLIC_BASE_URL') ?: 'https://setai.no', '/'));

// SETAEI branding (used in email footer, landing pages, etc.)
define('MAIL_ORG_NUMBER',   getenv('SETAEI_ORG_NUMBER') ?: '');
define('MAIL_BRAND_TAGLINE', 'Nettside, booking og digital vekst for norske bedrifter');
define('MAIL_SIGNATORY',    'Khabat Setaei');
define('MAIL_BRAND_URL',    PUBLIC_BASE_URL);
