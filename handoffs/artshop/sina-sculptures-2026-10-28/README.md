# Sina Soleimani — sculpture update, 28 October 2026

Published on the existing page: https://setai.no/artshop/artists/sina-soleimani

## Result
- Existing paintings and lower-body Icarus preserved.
- Two new winged sculptures shown separately: Icarus (2025) and Icarus III (2025).
- Icarus material: Iron sheets / Jernplater / ورق آهن. Supplied weight: 6.5 kg.
- Daedalus portrait added from the artist’s official site: Bronze / Bronse / برنز, supplied weight 6.5 kg. Its catalogue identifies 2025 and 50 × 25 × 20 cm.
- New winged Icarus works: catalogue dimensions 75 × 70 × 25 cm, 2025.
- Three finished-work views for lowered-wing Icarus; four workshop photographs in a separate expandable studio gallery.
- Full-image dialogs, thumbnails, arrow-key navigation, Escape dismissal and focus return. Native dialog behavior supports keyboard focus containment.
- Price on request retained in English, Norwegian and Persian.
- Duplicate 45728.jpg is archived but excluded from the visible gallery.

## Source and recovery
The active application is /var/www/setai-artshop on server 1431514. This GitHub directory stores its update handoff; it is not the active application's root.
implementation.patch records only this update relative to the captured working-tree baseline, preserving earlier uncommitted work. Apply from the application root only after reviewing the current source. The application imports the new sculpture components from app/artists/sina-soleimani/page.tsx; its /artshop route re-exports that page. The homepage medium for the existing Icarus was also corrected to iron sheets.

Copy the nine original JPEGs to public/artshop/sina-sculptures/. Daedalus images come from:
- https://sinasoleimani.com/wp-content/uploads/2025/09/Daedalus-Copy.webp
- https://sinasoleimani.com/wp-content/uploads/2025/09/Daedalus.webp

Build was performed in an isolated staging copy using the established Node 22 workflow. The working production dist was retained until a successful build and browser verification, then only PM2 setai-artshop was restarted. Nginx was not changed.
Production dist backup: /var/www/setai-artshop/dist.before-sina-20261028-135843
Modified-source baseline: /root/sina-update-20261028/baseline-20261028-135843

## Validation
Production build passed. Preview browser checks passed for 4 sculpture cards, 5 paintings, gallery selection, dialogs, keyboard navigation, focus return, EN/NO/FA switches, image loading, duplicate exclusion and 390px mobile layout without horizontal overflow. Desktop and mobile screenshots inspected. Local production HTTP 200 and new sculpture markup verified after deployment. The same browser checks were then run against the public URL; see deployment-validation.json.
