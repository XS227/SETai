# Sense Room v5 — orientation, placement and live estimate

Fixes the uploaded screenshot: the three companion GLBs were exported Z-up, but the scene was Y-up. Each model is now rotated at its root, centered in X/Z, and anchored at its own bottom before wall placement. Its authored metre dimensions are validated; no arbitrary stretching or guessed unit scaling is used.

- Sense: Y-up, 1.7 × 0.6 × 0.8m, floor-mounted with its rear against the back wall.
- Vedum: converted to Y-up, 1.205 × 0.422 × 0.628m, front facing inward from the left wall, bottom at 0.48m, top about 0.902m.
- Z-UP: converted upright, 0.6 × 2.798 × 0.02085m, flush with the back wall from the floor.
- Colorker: converted upright, 0.595 × 1.192 × 0.01135m, mounted on the left wall above the vanity (bottom 1.1m).
- Stone reference is displayed in the product drawer as a reference photograph, rather than a floating picture in the 3D room. It remains unpriced.
- Removes the unrelated decorative window/mirror from this room using an opt-in renderer option. Other callers keep their existing default scene.
- Six 44px icon controls: dimensions, floor, products, light, camera and calculator. No large “Tilpass dette rommet” CTA.
- Persistent price pill plus a price drawer: live product lines, floor area, waste, whole packages, known subtotal and explicit missing-price status. Changing room width/length repositions wall-mounted objects and recalculates quantities. Existing saved room/material choices migrate to the new storage key; invalid small dimensions are bounded to fit these models.
- Fixes the bare button CSS selector that put a focus outline on every button. Focus indicators now appear on keyboard focus.

Requires existing Sense Film v4. The installer preserves the current landing page/movie/footer and edits only its room loader and versioned CSS link; existing landing JS/CSS are patched rather than replaced wholesale. All replaced files are backed up.

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-sense-room-v5/install.sh -o /tmp/ksh-sense-room-v5.sh && sudo bash /tmp/ksh-sense-room-v5.sh
```

Product prices, reconstructed CAD status, material sources and exclusion of work/shipping remain as documented in the earlier product studies. Våtrom suitability is not certified by this visual combination.
