# Sense Film v4

Cinematic landing page for the existing Sanipro Sense product study. Uses the user's final 6-second film exports; no substitute stock footage or additional generation.

The full-width film loops at the top and becomes scroll-controlled through three short editorial chapters. It then leads into material detail, the existing interactive multi-product showroom, a compact specifications disclosure and a contact/price section. One video element chooses WebM VP9 first, H.264 MP4 second. A JPEG extracted from the supplied clip paints before playback. Pause stops both playback and scroll seeking. Reduced motion/data-saving modes start paused; the visitor can opt in. Playback failure keeps the still and the rest of the page usable. Browsers retain control of autoplay policy.

The 3D module is imported only as the showroom approaches the viewport. It reuses the v3 reconstruction and existing Vedum/Z-UP/Colorker model studies and pricing. This film update does not make them supplier CAD. The common current footer is preserved at installation. No other company page is rewritten.

Prerequisite: the Sense v3 package and shared KSH v6 assets already installed.

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-sense-film-v4/install.sh -o /tmp/ksh-sense-film-v4.sh && sudo bash /tmp/ksh-sense-film-v4.sh
```

Downloads and checks all files before writing, backs up replacements, writes assets before HTML, and rolls back completed writes if an in-process replacement fails. The installer prints the restore command. Re-running keeps one footer and one film element.

Media provenance:
- User attachment sanipro-sense-hero-720p.webm.mp4 is a WebM container, renamed sense.webm without re-encoding: VP9, 1280×720, 24fps, 6.042s, 539617 bytes, silent.
- User attachment sanipro-sense-hero-720p.mp4 is H.264, 1280×720, 24fps, 145 frames, 6.041667s, 1130001 bytes, silent. Retained without re-encoding, including front moov atom.
- poster.jpg is extracted at 0.5s from the supplied MP4.

The film is described as a mood visualization, distinct from the product references and interactive reconstruction. Product specifications and the NOK 24750 dated snapshot are carried forward from the approved product study; no fresh availability claim is made.

Validation: see VALIDATION.md.
