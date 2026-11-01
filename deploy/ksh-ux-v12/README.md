# KSH Fliskonkurrenten – UX v12

Resolves reported Galaxy Z Fold screenshots where:
1. **Z-UP Eik Sort product card incorrectly showed a screw**, a related accessory rather than the 600066 panel.
2. Pop-up product/material/light controls **covered too much 3D showroom**.
3. Cinematic product hero/scroll chapters **cropped headings and CTAs on phone/foldable**, with a redundant generated footer in addition to the standard KSH footer.

## Fixes
- Downloads the **actual manufacturer Duri product photograph** of `Z-UP Spilepanel Eik Sort`, GTIN `7072789020084`, supplier article `600066`, and stores it locally at `/ksh/fliskonkurrenten/produkt/zup-spilepanel-eik-sort/assets/zup-eik-sort-600066.jpg`. The Z-UP card on `/produkter/` and the homepage is corrected, and the same authentic dark-slat photo is used for the Z-UP hero and product detail purchase panel. The existing correct `detail.webp` and original `hero.webp` stay intact for rollback. The source file is roughly 115 KB, JPEG 900 × 746. Source: `https://duri.no/7072789020084` (public manufacturer reference); **do not confuse it with Fliskonkurrenten's own product photography or suggest an external sales link**.
- New `ksh-ux-v12.css` makes desktop showroom popovers narrower and caps their height. Compact Fold/phone drawers are max **28% or 238px** tall and individually scrollable, allowing continuous view of the scene. Price remains accessible. Fullscreen v11.1 and camera controls are retained.
- Four cinematic product pages get responsive hero/story sizing and clipping, smaller typography, wrapping CTAs, corrected scroll section min-heights, overflow protections and mobile-safe sticky contact CTA. The canonical KSH footer remains; duplicate per-product footer is removed by `ksh-ux-v12.js`.
- No changes to 3D model files, current showroom camera, video playback, real product prices or quotation formulas. Existing versions and assets retained.

## Deployment

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-ux-v12/install.sh -o /tmp/ksh-ux-v12-install.sh && sudo bash /tmp/ksh-ux-v12-install.sh
```

The installer validates the supplier JPEG and JS/CSS, then stages and atomically installs only nine/named files under the Fliskonkurrenten proposal, backing up every existing affected file under `/var/backups/setaei/ksh-ux-v12-*`. Seven HTML pages receive one versioned CSS+JS include: proposal homepage, product gallery, shared showroom, four cinematic product pages. **No unrelated KSH project changes**.

## Browser acceptance
- Reload `/ksh/fliskonkurrenten/produkter/?v=12`; Z-UP photo must show dark vertical slats, not a screw.
- Open Z-UP landing on Fold cover and inner screen; hero must show slats and both hero CTAs must fit; story photo remains within width, mobile headline not clipped. Verify other 3 product pages (Sanipro Sense, Vedum Flow, Colorker Althea) remain responsive.
- On `/ksh/fliskonkurrenten/showroom/?v=12`, open Produkter, Gulv, Lys, Kameravisninger: drawer must take substantially less of the image and be scrollable; price stays visible. Confirm add/remove, lighting and 3D remain functional.
- No duplicate dark footer on individual product pages; the KSH footer remains and contact sections stay available.
- Verify Z-UP gallery card image and same Z-UP landing image use manufacturer article 600066.

**Note**: A distributor/manufacturer reference may require permission for commercial republication outside this non-indexed design prototype.
