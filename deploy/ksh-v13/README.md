# SETAEI KSH · Fliskonkurrenten v13

## Product landing 3D consistency — Vedum Flow

The stand-alone Vedum cinematic product landing was visually pale despite the correct darker fog-green finish and textured Turbine Grey composite-stone top in the interactive shared bathroom. Cause: the product's original glTF encoded 8-bit **sRGB** surface values as if they were **linear** PBR factors, causing an over-bright result in `<model-viewer>`, whereas the showroom renderer explicitly converted `THREE.Color.set('#hex')` to linear.

`build_vedum.py` makes a separate `model-turbine-v13.glb` from the existing v9 model. The new GLB uses the **same linear-space color values and roughness** as the production showroom: fog green, drawer fronts, shadow slots, Turbine Grey (manufacturer's embedded textured top), white Zone basin, and metal. **All original geometry, UVs, and manufacturer photograph embedded in v9 are preserved.** Low-poly illustrative modeling is not passed off as manufacturer's official CAD.

On the Vedum landing, the 3D viewer now loads the v13 GLB, with tone mapping exposure reduced from 1.15 to 0.93. A nearby true-product reference photograph allows customers to compare the finish. The button to visualize the item in the shared bathroom remains.

## Complete category catalog and image banners

Public taxonomy extracted from Fliskonkurrenten's official shop. This prototype has **9 editorial category groups** and **42 category/subcategory cards**:
- Fliser: bad, kitchen, entrance, marble look, mosaic, terrazzo, outside
- Baderom: bathtubs, showers, furniture, basins, shower/basin fittings, mirrors
- Naturstein: marble, slate, irregular flags, paving slate, stepping stones, further slate and dry stone
- Benkeplater: Dekton, Silestone, granite, marble, terrazzo and Lundhs
- Tilbehør: grout/silicone, glue, membrane, trims, mortar, tools, PPE, care, Akemi and Mapei
- Spileplater
- Outlet
- Støp og avretting
- Vaskerom

Original taxonomy contains duplicate kitchen-flis categories; the proposal consolidates them visually.

Each category/subcategory has a **clickable image banner**. During installation, `catalog.py` collects actual product photo URLs from the retailer's public category listing and downloads local images. Preliminary audit retrieved 32 distinct category source images. Ten missing source categories reuse a relevant product image from their material group and disclose this. The user sees **no WordPress placeholder illustrations**. This remains a demo: prices/live stock aren't invented for category pages and products aren't sold here.

New navigation and sites:
- `/ksh/fliskonkurrenten/kategorier/`: full responsive category directory with image banners.
- `/ksh/fliskonkurrenten/kategorier/?kategori=fliser-marmorlook`: example deep link to detailed subcategory with category product titles; all 42 categories have similar links.
- Home proposal includes nine picture-led banners to the full category hub; shared proposal pages get a Kategorier navigation link.
- Category footer mirrors the existing KSH approved footer/brand.

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-v13/install.sh -o /tmp/ksh-v13-install.sh && sudo bash /tmp/ksh-v13-install.sh
```

Requires existing KSH v12 and original v9 Vedum GLB. It downloads and validates source product photos, generates the v13 GLB, checks JS/Python and expected category counts, makes backups before any edits, then publishes only Fliskonkurrenten paths. Previous v9 GLB is retained; no other KSH business pages touched. Backup path displayed.

## QA

1. Compare standalone Vedum rotating model with showroom: both should have muted fog-green drawers and photographic dark-grey Turbine Grey with a separate white bowl. Rotate to inspect sides. Check the "real product" reference photo below the model.
2. Open /kategorier and scroll nine sections; all 42 category banners show a real material photograph, title, and description. No screw image for Z-UP and no broken placeholder thumbnails.
3. Click "Marmorlook", "Fliser Bad", "Baderomsinnredning", "Skifer", "Outlet" etc.; correct category detail shows product source examples and internal navigation. Click home-category banners and ensure anchor navigation scrolls to the target section *after async catalog loads*.
4. On Z Fold (both covers/inner screen), check three-column desktop banners become one column on narrow viewport, header burger menu, touch scrolling, back navigation, consistent footer.
5. Confirm other product landings, 3D showroom, costs, camera and user selections are unchanged.

Source site taxonomy: https://fliskonkurrenten.no/ . Source photography is for an unindexed customer proposal; request permission for public commercial reuse if promoted to a production site.
