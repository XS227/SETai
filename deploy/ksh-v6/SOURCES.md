# KSH v6 — sources, scope and limitations

Prepared 31 October 2026. This is the SETAEI design proposal, not an official company site.

## Verified company sources

- https://fliskonkurrenten.no/ — supplier range, official logos, contact and official social links.
- https://fliskonkurrenten.no/om-oss/ — people, history, business relationships and showroom.
- https://fliskonkurrenten.no/flyt-gulv/ — Flyt-Gulv services and official mark.
- https://www.instagram.com/fliskonkurrenten/ and https://www.instagram.com/heimdalnatursteinas/ — public profile posts inspected directly on 31 October 2026. Exact public permalinks are in social.js.
- Heimslig org. 938778191. No official Heimslig social profile, product CAD or established identity was verified. The proposed lowercase wordmark is explicitly a new proposal.

## Real product surfaces

| Material | Supplier page | Dimensions | Price snapshot incl. VAT | Packaging |
|---|---|---|---|---|
| Rondine Windsor Beige | https://fliskonkurrenten.no/produkt/rondine-windsor-beige-203x406-107m2/ | 20.3 × 40.6 cm | NOK 949/m² | 1.07 m², from product title |
| CP Metro Sand | https://fliskonkurrenten.no/produkt/cp-metro-sand-60x60/ | 60 × 60 cm | NOK 559/m², clearance | 1.44 m², product attribute |
| Cemento Cassero Grigio | https://fliskonkurrenten.no/produkt/cemento-cassero-grigio-30x60/ | 30 × 60 cm | NOK 649/m² | 1.44 m², product attribute |

Product images are supplied by the retailer's public product pages and are used for this retailer design proposal. Copyright stays with the respective owners. They are **color images, not measured PBR scans**. Tile reflectance is approximate. Windsor environment photos are supplier photos, never presented as a rendering of the user's room. Physical samples remain the color/finish reference. Source photos are not generated.

The quantity calculation adds the selected waste percentage, then rounds up to whole packages. A missing furniture or delivery price is shown as missing; the output is then a subtotal. Prices are dated snapshots, not live inventory or binding offers. The calculation excludes installation, adhesive, grout, wall treatment and unentered delivery costs.

## Visualization resources

- Three.js 0.170.0, MIT. The vendor/LICENSE file is shipped unchanged. https://threejs.org/ and https://github.com/mrdoob/three.js/tree/r170
- Modern Arm Chair 01: https://polyhaven.com/a/modern_arm_chair_01 — CC0 scanned model with 1k color/normal/ARM maps.
- Wood Floor: https://polyhaven.com/a/wood_floor — CC0 color, normal and ARM maps.
- Painted Plaster Wall: https://polyhaven.com/a/painted_plaster_wall — CC0 color and normal maps.

The scanned chair, generic wood and plaster are independently sourced visualization assets, **not confirmed Heimslig/Heimdal products**. Other furniture remains rounded dimensional studies. The UI makes this distinction visible in product information. Physically based shading, environment lighting, directional soft shadows and correct texture color space improve depth; they do not constitute a claim that the result is verified photorealistic or depicts actual company furniture.

Every downloaded dependency is pinned by URL and SHA-256 in assets-manifest.json. All rendering assets are served locally by the VPS after installation; the Instagram gallery also uses local images and only links out when the visitor opens the original post.

## Instagram

The existing retailer Smash Balloon feed returned “No posts found” for both public feeds. Public Instagram profile pages did show real posts, so v6 uses local original post thumbnails with verified permalinks. This is a curated selection, not an automatically refreshing feed. Instagram embed iframes failed in the test browser. The gallery therefore displays downloaded original public post thumbnails locally, with account, publication date and a direct original link. No invented posts or authors, and no expiring CDN URLs are shipped. Copyright in the images remains with the original account/rights holders. No messages were posted or sent.

## Identity and shared footer

The four profiles are presented at /ksh/identitet/. Real Fliskonkurrenten, Heimdal Naturstein and Flyt-Gulv logos are retained. The palette, typography, photographic approach, voice, spacing and interaction rules are documented. Existing green UI colors are warmed in separate per-brand copies of the existing stylesheets; original stylesheets are preserved. Relative stylesheet image URLs are resolved to their original public paths.

Every discovered KSH HTML page receives the same server-rendered footer. Payment links all point to the official Fliskonkurrenten store. Unverified Vipps/Klarna/PayPal/other acceptance badges are not repeated across unrelated companies. The personal Heimdal about-us main content and motion scripts are preserved.

## Operational scope

- Upgrades the existing Heimslig room and calculator together; other companies' specialized renderers remain intact.
- Adds real Instagram selections on the four company homepages and existing social/inspiration pages.
- Adds one shared footer throughout KSH, plus the four distinct brand palettes.
- Keeps the v5 saved room untouched and migrates valid dimensions/furniture on the first v6 visit. Previous generic floor choices without a v6 equivalent use Windsor, with its documented price. New data is stored as ksh-room-v6.
- Backup before any replacement; all downloads/checksums and planned HTML transformations must succeed before writing. Asset files are written before pages. If an in-process write fails, completed replacements are rolled back.

Limitations: the container browser may not expose WebGL; 3D shader/appearance needs checking on a GPU-enabled browser. Product colors, actual furniture CAD, current stock and a live Instagram API feed need their respective supplier/account data. This update does not turn an unverified model into a genuine product.
