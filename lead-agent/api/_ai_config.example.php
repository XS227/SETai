<?php
/**
 * AI config template — copy to _ai_config.php and fill in your Anthropic API key.
 * _ai_config.php is gitignored. Never commit the real key.
 */
return [
    'api_key' => getenv('ANTHROPIC_API_KEY') ?: '',
    'model'   => 'claude-opus-4-7',
    'enabled' => true,
];
