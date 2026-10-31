# Heimslig v6 — photo-scanned surface upgrade

Scope: ONLY `/ksh/heimslig/` 3D studio. Does not change prices, calculator logic, page structure, logos, navigation, footer, KSH siblings or checkout.

## What changes

The v5 WebGL room renderer now reads **21 genuine 1K photographic PBR maps** (colour, OpenGL normal, roughness) from 7 assets:
- Oak floor: [Laminate Floor 02](https://polyhaven.com/a/laminate_floor_02) (visible wood planks)
- Furniture wood: [Oak Veneer 03](https://polyhaven.com/a/oak_veneer_03)
- Concrete: [Concrete Floor](https://polyhaven.com/a/concrete_floor)
- Painted plaster walls: [Plastered Wall 05](https://polyhaven.com/a/plastered_wall_05)
- Stone/tile: [Stone Tiles](https://polyhaven.com/a/stone_tiles)
- Slate: [Slate Floor](https://polyhaven.com/a/slate_floor)
- Upholstery: [Wool Boucle](https://polyhaven.com/a/wool_boucle)

All assets: **Poly Haven CC0**: https://polyhaven.com/license. Each texture map is downloaded from its official Poly Haven CDN and verified against an individual upstream MD5 from Poly Haven's asset API. Maps are hosted on the user's own site after installation (no cross-origin image load in production). If a map fails to load, WebGL retains the original procedural preview for that surface; if WebGL is unavailable, the v5 2D plan and calculator remain.

This is a **PBR-map-enhanced custom WebGL renderer**, not a fully path-traced or physically calibrated renderer. Room shape and six simple illustrative furniture models remain unchanged. These are genuine real-world material scans, **not confirmed Heimslig catalogue material IDs or actual product photography**. No claims about actual Heimslig assortment.

## Safe deployment

Requirements: existing working Heimslig v5, bash, curl, md5sum, Python3, optional Node for syntax check, and free local space for ~13–18 MB of source textures.

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/heimslig-v6/install.sh -o /tmp/heimslig-v6-install.sh && sudo bash /tmp/heimslig-v6-install.sh
```

The installer fully downloads and verifies all 21 texture maps **before** touching site files. It updates only existing Heimslig viewer pages to load `/ksh/heimslig/assets/v6/room-renderer.js?v=6.0`, preserving v5 core, controls, price studio and 2D fallback. It backs up changed HTML files and existing v6 assets to `/var/backups/setaei/heimslig-v6-<date>`; a precise restore command is printed. Safe to rerun; no duplicate renderer script includes.

## Verification

1. Visit https://setai.no/ksh/heimslig/3d-studio/?v=6 with a WebGL-capable browser.
2. Confirm label `PBR MATERIALER` appears once all 21 local maps load. Check no 404 responses under `assets/v6/textures/`.
3. Change floor Eik / Betong / Skifer / Kalkstein, and wall colour. Ensure texture remains distinct, not plain colour.
4. Change sofa finish, room dimensions and rotate/zoom; budget must still respond and persist.
5. Turn off WebGL to confirm 2D fallback and pricing functions.
6. Confirm KSH sibling sites and shared footer are untouched.

This package was source-validated (JavaScript compilation/manifest consistency). Live GPU and production acceptance testing require installing it on the authorized VPS. Do not mark v6 as deployed until independently confirmed.
