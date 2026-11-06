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


## Update 2026-11-06 (session 2): one research project for Keno, Lotto and EuroJackpot
Done (owner: "ta Lotto, EuroJackpot og Keno under samme forskning"; wallet agent still waiting for a definition):
| Path | What |
|---|---|
| `forskning/engine.js` | Shared engine `setaei-forskning-engine-v1`: numerology factory (pool per game), seeded control rows, hot/gap rows, hypergeometric scoring, Holm, walk-forward `backtestAll` (whole family in one pass), `nextDrawDate`. Browser + Node. |
| `Keno/numerology.js` | Now a wrapper (`setaei-keno-numerology-v1`, pool 70). `tests/forskning_engine.test.js` proves output identical to the frozen original (`tests/fixtures/keno-numerology-v1.frozen.js`) for every archive date and level. |
| `forskning/lotto/`, `forskning/eurojackpot/` | New pages, generic logic in `forskning/game.js` + `forskning/ui.js`, styles `forskning/spill.css`. EuroJackpot stars are analysed from 2022-03-25 only (pool 1-12). |
| `forskning/data/{lotto,eurojackpot}.json` | Normalized archives. Lotto from the Norsk Tipping API (`?fromDate=&toDate=`), EuroJackpot from WestLotto result pages (`?datum=DD.MM.YYYY`). Seeded from the old server's public files, then brought up to date. |
| `scripts/lottery_update.py` | Stdlib updater for both. 14-day overlap re-verifies old rows; aborts on contradictions. |
| `scripts/forskning_prereg.js` | Append-only pre-registration, SHA-256 hash chain, refuses stale data and draw-day after 12:00 Oslo. Entries: `Keno/preregistered.json`, `forskning/data/{lotto,eurojackpot}-prereg.json`. |
| `ops/forskning.cron` | Live schedule (03:22 / 03:24 updaters, 03:30 pre-registration). |

Findings with Holm over the whole family (all strategies × levels × windows):
- Keno 81 tests: 9 with raw p < 0.05 (about 4 expected by luck), **0** after Holm, lowest Holm-p 0.81. The random control at level 3 has z = +2.58, which is the point of the correction.
- Lotto 9 tests, EuroJackpot 18 tests: 0 after Holm.
- All strategies are now scored on the same draws (>= 365 / 104 draws of history), so older single numbers (e.g. cold-90 z = +2.19) are not directly comparable.

Primary pre-registered hypothesis (one test, two-sided, alpha 0.05): numerology by date at the highest level (Keno k10, Lotto main7, EuroJackpot main5). No conclusion before 30 scored draws. Everything else is exploratory.

Open: wallet-agent track; Keno draw time vs the 12:00 Oslo deadline is a conservative assumption; the Keno Statyr source is third-party.
