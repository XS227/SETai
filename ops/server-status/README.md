# SETAEI server status

Public dashboard: https://setai.no/server/

## Runtime
- Python standard library only. Samples Linux /proc every 5 seconds.
- RAM used is MemTotal minus MemAvailable; swap is shown separately.
- CPU uses differences in the first eight aggregate CPU counters, with idle plus iowait excluded.
- Root disk percentage is used / (used + space available to unprivileged users), matching df.
- Network traffic sums eth*, en*, wl* uplinks; loopback, bridge and VPN interfaces are excluded to avoid double counting.
- History keeps 180 real samples in memory (approximately 15 minutes); restarting the collector resets history.
- Service checks every 30 seconds connect to local nginx TCP port 80 and the PHP-FPM Unix socket.
- Unknown probe errors are shown as unknown, not stopped.
- No credentials, IP addresses, process lists or logs are included in the public JSON.
- Runtime JSON and the random 512 KiB download payload live in /run/setai-server-status (RAM-backed).
- Browser polling pauses in hidden tabs and during speed tests. Values become stale after 20 seconds and unavailable after 60.
- Speed test measures three HTTP requests and one 512 KiB download; it is indicative client-to-server throughput.
- Page has noindex/nofollow. No page was added to the public sitemap.

## Install
1. Copy collector.py to /opt/setai-server-status/collector.py.
2. Copy the unit to /etc/systemd/system/setai-server-status.service.
3. Copy nginx.conf to /etc/nginx/snippets/setai-server-status.conf.
4. Include that snippet inside the existing setai.no HTTPS server block.
5. Deploy server/index.html, server/style.css and server/app.js beneath /var/www/setai/server/.
6. Run systemctl daemon-reload and systemctl enable --now setai-server-status.
7. Verify nginx -t, then systemctl reload nginx.

The unit uses a dynamic unprivileged user, a read-only filesystem, a 48 MB memory limit and 5% CPU quota. Supplementary www-data membership permits the PHP socket probe. It automatically starts at boot.

## Validation on 22 October 2026
Python and JavaScript syntax checked. nginx -t passed. HTTPS page, assets, fresh live JSON, bounded chronological history and service probes verified. Speed payload checked for exact length, no caching and no compression. Browser verified real changing values and a completed speed test. Collector used approximately 6 MB RAM.

## Remove
Remove the snippet include from the setai.no vhost, verify nginx -t and reload nginx, then disable --now setai-server-status. Other services do not need to restart.
