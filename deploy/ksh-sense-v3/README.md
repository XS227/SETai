# Sanipro Sense v3 — cinematic room study

First product in the requested upgraded catalog experience. Requires the existing four-product deployment.

- Pinned scroll-controlled Three.js camera path from product images into a shared room; interactive orbit and compact material/product drawers.
- Refined Sense GLB: 192 contour points per ring, consistent normals across material boundaries, KHR clearcoat and acrylic IOR. Still a reference-based reconstruction, not manufacturer CAD.
- Combines the current Sense, Vedum Flow, Z-UP and Colorker concept models in one scene. Actual product models are reused from the existing VPS deployment. Stone is explicitly a Heimdal reference photograph, not a validated stone product or scan.
- Subtotal: Sense + selected floor (3.8 × 3.4 m, 10% waste, whole packs) + one selected model each. Althea is one tile, Z-UP one panel. Excludes work, shipping and unpriced stone. Price snapshots from the existing October 31 product studies, not live offers.
- No camera AR. No paid AI generation or generated video was purchased. This is scroll-controlled real-time 3D with a product-photo fallback, not a rendered cinematic film file.
- Local storage keeps room selections. A no-WebGL browser shows photos/reference selections and a clear status.
- Installs the shared KSH v6 profiles/footer/Instagram changes first; the patched existing shared product script respects that single footer.

Run install.sh on the VPS. It prints both backup locations. Source and price details for the shared materials are in deploy/ksh-v6/SOURCES.md.

Validation: GLB generated, JavaScript syntax, shared quantity/core tests and idempotent installer fixture checks pass. Browser fallback interaction confirmed adding Vedum raises the subtotal from 38,966 to 80,891 NOK. WebGL is disabled in the test browser, so the 3D appearance and camera path are not visually GPU-verified; do not call the output verified photorealistic.
