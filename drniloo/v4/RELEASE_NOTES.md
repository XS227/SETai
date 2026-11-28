# Responsive identity and video journal — 28 November 2026

Preserves the current v4 design from the VPS and makes it reproducible in Git.

## Changes

- On screens up to 960px, hero copy and portrait occupy separate rows. Mobile portraits crop the empty upper background while keeping the face clear. The header has a navy surface on every page.
- The horizontal details sequence becomes a vertical image/text sequence on compact screens. The clinic image and caption use separate rows; the doctor collage becomes a stable grid. Desktop scroll storytelling remains.
- Shared identity.css keeps navy, warm gold and ivory tokens, Vazirmatn Persian type, Cormorant Garamond signature text, fine stroke SVG icons and arched image frames consistent across home, services and journal.
- The journal uses an HTML5 player with play/pause, seek, mute and fullscreen controls, plus own-brand Follow and View on Instagram links. Native video controls remain as a no-JavaScript fallback. Instagram embed chrome and embed.js are removed.
- Outline and Lip care are served from stable /drniloo/media/ MP4 URLs, with real frame posters. Only one reel plays at once; leaving the tab pauses playback. Videos retain their original sound and visible attribution.
- The Full face embed supplied no public playable file. Its original Instagram link remains in a branded card, without a fake play control. Replace that card when the original video file is supplied.

## Media

media-manifest.json records the two original permalinks, SHA-256 checksums and byte counts. MP4 files are deployment media on the existing VPS, outside the versioned site directory. Keep /var/www/setai/drniloo/media on backup; do not replace those files with expiring Instagram CDN URLs.

## Validation

JavaScript syntax and local asset/link checks pass. Browser review used 320, 390, 430, 768 and 844px frames, including landscape, with no horizontal overflow or hero copy/image overlap. Both direct videos decoded as H.264/AAC and played; pause, seek and mute were exercised. Desktop rendering and the original scroll architecture are retained.

## Deployment

Deploy identity.css, player.js and assets/reels before index.html, blog/index.html and services/index.html; v4.js has compact-screen scroll adjustments. CSS/JS request keys are 4. Existing indexing policy, phone number and treatment text are retained. A pre-change backup is in /opt/setai-deploy-releases/drniloo-mobile-player-20261128/before on the VPS.
