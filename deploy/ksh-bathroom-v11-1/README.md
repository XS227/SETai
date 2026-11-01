# KSH Bathroom Showroom v11.1 – Fullscreen fallback fix

v11 introduced fullscreen, live brightness and Kelvin sliders, and five camera presets. Browser QA confirmed the light adjustments, saved settings, live quote and tool controls worked, but the non-native CSS fullscreen fallback remained trapped inside the pinned scroll container; the page header was visible outside the viewer.

v11.1 addresses the **remaining fullscreen issue**. If the native browser Fullscreen API is unsupported or denied, temporarily move the existing live `journey-stage` DOM node to `document.body`, saving its exact original position in a comment placeholder. On closing via the toolbar or Escape, reinsert the same node in its original location. This avoids transformed ancestor containing-block bugs and preserves WebGL canvas, product selection, pricing, live settings and state. The fallback uses `position: fixed; inset: 0` and a high stack order. Native fullscreen remains the preferred path. The renderer resizes on entering and exiting.

Also improves the **Ovenfra** camera preset by reducing the distance so the room fills the view better. The chosen camera perspective is announced in the status line.

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-bathroom-v11-1/install.sh -o /tmp/ksh-bathroom-v11-1.sh && sudo bash /tmp/ksh-bathroom-v11-1.sh
```

The installer is scoped to Fliskonkurrenten's showroom and existing Sanipro Sense embedded viewer; writes versioned `bathroom-v11-1` assets and backs up all replaced references. Does not modify other KSH clients, catalog prices or product models. Script preflight passed on target VPS.

QA: click Fullskjerm on desktop or Z Fold. If native browser fullscreen is not available, the **fallback must fully hide the ordinary page**, not merely enlarge a canvas inside the scroll region. Close and confirm the original page, zoom level and price are restored. Open Kameravisninger > Ovenfra and confirm a readable overhead view. Try brightness slider and product add/remove after exiting.