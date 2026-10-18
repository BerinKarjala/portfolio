# Page Builder implementation evidence

M1–M5 implementation has landed through owner-merged PRs #227, #228, #229, #232 and #233, after the requirements baseline in #226. M5 merge `095d567` is live through Git-connected Netlify deployment. [Post-merge verification](release-verification.md) records the exact revision, immutable CI and live checks. Follow-up [PR #235](https://github.com/BerinKarjala/portfolio/pull/235) adds remaining automated acceptance coverage and updates documentation; physical-device/AT/manual sign-off remains open in [#234](https://github.com/BerinKarjala/portfolio/issues/234). Codex performed no merge or manual production deployment. Earlier milestone descriptions retain historical evidence.

The approved October 18 launch layout overrides the original direct-to-editor route: portfolio project page, clickable preview on the left, existing source viewer on the right, full-viewport workspace after activation.

## Milestones

- [x] M1 — foundation and persistence: local, GitHub CI and Netlify preview gates passed
- [x] M2 — canvas and structural editing: local, GitHub CI and Netlify preview gates passed
- [x] M3 — content and design systems: local, GitHub CI and Netlify preview gates passed
- [x] M4 — export, preview, validation and resilience: local, GitHub CI and Netlify preview gates passed
- [ ] M5 — cross-browser evidence, teaching documentation and release

## M1 deliverables

- [x] Portfolio route and CMS-aware bundled gallery entry; keyboard-accessible preview launcher and close action
- [x] Context/reducer foundation; six starter structures plus blank
- [x] Dashboard create/rename/duplicate/search/sort/filter/favorites/grid/list/Trash
- [x] Strict versioned project validation; isolated stored records and safe migration
- [x] One-second autosave, visible failures, unsaved download/exit warnings, revision/ownership protection
- [x] Versioned project/collection JSON; selective copy restore, duplicate preview, validation reports and failure rollback foundation
- [x] Error recovery; separate workspace/preferences; width/scroll flush on page exit
- [x] Unit/integration tests, production build, Chromium smoke workflows
- [x] GitHub cross-browser CI and implementation Netlify Deploy Preview verified

## M1 verification

Local runtime: Node 22.22.2 / npm 10.9.4, clean lockfile install before implementation.

- Baseline: 9 existing tests and production build passed.
- TDD: initial domain suites failed on missing modules before implementation; 21 initial model/storage cases subsequently passed.
- M1 local suite: **45 tests across 8 files passed**, including host gallery/game logic and new corruption/quota/migration/backup/ownership cases.
- Production build: passed; existing routes and lazy-loaded chunks preserved.
- Browser foundation: **6 Chromium scenarios passed** against the production build: launcher/focus, autosave/reload/JSON copy restore, real two-tab takeover, quota recovery/download/exit guard, 390px dialogs/Escape, gallery fallback and both game routes.
- Screenshots reviewed: portfolio launch layout, starter settings/layout and mobile template selection. Screenshots are review evidence, not approved visual baselines.
- GitHub Actions [run 39098233550](https://github.com/BerinKarjala/portfolio/actions/runs/39098233550) passed for implementation commit `7c69fff`: clean `npm ci`, 45 tests, build, and 18 browser cases (six each on Chromium, Firefox and WebKit). Browser reports/screenshots/traces were uploaded.
- Netlify Deploy Preview for PR #227 passed: [open the project](https://deploy-preview-227--berinkarjala.netlify.app/projects/page-builder). No production deployment was requested or performed by Codex.
- Requirements check: all 130 JSON records, specification table rows and implementation-trace rows are present; selected options/domains/descriptions match. No existing dependency versions changed; Playwright added three dev packages.
- This evidence update changes documentation only; the tested implementation is unchanged.

## M2 deliverables and gate

- [x] Core component palette with search/categories/favorites/recent; mouse, long-press touch and KeyboardSensor placement
- [x] Interactive Flex/Grid/free-form canvas; four-level semantic nesting; unified atomic commands and safe reparenting
- [x] Percentage move/resize, snapping/guides, modifier override, aspect lock, compatible multi-element arrangement
- [x] Selection/overlap cycling, breadcrumbs/touch layer picker, searchable expandable Layers, reorder/rename/visibility/z-index
- [x] Inherited/descendant locks, groups, internal copy/cut/paste/duplicate, reference remapping and delete/unwrap choices
- [x] 50-action session Undo/Redo, coalesced typing/nudges, one action per pointer gesture; storage revision retained through history
- [x] Viewport presets/custom/edge resizing, 50–200% zoom, fit/reset, Ctrl-wheel, Space/middle pan and touch pinch
- [x] Separate workspace recovery for width/zoom/scroll/selection/panels/Layers; responsive drawers and touch selection checkboxes
- [x] Schema v2 with validated M1/v0 migration; last-good storage protections retained
- [x] Local **61 unit/integration tests across 12 files**, production build and **16 Chromium browser scenarios** passed
- [x] Reviewed and committed representative structured/Grid Chromium visual baselines; ordinary CI compares them without updating
- [x] M2 GitHub Chromium/Firefox/WebKit verification and Netlify Deploy Preview

GitHub Actions [run 39101837094](https://github.com/BerinKarjala/portfolio/actions/runs/39101837094) passed for implementation commit `1759a29e6ca2963079a259e9515287cff720fc5a`: clean `npm ci`, **61 tests**, production build, and **44 passing browser cases with four intentional skips** across Chromium/Firefox/WebKit. The Chromium run also compared both committed visual baselines successfully. Browser reports/screenshots/traces were uploaded.

Netlify Deploy Preview for PR #228 passed: [open Page Builder](https://deploy-preview-228--berinkarjala.netlify.app/projects/page-builder). The preview deployment, header and redirect checks passed. This records the deployment check; automated interaction coverage runs against the production build in CI. M1 was merged independently while M2 was underway; the feature branch incorporates that main baseline without changing the tested M2 tree. M2 was subsequently merged independently by the repository owner; no production release was performed by Codex. This final evidence update changes documentation only.

The browser matrix includes a CDP touchscreen case and representative visual-baseline case on Chromium only; both are explicitly skipped on Firefox/WebKit. All ordinary pointer/keyboard/mobile layout/ownership workflows run in every engine. Full visual/performance/manual-device acceptance remains M5. See [M2 contracts and verification](m2-canvas.md).

## M3 deliverables and gate

- [x] Full 18-type categorized palette and component previews; semantic form/table/gallery/media/icon/native-navigation controls
- [x] Structured version-2 rich-text editor, selection-preserving contextual toolbar, inline icons/links/formatting, safe paste, composition and grapheme-aware deletion
- [x] Global/element visual styles, state styling, colors/swatches, box model, typography, backgrounds/crop, sticky layout and responsive visibility
- [x] Category preset inheritance/variants, effective/inherited/override display, confirmed appearance baking and transitive dependency copying
- [x] Validated linked masters, edit/propagation/detach/removal, independent cross-project copy and local instance overrides
- [x] Global/element effects, triggers/timing/repeats/direction, session pause/replay and reduced motion
- [x] Six polished editable template compositions with original SVG placeholders
- [x] Schema v3 migration, canonical graph history, ownership and last-good-save protections
- [x] Final local unit/integration/browser checks, refreshed visual comparison and accessible workflow review
- [x] M3 GitHub Chromium/Firefox/WebKit verification and Netlify Deploy Preview

Local M3 verification on Node 22.22.2/npm 10.9.4: **102 tests across 16 files passed**; production build passed; the full **23-case Chromium suite passed**, including the seven M3 workflows. Final mobile heading/drawer refinements then passed all seven M3 workflows plus the existing mobile insertion/dialog cases and ordinary visual comparison. Two refreshed structured/Grid images, desktop rich editing, mobile inspector and all six mobile template heroes were visually reviewed. Axe scans passed for the desktop/mobile shell and the rich editing controls; new browser cases report no unhandled page errors.

The first lazy-workspace unit assertion now allows five seconds for test-runtime compilation/import; ordinary behavior assertions remain unchanged. The only new packages are dev-only `@axe-core/playwright` 4.14.0 and `axe-core`; the Node >=22.12 peer/runtime contract matches this repository. No existing dependency versions changed. All 130 requirement rows remain present with selected options preserved.

GitHub Actions [run 39105808514](https://github.com/BerinKarjala/portfolio/actions/runs/39105808514) passed on implementation commit `790edde6d0ff3369eaaa586393ab489451556024`: clean installation, **102 tests**, production build, **65 passing browser cases and four intentional skips** across Chromium/Firefox/WebKit. Both representative Chromium images compared successfully. All M3 cases ran in every engine, including composition/paste/discrete formatting Undo and the desktop/mobile axe scans. Browser reports, screenshots and failure traces were uploaded.

Netlify [PR #229 Deploy Preview](https://deploy-preview-229--berinkarjala.netlify.app/projects/page-builder), header and redirect checks passed for that implementation. Interaction tests run against the production build in CI. M3 was subsequently merged independently by the repository owner; Codex performed no merge or production release. This final evidence update changes documentation only; the tested application is unchanged.

M2 was merged independently by the repository owner during M3 implementation. The M3 work was isolated on `codex/page-builder-m3` from that exact main baseline. See [M3 contracts](m3-design.md). M3 browser workflows also fail on unhandled page errors; scoped axe scans cover the desktop/mobile editor and text tools. External page designs, physical device and screen-reader review remain release gates.

## Change log

- Added the portfolio project page, full-screen workspace and source viewer integration.
- Added browser-local project lifecycle, starter content, safe record storage, autosave and revision/lease coordination.
- Added JSON backup/restore foundations, damaged-data recovery, unit/integration/browser tests, CI and documentation.
- Fixed a browser-discovered reload race by flushing workspace state on page exit.
- M2: added the interactive canvas, structural command/history/geometry services, Layers/inspector/camera controls and schema migration.
- M2: added mouse/keyboard/real-touch/mobile/overlap/cancellation tests and representative visual regression images; documented contracts and remaining release gates.
- M3: added the full semantic component/editor inventory, safe rich text, design/preset/master systems, effects, visibility/accessibility and polished template compositions.
- M3: added component/invariant/security fixtures, rich-input and shared-design browser workflows, scoped axe checks and updated template images.
- M4: added shared compilation, sandbox/device/template previews, generated code, preflight and two-file downloads; completed recovery reports and per-engine export regression evidence.
- M4: corrected coalesced pointer release handling, reviewed nine CI-native exported-page baselines, and retained the latest upstream portfolio changes.

## M4 deliverables and gate

- [x] Shared deterministic semantic HTML/CSS compiler, validated AST serialization and native component output
- [x] Resolved presets/states/effects, media queries, stable classes, CSS sharing/pruning and font/image loading defaults
- [x] Empty-sandbox/CSP iframe, actual device/custom widths, native interaction and template previews
- [x] Read-only escaped HTML/CSS viewer, line numbers, copy and manual selection
- [x] Critical/warning preflight, affected-element navigation, warning acknowledgement for every download mode
- [x] Two-file UTF-8 ZIP/CRC32, safe filename slug and individual HTML/CSS downloads
- [x] Observed resource warnings/correction, isolated panels, critical autosave pause and saved/unsaved JSON recovery
- [x] Detailed collection restore report, default rollback and explicit partial-retention choice
- [x] Local **125 unit/integration tests across 19 files**, production build and **30 Chromium scenarios** passed
- [x] GitHub Chromium/Firefox/WebKit verification, reviewed per-engine exported-page baselines and Netlify preview evidence

TDD began with missing compiler modules; the initial six compiler/delivery tests then passed. The expanded compiler suite covers safe text/attribute/style contexts, all component semantics, rich text, IDs, deterministic classes, CSS/font/keyframe pruning, URL punctuation, hidden subtrees, breakpoint visibility, warning gates and a 250-component fixture. Integration tests cover current-input invalidation, code viewer isolation, panel retries and critical failure recovery beyond the autosave interval. Existing quota/migration/ownership and last-good-byte tests remain passing.

Seven new browser cases run in each engine. They cover sandbox parent/navigation/form isolation, native menu resizing, no persisted visitor values, ZIP names/CRCs and individual-file equivalence, every compiled node's preview/export computed layout at 390/768/1280px, warning navigation, no-write template preview, desktop/mobile axe, damaged records/restore reports and observable large-page timings. Existing game/gallery/canvas/rich-text/storage workflows are retained. The four intentional skips remain limited to the two Chromium-specific CDP/canvas cases on the other engines.

M4 adds three exported-page baselines per engine. These are implementation regression evidence, not user-approved final design screenshots. Details: [M4 contracts](m4-export.md). Baseline acquisition [run 39108980299](https://github.com/BerinKarjala/portfolio/actions/runs/39108980299) verified the full interaction matrix and produced images for review. Its three failures were the expected exported-page baseline comparisons/initialization. All nine actual CI images were visually reviewed and committed; local system-font rasterization differs, so these CI-native images are canonical. The runner is fixed to Ubuntu 24.04 and browser versions come from the lockfile. The same run exposed a WebKit width-resize flake (passed on retry): the release coordinate was not committed when the final move was coalesced. The fix snapshots gesture zoom, applies the pointer-up coordinate and retains cancellation rollback; a regression test verifies all three behaviors without creating content history. Implementation [run 39109781875](https://github.com/BerinKarjala/portfolio/actions/runs/39109781875) passed on feature head `a45b4c394c73b924bb07e03d84746fe71eb03523`: clean install, **123 tests across 19 files**, production build, **86 browser cases passed, four intentional skips, no flaky retries**. All nine exported-page baselines and both earlier Chromium canvas images compared successfully. The seven M4 cases passed in every engine, including native pointer resizing and cancellation. Desktop/mobile export-workspace screenshots from all three engines were also reviewed.

The owner updated `main` during M4 with portfolio/gallery/Sudoku/source-panel changes and one additional test. The M4 branch incorporates `d7c0751` without conflicts; its combined application/workflow/browser-test tree was compared with CI's tested merge tree and matches. This explains the change from the original worktree's 122 tests to 123. The evidence update changes documentation only relative to that tested combined application.

Netlify [PR #232 Deploy Preview](https://deploy-preview-232--berinkarjala.netlify.app/projects/page-builder), header and redirect checks passed on the implementation. Automated interactions use the production build in CI; this records deployment checks rather than a separate live-site interaction run. The PR remains unmerged; final release acceptance is separate.

The 250-component CI fixture observed open/preview times of Chromium **1467/269ms**, Firefox **1959/424ms**, and WebKit **4022/1093ms**, with 511 preview DOM nodes, 44,788 preview-document UTF-8 bytes and zero scripts. These are observations from one shared CI runner, not calibrated budgets or performance guarantees. Reports, preview/export screenshots, measurements and baseline files are available as run artifacts.

## Known limits and release gates

Canvas tools are implemented in M2, content/design systems in M3, and compiler-backed preview/export plus detailed recovery reports in M4. The editing canvas remains an approximation; final preview and downloads share the compiler. The current schema version 3 rejects unsupported component/style/master/preset data. M1 schema version 1, M2 version 2 and the documented unreleased v0 fixture migrate through validated in-memory transformations.

Browser storage revision checks have no atomic cross-tab compare-and-swap and remain best effort. Project input is bounded to 4 MiB; backup files to 16 MiB. The 3 MiB storage warning estimates project records, not the browser's actual quota. Calibrated cross-browser visual/performance baselines, manual mobile/assistive-technology checks, all 130 decisions and AC-01–AC-16 remain release gates. No final release approval is implied.


Final URL-resolution regression: the browser interprets `https:example.com/path` relative to an existing HTTPS host, although `new URL(value)` without a base treats it as an absolute destination. The shared validator now requires an explicit HTTPS authority (`https://...`), retaining approved fragments/mailto/tel for links. A new regression failed before the fix and passed afterward; compiler cases cover links, forms and embeds. The local final suite is **124 tests across 19 files**, with a passing production build. Earlier 123-test CI evidence above predates this single added test; final-head CI and deployment status are linked from [PR #232 checks](https://github.com/BerinKarjala/portfolio/pull/232/checks). Ambiguous stored/imported URLs are rejected without rewriting their original record bytes.


Native table refinement: exported tables now have a separate labelled, keyboard-focusable horizontal viewport, so the element's outer overflow controls cannot accidentally disable data scrolling in a narrow container. The common browser workflow narrows a table to 160px and verifies real ArrowRight scrolling. Helper classes use a reserved internal namespace; an identity regression verifies that an imported table ID such as `scroll` cannot collide with its helper. The final local unit suite is **125 tests across 19 files**; all seven M4 Chromium workflows passed for functional checks (`--ignore-snapshots` locally because the reviewed visual baseline uses CI fonts). CI continues to compare all nine images normally. The URL-only [run 39110904627](https://github.com/BerinKarjala/portfolio/actions/runs/39110904627) also passed before this final table refinement. Final-head checks remain linked from PR #232.


Preview anchor correction: an actual section-link click exposed that `srcdoc` resolves relative fragments against the portfolio URL. Preview now rewrites validated section links to `about:srcdoc#...`; final files retain ordinary `#...` links. The browser workflow clicks the section link and verifies that the target and document remain inside the opaque preview. Inert external links retain their normal underline via shared CSS. The prior table/URL build passed in [run 39111520442](https://github.com/BerinKarjala/portfolio/actions/runs/39111520442); final branch checks cover this preview-only correction too. Unit count remains 125 and no snapshots are skipped or updated in CI.


## M5 deliverables and release gate

- [x] Optional first-run guide, keyboard/focus hint, restart and local completion independent of dashboard preferences
- [x] Confirmed remembered-origin reset, optional independent backup of current/unsaved work, backup-failure protection and one-action Undo
- [x] Actual read-only source without duplicate entry; on-page teaching introduction and four architecture/reducer/testing/export tutorials
- [x] All 130 canonical decisions guarded against omissions/changes; all AC-01–AC-16 mapped with explicit evidence and remaining manual work
- [x] Shared-runner large-page regression ceilings, production raw/gzip budgets, reduced-motion/state/sticky/asset-failure browser checks
- [x] M5 final-head unit/build/budget and Chromium/Firefox/WebKit comparison run plus Netlify checks verified; see post-merge evidence
- [ ] Current browser, physical-device and assistive-technology matrix, final screenshots/threshold review and explicit user release approval

M5 TDD first reproduced a missing reset module, then passed identity/template immutability/one-action Undo/read-only tests. Focused integration tests verify saved guide settings, restart, backup quota failure preserving the exact original record/current state, and successful independent copies/Undo. Three new browser cases cover mobile guide axe/focus/persistence, template reset/cancellation/copy/reload and generated sticky/hover/focus/reduced-motion/remote-font-image failures. Existing nine export images remain unchanged; ordinary CI compares them normally.

M4's final implementation run [39112228452](https://github.com/BerinKarjala/portfolio/actions/runs/39112228452) passed 125 unit/integration tests and 86 browser cases with four intentional engine-specific skips, no flaky retries, plus build and Netlify checks. That result predates M5 and is not evidence for new M5 behavior. See [M5 release candidate](m5-release.md) for budget calibration, the full acceptance map, known limits and unperformed manual checks.

Change log: M5 adds onboarding, safe original-template reset, teaching notes/tutorials, trace/build guards, runtime ceilings and release-state documentation. No approved requirement was removed. Release acceptance is deliberately separate from implemented/automated coverage.

Local M5 verification: the full 129-test suite passed before the final additional optional-copy/ownership regression; all three focused M5 integration cases then passed. The production build and trace/raw/gzip budget checks passed. All **33 Chromium workflows passed** against the production build; local functional verification used `--ignore-snapshots` because canonical images use CI fonts. CI retains ordinary snapshot comparisons and no baseline images were changed. Desktop launcher and mobile guide appearance were inspected locally. Physical-device/AT acceptance remains tracked in [issue #234](https://github.com/BerinKarjala/portfolio/issues/234).

Initial M5 [CI run 39114059237](https://github.com/BerinKarjala/portfolio/actions/runs/39114059237) passed **130 unit/integration tests across 21 files**, trace/build budgets and every new M5 browser workflow in all three engines. It reported **94 browser passes, four intentional skips and one existing Chromium CDP touch failure**, repeated on retry. The failed assertion was the inserted heading after a synthetic long-press drop. That test previously used a fixed 320ms sleep and released without verifying activation or a valid over-target. M5 now scrolls the handle into view, waits for the drag overlay and actual target-over state, and verifies fresh activation/cancellation rather than relying on a short timer. Three initial local repeats and the tightened cancellation case passed. Assertions are strengthened; no baseline or application behavior is changed by this correction. The full artifact exceeded the workspace's 32MiB transfer cap, so CI also uploads a compact touch-specific failure artifact for any recurrence. Final-head result is recorded in [PR #233 checks](https://github.com/BerinKarjala/portfolio/pull/233/checks).


## Post-merge acceptance follow-up

M5 final run 39114567236 passed 130 unit/integration tests, 95 browser cases/four intentional skips/zero flaky retries, ordinary visual comparisons and all performance/build/Netlify gates. The owner merged it and Netlify published `095d567`; desktop/mobile-viewport live workflows also passed. PR #235 adds all six directed cross-engine JSON transfers, media/background/provider failure and 320px keyboard/reflow checks. See [release verification](release-verification.md) for exact scope, results and manual limitations. No application code, dependency or baseline changes are introduced by this follow-up.

First follow-up [run 39165190019](https://github.com/BerinKarjala/portfolio/actions/runs/39165190019) passed all nine new acceptance cases: six directed cross-engine transfers, media/background/provider failures and 320px keyboard/reflow. Engine versions recorded by actual source processes were Chromium 156.0.8078.4, Firefox 157.0 and WebKit 27.2. Unit count remains 130; all ordinary visual/budget gates passed. The run reported 103 regular browser passes, four intentional skips and one existing Firefox mouse-drag case passing on retry. Its screenshot/trace showed an active drag highlighting Before Container while the test expected Inside Container; the test had measured the destination before activation. The mouse helper now waits for fresh activation, scrolls/measures the live destination and verifies the actual over-target before release for insertion and reparenting. Three local Chromium repeats passed. No application code or baseline changes accompany this test correction; final follow-up head evidence is linked from PR #235.
