# CSS Studio verification record

Date: October 20, 2026 (America/New_York). Branch: `css-studio`.
Initial commit: `5644de5b9f7eeb809ed8ce2d6b9f2e03ac84e2da`.
Current runtime-source commit tested:
`24fa8706074bbcba0b5482f8e73952f922850665`.
The following documentation commit changes no runtime source.

Runtime: Node 22.22.2; npm 11.9.0; Vitest 5.0.4. Browser: Chromium
154.0.8037.57, Debian 13 build, `/usr/bin/chromium`. Commands and environment
selectors are documented in `progress.md`; no dependency/lockfile updates.

| Command/check | Result | Evidence/scope |
| --- | --- | --- |
| `npm test -- --reporter=dot` | passed | 152 tests, 25 files; final resolver and existing portfolio/Page Builder tests. |
| `npm run build` | passed | Final source builds; 365 modules transformed; no unresolved dependencies. |
| `npm run check:page-builder` | passed | 130 canonical decisions/options match, all 16 acceptance gates mapped; run after main integration. |
| `npm run check:page-builder:build` | passed | PageBuilderProject 3,965 bytes / 1,846 gzip, BuilderWorkspace 210,167 / 62,395 gzip; within existing budgets. Run after main integration; subsequent changes touch theme resolution/tooltip only. |
| Chromium `e2e/css-studio.spec.js e2e/page-builder.spec.js e2e/portfolio-responsive.spec.js` | passed | 26 checks on runtime commit e6f0148; navigation, Page Builder data/recovery/focus, game/gallery routes, responsive and 4K behavior. |
| Chromium `e2e/css-studio.spec.js` | passed | All 10 checks repeated on final runtime source after contrast-identity and tooltip corrections. |
| Seasonal/holiday matrix | passed | 16 seasonal + 64 holiday solid-palette combinations tested in Chromium for minimum 4.5:1 resolved canvas text contrast. This is not a complete contrast audit of every actual element/photo/state. |
| Axe scan | passed | No reported violations on Winter/Light at 1440px with both drawers and focused moon. Other appearances and actual photo overlays require further accessibility review. |
| Responsive layout | passed | Studio at 360, 390, 430, 768, 1440, 1920×1080, 3840×2160. Existing portfolio suite adds 320px and navigation/4K scaling checks. |
| Manual screenshot review | passed | Reviewed phone, desktop and 4K-class layouts; fixed transient color transitions and unreadable tooltip. Final screenshot review confirms the navigation labels and canvas remain visible. Screenshots are intermediate local artifacts, not release-device certification. |
| Handoff integrity | passed | SHA-256 of all seven supplied Markdown files matches supplied manifest. This does not verify unavailable asset files. |
| `git diff --check` | passed | No whitespace errors. |

Test failures encountered and resolved are recorded in `progress.md` with the
TDD sequence. The initial missing-package failures were environment setup, not
regressions. Source inspection includes the currently fetched main branch's
navigation standards; main was merged into the feature branch, never the reverse.

## Not verified / incomplete

- Firefox/WebKit and the full remaining Page Builder browser suite were not run
  here. They remain part of the existing CI release matrix. No CI run or remote
  pull request has been created for this branch.
- Physical phones, TV browsers/remotes, assistive technology, viewing distance,
  browser zoom and actual microphone permissions/recognition compatibility need
  device review. The speech test uses an explicit recognition mock.
- Moon fixtures check approximate phase dates and waxing/waning intervals; a full
  independent visual phase-geometry sweep and visibility/timer browser test are
  still not run.
- Complete keyboard/form/focus review, resize-state scenarios, browser denied-write
  recovery and every edited appearance need broader acceptance verification.
- The 248-photo catalog, paths/decoding/hashes, credits/licenses, cultural relevance,
  cross-season holiday selection, lazy loading, fallback, export assets and
  text-over-photo contrast are blocked until the supplied library is accessible.
- Generated-image byte caching, bounded image history/comparison/downloads and
  image refinements are not implemented.
- Protected Cloudflare endpoint, server identities, durable quotas/reservations,
  concurrency/UTC reconciliation, current free-model/service checks, live output
  validation and model comparisons remain blocked/unimplemented. No inference
  request has run; production's disabled adapter cannot dispatch requests.

Next executable milestone: obtain `background-library/catalog.json`, attribution
and license records, and photos/thumbnails in individually transferable archives
under 32 MiB; integrate and verify M2 before claiming complete curated scope.
No production deployment, push, PR, or merge into the default branch occurred.
