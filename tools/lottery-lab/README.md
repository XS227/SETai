# Lotto and Vikinglotto labs

Independent English number labs for setai.no, sharing EuroJackpot's coupon style,
preview code 227 and personal numerology profile calculator. The preview gate is
browser-side presentation, not server authentication. Personal input stays in memory.

Source: Norsk Tipping LotteryGameInfo public finalised results. Lotto: 2016 onward;
Vikinglotto: current 1–5 special-number rules, 9 June 2021 onward. Each interval is
under 15 weeks. Validate all weekly dates, pool bounds, distinct main numbers and
conflicting existing results before accepting a snapshot. Prize amounts are NOK.

From the repository root:

    python3 tools/lottery-lab/collect.py
    node tools/lottery-lab/freeze.js
    python3 tools/lottery-lab/build.py
    node tools/lottery-lab/test.js

`LOTTERY_LAB_ROOT` optionally selects a data/output directory. Source JS is always
loaded from the script's repository. `refresh.sh` stages collection and rendering,
validates them, then atomically replaces individual public files. A shared lock
prevents overlap. Browser snapshot checks reject a brief cross-file revision mismatch.
The last published files remain intact if collection, analysis or validation fails.

Forecast ledger: never rewrite registered rows. Attach actual result and hit counts
after publication; append new target dates only before 18:00 Europe/Oslo. The second
upcoming date is registered using the history available now and stays frozen even
after the nearer draw occurs. No fabricated retrospective forecasts. Uniform control
is recorded with every batch. Local coupon edits never change this record.

AI 1/2 share regularised logistic inclusion probabilities. Inputs: last-50 frequency,
shrunk full-history frequency and scaled time since last appearance. Fixed 80/20
chronological holdout freezes coefficients in the last fifth; rolling features use
only earlier draws. Refitting afterwards is for new forecasts only. Weighted sampling
without replacement produces selections; the Brier check measures inclusion
probabilities, not selected-line performance. No demonstrated predictive advantage.

Other registered methods: day-of-month root frequency (last 400 draws with 20-draw
smoothed history prior), unseen exact main set, most frequent main-sum root among
earlier full-date-root matches, and uniform control. Tie breaks choose the lowest
root. Sum-root expectations enumerate all valid main combinations by sum dynamic
programming. Lotto's 7 main plus drawn bonus is a uniform 8-subset; Viking sums convolve
the uniform 6-main subset with the separate 1–5 Viking pool. Root/date matches are
descriptive; no significance or multiple-comparison-adjusted discovery is claimed.

Personal profiles reuse the original EuroJackpot calculator unchanged. The new game
mapping prioritises year/month/day/life/birth day/name/birth month/birth-year factors,
deduplicates, fills using documented pair sums, then deterministic factor sums. Map
cyclically to the main pool; Viking maps the personal day to 1–5. These mapping rules
are a labelled numerology experiment, not a learnt prediction model.

Deployment uses an isolated Git worktree to avoid unrelated live repository changes.
Public directories: Lotto/, Vikinglotto/, LotteryLab/. Operations: /opt/setai-lottery-labs.
An hourly cron invokes refresh.sh. Preserve forecast ledgers across code deployments.
