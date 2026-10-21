# CSS Studio M2 verification

October 20, 2026 (America/New_York). Branch `css-studio`.
Previous increment: `379e8ff`. Current runtime/asset commit:
`93c961b78a3d4095d3c7543a91831b1ac0a1db43`.
Original feature starting commit: `5644de5b9f7eeb809ed8ce2d6b9f2e03ac84e2da`.
Documentation-only changes follow this tested source commit.

Source: the user's connected [Drive handoff folder](https://drive.google.com/drive/folders/1HJuK5FAA8RTOnMXBD9HrP-grY-UdgKxF).
Drive files were read, never edited or shared. All **504** integrated files
match the original handoff manifest: 248 photos, 248 thumbnails, four contact
sheets, catalog, attribution, README and standalone browser. No image bytes were
fabricated or recompressed. Public assets occupy approximately 97 MiB on disk;
this is static storage, not an initial page download.

## Commands and outcomes

Commands use Node 22.22.2 through the previously documented npm-exec cache selector.
Chromium is 154.0.8037.57; override executable `/usr/bin/chromium`.

| Check | Outcome |
| --- | --- |
| `python scripts/check-css-studio-assets.py` | passed: all 496 WebP files decoded; exact hashes/dimensions/paths; unique IDs/source identity metadata; 62 per season and 50/12 split; complete credit records; generated runtime index matches source catalog. |
| Original handoff SHA-256 manifest comparison | passed for every one of the 504 integrated files. |
| `npm test -- --reporter=dot` | 158 tests, 27 files passed again on final runtime commit 93c961b after the metadata-guard correction. |
| `npm test -- src/features/css-studio` | 25 tests, 5 files passed after portable-copy normalization. |
| `npm run build` | passed, 369 modules. Final metadata validation/error-status changes build successfully. |
| `npm run check:page-builder` | passed, all 130 canonical decisions/options and 16 gates. |
| `npm run check:page-builder:build` | passed, launcher and workspace remain within existing size budgets. |
| Chromium `e2e/css-studio.spec.js e2e/page-builder.spec.js` | 18 checks passed, including the six existing Page Builder regressions. |
| Chromium `e2e/css-studio.spec.js` | all 13 checks passed after adding the standalone catalog check and portable-copy behavior. |
| Chromium final photo/fallback/standalone subset | all 3 passed on final runtime source after allowing source-provided legacy HTTP license links. |
| `git diff --check` | passed. |

Browser commands also use `--project=chromium --workers=1 --retries=0`.
The final subset selector was:

```sh
npm run test:e2e -- e2e/css-studio.spec.js --project=chromium --grep 'curated holiday|broken manually|standalone supplied' --workers=1 --retries=0
```
See progress.md for the full reproducible command prefixes and historical TDD
failures. No test or development action performed inference.

## Verified behavior

- Seasonal wilderness defaults; matching holiday photos searched across seasonal
  folders; manual overrides persist independently and survive reload.
- At most 12 lazy thumbnails per picker page; full photos load only when selected.
  Network assertions detect no inference endpoints and no eager full-library load.
- Catalog filters by preset/all, season, subject and title/holiday text. The
  supplied standalone browser filters 248/all, 62/Winter, 12/celebration and
  3/Christmas correctly and opens a local full-size sample.
- Photo credits expose source, creator, license, original-resolution URL, changes
  and additional rights notes. Two personality-rights notes are retained. Original
  legacy HTTP license links remain unchanged; unsupported URL schemes are rejected.
- A broken selected photo falls back without erasing its saved ID. Export follows
  the actual fallback. Two failures stop retries and retain a solid curated palette.
- Portable ZIP download includes exact selected WebP bytes, styles.css and full
  matching CREDITS.json. Unit tests parse ZIP entries and compare bytes/metadata;
  corrupt bytes fail SHA-256 validation. CSS resolves the same design/selected
  image and normalizes only `/css-studio/` to `./css-studio/` for portable use.
- All sixteen seasonal and sixty-four holiday appearance combinations retain
  the existing token/contrast matrix check. Representative Winter/Light axe scan
  passes with the real background loaded; this is not full AA conformance proof.
- Contact sheets for all four seasons were reviewed. Actual Winter picker/canvas
  screenshots at 390, 1440 and 3840 px show readable opaque content/control
  surfaces and usable responsive crops.

## Remaining work

Generated-image byte persistence/history/comparison/refinement/download workflows,
protected Cloudflare access and model/free-plan checks, durable shared quota
admission/reservations, server-issued browser identity, concurrent UTC-boundary
reconciliation and live model comparisons remain unimplemented/unverified. Public
AI dispatch stays disabled. No paid fallback or provider credentials were added.

Firefox/WebKit, full keyboard/form/resize sweeps, every photo under every edited
appearance, physical phones/TV remotes, microphone/device behavior and current
source-site license/legal clearance have not been comprehensively verified here.
The complete existing browser suite remains part of release CI. Refer to
requirements-trace.md for individual AC statuses and verification-m1.md for
historical evidence. No push, deployment, PR or merge into main occurred.
