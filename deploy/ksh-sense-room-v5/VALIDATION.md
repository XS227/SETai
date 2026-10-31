# Validation — 1 November 2026

Root cause confirmed in actual companion GLB JSON: node primitives have Z-height with no root coordinate transform. Z-UP spans Z=0..2.798 while source Y thickness is 0.02085; Althea spans Z=0..1.192 while source Y thickness is 0.01135. Vedum source extents are 1.205 × 0.628 × 0.422 in X/Y/Z. Sense already uses glTF Y-up.

The actual four GLBs were parsed through Three.js GLTFLoader in Node, and the same normalizeModel/placement functions used by the browser were applied. Tests passed for 3.8×3.4×2.8m, 3.2×2.8×2.8m and 8×8×4m rooms. Each transformed model fits inside floor/wall/height bounds. Z-UP is 2.798m upright, Vedum's vertical height is 0.422m and its 1.205m width runs along the left wall, Althea's bottom is at 1.1m on that wall. Units are validated rather than rescaled.

Quote tests passed: empty selections in the default Sense room cost NOK 38966.02 including the priced floor; Vedum, Z-UP and Althea add their individual unit amounts; an unpriced stone reference or generic floor is flagged missing rather than assumed free. Room area changes update whole-package quantities and price.

Browser interaction: all six icon buttons render, open/close their drawers and retain accessible names. Selecting Vedum, Z-UP and Althea shows NOK 83811 (83811.32 internally), with 12.92m² net floor, 10% waste, 14 packages/14.98m². Width changed to 4.8m: 16.32m² net, 17 packages/18.19m² and NOK 86858 (86857.61 internally). Price output is 26px and statically laid out inside the price pill; its desktop bounds end at y=918 in a 936px viewport, fully visible. All-button focus rings and the large room CTA are absent.

The no-WebGL photo fallback was tested. The test browser reports GL_RENDERER Disabled, so no GPU appearance screenshot of the corrected scene is claimed. Geometry transforms and bounds have been verified independently with the real meshes.

Full installer run twice on a fixture of the original Film v4 page: main body, video and footer remain byte-identical, exactly one new stylesheet, loader points to v5, focus selector corrected, backups created. Shell and JavaScript syntax checks pass.
