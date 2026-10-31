# KSH v6

Warm, distinct identities; one shared footer; curated real Instagram posts; an icon-operated Heimslig room studio with synchronized quantities and estimates.

Run on the existing VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-v6/install.sh -o /tmp/ksh-v6-install.sh && sudo bash /tmp/ksh-v6-install.sh
```

Requires Python 3.9+, curl and the existing `/var/www/setai/ksh/heimslig/3d-studio/index.html`. Node is optional for syntax checks. The installer downloads pinned vendor/model/texture assets, verifies every checksum, creates a backup, then updates the pages. Re-running does not create duplicate footers, social sections, scripts or import maps.

Review `/ksh/identitet/` and `/ksh/heimslig/3d-studio/`. See SOURCES.md for provenance and honest visualization limits. The installer prints its exact backup/restore command.

The official supplier images, logos and CC0 assets are fetched during installation, not stored as repository binaries. Six original public Instagram thumbnails are included in social-images/. The Instagram selection is curated and explicitly marked; a live auto-refresh feed is not configured.

Checks: `node test-core.cjs`, `python3 test-install.py`, plus JavaScript syntax checks. Browser QA results are recorded in VALIDATION.md.
