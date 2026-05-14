<?php
/**
 * Shared HTML email template for outbound offers.
 * Mobile-responsive, brand-consistent, with tracking pixel and CTA click wrapping.
 *
 * Callers must require _mail_config.php for the MAIL_* brand constants
 * and _public_url.php for public_url().
 */

require_once __DIR__ . '/_public_url.php';

function render_outreach_email_html(array $args): string {
    $subject       = $args['subject']      ?? '';
    $message_text  = $args['message_text'] ?? '';
    $company_name  = $args['company_name'] ?? '';
    $cta_url       = $args['cta_url']      ?? '';        // wrapped click URL or final URL; pass '' to hide button
    $cta_label     = $args['cta_label']    ?? 'Se tilbudet';
    $tracking_pixel_url = $args['tracking_pixel_url'] ?? ''; // empty hides the 1x1
    $reason_line   = $args['reason_line']  ?? null;      // override the "why am I getting this" footer line

    // Force all internal links through public_url so they never leak :8447.
    if ($cta_url && stripos($cta_url, 'setai.no') !== false) {
        $cta_url = public_url($cta_url);
    }
    if ($tracking_pixel_url && stripos($tracking_pixel_url, 'setai.no') !== false) {
        $tracking_pixel_url = public_url($tracking_pixel_url);
    }

    $brand     = 'SETAEI';
    $logo_url  = public_url('/assets/brand/setaei-logo.png');
    $tagline   = defined('MAIL_BRAND_TAGLINE') ? MAIL_BRAND_TAGLINE : 'Nettside, booking og digital vekst';
    $brand_url = public_url('/');
    $contact   = defined('MAIL_FROM')          ? MAIL_FROM          : 'khabat@setai.no';
    $org_no    = defined('MAIL_ORG_NUMBER')    ? MAIL_ORG_NUMBER    : '';

    $co_html       = htmlspecialchars($company_name, ENT_QUOTES, 'UTF-8');
    $subject_html  = htmlspecialchars($subject,      ENT_QUOTES, 'UTF-8');
    $message_html  = '<p style="margin:0 0 14px">' .
        implode('</p><p style="margin:0 0 14px">',
            array_map(fn($p) => nl2br(htmlspecialchars($p, ENT_QUOTES, 'UTF-8')),
                preg_split('/\n{2,}/', trim($message_text)))) .
        '</p>';

    $cta_block = '';
    if ($cta_url) {
        $cta_url_html  = htmlspecialchars($cta_url, ENT_QUOTES, 'UTF-8');
        $cta_label_html = htmlspecialchars($cta_label, ENT_QUOTES, 'UTF-8');
        $cta_block = <<<HTML
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:24px 0">
  <tr>
    <td bgcolor="#246bff" style="border-radius:10px;padding:14px 32px">
      <a href="{$cta_url_html}" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:0.1px">{$cta_label_html} &#8594;</a>
    </td>
  </tr>
</table>
HTML;
    }

    $reason = $reason_line ?? "Du mottar denne e-posten fordi {$co_html} nylig ble registrert i Br&oslash;nn&oslash;ysundregistrene.";
    $reason_html = is_string($reason) ? $reason : '';

    $org_line = $org_no ? '<br><span style="color:#aab0bb;font-size:11px">Org.nr ' . htmlspecialchars($org_no, ENT_QUOTES, 'UTF-8') . '</span>' : '';

    $pixel_html = $tracking_pixel_url
        ? '<img src="' . htmlspecialchars($tracking_pixel_url, ENT_QUOTES, 'UTF-8') . '" width="1" height="1" alt="" style="display:none;border:0" />'
        : '';

    $tagline_html   = htmlspecialchars($tagline,   ENT_QUOTES, 'UTF-8');
    $brand_url_html = htmlspecialchars($brand_url, ENT_QUOTES, 'UTF-8');
    $contact_html   = htmlspecialchars($contact,   ENT_QUOTES, 'UTF-8');
    $logo_url_html  = htmlspecialchars($logo_url,  ENT_QUOTES, 'UTF-8');
    // Display "setai.no" rather than the full URL to keep the footer clean.
    $brand_url_display = preg_replace('#^https?://#', '', $brand_url_html);

    return <<<HTML
<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{$subject_html}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#13223a">
<!-- Preheader (hidden, drives inbox preview text) -->
<div style="display:none;font-size:1px;color:#f5f7fb;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">{$tagline_html}</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#f5f7fb">
  <tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4e9f2;box-shadow:0 1px 3px rgba(17,33,72,0.04)">
      <tr><td style="background:linear-gradient(135deg,#246bff 0%,#1855d6 100%);padding:26px 32px" align="left">
        <a href="{$brand_url_html}" style="text-decoration:none;display:inline-block;line-height:0">
          <img src="{$logo_url_html}" alt="{$brand}" width="120" height="32" style="display:block;border:0;outline:none;text-decoration:none;height:32px;width:auto;max-height:32px" />
        </a>
        <div style="color:rgba(255,255,255,0.82);font-size:12px;margin-top:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:0.1px">{$tagline_html}</div>
      </td></tr>
      <tr><td style="padding:36px 32px 8px;color:#13223a;font-size:15px;line-height:1.75;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
        {$message_html}
        {$cta_block}
      </td></tr>
      <tr><td style="background:#f5f7fb;padding:22px 32px;border-top:1px solid #e4e9f2;font-size:12px;color:#66758f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
        <strong style="color:#13223a">{$brand}</strong> &mdash; {$tagline_html}<br>
        <a href="{$brand_url_html}" style="color:#246bff;text-decoration:none">{$brand_url_display}</a> &middot;
        <a href="mailto:{$contact_html}" style="color:#246bff;text-decoration:none">{$contact_html}</a>
        {$org_line}
        <br><br>
        <span style="color:#aab0bb;font-size:11px;line-height:1.5">{$reason_html} Svar &laquo;avmeld&raquo; for &aring; bli fjernet fra v&aring;r liste.</span>
      </td></tr>
    </table>
    <div style="max-width:600px;margin:14px auto 0;text-align:center;color:#aab0bb;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
      Sendt fra {$brand} &middot; <a href="{$brand_url_html}" style="color:#aab0bb;text-decoration:underline">{$brand_url_display}</a>
    </div>
  </td></tr>
</table>
{$pixel_html}
</body>
</html>
HTML;
}
