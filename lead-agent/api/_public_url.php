<?php
/**
 * Public URL helper.
 *
 * EVERY outbound URL the lead-agent generates (email CTAs, tracking pixels,
 * tracking redirects, landing-page links) must go through public_url() so we
 * never leak the internal :8447 proxy port.
 *
 * Requires _mail_config.php to be loaded for the PUBLIC_BASE_URL constant.
 */

if (!function_exists('public_url')) {
    function public_url(string $path = ''): string {
        $base = defined('PUBLIC_BASE_URL') ? PUBLIC_BASE_URL : 'https://setai.no';
        if ($path === '') return $base;
        // Allow callers to pass an absolute URL — return it unchanged unless it's
        // a same-host URL with the wrong port (then rewrite to base).
        if (preg_match('#^https?://#i', $path)) {
            $parts = parse_url($path);
            if (!empty($parts['host']) && stripos($parts['host'], 'setai.no') !== false) {
                $newPath = ($parts['path'] ?? '/') . (isset($parts['query']) ? '?' . $parts['query'] : '') . (isset($parts['fragment']) ? '#' . $parts['fragment'] : '');
                return $base . $newPath;
            }
            return $path;
        }
        return $base . '/' . ltrim($path, '/');
    }
}

if (!function_exists('public_track_base')) {
    function public_track_base(): string {
        return public_url('/lead-agent/api/track.php');
    }
}
