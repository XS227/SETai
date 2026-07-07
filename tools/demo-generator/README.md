# SETAEI Demo Generator

Generates complete static demo landing pages for clients, served under `https://setai.no/demo/{slug}/`.

## Usage

```bash
node generate-demo.js "<Business Name>" "<industry>" "<city>" "<style>" [language]
```

## Arguments

| # | Argument | Required | Description |
|---|----------|----------|-------------|
| 1 | `businessName` | ✓ | Business name (quoted, supports æøå) |
| 2 | `industry` | ✓ | Industry type (see list below) |
| 3 | `city` | ✓ | City name |
| 4 | `style` | ✓ | Visual style / colour theme |
| 5 | `language` | – | Language code (default: `no`) |

## Examples

```bash
node generate-demo.js "Bella Frisør" "hair salon" "Oslo" "premium black and gold" "no"
node generate-demo.js "Fjord Bistro" "restaurant" "Bergen" "warm cinematic" "no"
node generate-demo.js "Zen Studio" "fitness" "Trondheim" "minimal white" "no"
node generate-demo.js "Advokat Hansen" "law firm" "Stavanger" "navy blue" "no"
node generate-demo.js "SmilKlinikken" "dental" "Tromsø" "clean white gold" "no"
node generate-demo.js "Rent & Fint" "cleaning" "Kristiansand" "green organic" "no"
```

## Output

- Creates `/var/www/setai/demo/{slug}/index.html`
- Prints the public URL: `https://setai.no/demo/{slug}/`
- No nginx changes needed — served automatically as a static file

## Supported Industries

The generator includes pre-configured templates for:

| Keyword | Industry |
|---------|----------|
| `hair` | Hair salons, barbers |
| `restaurant` | Restaurants, dining |
| `cafe` | Cafés, bakeries |
| `fitness` | Gyms, personal trainers |
| `cleaning` | Cleaning services |
| `law` | Law firms |
| `dental` | Dental clinics |
| *(other)* | Generic business (fallback) |

Industry is matched by keyword — `"hair salon"` matches the `hair` config, `"fine dining restaurant"` matches `restaurant`, etc.

## Style / Colour Presets

| Style keyword | Result |
|---------------|--------|
| `black and gold` | Dark background, gold accents |
| `white gold` / `luxury` | Light background, gold accents |
| `blue` / `navy` / `ocean` | Deep navy, blue accents |
| `green` / `nature` / `organic` | Light sage, green accents |
| `pink` / `rose` / `feminine` | Warm blush, rose accents |
| `minimal` / `clean` / `white` | Pure white, dark accents |
| *(other)* | Warm dark premium (default) |

## Page Sections

Every generated page includes:

1. **Fixed navigation** — transparent → frosted glass on scroll
2. **Hero** — full-viewport image, headline, dual CTAs
3. **Om oss** — two-column with photo, stats grid
4. **Tjenester** — 3 service cards (industry-specific)
5. **Anmeldelser** — 3 placeholder Google reviews
6. **Booking / CTA** — parallax form section
7. **Kontakt** — address, hours, map placeholder
8. **Footer** — "Demo laget av SETAEI"

## Slug Rules

Norwegian characters are converted automatically:
- `æ` → `ae`, `ø` → `o`, `å` → `a`
- Spaces and special characters → `-`
- All lowercase

Examples: `Bella Frisør` → `bella-frisor`, `Ål & Øst AS` → `al-ost-as`

## File Safety

- Only writes inside `/var/www/setai/demo/`
- Never touches existing setai.no files
- Never modifies nginx config
