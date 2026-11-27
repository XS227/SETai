# KASHI progress log

## 2026-11-27 (2): branch stitched
Merged the rebuilt V2 into this branch and reconciled it with the handoff documents. See README "Implementation status".
Replaced placeholder terms (0 ISK setup fee, 15 % commission) with the Founding Partner terms; restored free-text search;
added Norwegian, offer page, sign-in preview, buyer and professional panels, seller company/team/membership/CSV,
admin roles, partner pipeline and audit log.
Tests: tools/crawl.js locally, headless Chromium: 0 errors, 0 untranslated, no horizontal overflow on checked views.
Not deployed. Not merged to main.

## 2026-11-27 (1): V2 rebuilt and published to https://kashi.is/v2/
Full client-side rebuild (21 pages, real 3D studio, EN/IS/FA). Previous single-file page backed up on the server.
Known, unfixed: v1 contact/about forms on kashi.is post to /api/kashi-contact.php, which returns 404 on that host.
