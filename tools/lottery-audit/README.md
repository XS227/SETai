# Reverse fitting, frozen replay and prospective registration

This study covers 50 EuroJackpot draws from 1 May to 20 October 2026. Features
use only draws on or before target minus seven calendar days (inclusive).
Euro-number feature history starts at the 12-number pool on 25 March 2022.

Three standardised/clipped features: last-50 inclusion frequency, long-run
frequency with a 30-draw prior, and scaled absence. Polynomial terms follow the
explicit exponent ordering stored with every coefficient vector.

`fit_last50.py` requires NumPy and SciPy for manual analysis generation. It:

1. Fits two 9-term quadratic score functions to the known 20 October answer
   using features available through 13 October, then freezes those coefficients.
2. Replays that same score function on all 50 cases. The 20 October fitting
   example is separated from the 49 other cases. This remains retrospective.
3. Fits each known answer separately, trying polynomial degrees 2, 3, 4 in
   order, with coefficient bounds [-1,1]. It maximises the strict winner versus
   non-winner score margin, requires margin > 1e-7, and verifies the selected set.
4. Tests one common coefficient vector across all 50 dates at degrees 2, 3, 4.

The per-answer fitting finds 50/50 exact sets after using the answers. It is
not 50 successful predictions. Main numbers require 9 terms in 14 cases and
19 terms in 36; stars use 9 terms in all 50. No tested common coefficient
vector strictly separates all 50 sets. The original frozen model fits its
training case and has zero complete matches on the 49 other cases.

Published JSON contains full coefficients, source hash, cutoffs and per-draw
results. CSV exposes all 50 comparisons. Never report the fitting case as an
independent success, and never present refitted coefficients as unchanged.

`inverse-engine.js` reproduces the same normalisation, powers and deterministic
ascending-number tie-break in JavaScript. `freeze_inverse.js` explicitly saves
one next-draw selection without changing existing records. The 23 October
record uses feature data through 16 October but coefficients fitted to the
20 October answer; its true information date and registration time are stored.
This is not a forecast issued a week early. No improved winning odds are claimed.

`render_page.py` uses only Python's standard library. It preserves the existing
LotteryAudit functionality, renders this fixed dated study and reads current
AI, uniform comparison and inverse registrations for the next date. The EuroJackpot
hourly refresh stages the audit update before publication. It does not refit
coefficients or silently shift the dated 50-case study after new results arrive.

Commands from the repository root:

    python3 tools/lottery-audit/fit_last50.py --root . --out LotteryAudit
    python3 tools/lottery-audit/test_inverse.py
    node tools/lottery-audit/test_inverse.js .
    python3 tools/lottery-audit/render_page.py --root .

Tests verify every model's exact selection, cutoff isolation, training-case
exclusion, shared-weight failures, JavaScript/Python parity and prospective
record timing. Navigation is published across all four labs; other pre-existing
changes to the running Lotto/Vikinglotto renderer are preserved separately.
