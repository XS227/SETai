# SETAEI Cryptographic Randomness Research

Source for the isolated research UI intended for `https://setai.no/key/research/`.

## Studies
- `index.html` — research landing with study links and evidence status
- `experiment-01/index.html` — seeded 160-bit distribution and pattern visualizations
- `experiment-02/index.html` — ten synthetic 160-bit targets and one shared candidate, paired baseline/filter comparison, per-position inspection, JSON export
- `journal/index.html` — research-note/protocol format, not an accepted publication or a PhD degree
- `assets/styles.css` and `assets/multi-target.js` — responsive UI and local deterministic simulation

## Non-negotiable scientific cautions
The ten-target demo uses **synthetic random data**, not real wallet targets or private-key scanning. A gate can improve the *conditional average similarity of the retained subset* while discarding genuine matches. The primary success measure is exact address hits **per generated candidate**, not hits per accepted candidate. Testing ten targets can increase the chance of any hit per generated candidate compared with one target, but it does not imply tenfold key-generation speed or cryptographic predictive skill.

## Deployment safety / provenance
This GitHub branch is a **source staging branch**, not proof of publication.
The existing `/key/` page, its counter, `/key/api/latest`, workers, watchdogs, database and server configurations must remain untouched.

The script `deploy/DEPLOY_FROM_GITHUB.sh`:
1. Defaults to **read-only inspect**.
2. Fetches a pinned source commit from GitHub in a separate staging folder.
3. Requires a verified existing static `key` directory and a new, unused `key/research` destination.
4. Checks the live counter API before and after.
5. Never stops or restarts a worker or edits Nginx.
6. Refuses to overwrite existing research files.

No GitHub Actions production deploy integration or SSH credential was found/verified. Therefore a pull request or push **does not itself establish that VPS content has changed**. Do not infer the Nginx webroot from the GitHub tree.

## Testing
`node --check assets/multi-target.js` checks script syntax and `bash -n deploy/DEPLOY_FROM_GITHUB.sh` validates bash syntax. The pull-request CI also checks expected navigation and sources. Runtime browser checks and the final deployment health checks must be performed against the actual deployment.

## Future research
Log hypotheses before live testing, report confidence intervals and multiple-testing correction, split discovery from validation, and compare throughput (candidates/s), evaluations (comparisons/s), and exact-match probability separately. Do not publish key material, seeds used for security, or server secrets.
