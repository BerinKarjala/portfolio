# M3 client workflow verification

October 20, 2026. Branch `css-studio`. Tested source commit:
`3cd7dec` (previous increment `c3d4dda`). Documentation-only updates follow.
This records client workflows with injected responses, not live generation.

| Check | Outcome |
| --- | --- |
| `npm test` | 175 tests across 30 files passed on the final source commit. |
| `npm test -- src/features/css-studio` | 42 tests across eight files passed after the opaque-frame image correction. |
| `npm run build` | Passed, 374 modules, after the opaque-frame correction. |
| `npm run check:page-builder` | Passed, all 130 canonical decisions/options and 16 mapped gates. |
| `npm run check:page-builder:build` | Passed, launcher 3,992 bytes / 1,863 gzip and workspace 208,797 / 61,842 gzip, within existing budgets. |
| Chromium Studio/Page Builder/portfolio suite | All 33 passed on the final source commit: 17 Studio, six Page Builder and ten portfolio responsive/navigation checks. |
| Chromium separate image-storage suite | All four passed again on the final source commit, using an isolated artifact directory. |
| `git diff --check` | Passed. |

Commands use Node 22.22.2 through the existing offline npm-exec selector. Chromium
154.0.8037.57 uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`.

```sh
npm run test:e2e -- e2e/css-studio.spec.js e2e/page-builder.spec.js e2e/portfolio-responsive.spec.js --project=chromium --workers=1 --retries=0
npm run test:e2e -- --config e2e/playwright.images.config.js --project=chromium --workers=1 --retries=0
```

New integration tests cover image preview before Apply, late preset isolation,
refinement operation/base bytes, independent restoration, protected comparisons,
full protected capacity, local retry without new inference, canceled/malformed
responses, visit-only denied-storage Apply and fallback after losing that mirror.
A separate microphone denial test preserves the typed draft and manual Send.
The generated-reference/refinement tests initially failed before implementation;
the generated archive test initially failed with Missing credits before adding
its separate metadata/export path.

Actual browser tests seed explicit raster fixtures into IndexedDB; they do not
pretend those fixtures came from AI. Two different supplied WebP files exercise
different stored bytes. Checks include exact image download bytes, portable ZIP
entries/metadata, no blob URLs in exports, restoration across reload, scoped
reset/Undo protection, comparison/deletion, and two seasons/two holidays retaining
their generated IDs through appearance changes. Missing records retain their
saved references and show curated fallbacks.

The examples test requires actual image decoding inside the sandbox, beyond just
checking the CSS value. It caught an opaque-origin blob-image failure. Only the
examples view now converts selected verified bytes into an ephemeral raster data
URL; `sandbox=""`, script blocking and the Page Builder compiler remain intact.
Canvas uses local object URLs; exports use portable paths and exact verified bytes.
The separate storage Playwright config now owns test-results-images so it cannot
remove the main suite's trace files when both run at the same time.

Generated history/comparison fits 320, 390, 768, 1440, 1920 and 3840 CSS-pixel
viewports without horizontal overflow. Mobile and 4K screenshots were inspected.
Automated axe checks pass on the history controls and existing themed canvas;
opaque text/control surfaces remain in use. This does not establish all-image,
all-appearance, physical phone/TV, assistive-technology or remote-control coverage.

No dependencies, lockfiles, supplied image bytes, deployments, inference calls,
provider resources, credentials, pushes or merges into main were changed. The
client adapter stays unavailable by default. Live Cloudflare eligibility, $0
allowances, durable shared quota/identity infrastructure, model comparison and
Firefox/WebKit/manual microphone/device matrices remain outstanding. AC-06 and
AC-42 are partial; AC-30 and AC-32–38 remain blocked. AC-31 is client-workflow
verified, with browser-controlled storage loss and private/disk-quota modes
remaining material limits.
