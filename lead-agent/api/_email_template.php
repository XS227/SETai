<?php
/**
 * Shared HTML email template for outbound offers.
 * Mobile-responsive, brand-consistent, with tracking pixel and CTA click wrapping.
 *
 * Callers must require _mail_config.php for the MAIL_* brand constants.
 */

function render_outreach_email_html(array $args): string {
    $subject       = $args['subject']      ?? '';
    $message_text  = $args['message_text'] ?? '';
    $company_name  = $args['company_name'] ?? '';
    $cta_url       = $args['cta_url']      ?? '';        // wrapped click URL or final URL; pass '' to hide button
    $cta_label     = $args['cta_label']    ?? 'Se tilbudet';
    $tracking_pixel_url = $args['tracking_pixel_url'] ?? ''; // empty hides the 1x1
    $reason_line   = $args['reason_line']  ?? null;      // override the "why am I getting this" footer line

    $brand     = 'SETAEI';
    $tagline   = defined('MAIL_BRAND_TAGLINE') ? MAIL_BRAND_TAGLINE : 'Nettside, booking og digital vekst';
    $brand_url = defined('MAIL_BRAND_URL')     ? MAIL_BRAND_URL     : 'https://setai.no';
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

    $tagline_html = htmlspecialchars($tagline, ENT_QUOTES, 'UTF-8');
    $brand_url_html = htmlspecialchars($brand_url, ENT_QUOTES, 'UTF-8');
    $contact_html = htmlspecialchars($contact, ENT_QUOTES, 'UTF-8');

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
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#f5f7fb">
  <tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4e9f2;box-shadow:0 1px 3px rgba(17,33,72,0.04)">
      <tr><td style="background:linear-gradient(135deg,#246bff 0%,#1855d6 100%);padding:22px 32px">
        <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">{$brand}</span>
        <span style="color:rgba(255,255,255,0.78);font-size:12px;margin-left:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">{$tagline_html}</span>
      </td></tr>
      <tr><td style="padding:34px 32px 8px;color:#13223a;font-size:15px;line-height:1.75;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
        {$message_html}
        {$cta_block}
      </td></tr>
      <tr><td style="background:#f5f7fb;padding:22px 32px;border-top:1px solid #e4e9f2;font-size:12px;color:#66758f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
        <strong style="color:#13223a">{$brand}</strong> &mdash; {$tagline_html}<br>
        <a href="{$brand_url_html}" style="color:#246bff;text-decoration:none">{$brand_url_html}</a> &middot;
        <a href="mailto:{$contact_html}" style="color:#246bff;text-decoration:none">{$contact_html}</a>
        {$org_line}
        <br><br>
        <span style="color:#aab0bb;font-size:11px;line-height:1.5">{$reason_html} Svar &laquo;avmeld&raquo; for &aring; bli fjernet fra v&aring;r liste.</span>
      </td></tr>
    </table>
  </td></tr>
</table>
{$pixel_html}
</body>
</html>
HTML;
}
