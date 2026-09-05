# SETAEI cinematic homepage

A single sticky stage contains six scenes driven by native page scroll: Volla exterior, imagined studio, project browser, Shahnameh film, BIAP collaboration, contact. Chapter anchors provide direct navigation. Reduced-motion preferences and short viewports use normal document flow. No scroll interception or third-party animation dependency.

Assets:
- volla.webp: existing project image from https://vollabyggmester.no/images/hero.webp (retrieved 2026-09-05).
- studio.webp: AI-generated imagined creative studio, not a documentary photograph of Khabat's actual office. Prompt: photoreal Scandinavian creative technologist office, walnut desk, central blank monitor, warm lamp, Persian rug, cool window light, wide architectural perspective, no people or text. Generated once with built-in imagegen; WebP optimized.
- Existing /projects/shahnameh/poster-hero.jpg and intro-hero.mp4 are reused directly, not duplicated. Video loads only when its scene is reached or the user requests playback; playback pauses on other scenes and hidden tabs. Reduced motion and data-saving preferences suppress automatic playback.

Deployment must include index.html and every file in assets/journey/. Existing contact endpoint and project routes must remain available. This redesign deliberately replaces the former homepage sections; it does not change project subpages or backend APIs.
