# Vedum Film v7

Integrates the user-approved realistic Higgsfield clip into the existing Vedum Flow product page. The background stays pinned across the hero and four scroll chapters. The same video element loops at the top and seeks with scrolling in the story. A 44px icon pauses both modes. Reduced-motion and data-saver visitors start on the poster. Failed video playback restores the original photographs.

Source: `hf_20261101_003305_5ae7678b-1f37-4484-8eb3-d8870ba0ed31.mp4`, supplied and approved by the user on 1 November 2026. No new paid generation.

Verified media: 1280×720, 24 fps, 97 frames, 4.041667 seconds, no audio. The source is about four seconds, despite the earlier six-second generation brief. Its duration is preserved. WebM VP9: 355729 bytes. MP4 H.264: 605873 bytes, faststart. Short GOPs support scroll seeking. Both exports decode without errors. Poster is an actual frame from the supplied film.

Validation: browser playback, pinned video position, scroll seeking and pause during scrolling; mobile layout; installer syntax and repeated-install byte equality. The existing product body, header/footer, canonical 3D models, shared showroom links and calculator are preserved. This patch only inserts versioned film tags into the page head and installs their local assets. The installer verifies payload hashes, backs up overwritten files, prepares updates before replacing the page, and rolls back write failures.

Install on the existing VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-vedum-film-v7/install.sh -o /tmp/ksh-vedum-film-v7.sh && sudo bash /tmp/ksh-vedum-film-v7.sh
```

Page: https://setai.no/ksh/fliskonkurrenten/produkt/vedum-flow-takegronn/
