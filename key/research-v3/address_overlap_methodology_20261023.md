# SETAEI research note: address-bit overlap is not key-bit overlap

**Date:** 2026-10-23 (Europe/Berlin).
**System:** Ethereum EOA, secp256k1 private key -> public key -> Keccak-256 -> final 160-bit address.
**Reproducibility:** 2,000 fresh, independent, secure-random synthetic private keys generated in a local test environment; no live account keys or wallet balances were used. Public source code for the model is served on /key/ as `model-experiment-v5.js` and `guess-experiment-v5.js`.
**Scope:** One observational set of 2,000 model predictions and independent control keys, plus 500 tests where a *single* bit in a synthetic secret key was flipped before deriving the address. No model weights were updated by this experiment.

## Definitions

- *Address matches*: number of equal bit positions (Hamming similarity) between target Ethereum address and address derived from candidate key, ignoring checksum capitalization. Range 0–160.
- *Key matches*: number of equal bit positions between synthetic known secret and predicted key. Range 0–256. This metric is **not available** from a real public address alone.
- *Control*: address derived from an independent random private key; this should match approximately 80 of 160 address bits.
- *Avalanche*: address-bit similarity when a key differs from the known secret in exactly **one bit**.
- *Correlation*: Pearson coefficient between per-case address matches and secret-key matches; tested over 2,000 pairs.

## Results

| Test | Mean matched bits | Percent |
| --- | ---: | ---: |
| Model predicted address vs target | 79.905 / 160 | 49.940625% |
| Independent random-key address vs target | 80.0685 / 160 | 50.042813% |
| Predicted key vs known secret | 128.3735 / 256 | 50.145898% |
| Exactly one key bit flipped vs original address (500 tests) | 80.304 / 160 | 50.190000% |

- Pearson correlation between model address match and model key match: **r = +0.0276093**, practically negligible in this experiment.
- Best address similarity among the 2,000 predictions was **102 of 160 bits**, but **no full addresses and no original secret keys were recovered**.
- Of 15 model predictions with at least 96 matching address bits, mean correct *key* bits was 129.67 of 256. Of 951 predictions with fewer than 80 matching address bits, mean correct key bits was 128.22 of 256. These post-hoc small subgroups must not be mistaken for a predictive signal.

## Interpretation / research decision

That a candidate address agrees at one position only proves this *one address bit* agrees. It does not localize which bits of a secret key are correct or show a path to repairing a bad guess. A high-scoring address candidate can still have an essentially unrelated private key. This is expected of ECC public key derivation followed by a cryptographic hash.

**Decision:** Continue as a measurement/learning laboratory, and retain the original model. Do not promote a new model or mark secret-key bits as verified for an address-only input. Before accepting an alleged improvement, freeze the candidate algorithm, evaluate a never-used holdout with a random-address baseline, measure whole-key success and reproducibility, and publish uncertainty bounds.

## Files

- `address_overlap_study_20261023.json` includes full aggregate statistics and per-bit occurrence counts; no private keys or public addresses are saved.
- `known_pair_validation_20261023.json` is the earlier 1,000-sample key-only holdout result.

## Relevant background

- Ethereum account generation: https://ethereum.org/en/developers/docs/accounts/
- Avalanche principle in cryptographic hashing: https://www.cs.cornell.edu/courses/cs513/2005fa/NL20.hashing.html
