# Sina Soleimani — sculpture update, 28 October 2026

Prepared source assets and artist-provided corrections for the EXISTING page:
https://setai.no/artshop/artists/sina-soleimani

## Status
Not integrated, built or deployed. The live page was checked and returns HTTP 200. It currently lists five paintings and one Icarus sculpture, labelled generically as metal. The active source is reported at `/var/www/setai-artshop` on Desktop Commander device `1431514`, currently offline. This folder is a handoff, not the active application source.

## Content to apply
- Icarus: Iron sheets / Jernplater / ورق آهن; 6.5 kg; 2025; 75 × 70 × 25 cm as printed in its supplied catalogue image.
- Icarus III: same material, weight, year and printed dimensions. Preserve the Roman numeral III from the supplied caption; do not invent Icarus II.
- Daedalus portrait: Bronze / Bronse / برنز; supplied weight 6.5 kg. Its photo is absent from this upload. Locate the existing portrait before editing or adding it; do not substitute any of the full-body Icarus photos.
- Keep “Price on request” and the existing English/Norwegian/Persian presentation. No new price, edition, provenance, finish, certification or availability claims.

See artworks.json for exact image grouping, provenance and SHA-256 checksums. All nine original uploads are preserved unmodified. 45728.jpg and 45729.jpg are byte-identical: only show one in the gallery. Four workshop photographs appear to show the raised-wing Icarus; their association is provisional, and 45739.jpg shows a work in progress. Keep process photos separate from finished-work views. Do not create separate artworks from alternate angles.

## Integration and validation
1. Inspect the current source, applicable AGENTS.md instructions and uncommitted changes on the actual Artshop server. Match the existing Icarus image to the correct sculpture before replacing records. Preserve other artists, paintings and functionality.
2. Back up the source files to be changed and current dist to a new timestamped path; do not overwrite the previous backup.
3. Integrate the supplied originals and exact metadata into the existing components/data model. Use the existing gallery mechanism, or add accessible thumbnails/lightbox if needed. Do not use generated substitutions for artwork photographs.
4. Build with the established Node 22 Artshop workflow, staging output so a failed build cannot remove the working dist. Only switch dist after a successful build, then restart only PM2 setai-artshop (reported port 3027). Do not alter nginx or unrelated apps.
5. Verify the live artist page, image responses, EN/NO/FA text and mobile layout. Confirm the two Icarus records are distinct, the duplicate is absent from the gallery, and Daedalus is attached to the correct portrait. Report deployment separately from this prepared handoff.
