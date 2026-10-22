# SETAEI server dashboard

Published at https://setai.no/server/ with tabs SETAEI, Realgram and BIAB.

## Server assignment
- SETAEI: 1431514 (central dashboard and relay)
- Realgram: vps-5348441
- BIAB: vps-5359843

## Collection and isolation
Python standard library only; actual CPU, memory, root disk, swap, uptime and physical-uplink network traffic every five seconds. CPU excludes idle and iowait. RAM used is total minus available; root disk percentage matches df semantics. Local socket probes run every 30 seconds. Missing or inaccessible PHP is unknown.

Each server keeps at most 180 real samples, approximately 15 minutes. The central collector exposes a relay bound only to 127.0.0.1:9159, proxied by the existing nginx vhost under /server/remote/. Each remote agent posts only its own aggregate metrics over verified HTTPS with an independent per-server bearer token. Tokens live outside the repository and public webroot. The relay requires authentication, enforces schema, size, timestamp, order and server identity, and strips unknown fields. Remote data is held in memory. No metrics from SETAEI are substituted for a missing remote server.

The interface clears measurements on a tab change, isolates in-flight responses by generation, retains separate per-server history and uses hash navigation and keyboard-accessible tabs. Tab badges check all servers every 10 seconds; the selected tab updates every five seconds. Measurements become stale after 20 seconds and unavailable after 60 seconds. Background tabs pause polling.

The HTTP response card and speed test measure the client connection to the central SETAEI dashboard. They do not claim to measure direct client connectivity to the selected remote server. The speed test downloads a random uncached, uncompressed 512 KiB payload.

## Installation
Central server: stage this source tree, install root-owned per-server tokens in /etc/setai-server-status/remote-tokens.json (mode 0640, group www-data), then run python3 ops/server-status/install.py setaei as root. The existing nginx include must already be present. The installer backs up dashboard files, validates nginx, restarts only the monitoring unit, and gracefully reloads nginx.

Remote servers: use install-agent.py as the existing ubuntu user. Privileged shell commands are blocked on these devices, so the agents run unprivileged. Stage collector.py, relay.py and install-agent.py together. Put the matching 64-character hexadecimal token into ~/.config/setai-server-status/push-token (0600), then run python3 install-agent.py realgram or biab on the matching host. This creates a private launcher, an exclusive flock lock, and tagged crontab entries at boot and every minute for recovery. Existing cron entries are retained. No production application service is restarted or reconfigured.

Restarting the central collector clears received history until agents send their next sample. To remove an agent, remove only the cron lines tagged setai-server-status-agent and stop its collector. Secrets are never committed.

## Verification on 22 October 2026
- Python and JavaScript syntax checked.
- Relay tests passed: authentication, cross-server token isolation, missing-server 503 response, allowlisted fields, replay rejection, invalid telemetry and bounded history.
- All three HTTPS live endpoints returned matching server IDs and samples less than 15 seconds old.
- All three history endpoints returned bounded, chronological samples.
- An unauthenticated POST returned 401.
- Browser verified real changing measurements and separate selected panels for all tabs.
- Realgram and BIAB both used approximately 92% of disk; capacity warnings are displayed.
- No production app services were restarted.
