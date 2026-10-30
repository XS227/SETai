# SETAEI / Google Business Profile Performance

This is a private, read-only Google Business Profile dashboard built on top of the already installed SETAEI Flask OAuth bridge on **127.0.0.1:18767**.

## What is implemented

- Dedicated `/seo/google/dashboard` route using the existing admin session; **not public**.
- Google Search and Maps impression time-series, website clicks, phone clicks, and directions.
- Profile selector for each SETAEI listing; data are **not combined** because three potentially duplicate listings exist.
- Google monthly discovery search keywords (`value` or `threshold`), separate from Search Console rankings.
- Reviews, average rating, and reply status when the reviews API works and the listing is verified.
- Status per Google API, showing unavailable data as unavailable—not fabricated zeroes.
- SQLite with incremental per-listing metric snapshots under `/var/lib/setai-gbp/dashboard.sqlite3`.
- systemd sync every day at 06:30 and 18:30 UTC, plus first sync at install.
- Fully read-only access to Google data. No post, edit, or reply calls.

## Deployment

The installer must be run with sudo on the SETAEI VPS, **after** the existing Google OAuth and port-18767 setup is working. It requires `/etc/systemd/system/setai-gbp-oauth.service.d/20-listen-port.conf` and the existing `/etc/setai-gbp/service.env`; both should already exist.

The installed code is additive: an extra WSGI module and an override to use it, plus a systemd sync service and timer. The existing `app.py`, OAuth credentials, Nginx, existing application on port 8767 and customer websites are not modified.

`install-dashboard.sh` refuses to overwrite an existing dashboard installation and confirms the new routes reject anonymous requests. If the new WSGI fails, it removes only its new override and restarts the original OAuth WSGI. It logs the initial sync status separately so unavailable Google APIs cannot silently become fake KPI values.

## Google Cloud

API already tested: Business Profile Account Management and Business Information. Additional Google APIs may need to be enabled:

- `businessprofileperformance.googleapis.com` (performance + monthly discovery searches)
- `mybusiness.googleapis.com` (verified profile review endpoint)

Project `real-499116`, project number `790183814306`. No new OAuth scope required beyond `https://www.googleapis.com/auth/business.manage`.

## Privacy and operations

- Only existing authenticated SETAEI admin sessions can open dashboard or data API. No access tokens, client secrets or admin passwords are copied into GitHub.
- Keep `/var/lib/setai-gbp` mode `0700` and preserve the existing encrypted token file.
- `systemctl status setai-gbp-dashboard-sync.timer`
- `sudo journalctl -u setai-gbp-dashboard-sync.service -n 45 --no-pager`
- `sudo systemctl start setai-gbp-dashboard-sync.service` for a manual refresh.
- If needed, revert by removing `60-dashboard.conf`, disabling the sync timer and restarting the existing OAuth service. Keep the historical SQLite database intact.

## Verified against Google official REST specs

- `locations/*:fetchMultiDailyMetricsTimeSeries`
- `locations/*/searchkeywords/impressions/monthly`
- `accounts/*/locations/*/reviews`

Test scripts validate date parsing, per-profile isolation, search-keyword thresholds, reviews and SQLite persistence with **synthetic test data only**, never shown in the dashboard.