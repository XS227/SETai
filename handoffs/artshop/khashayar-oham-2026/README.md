# SETAI ART — Khashayar Shahrokhi / Oham Collection 2026

## Verified artwork facts
- Artist: Khashayar Shahrokhi (خشایار شاهرخی).
- Collection: Oham Collection.
- Year: 2026.
- Medium: **Triple-fired ceramic** (Persian: **سرامیک سه بار پخته شده**).
- Price display: **Price on request** only; no public numerical prices.
- Measurements, artwork title, edition, and sales availability are **not yet confirmed**. Do not invent these.

## Images
There are **13 user-provided original photos**: 45549.jpg, 45551.jpg, 45552.jpg, IMG-20261028-WA0036.jpg, IMG-20261028-WA0037.jpg, IMG-20261028-WA0038.jpg, IMG-20261028-WA0040.jpg, IMG-20261028-WA0041.jpg, IMG-20261028-WA0042.jpg, IMG-20261028-WA0043.jpg, IMG-20261028-WA0045.jpg, IMG-20261028-WA0046.jpg, IMG-20261028-WA0047.jpg. Source: ChatGPT Art project conversation, 28 October 2026. **Binary photos have not yet been transferred to GitHub**; obtain the accompanying ZIP from the user, or original attachments. AI studio renders are artistic visualizations only, not photographic evidence; clearly label them if displayed.

## Claude Code handoff — implement on actual site
1. Identify and back up the **actual source and deployment location** for `https://setai.no/artshop/`; this GitHub repository contains an unrelated Django SETai MVP and is **not verified** as the artshop frontend source. No live site change has yet been made.
2. Upload all 13 original photos (optimized WebP plus original preservation) to `/artshop/` asset system; build an image gallery with image zoom, lightbox, touch pinch and swipe, accessibility and lazy loading. Do not conflate photo-angle carousel with a faithful 3D mesh.
3. Add artwork record under **Oham Collection (2026)**: triple-fired ceramic, title/size/edition pending, contact `art@setai.no`.
4. **Restore/preserve the existing separate original `Oham` painting** section, images and details (painting, 210 x 270 cm) shown on the current artist page; do not replace this painting with the new sculpture.
5. For the artwork, a true rotatable 3D viewer needs a validated GLB/glTF mesh generated from aligned photogrammetry with multi-view front, side, rear, top and scale references. Start with labeled multi-angle photo viewer; only expose 3D toggle when a reviewed mesh exists. Preserve exact surface pattern, facial features and silhouette; do not hallucinate geometry or textures without explicit approval.
6. **Across the entire Artshop**, remove all public numeric artwork prices from product cards, detail pages, JSON-LD structured data, feeds, open-graph metadata, search/filter/sorting UI, APIs/SSR and cached pages. Replace with `Price on request` / `Pris på forespørsel` and an email/inquiry flow. Internal confidential price fields may be retained; no leakage to public. Ensure cart/checkout is not showing stale prices; do not break unrelated commerce workflows without a review.
7. Update downloadable artist CV and a factual one-page artwork sheet with supplied year, ceramic technique and existing verified exhibition history. Do not publish personal contact details beyond existing `art@setai.no` without permission.
8. Test mobile and desktop, detail zoom, 3D fallback, Oham painting preservation, no numeric prices (HTML source/API/structured data), link health, and PDF downloads; deploy only after tests and report live URLs and commit SHAs.

## Hand-off status
**GitHub handoff metadata published only.** Original image binaries and live deploy **not yet uploaded/published**. A local ZIP and revised PDF can be provided by the originating agent to complete the handoff.

## 2026 drawings: 7 works on paper
20 original JPGs plus WebP and thumbnails in assets. catalog.json and drawings.json are ready for Claude Code import. See CLAUDE_CODE_NEXT_STEPS.md. Provisional titles/techniques; no invented years or cm sizes.
