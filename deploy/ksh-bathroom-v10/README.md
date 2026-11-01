# Fliskonkurrenten KSH / Bathroom Room v10

Fixes user screenshot from Z Fold (1 Nov 2026). Changes only shared bathroom viewer under `/ksh/fliskonkurrenten/showroom/` and the Sense embedded viewer.

## 1. Install surfaces as surfaces
- Colorker Althea Sand Dekor **no longer appears as an arbitrary floating single white panel**. Instead, a full-height wall finish covers the left bathroom wall, with separate 59.5 × 119.2 cm units, realistic 4 mm grout and narrow illustrative ceramic relief. This is the visualization of the tile **installed on the wall**, not a manufacturer's texture/CAD source.
- Z-UP Eik Sort likewise covers the rear wall with 600 mm-wide slat panels, rather than one detached loose slab.
- The renderer uses a handful of **instanced meshes** per wall surface (not dozens of independent CAD mesh clones), appropriate for foldable-phone GPU constraints.
- Both surfaces can still be independently added and removed. Existing room materials and Sanipro/Vedum custom GLB models unchanged.
- Wallpaper is a concept sample based on the product's tone/dimensions. Validate actual tile color and installation conditions with supplier before publishing for sale.

## 2. Calculate installed quantities, not one tile
`surfacePlan(key, room)` calculates installed whole units based on the width and height of the visualized walls and existing waste percentage:
- Althea: .595 m wide × 1.192 m tall; *left* wall length × height. For a 3.4 m × 2.8 m wall, 6 columns × 3 rows = 18 pieces, **20 order pieces with 10% waste**. Estimate: 20 × (0.595 × 1.192 × 1,299 kr/m²) = 18,426.06 kr.
- Z-UP: .600 m wide × 2.798 m tall; *rear* wall width × height. At 3.8 m wide × 2.8 m high, 7 columns × 1 row = 7 panels installed and 8 panels with 10% waste.
- Shows material count, wall area, waste and estimated subtotal in the live calculation. **Labor, adhesive, grout, moisture protection and installation not included**; this is not a construction takeoff or binding offer.

## 3. Product-specific camera fly-to
Adding a product now closes the editing panel and animates the Three.js camera toward that product or surface. A separate "Vis" button on selected products refocuses the camera without removing anything. Camera movement can be interrupted by user touch, drag or wheel. Honors `prefers-reduced-motion`.

## 4. Foldable and mobile layout
Detects compact layouts by coarse pointer **or** scene/container width (not only CSS viewport width). The product panel becomes a compact, independently scrollable lower drawer instead of a tall right-hand overlay that covers the entire bathroom, and collapses as soon as the user adds a product. Smaller icon controls, legible price strip, focus control and custom narrow-phone/landscape rules.

## Deployment
```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-bathroom-v10/install.sh -o /tmp/ksh-bathroom-v10.sh && sudo bash /tmp/ksh-bathroom-v10.sh
```
Installer downloads 4 source files, preflights JS/Python syntax and material arithmetic, and backs up all changed HTML/JS/CSS to `/var/backups/setaei/` before atomic writes. No other KSH sites affected. Backup path printed after install. Product landing pages remain untouched.

## Acceptance checks
- Open `/ksh/fliskonkurrenten/showroom/`, select **Colorker Althea**, verify repeated tiles/grout spanning the full left wall; no isolated floating white board.
- Added tile automatically aims camera toward the *left* wall and closes the panel on mobile/foldable. Click `Vis` to refocus later.
- Selected Vedum aims camera at vanity; Sense toward tub; Z-UP toward rear wall with repeated slats.
- Check budget: Althea counts 20 ordered pieces at default 3.4 × 2.8 m with 10% waste and preserves floor cost separately. Removing Althea removes entire wall surface and wall cost. Changing room dims recalculates piece count.
- Fold open/closed and portrait/landscape: icon row, bottom sheet, total and close button remain usable. Never pretend simulated room preview is real AR.
- Existing white Zone sink and Turbine Grey manufacturer texture and floor-off logic remain.
