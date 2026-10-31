# Validation — 1 November 2026

- Both supplied exports inspected with ffprobe: 1280×720, 24fps, roughly 6.042s, no audio streams. MP4 contains 145 frames. Both decoded with ffmpeg to a null output with no errors.
- Chrome desktop chose the WebM source, video dimensions 1280×720, readyState 4 and paused=false on the opening scene.
- Scrolling paused looping playback and set currentTime to 2.082606s in the film journey. Explicit pause kept the time unchanged at 0.490345s across a further viewport scroll. Play re-enabled the control correctly. Interrupted play promises are not treated as autoplay denial.
- Desktop screenshot inspected for hierarchy, film framing, header/logo contrast and CTA readability. preview.jpg records the implemented layout.
- 390px iframe mobile layout inspected. Menu opens and closes; its 3D link reaches #se3d and loads the room module on demand. Film remains inline. Production Safari/iOS and Firefox were not device-tested.
- Existing room controls load in the no-WebGL browser and show an explicit product-photo status. WebGL appearance remains outside this browser's capabilities; the cinematic film itself displays without WebGL.
- JavaScript and shell syntax checks pass. Full installer run twice on a temporary fixture using the existing v3 page: one video element, one footer, footer unchanged byte for byte, and all installed media hashes match their source files. Backups created on both runs.
- There is no new supplier CAD, live stock lookup or payment flow in this release. Film remains a mood visualization; prices/specifications retain their existing source date.
