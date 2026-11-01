# KSH Fliskonkurrenten · v9: Turbine Grey and removable floor

## What changed
- Vedum's own **Turbine Grey komposittstein** photographic material sample is downloaded from the official manufacturer URL `https://www.vedum.no/globalassets/kok/bankskivor/kompositsten/11/vedum_kok_bankskiva_turbine_grey.jpg` and embedded into a separate, versioned GLB with UV coordinates on the top slab. This replaces the visually flat, near-white/grey stone top in the concept model, while the Zone basin remains white.
- The product landing and KSH bathroom showroom both use `model-turbine-v9.glb`. Old `model.glb` and `model-yup-v6.glb` are preserved for rollback. The shared room's `normalizeModel` no longer tints the stone texture flat gray.
- The floor selection now has **Ingen gulvbelegg**. Clicking an already-selected floor clears the selection to `none`. The 3D scene keeps a neutral architectural base for legibility; no commercial floor texture is present. Calculation floor cost becomes 0 kr. LocalStorage persists this state between sessions. Other products are untouched.
- Shared CSS and JavaScript are updated for the main showroom and inline Sense showroom. Only the Vedum product landing's local 3D model URL is changed.

The material texture is the supplier's public material reference, not a site-provided factory-CAD scan. The 3D geometry is still an illustrative reconstruction. Because manufacturer photos are used, keep product/manufacturer credit visible and request client permission for onward commercial use.

## Deploy
```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-bathroom-v9/install.sh -o /tmp/ksh-bathroom-v9.sh && sudo bash /tmp/ksh-bathroom-v9.sh
```

The installer stages and validates the manufacturer JPEG (original 1 MB), appends its image + texture material + UVs to a copy of the Vedum GLB with Python standard library, validates CSS/JS and writes versioned files with backup and rollback on failure.

**Test**:
1. https://setai.no/ksh/fliskonkurrenten/showroom/ — open Produkter, inspect Vedum top, see marble-style grey veining and separate white Zone sink.
2. Open Gulv, click existing selected material again. Selection changes to Ingen gulvbelegg, floor cost zero, neutral base. Select a new floor, then choose Ingen gulvbelegg. Refresh and verify persistence.
3. Change rooms and check floor is excluded from quote while products remain.
4. https://setai.no/ksh/fliskonkurrenten/produkt/vedum-flow-takegronn/ — verify its dedicated 3D viewer uses the same texture without affecting the approved cinematic film.

Source model dimensions and price are unchanged. Validated 8 UV vertices, embedded 1,065,229-byte manufacturer JPEG and glTF 2.0 binary size ~1.1 MB in controlled dry run.
