# Heimslig v7 — product handoff and collision-free furniture placement

This narrowly scoped patch fixes two reported regressions in the existing Heimslig 3D studio:

1. The detail link for `Sirkel · sofabord` already carries `?produkt=sirkel-bord`, but v5 ignored the product query and left the generic sofa/table visible. V7 now reads the canonical product slug and selects/adds the corresponding named concept variant. The Sirkel variant uses a **round, pale/white 3D tabletop and cylindrical pedestal**, not the generic rectangular wooden side table. The same shape appears in the 2D fallback. Product concept dimensions are illustrative, **not confirmed real product measurements or official manufacturer CAD**.
2. The `Legg i rommet` action created new furniture at `x=z=0` and overlapping objects. V7 searches for free, in-bounds positions, accounting for rotating rectangular footprints and safety clearance, without moving existing pieces. If no safe position exists it refuses the insertion and explains the missing space. The duplication action uses the same placement rules. For overlapping furniture in existing saved rooms, `Fordel overlappende møbler` reflows the furniture when it can all fit.

Also maps known product slugs from the demo storefront to named concept variants; unknown product IDs show a clear message rather than pretending an unrelated model is the selected product. Existing user-local room storage key (`heimslig-room-v5`), price estimates, HTML design, and footer stay intact.

## Install or update on VPS

Prerequisite: existing Heimslig v5. Optional v6 textures load if installed; if not installed, the renderer retains the v5 procedural fallback.

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/heimslig-v7/install.sh -o /tmp/heimslig-v7-install.sh && sudo bash /tmp/heimslig-v7-install.sh
```

The installer downloads the three JS assets and regression test file, syntax checks and runs Node tests if Node is present, verifies expected existing include tags **before** any site edits, then backs up all replaced HTML/assets under `/var/backups/setaei`. Updates only Heimslig room-viewer pages and adds assets under `/ksh/heimslig/assets/v7`; no changes to other KSH sites or catalog images. The installer prints the precise rollback command; repeat installs do not duplicate JS includes.

## Acceptance checks

- Navigate from `/ksh/heimslig/produkt/sirkel-bord/` by clicking `Prøv 3D-studio`; selected item should be **Sirkel · sofabord**, a light/white round pedestal table. It should **not** show the starter sofa or a rectangular table in place of Sirkel.
- Click `Legg i rommet` to add a table/chair and `Ett til` to duplicate; all pieces should occupy free floor positions. In cramped rooms, insertion should be rejected with a legible explanation rather than overlapping.
- Existing v5 saved furniture arrangement should remain intact except when the user explicitly clicks `Fordel overlappende møbler`.
- Change dimensions, floor and selected furniture finish; calculated price subtotal and local autosave should still work.
- Verify mobile, 2D WebGL fallback and existing v6 scanned materials (if v6 textures are installed).
- Check other KSH client sites are unaffected.

Source validation: JS compiles, and the core placement/product tests pass in isolated validation. Live production/browser acceptance is **pending VPS deployment**, not claimed completed.
