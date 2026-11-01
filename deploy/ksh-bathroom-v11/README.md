# KSH Fliskonkurrenten – Showroom v11

Adds three new live 3D controls on top of production v10. No changes to product models, tiles, flooring selection, prices, branding or footers.

## Features

**Fullskjerm**: a visible maximize icon in the top-right of the showroom. Uses the standard browser Fullscreen API to display the *entire showroom* (not just a cropped WebGL canvas), including tool buttons and live price. In browsers that reject the Fullscreen API (common on certain iOS versions), an accessible full-viewport CSS fallback is used. The button switches to **Lukk fullskjerm**. Escape exits fullscreen when applicable. The renderer adjusts its canvas size upon changing mode. Mobile/Z Fold gets a separate compact floating icon that does not displace the seven existing tools.

**Lys**: retains Dagslys and Kveldslys, now with two live sliders:
- Lysstyrke **20–180 %**, default 100 %.
- Fargetemperatur **2700–6500 Kelvin**, default 5500 K (warmer to cooler).
Inputs update directional sunlight intensity and hue, hemisphere ambient intensity and WebGL tone mapping in real time **without rebuilding 3D tiles/models**. Settings persist in the existing `ksh-bathroom-v6` localStorage room state. Day/evening presets reset brightness/temperature. This is visual representation, not calibrated lighting for installation or precise product color decisions.

**Kameravisninger**: new toolbar icon (2×2 square grid). Five animated views:
1. **Oversikt** – room-wide angled perspective
2. **Forfra** – looking toward the back wall
3. **Venstre vegg** – where Althea tiles and Vedum appear
4. **Høyre vegg** – where paneling is placed
5. **Ovenfra** – top-down plan

Each view closes the control sheet before moving the camera, respects `prefers-reduced-motion`, and leaves mouse/touch rotation and product-specific `Vis` focusing intact. Reset-camera remains a separate tool.

## Scope & deployment

The installer only installs `/ksh/fliskonkurrenten/assets/bathroom-v11/{room.js,room.css,layout.js}` and updates versioned references in:
- `/ksh/fliskonkurrenten/showroom/index.html`
- `/ksh/fliskonkurrenten/produkt/sanipro-sense/index.html`
- `/ksh/fliskonkurrenten/assets/sense-film-v4/landing.js`

It checks syntax and regression pricing, backs up all changed files under `/var/backups/setaei/ksh-bathroom-v11-*`, stages atomic writes, and rolls back partial changes on error.

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-bathroom-v11/install.sh -o /tmp/ksh-bathroom-v11.sh && sudo bash /tmp/ksh-bathroom-v11.sh
```

## Acceptance

1. Open `https://setai.no/ksh/fliskonkurrenten/showroom/?v=11`, press the top-right **Fullskjerm** button. Confirm canvas **and UI** fill display and exit button restores layout.
2. Open **Lys**, adjust 20% to 180% and 2700 K to 6500 K. Confirm live changes are visible and preserve existing prices/models. Reload and confirm slider values persisted.
3. Open **Kameravisninger**, select each of five modes. Ensure 3D moves, and user can still drag orbit afterwards.
4. Add Colorker, Vedum and Z-UP: correct full-wall geometry remains and product-specific camera focus works as before.
5. Try desktop, unfolded Galaxy Z Fold, cover screen and landscape orientation. The fullscreen control should remain reachable without overlapping the main icon row.
6. If WebGL is unavailable, tools should not crash; the existing plan/price fallback remains.

Source preflight was executed on the authorized VPS (syntax and quantity tests). Actual browser acceptance is required separately before marking visually complete.
