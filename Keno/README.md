# Keno · SETAEI LotteryAudit

An independent, read-only research page at \`/Keno/\`, designed to complement the existing EuroJackpot, Lotto, Vikinglotto and LotteryAudit research pages. **No betting, deposits or purchase links.**

## Source and coverage
- Results archive: https://statyr.com/nb-no/keno/arkiv (independent third party; not an official source)
- Rules: https://www.norsk-tipping.no/lotteri/keno/slik-spiller-du
- Initial snapshot verified for data structure: 5,500 unique dates (2011-08-25 to 2026-11-05), each with 20 distinct integers in 1..70.
- Data validation verifies **format, range and date uniqueness**, not authenticity of each draw. Cross-check against Norsk Tipping before treating the data as authoritative.

## Start locally
From the repository root:
\`\`\`bash
python3 -m http.server 8000
# Open http://localhost:8000/Keno/
\`\`\`

## Daily updates
\`\`\`bash
pip install beautifulsoup4==4.12.3
python scripts/keno_update.py
\`\`\`
The scheduled GitHub Action runs after each Norwegian evening drawing. It only writes new draws and **stops on contradictory or invalid records**. Scheduled workflows run only once this feature is on the repository default branch and GitHub Actions are enabled. Updates may lag the drawing or fail when the third-party site changes.


## Live deployment (6 November 2026)
The active public host is **vps-5359843 (5.249.252.88)**, not the former server vps-1431514 (5.249.255.116). Public Keno is served from \`/var/www/setai/Keno/\`. A standalone root-owned updater is installed at \`/opt/setai-keno/update.py\` with an isolated Python environment at \`/opt/setai-keno/venv\`; it writes \`/var/www/setai/Keno/draws.json\` as \`www-data\`.

The **live production** refresh job is \`/etc/cron.d/setai-keno-refresh\` and is recorded in \`ops/keno-refresh.cron\`. It runs daily at **03:17 UTC** and writes logs to \`/var/log/setai-keno-refresh.log\`. This is separate from the GitHub Action, which refreshes the repository dataset but does not publish new data to the VPS.

The old \`/EuroJackpot/\`, \`/Lotto/\`, \`/Vikinglotto/\` and \`/LotteryAudit/\` routes were deliberately retired (HTTP 410) during the 2026-10-28 VPS migration, according to the new host's Nginx comment. Keno is a new independent page; its own navigation uses active internal anchors rather than pointing to the retired routes. Do not remove the existing 410 rule without a separate decision to restore the former modules.

## Statistical design
The Keno draw is modeled as 20 distinct numbers sampled without replacement from 70. At Keno level k (2–10), the expected number of matches is k×20/70. Each of the user's k-number selections has the same mathematical probability of getting all k correct: C(20,k)/C(70,k).

Each walk-forward simulation selects k numbers using only the previous W draws, where W is 90, 180 or 365. Strategies: most frequent ("hot"), least frequent ("cold"), and fixed 1..k control. Results are evaluated out of sample from 2013-01-01. Comparing multiple windows and strategies post hoc can produce apparent wins by chance; a pre-registered holdout is required for credible claims of predictive advantage.

### Initial independent audit (2026-11-06)
- 2026 archive: 307 draws, top #32 appeared 104 times, least frequent #50 appeared 64.
- Mean 10-number hit rate over 5,009 walk-forward draws, 2013–2026: 90-draw hot 2.86145, 180-draw hot 2.85406, 365-draw hot 2.84927, 90-draw cold 2.89838. Chance expectation = 2.85714.
- These are **not** reliable predictions. No reproducible positive edge established.
- Theoretical prize share at level 10 using the published payout table was approximately 55.21% (before rare jackpot truncation effects).

## Redesign 2026-11-06 (research hub)
Keno is now part of **SETAEI Forskning** (`/forskning/`, see `handoffs/forskning/README.md`). The page logic moved to `app.js`, and the numerology engine lives in `numerology.js` (`setaei-keno-numerology-v1`). The page now shows top-10 lists, randomness tests, rows for the next draw (numerology by date, personal, hot, overdue, random control) and a backtest with z-scores. The logo is the inline SETAEI SVG wordmark, not `/assets/logo/setaei-logo.png`.


## Shared engine and pre-registration (2026-11-06)
Rows, scoring and Holm correction now come from `/forskning/engine.js` (shared with `/forskning/lotto/` and `/forskning/eurojackpot/`). `Keno/preregistered.json` is written by `scripts/forskning_prereg.js` from cron (`ops/forskning.cron`): rows for the next draw are locked before it happens in a SHA-256 hash chain. Run `node --test tests/forskning_engine.test.js tests/forskning_prereg.test.js`.
