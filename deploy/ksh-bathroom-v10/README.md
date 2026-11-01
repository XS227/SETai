# KSH Fliskonkurrenten showroom v10 — realistic walls, camera attention, Z Fold layout

This completes reported bugs from the customer's Samsung Galaxy Z Fold screenshot.

## Fixes

**Colorker Althea Sand Dekor** was rendered as one blank plate on a wall. Selecting it now covers the **whole back wall by default**, using repeated 59.5 × 119.2 cm tiles, 3 mm visual grout lines and the product's locally hosted detail texture. The product settings offer `Bakvegg`, `Venstre vegg`, and `Begge veggene`. It is no longer added as a floating GLB panel. The estimated wall surface is priced at the listed **1,299 kr/m²** with **10% cutting allowance**; estimated physical tile count is calculated for context, not guaranteed as an exact pack quantity. Actual wall preparation, waterproofing, joints, labour and VAT qualification must be verified before a commercial quote.

**Z-UP Eik Sort** was also added as a solitary panel. It is now repeated across the right wall with partial final-panel scaling, and the estimator counts panels of 60 cm width at 1,999 kr each. Existing product source GLB files are retained unchanged.

**Camera feedback**: adding Sense, Vedum, Z-UP or Althea now automatically closes the selection drawer and animates the 3D camera toward the product's placement. The animation observes reduced-motion accessibility settings. The camera reset control continues to work; removing products still updates the 3D scene and budget. Direct `?add=product` arrivals also get product focus.

**Galaxy Z Fold / responsive UI**: previously the drawer was a 340 px side panel even on large-screen phones and tablets, obscuring the content. At CSS widths up to 1180 px it becomes a small **bottom sheet** (max 355 px or 42% showroom height), with total above it; at narrow widths a smaller sheet is used. Selecting a product closes the sheet automatically. Page styles respect mobile landscape and foldable CSS widths. The JS no longer sets competing inline price positions on compact viewports.

**No accidental global changes**: Existing branding, footer, headers, product landings and GLB source files stay intact. Only `showroom/index.html`, `produkt/sanipro-sense/index.html` and `assets/sense-film-v4/landing.js` are updated to load the isolated `assets/bathroom-v10/{room.js,layout.js,room.css}`. Original content and assets remain in place.

## Deployment
```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-bathroom-v10/install.sh -o /tmp/ksh-bathroom-v10.sh && sudo bash /tmp/ksh-bathroom-v10.sh
```

Installer runs Node JS syntax checks and regression tests for no floor, wall area, full wall tile price and repeated Z-UP panel price before touching live files. Scoped atomic backups are stored in `/var/backups/setaei/ksh-bathroom-v10-*` with a `created.json` rollback manifest.

## Acceptance checks

1. Open `https://setai.no/ksh/fliskonkurrenten/showroom/`. Remove all products, then select Colorker. Confirm **full back wall** is covered with sand tiles (not one white rectangle) and camera moves toward it.
2. Reopen products. Change wall selector to `Venstre vegg` and `Begge veggene`. Verify wall coverage and m² estimate change, with 10% estimated cutting waste.
3. Add Z-UP: check repeated dark panels along right wall and price by 60 cm panel count. Add Vedum: camera centers on its location. Add Sense: camera moves to tub.
4. Remove products individually and via clear action; ensure scene and estimate update.
5. Use Z Fold inner display / portrait, cover display and landscape: the drawer is a bottom sheet and never permanently hides the product. Click the product to automatically close the sheet and focus the camera.
6. Refresh: selected wall, floor and products persist in localStorage.

Important: tile material appearance is an illustrative visualization with a retailer reference photo, **not calibrated product PBR scans or exact grout/installation instructions**. Mobile devices need physical acceptance QA after deployment. No real camera AR is claimed.
