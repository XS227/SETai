# KSH / Fliskonkurrenten – Sanipro Enzo real 3D product landing

The user-generated Higgsfield link https://higgsfield.ai/s/JpG9EMDhrTw is an **MP4** output, not an editable geometry model. This experiment replaces that UX with a real, interactive GLB, while preserving the MP4 as a linked optional reference.

## Content

- `index.html` – responsive cinematic, self-contained product-landing layout, with Google model-viewer 4.0.0 for real GLB orbit/zoom and material controls. Uses product-image URLs from Fliskonkurrenten's original site.
- `build_enzo_glb.py` – pure Python standard-library procedural reconstruction of the outer silhouette and hollow inner basin. Scale follows public L179 × W90 × H66 cm envelope. Separate materials for exterior and interior allow exterior concept color changes while inside stays white.
- `install.sh` – safe, isolated install that stages source and generates/validates a GLB BEFORE changing the webroot. Creates only `/var/www/setai/ksh/fliskonkurrenten/produkt/sanipro-enzo/`. Existing demo page (if any) is backed up under `/var/backups/setaei/`. Other KSH/Fliskonkurrenten pages are unaffected.

## Deployment

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-enzo-3d/install.sh -o /tmp/install-ksh-enzo.sh && sudo bash /tmp/install-ksh-enzo.sh
```

After deployment: https://setai.no/ksh/fliskonkurrenten/produkt/sanipro-enzo/

## Important limitations

This is NOT a supplier-CAD export, photogrammetric scan or a model recovered from the MP4. It is a **design reconstruction** based on public product imagery and published overall dimensions. It must not be used for exact plumbing, floor-load or installation design. It uses real product information from https://fliskonkurrenten.no/produkt/sanipro-enzo-badekar-hvit-179x90xh66/ and https://sanipro.no/produkt/enzo/ ; prices and availability require live verification. Demo `noindex,nofollow`, original store link, and clear prototype labelling protect against confusing the concept with the genuine retailer.

Source geometry was generated separately and verified as a valid glTF binary (4 meshes, size around 217 kB). WebGL mobile acceptance on the production VPS is a **post-deployment check**; do not claim public deployment until verified.
