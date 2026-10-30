# SETAEI Unified Control Room · October 2026

A private, authenticated agency workspace consolidating existing SETAEI SEO intelligence, Google Business Profile data, client navigation, leads and server links. It is an additive installation over the working SETAEI GBP OAuth bridge.

## Canonical UI

- Shortcut: `https://setai.no/control-room/`
- Authenticated application: `https://setai.no/seo/google/control-room`
- Existing admin login: `https://setai.no/seo/google/`

The shortcut is an Nginx redirect to the authenticated app, not a static public copy of client data.

## Modules

1. Agency overview: Google profile inventory and sync state from real private API, client list and follow-up queue.
2. Clients: SETAEI, Bilvaskexpress, SOMI, Volla, STYRK; only SETAEI and Bilvaskexpress show a GBP connection when real profiles are returned.
3. SEO Intelligence: existing `/seo-status.html` preserved and embedded, linked to original full report. Not a live Google Business ranking feed.
4. Google Business: authenticated `/seo/google/api/dashboard?client=setaei|bilvaskexpress`, separate accounts/profiles, 7/30/90 days, Search + Maps graph, clicks, keywords, source status.
5. Leads: links to existing Lead Agent, drafts and sales partner campaign (preserves existing access controls).
6. Projects: existing projects and sales proposals.
7. Systems: actual OAuth health check; links to existing VPS server page.

Nothing on the public `/seo/` marketing page, historical report, Lead Agent, existing Google API endpoints, or live-counter experiments is rewritten or redirected. The embedded SEO report retains its own existing Google Search Console date labels and reporting limitations.

## Security and data integrity

- Protected by existing Flask session `session['admin']` using the existing OAuth login. The cookie path `/seo/google` is preserved.
- No new passwords, tokens or OAuth credentials.
- Strict local CSP, `Cache-Control: private, no-store`, `noindex`.
- No third-party JS/CDNs and no example/fake dashboard KPI values.
- GBP customer and location IDs are selected through existing allowlisted read-only API. Never add metrics across potentially duplicate GBP profiles.
- The system has no write routes to Google Business Profile, Search Console, Lead Agent or sales endpoints.

## Deployment

On the already-authorized VPS where the Google bridge runs at port 18767:

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/d4b9c164728fd07915a72e141f4b1a3d708053cb/integrations/control-room/deploy-control-room.sh -o /tmp/deploy-setaei-control-room.sh && bash -n /tmp/deploy-setaei-control-room.sh && sudo bash /tmp/deploy-setaei-control-room.sh
```

The deploy script downloads pinned sources, pre-tests code and Flask authentication, backs up WSGI and Nginx, mounts routes into the existing Gunicorn service, checks actual JSON health and unauthenticated HTTP 403, and adds exact-match `/control-room/` redirects only after `nginx -t` passes. On failure it restores the original WSGI + Nginx and existing control-room files.

Expected final output: `CONTROL_ROOM_DEPLOYED=YES`. If server state differs, deployment aborts rather than replacing unrelated services.

## Important limitations

- The current SEO report remains an integrated legacy view pending native extraction of Search Console data.
- Lead Agent and customer website dashboards may have independent authentication; they are not silently merged into the OAuth account.
- Google Reviews still require activation of `mybusiness.googleapis.com`.
- This code is staged in the GitHub feature branch. It is not live until the VPS deploy command completes successfully. Verify URL and log in after deployment.

## Code

- `setai_control_room.py`: Flask private routes and security
- `setai_control_room.html`: one semantic workspace
- `setai_control_room.css`: responsive, premium SETAEI styling
- `setai_control_room.js`: authenticated data displays with safe DOM updates
- `test_control_room.py`: offline Flask route/access/CSP tests
- `deploy-control-room.sh`: protected installer and rollback
