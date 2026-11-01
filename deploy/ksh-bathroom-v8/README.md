# Fliskonkurrenten / Vedum showroom v8

Corrects the unfinished user feedback from 1 November 2026.

**Fixes**
1. The Vedum Flow cabinet appeared too bright mint-green because the old GLB used raw sRGB numbers as linear glTF baseColorFactors. V8 applies muted fog-green material presets using Three.js `Color.set('#hex')`, which correctly converts sRGB to Three's linear working color space. Distinguishes painted cabinet / drawer fronts, Turbine Grey top, white bowl and metal details. Still an illustrative concept, not factory CAD.
2. Previously Sanipro Sense was *always* in the room and quote, with no removal action. V8 puts all five entries (Sense, Vedum, Z-UP, Althea, Heimdal reference) under individually reversible add/remove controls. The controls show a remove (−) state and a **Fjern alle produkter fra rommet** action. Clearing affects both the 3D scene and price subtotal. Shared choices persist in `ksh-bathroom-v6` localStorage. First-time `showroom/?add=vedum` loads only the requested product; existing saved room choices persist until the user explicitly changes them.
3. v8 CSS improves narrow-phone, landscape, safe area, keyboard and collapsible overlay. Controls stay accessible without covering the total amount; existing editorial product-page content remains untouched.
4. The verified Vedum film has an actual duration of 4.0417 seconds, not six. V8 uses `playbackRate = video.duration / 11` on the auto-playing hero loop to make an **11-second** playback. Pinned scroll seeking still follows the user's scrolling, rather than playing in realtime. No re-encoding or new video generation.

**Affected production files** under `/var/www/setai/ksh/fliskonkurrenten/`:
- Adds `assets/bathroom-v8/{room.js,layout.js,room.css,film.js}`.
- Updates references in `showroom/index.html`, `produkt/sanipro-sense/index.html`, `assets/sense-film-v4/landing.js`, `produkt/vedum-flow-takegronn/index.html`.
- No edits to the other two or three product landings, customer branding, global footers, photos, original GLBs or checkout.
- All file edits staged; existing files backed up at `/var/backups/setaei/`. Installer prints path and supports safe idempotent reruns.

**One-command deployment** (also callable by the agent over authorized SSH):

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-bathroom-v8/install.sh -o /tmp/ksh-bathroom-v8.sh && sudo bash /tmp/ksh-bathroom-v8.sh
```

**Acceptance:** The Vedum 3D must be muted dark grey-green (compare real video on the same display); adding/removing Sense and Vedum must update canvas and quote; clearing all should show an empty room with flooring still priced; refresh should restore state. Open on narrow phone, landscape mobile, desktop; check 11 s hero loop and unaffected scroll scrub. Review visible result before approving production use as photorealistic or manufacturer-accurate.
