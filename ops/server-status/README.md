# SETAEI server and project dashboard

Published at https://setai.no/server/ with SETAEI, Realgram and BIAB tabs.
Exactly two interface languages: English and Persian, with Persian RTL and localized numbers.
Language preference is saved in the browser; ?lang=en and ?lang=fa are supported.

## Live data
All three collectors measure actual CPU, RAM, swap, disk, uptime and physical-uplink traffic every five seconds. Each server keeps 180 real history samples. Separate project inventories show names, process counts, normalized CPU, process RSS and allocated disk bytes. Projects can be sorted by CPU, RAM or disk.

Project identification uses the most specific configured directory, safe command-path matching, systemd cgroups and process ancestry. PID start time prevents CPU reuse across unrelated processes. On SETAEI, a root-owned read-only process identity exporter refreshes a sanitized PID-to-project map every minute so the unprivileged collector can attribute root-owned PM2 processes without exposing command arguments or environment variables.

Project disk scans run in a background thread every 15 minutes. Nested projects are excluded from their parent disk scan, and same-project nested roots are counted once. Restricted scans are explicitly partial. Sites using a shared runtime do not receive fabricated per-site CPU/RAM numbers. Process RSS can count shared pages more than once and is labeled accordingly. Projects without running processes are distinguished as static, shared-service or files/archive entries. These are resource inventories, not end-to-end application health checks.

No process arguments, project paths, credentials or private logs are published. The relay whitelists all server and project fields, bounds row counts and body sizes, validates timestamps and identity, rejects unauthenticated/replayed ingestion and strips unrecognized fields.

## Host assignment
- SETAEI: 1431514
- Realgram: vps-5348441
- BIAB: vps-5359843

## Runtime
Central relay binds only to 127.0.0.1:9159 and is proxied by the existing setai.no nginx vhost under /server/remote/. Agents post through verified HTTPS with independent per-server bearer tokens. The TLS context is reused rather than reloading the certificate store for every upload. Tokens and project configuration live outside the public webroot.

The selected tab refreshes every five seconds; other tab badges every ten seconds. Polling pauses in background tabs. Samples become stale after 20 seconds and unavailable after 60. Tab changes clear data and isolate in-flight responses. Missing remote data is never replaced with SETAEI measurements.

The HTTP card and the 512 KiB speed test measure the connection to the central SETAEI dashboard, not a direct client connection to the selected remote server.

## Installation
Stage this source tree on SETAEI, preserving the existing per-server tokens in /etc/setai-server-status/remote-tokens.json. Run python3 ops/server-status/install.py setaei as root. The existing nginx include must be present. The installer validates nginx, backs up UI files, installs collectors and project configuration, restarts only monitoring, refreshes the process map and gracefully reloads nginx.

On the two agents, use the existing ubuntu account. Stage collector.py, relay.py, projects.py, install-agent.py and the matching projects-ROLE.json together. Keep the matching token in ~/.config/setai-server-status/push-token (0600), then run python3 install-agent.py realgram or biab on the matching host. Existing cron entries are retained; tagged boot/minute entries recover the unprivileged monitoring process with an exclusive flock lock. To apply collector changes, stop only that monitoring PID and run the installer again. Existing application services remain untouched.

## Verified 22 October 2026
- Python and JavaScript syntax passed.
- Relay authentication, cross-server isolation, replay/invalid-payload rejection and field redaction tests passed.
- Project tests verified longest-root attribution, no duplicate process attribution, RSS measurement and project-field validation/redaction.
- Both language dictionaries contain the same 127 keys; only en/fa are supported.
- Browser verified Persian RTL and English LTR, live project rows, sorting and switching server/language.
- All three APIs publish fresh project data without paths or secrets.
- First disk scans completed: 24 project/service groups on SETAEI, 11 on Realgram and 12 on BIAB.
- Production application services were not restarted.
