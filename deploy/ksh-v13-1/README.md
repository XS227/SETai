# KSH Fliskonkurrenten v13.1 — same live 3D on Vedum landing

The v13 standalone GLB now has correctly calibrated fog-green PBR colors and Turbine Grey texture, but external visual QA still found the isolated object too simplistic (flat stone top, simplified round bowl) compared with the fully rendered shared showroom.

**This v13.1 change resolves the difference without pretending to have a factory CAD file.** The Vedum landing's digital showroom section now opens with a **true live iframe of the same KSH WebGL showroom scene** that the customer already approved, focused on Vedum Flow via `/ksh/fliskonkurrenten/showroom/?add=vedum&embedded=1#reisen`. It uses the same manufacturer grey stone texture, green cabinet, wall surfaces, adjustable lighting, mobile controls, other materials and camera rotation as the shared showroom — not a static render or screenshot. The iframe opens in an immersive view with site header/intro/footer hidden and stage filling the iframe.

The user can switch between two accessible tabs:
- **I baderommet · Live 3D** — default; same room renderer as the actual showroom.
- **Produkt 360°** — retains the current calibrated standalone GLB, auto-rotation and zoom controls.

All original product details, cinematic scroll, contact actions, original GLB and quote engine remain unchanged. The room opens as an internal iframe and doesn't launch camera AR.

Category image adjustments: the original retailer catalog had no product images for several kitchen-countertop brands, a laundry category and tools/dry-stone categories; the initial v13 algorithm used a wholly unrelated tile or silicone image. v13.1 replaces those with a genuinely relevant material-reference photograph from the existing KSH inventory: Vedum's real countertop for the countertop group, real furniture for utility room, underfloor installation material for tools, and real slate for dry stone. These are labeled editorial inspiration and **not** passed off as a specific Dekton/Silestone or power tool SKU.

## Deploy

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-v13-1/install.sh -o /tmp/ksh-v13-1.sh && sudo bash /tmp/ksh-v13-1.sh
```

This makes scoped backups and alters only Fliskonkurrenten's showroom, Vedum product landing, category catalog and four category photo assets. No unrelated KSH client or existing financial calculations are altered.

## QA
1. On `/produkt/vedum-flow-takegronn/?v=13.1`, scroll to "Se det fra alle vinkler". The first tab displays a **full interactive bathroom** with the real-looking Vedum on the wall; the second tab switches to a standalone orbit model.
2. Click product and material icons inside embedded room, change brightness/view, ensure scene reacts. The live-room link opens the full showroom.
3. Test at desktop, narrow mobile, Z Fold cover/inner screen, and landscape. The embedded room fills the content width with no external header inside it; tabs and controls are accessible.
4. Verify categories Benkeplater/Vaskerom/Verktøy now show plausible category-specific editorial imagery instead of irrelevant original defaults. Show disclaimers for images without exact category product photography.
5. Other product pages, original interactive showroom, prices, category counts (9, 42) and footer remain unchanged.
