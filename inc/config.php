<?php

declare(strict_types=1);

return [
    'smtp' => [
        'host' => getenv('SMTP_HOST') ?: 'SMTP_HOST',
        'port' => (int) (getenv('SMTP_PORT') ?: 587),
        'user' => getenv('SMTP_USER') ?: 'SMTP_USER',
        'pass' => getenv('SMTP_PASS') ?: 'SMTP_PASS',
        'secure' => getenv('SMTP_SECURE') ?: 'tls',
        'from_email' => getenv('MAIL_FROM') ?: 'no-reply@setaei.com',
        'from_name' => getenv('MAIL_FROM_NAME') ?: 'SETAEI Starter',
    ],
    'contact_recipient' => 'khabat.setaei@gmail.com',
    'rate_limit' => [
        'window_seconds' => 600,
        'max_attempts' => 5,
    ],
    'storage_path' => __DIR__ . '/../tmp',
    'db_dsn' => getenv('STARTER_DB_DSN') ?: '',
    'db_user' => getenv('STARTER_DB_USER') ?: '',
    'db_pass' => getenv('STARTER_DB_PASS') ?: '',
];
