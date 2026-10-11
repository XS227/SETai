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
