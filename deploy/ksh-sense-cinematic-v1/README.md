# Sanipro Sense 170 × 80 — cinematic product journey (KSH)

A dedicated noindex/no-follow product **design prototype**, created for SETAEI's Fliskonkurrenten KSH showcase at:

https://setai.no/ksh/fliskonkurrenten/produkt/sanipro-sense/

## Experience
- Real Sanipro Sense photos in a 100svh cinematic hero, pinned multi-chapter scroll sequence, zoom/crossfades, premium Scandinavian art direction.
- Responsive product measurements 170 × 80 × 60 cm, colour **white only**, sanitærakryl/ISOFLEX, 75 kg, 270 litres, integrated overflow, adjustable feet.
- Pinned user-controlled `<model-viewer>` GLB: orbit, zoom, auto-rotate toggle, camera reset, AR where browser supports it; poster fallback; labelled as design reconstruction.
- Dedicated colour/material, technical SVG, specification and conversion sections.
- Price **21 400 kr** as displayed by **Oslo VVS Senter on 31 October 2026**; explicitly dated and not presented as a live SETAEI/KSH product catalogue price. All purchase links lead to the original vendor's real checkout; no fake payments. Source: https://www.oslovvssenter.no/products/sanipro-sense-back-to-wall-badekar-170-80
- Site `noindex,nofollow`, no fictitious product availability.

The interactive 3D geometry is generated with `build_sense_glb.py` from the same *parameterized rings and measurements* as the saved Blender 5.2/Higgsfield 3D Jutsu project, revision 2:
https://higgsfield.ai/3d-jutsu/01c9f7da-72b6-427c-8c36-34411df27fbf

**Note:** this is a separately generated web GLB, not a byte-identical export of the saved Blender master or official Sanipro CAD. Further manufacturer CAD/GLB, product photos and physical clearance verification would improve accuracy.

## GitHub-first, one-command VPS install

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-sense-cinematic-v1/install.sh -o /tmp/ksh-sense-install.sh && sudo bash /tmp/ksh-sense-install.sh
```

The script stages the single-file HTML with inlined CSS/JS, one SVG drawing, and four product photos **directly from the original supplier CDN**. It verifies valid WebP headers, builds and validates the portable 3D GLB (Python standard library only), backs up any previous isolated page, then copies these under `/var/www/setai/ksh/fliskonkurrenten/produkt/sanipro-sense/`.

It **does not** alter the existing Fliskonkurrenten index, product listing, menus, other KSH pages, or actual merchant store. If CDN download or GLB build fails, existing site files remain untouched.

## Browser QA after deployment

- Desktop: Hero and scroll chapters work; photos crossfade/zoom; text readability at each chapter; sticky story ends naturally.
- Mobile: Layout responsive, fixed conversion link only appears when useful, no horizontal scrolling, reduced-motion preference honoured.
- 3D: Same recognizable Sense shell, orbit/zoom controls and source GLB path load from local assets; GLB is not an MP4.
- Links: Primary conversion goes to external Oslo VVS product listing, not fake local checkout.
- Inspect console and Network for script/CDN errors and check all image assets return HTTP 200.
- Keep noindex during review; no SEO publication until catalogue ownership and price/availability updates are settled.

## Credits / licensing
Product images are downloaded from the retailer's publicly accessible media CDN as supplied in the user references; ensure permission to republish commercially before using the prototype in an actual client storefront. Photo and product information sources are credited in the footer. No brand claim or sales integration is implied.
