# Heimslig v5 — integrated room and price studio

Fixes the disconnected v4 budget form above the showroom. A single room state now drives the room geometry, furniture list and estimate. The existing header, logo, menu, footer, social page and other KSH sites remain intact.

- Room width, length and height; living, dining and bedroom labels with suggested furniture.
- Six illustrative furniture types, per-item dimensions, finish, position and rotation; add, duplicate and remove up to 20 items.
- Wall colours, four floors, stone tile format and pattern, day/evening lighting; camera presets, drag rotation, zoom and fullscreen on WebGL devices.
- Exact floor area plus user-selected waste; per-item amounts, material-specific price per square metre and delivery.
- Missing prices remain explicitly missing. Totals are marked partial until all amounts are entered. No invented catalog prices. Resizing or changing furniture finish clears its previous price estimate.
- Local browser persistence, copyable specification and print/PDF via the browser.
- A dimensioned 2D plan if WebGL is unavailable; the calculator and controls stay functional. Furniture crossing room boundaries is flagged. Collision checking and wall/installation pricing are not included.

The Stenhuset reference informed the grouped room/material/dimensions/price controls. These are illustrative Heimslig models, not Stenhuset product data or prices.

## Install on the existing VPS

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/heimslig-v5/install.sh -o /tmp/heimslig-v5-install.sh && sudo bash /tmp/heimslig-v5-install.sh
```

Optional first argument: another Heimslig document root. Downloads are staged and checked with SHA256SUMS before any site changes. Existing files are copied to a dated directory under `/var/backups/setaei`; the installer prints its precise restore command. Re-running does not duplicate includes. Existing v4 budget browser storage is preserved; it cannot be mapped safely onto particular 3D furniture, so v5 uses a separate key.

This installer updates only the Heimslig-scoped v4 script and v5 assets, and removes the old shared renderer include only from Heimslig pages containing the known furniture viewer. It does not modify `/ksh/assets/showroom.js`.

## Validation

Core tests: amounts, zero vs missing, waste, resizing, per-material price retention, add/remove, bounds and malformed storage.
Browser: 12,000 furniture + 22 m² × 500 + 1,000 delivery = 24,000; duplicate = 36,000; remove and resize to 6 × 4 m = 26,200; material change flags missing price; restoring material and refreshing preserves amounts; finish change clears stale estimate; boundary warnings work.
The available cloud browser has WebGL disabled, so the fallback and interaction flow were verified there. The 390px mobile layout had no horizontal overflow and its price controls worked. The installer passed two consecutive fixture runs with single includes and preserved header/footer. GPU shader output and touch rotation still need checking on a WebGL-capable phone/desktop. No claim of verified production deployment.
