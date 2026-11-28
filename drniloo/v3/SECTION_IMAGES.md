# Section photography integration — 28 November 2026

Updated the existing v3 design with eight generated section images. Responsive WebP files live in assets/sections; suffixes name maximum long edge, while HTML width descriptors use actual pixel width. Full resolution masters are in the conversation image pack.

| Asset | Placement |
| --- | --- |
| 01-hero | Desktop homepage, image left / Persian copy right |
| 08-hero-mobile | Mobile homepage, selected by picture at 720px |
| 02-journey-lips | First scroll chapter |
| 03-journey-chin | Second scroll chapter |
| 04-journey-skin | Third scroll chapter |
| 05-doctor | Doctor biography |
| 06-waiting-area | New clinic gallery |
| 07-reception | New clinic gallery |

## Behaviour

The journey crossfades separate photographs and applies a restrained zoom. Old portrait pixel landmarks and the focus ring were removed because they do not apply to these images. Reduced-motion visitors receive immediate image changes. The existing service carousel remains; hidden filtered cards now stay hidden. Existing N logo, video blog, map and contact content are retained. CSS/JS cache keys are 5.3.

## Provenance

Generated with Higgsfield / GPT Image 2.6 from the supplied doctor and clinic references. Portraits are AI recreations, not documented treatment results. The clinic photographs are AI edited wide compositions with inferred perspective; compare them with the actual room before final client publication. Accessible image descriptions identify the recreations.

## Validation

JavaScript syntax check, git diff whitespace check and local image/source path checks passed. Browser review confirmed desktop hero, all three scroll scene states, loaded clinic images, working service filter, and mobile picture selection at a 375px content viewport (390px frame including scrollbar) without horizontal overflow.

## Publish on existing hosting

Deploy the changed drniloo/v3/index.html, v3.css, v3.js and complete assets/sections directory together. Publish the 16 WebP assets before the HTML to avoid missing images during rollout. No change to services-hq artwork or SEO indexing policy. VPS was disconnected during this update, so direct deployment could not be verified.
