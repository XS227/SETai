# SETAEI EuroJackpot

Requested destination: https://setai.no/EuroJackpot/

Published at https://setai.no/EuroJackpot/ on 2026-10-11. Runtime update tasks
are installed under /opt/setai-eurojackpot, with an hourly refresh cron job.

## Run and deploy

Requires Python 3.9+, Node 18+, and Linux flock for scheduled refresh. The
web page itself is buildless and has no external dependencies.

1. Locate the actual existing setai.no static webroot in its Nginx vhost.
   Do not replace the site root, edit unrelated pages, or deploy this over the
   existing homepage.
2. Copy `index.html`, `engine.js`, `app.js`, `history.js`, and `proposals.js`
   into a new `EuroJackpot/` directory in that confirmed webroot. Match the
   existing site's read permissions. Its existing directory/index routing
   should serve `/EuroJackpot/` and normally redirect `/EuroJackpot` to it.
3. Store `update_history.py`, `freeze_proposals.js`, and `refresh.sh` in a
   separate non-public operations directory, together with a copy of engine.js.
   For example `/opt/setai-eurojackpot/`. Call refresh.sh with the absolute
   public EuroJackpot directory as its first argument. Avoid serving operational scripts.
4. Add an entry to the site's existing scheduled task setup, preserving existing
   jobs. Run the operations refresh task every hour. Optionally use
   `15 * * * * /bin/bash /opt/setai-eurojackpot/refresh.sh /VERIFIED/WEBROOT/EuroJackpot >> /opt/setai-eurojackpot/refresh.log 2>&1`.
   Refreshing hourly covers Tuesday and Friday even through DST changes.
5. Check `https://setai.no/EuroJackpot/`, its JS resources, and both slash/no-slash
   paths on the live server. Verify the most recent result, upcoming dates,
   archive pagination, the number grids, CSV export, and mobile layout.

For local development, use a static HTTP server. Source scripts live in
tools/eurojackpot; the page and generated data live in EuroJackpot/.

## Data and update behavior

- Official source: WestLotto's 2012–2021 zipped workbook and 2022+ zipped CSV.
- Snapshot: 997 complete scheduled draws, 2012-03-23 through 2026-10-09.
- Last result verified against the official operator's results page:
  18, 38, 41, 43, 46 + 7, 10.
- No synthetic or invented results are included.
- Python uses only the standard library to parse XLSX (ZIP/XML) and CSV.
- Reject future dates, invalid weekdays, duplicate/conflicting numbers,
  missing scheduled draws, changed historical rows, and shortened history.
- Atomic writes preserve the last successful data when refresh fails.
- The UI warns when the source is behind the latest expected result. The
  static page does not itself make cross-origin data fetches.
- Two next calendar draw dates are computed in Europe/Oslo. A scheduled draw
  today stays visible until it has an official result or the day ends. The
  Norwegian 19:00 entry deadline is shown separately.
- Two distinct rows per date for each mode. Registered pre-deadline proposals
  are immutable and store timestamp, as-of date, and model version.
- Future recorded hits are appended after results arrive; a historical
  backtest is not presented as a previously registered prediction.

## Mathematics and model

Fair jackpot probability is exactly 1 / [C(50,5) C(12,2)] = 1 / 139838160.
Main-number inclusion is 5/50; star-number inclusion is 2/12. Marginals are
not independent within a draw, so they must not be multiplied as if seven
numbers were seven independent events. The twelve prize-class probabilities
use two hypergeometric distributions.

The experimental model is a small regularized logistic learner with common
features per number: trailing-50 frequency, shrunk long-run frequency, and
draw gap. It predicts marginal inclusion scores and normalizes their expected
sum to the draw size. Weighted sampling uses these as suggestion weights,
not as calibrated joint probabilities for a seven-number row.

It trains on the first 80% of the chronological history and is frozen for
the last 20%. Each test prediction sees only earlier draw outcomes. Rolling
features update after each prediction, but coefficients remain frozen.
It resets star-pool statistics when the rules change (2014-10-10 and
2022-03-25). It then refits on all available history for upcoming suggestions.

Initial holdout: 797 training draws, 200 test draws (2024-11-12–2026-10-09).
Main Brier: 0.09000618 versus uniform 0.09000000.
Star Brier: 0.13887917 versus uniform 0.13888889.
These differences do not establish a predictive advantage. No advantage,
winning guarantee, or elevated physical draw probability is claimed.

## Validation

From the repository root, run `node tools/eurojackpot/test_engine.js` and
`python3 tools/eurojackpot/test_history.py`. Tests use the initial historical
snapshot through 2026-10-09 even after live results are updated.
JavaScript syntax checked for engine, app, and the snapshot writer. Official
archive completeness and latest result checked. Native browser QA was not
available in this environment and remains a deployment check.

## Personal numerology row 3

Birth date is required; full name is optional. All personal data stays in
browser memory and is never sent to the server or put into the global
proposal archive. Personal year/month/day use each draw date, matching the
current Numerologist report engine. Life path and name numbers match the
main IntakeForm calculator, including master numbers 11/22/33, Norwegian
letters and the contextual Y rule.

Row 3 prioritizes personal year, month, day, life path, and birth day. Equal
values share one ball. Gaps are filled by name factors when supplied, birth
month/year factors, and explicitly documented sums. Main sums above 50
wrap into 1-50. Star numbers use personal day and life path, with master
numbers above 12 digit-reduced and documented fallbacks for duplicates.
This is a symbolic selection rule, not a probability or prediction model.

Run `node tools/eurojackpot/test_numerology.js`. A sweep verified valid,
unique, explained 5+2 rows, and 90 profiles were compared against the
actual Numerologist source on the production server with exact agreement.
Native visual browser QA was not available.

## Experiment page and research data

Published at /EuroJackpot/eksperiment.html. Imports all twelve prize ranks,
winning row counts, source-reported euro quotes and international stakes
from the original official files. Source amounts remain explicitly post-draw.
Four operator-reported birthday stories are curated with provenance, missing
birth years, relation-to-birthday and the distinction between national draws
and actual matching-number prizes. No anonymous winner is identified.

The missing 2023-01-13 first-prize winning count is filled only from Norsk
Tipping's contemporaneous confirmation of no 5+2 winner. The missing quote
is left null. Overall first-prize counts: 831 no winner, 145 one winning row,
and 21 multiple winning rows through 2026-10-09.

Official advertised future jackpots are timestamped before the Norwegian
19:00 deadline. HTML result date and advertised weekday must match the
current archive. If the source layout changes, the collector preserves prior
announcements and reports that no new value was confirmed.

The combined personal/date/prize rule is versioned as personal-date-prize-v1.
Currency and integer-unit digit reduction are explicit. It is symbolic, not
a predictive advantage claim. Its historical test requires a real timestamped
pre-draw pot, never a payout substituted as a pre-draw feature.

Personal-row tests adapt star selections to each historical pool, and compare
their hit distributions with exact hypergeometric expectations and 200
independent random controls. All inputs stay in browser memory. The local
configuration download is not represented as independently verified public
preregistration.

Run node tools/eurojackpot/test_experiment.js and python3
tools/eurojackpot/test_research.py from the repository root. Tests passed
for data provenance, historical rules, odds, random controls and leakage
exclusion. Graphs and HTML asset/DOM references were checked, but visual
browser QA was unavailable.


## Calendar candidate registered 12 October 2026
84 retrospective method variants, seven-day information lag, 200 selection + 200 reused validation dates. Chosen calendar/dayroot/400 candidate: 0.945 mean total matches vs 0.833333 uniform, +13.4% descriptive only; zero 5+2. No corrected evidence of increased jackpot probability. Public report and immutable first two forecasts in EuroJackpot/kandidat-20261012.{html,json}. Two future draws alone cannot establish an advantage.
Reproduce grid (numpy/scipy required): python3 tools/eurojackpot/extended-analysis.py EuroJackpot /tmp/calendar-grid.json. Verify candidate independently: node tools/eurojackpot/test_calendar_candidate.js EuroJackpot/history.js. Source version calendar-dayroot-400-v1. Registration is self-published, not third-party certified.


## Same calendar date in previous years
EuroJackpot/index.html#samme-dato defaults to the visitor device calendar date/timezone and permits date selection. Exact month/day comparisons only; all prior years since 2012 displayed, including no-draw years. Leap-date absence, pre-launch dates and dates beyond available coverage are labelled separately. Midnight refresh follows local date only while Today mode remains selected. Historical-data refresh re-renders selected results. Source: same-date.js; syntax and current-date/coverage/leap/timezone checks passed.


## Exact drawn-number repetitions
EuroJackpot/index.html#gjentakelser groups all seven numbers, the exact five main numbers, and exact star pairs separately. Numeric order ignored; pool identities retained. All-history and current 12-star regime (from 25 March 2022) filters. Every repeated group shows occurrence count, repetitions beyond its first occurrence, and every date. Refreshed with historical data. Through 9 October 2026: 997 draws, zero repeated full rows, zero repeated five-main sets, all 66 star pairs repeated, 931 occurrences beyond the first per-pair occurrence. Top pair 7/8: 29 occurrences. Current regime: 475 draws. Independent Python and JS counting, ordering invariance, pool-boundary separation and immutability checks passed. Counts refer to drawn numbers, not number of winners.


## Row 4: exclude all prior main sets and full rows
Version unseen-main-and-full-v1, source EuroJackpot/exclusion.js. Every target-date proposal uses only strictly earlier draws. Reject any five-main set present in history, regardless of stars, and separately check the complete row. Rejection sampling uses date, source version, last available draw and history count for deterministic seeded uniform sampling. Reports count of checked draws, excluded distinct main/full sets, number of full current-rule combinations removed, and previous occurrences of selected star pair. All 66 current star pairs have appeared already, so stars cannot also be entirely unseen. Genuine per-row odds retain the original physical sample-space denominator. Row 4 is computed locally and included in clipboard export; original frozen AI/uniform forecasts and personal row 3 unchanged. Through 9 October: 997 main sets remove 65,802 complete 12-star-rule rows. New row for 13 October: 7,11,20,28,45 + 3,8; 16 October: 24,32,34,39,48 + 7,12. Verified historical exclusion, newly drawn/reordered set rejection and target/future-result invariance.


## English number lab and combined ticket (12 October 2026)
Ten-slot ticket: AI lines 1/2, personal numerology 3, historical exclusion 4, locked calendar hypothesis 5, personal/date/prize hypothesis 6, plus user-selected lines. Empty personal slots await birthday/amount. Remove/add controls, validated number picker, randomise and copy; odds count distinct complete combinations. Per-draw ticket state and personal details stay browser-local and unsaved. Calendar WebCrypto implementation reproduces original registered Node protocol; locked JSON unchanged. All user-facing EuroJackpot pages/calculator labels/errors use English.
SEO: canonical tags, English titles/descriptions, Open Graph PNG, WebSite/WebPage/Dataset/FAQ JSON-LD; latest results and all 997 historical results in HTML. New results.html archive and year navigation. update_site.py refreshes HTML fragments, full archive and lightweight site-data.js after the existing hourly updates. Four lab URLs added to sitemap without replacing unrelated live entries. No ranking guarantee.
Validation: engine/numerology/experiment/calendar tests passed; browser-calendar equivalence, ticket assembly/placeholders/manual validation/removal/deduplication; static HTML ID/assets/language/schema and full-archive checks. Visual browser/mobile QA unavailable without control-browser.
