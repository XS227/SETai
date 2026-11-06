# Handoff: SETAEI Forskning (research hub)

Owner request (Khabat, 2026-11-06): gather all long-running research under one research project.
- **Track 1, Lotteries:** Keno, Lotto, EuroJackpot (randomness, statistics, numerology engine)
- **Track 2, Wallet agent:** the agent's own research track. **Scope is not defined yet.** Ask Khabat what the wallet agent is before writing any content. The hub currently shows a "Planlagt" placeholder.

## What was done (commit on main, 2026-11-06)
| Path | What |
|---|---|
| `forskning/index.html` | New hub at `/forskning/`: tracks, pre-registered hypotheses H1–H4, research log, principles. Static, noindex. |
| `Keno/index.html` | Rewritten. SETAEI SVG wordmark replaces the old blue PNG (`/assets/logo/setaei-logo.png`, which has the "TEKNDLOGI" typo). Brand v2 colours. Nav links point only to on-page anchors and `/forskning/`. Never link to the 410 routes. |
| `Keno/app.js` | All page logic: top 10 (most/least drawn, longest gap, most frequent pairs), randomness tests (χ² df 69, sum, odd/even, low/high, repeats), rows for the next draw, walk-forward backtest with z-scores and the hit distribution against the hypergeometric distribution. |
| `Keno/numerology.js` | Deterministic engine `setaei-keno-numerology-v1` (1–70, levels 2–10, optional birth date). Reduction follows the Numerologist/Åse convention with master numbers 11/22/33. Each number carries its source factors. Works as UMD (`window.KENO_NUMEROLOGY` / `require`). |

`Keno/draws.json` and the updater/cron are unchanged.

## Deploy
The live host is **5.249.252.88** (`/var/www/setai`), not the old one (5.249.255.116). New files to put on the server:
`Keno/index.html`, `Keno/app.js`, `Keno/numerology.js`, `forskning/index.html`. No build step.

## Next steps (suggested order)
1. Deploy and check `/Keno/` and `/forskning/` on mobile and desktop.
2. **Pre-registration log:** save each day's numerology/control rows *before* the draw (e.g. append to `Keno/preregistered.json` from the existing `/opt/setai-keno/update.py` cron), then score them after the draw. Only this out-of-sample record counts as evidence for H1/H4.
3. **Lotto + EuroJackpot:** the old modules are retired with HTTP 410 on the new host. **Do not remove that rule.** Rebuild them as `/forskning/lotto/` and `/forskning/eurojackpot/` instead. Old data still exists on the OLD server only: `/var/www/setai/Lotto/history.json` and `/var/www/setai/EuroJackpot/{history.js,numerology-study-20261013.json,review-*.json}`. The refresh cron sources in `/opt/setai-eurojackpot` and `/opt/setai-lottery-labs` are gone. Factor `Keno/numerology.js` into a shared engine with a per-game range (Lotto 1–34, EJ 1–50 + 1–12).
4. Add a multiple-testing correction (Bonferroni/Holm) to the backtest table: 6 strategies × 3 windows × 9 levels.
5. Wallet-agent track: wait for the definition from Khabat.

## Findings so far (also in the hub log)
- Numerology by date, level 10, 5 009 draws (2013→): mean 2.867 against 2.857 expected, z = +0.52. Level 5: z = −0.46. Personal row for an example birth date 1980-05-17: z = +0.27.
- Cold numbers (window 90) z = +2.19. This is a single extreme among many tested strategies. Treat it as noise until it is confirmed on pre-registered draws.
- 2026 χ² = 80.4 (p ≈ 0.16). Whole archive χ² = 63.9 (p ≈ 0.65). Consistent with a fair draw.
