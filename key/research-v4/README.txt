SETAEI experiment audit 2026-10-24

1. node verify-metrics.cjs
   Uses Node.js 18+ and bundled standard modules only. Verifies frozen source hashes and all 7,168 metric rows. Synthetic seeds are public test data and must not be used for real funds.

2. python3 analyze.py
   Requires numpy, scipy and matplotlib. Reads input.json and writes recomputed summaries, confidence intervals and figures into output/.

The replay has 2,656 old observations and is not a new independent sample. The fresh cohort has 4,512 observations. Original per-trial times are unavailable. Logged UTC times in trials.jsonl.gz refer to this audit run.

The protocol was internally sealed before trial execution. This is not an external preregistration. Statistical consistency with a random reference does not prove cryptographic security.

The full original trial log SHA-256 is recorded in run.json. manifest.json lists file hashes. No real wallet keys, access tokens or target addresses are included.
