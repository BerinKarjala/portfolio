# Page Builder implementation evidence

M3 branch: `codex/page-builder-m3`. M1/M2 branch: `codex/page-builder`. Requirements baseline: PR #226. M1 landed in [PR #227](https://github.com/BerinKarjala/portfolio/pull/227). M2 landed in [PR #228](https://github.com/BerinKarjala/portfolio/pull/228), with local, GitHub CI and Netlify preview gates passed. M3 implementation/local verification is complete in [draft PR #229](https://github.com/BerinKarjala/portfolio/pull/229); remote gates are in progress; M4–M5 remain pending. No implementation merge or production release has been performed by Codex.

The approved October 18 launch layout overrides the original direct-to-editor route: portfolio project page, clickable preview on the left, existing source viewer on the right, full-viewport workspace after activation.

## Milestones

- [x] M1 — foundation and persistence: local, GitHub CI and Netlify preview gates passed
- [x] M2 — canvas and structural editing: local, GitHub CI and Netlify preview gates passed
- [ ] M3 — content and design systems: implementation/local checks complete; CI/preview gate in progress
- [ ] M4 — export, preview, validation and resilience
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
- [ ] M3 GitHub Chromium/Firefox/WebKit verification and Netlify Deploy Preview

Local M3 verification on Node 22.22.2/npm 10.9.4: **102 tests across 16 files passed**; production build passed; the full **23-case Chromium suite passed**, including the seven M3 workflows. Final mobile heading/drawer refinements then passed all seven M3 workflows plus the existing mobile insertion/dialog cases and ordinary visual comparison. Two refreshed structured/Grid images, desktop rich editing, mobile inspector and all six mobile template heroes were visually reviewed. Axe scans passed for the desktop/mobile shell and the rich editing controls; new browser cases report no unhandled page errors.

The first lazy-workspace unit assertion now allows five seconds for test-runtime compilation/import; ordinary behavior assertions remain unchanged. The only new packages are dev-only `@axe-core/playwright` 4.14.0 and `axe-core`; the Node >=22.12 peer/runtime contract matches this repository. No existing dependency versions changed. All 130 requirement rows remain present with selected options preserved.

M2 was merged independently by the repository owner during M3 implementation. M3 is isolated on `codex/page-builder-m3` from that exact main baseline. See [M3 contracts](m3-design.md). M3 browser workflows also fail on unhandled page errors; scoped axe scans cover the desktop/mobile editor and text tools. External page designs, physical device and screen-reader review remain release gates.

## Change log

- Added the portfolio project page, full-screen workspace and source viewer integration.
- Added browser-local project lifecycle, starter content, safe record storage, autosave and revision/lease coordination.
- Added JSON backup/restore foundations, damaged-data recovery, unit/integration/browser tests, CI and documentation.
- Fixed a browser-discovered reload race by flushing workspace state on page exit.
- M2: added the interactive canvas, structural command/history/geometry services, Layers/inspector/camera controls and schema migration.
- M2: added mouse/keyboard/real-touch/mobile/overlap/cancellation tests and representative visual regression images; documented contracts and remaining release gates.
- M3: added the full semantic component/editor inventory, safe rich text, design/preset/master systems, effects, visibility/accessibility and polished template compositions.
- M3: added component/invariant/security fixtures, rich-input and shared-design browser workflows, scoped axe checks and updated template images.

## Known limits and release gates

Canvas tools are implemented in M2 and content/design systems in M3; HTML/CSS compilation and complete backup/recovery reports in M4. The interactive canvas is not the final compiler-backed sandbox/export preview. The current schema version 3 rejects unsupported component/style/master/preset data. M1 schema version 1, M2 version 2 and the documented unreleased v0 fixture migrate through validated in-memory transformations.

Browser storage revision checks have no atomic cross-tab compare-and-swap and remain best effort. Project input is bounded to 4 MiB; backup files to 16 MiB. The 3 MiB storage warning estimates project records, not the browser's actual quota. Calibrated cross-browser visual/performance baselines, manual mobile/assistive-technology checks, all 130 decisions and AC-01–AC-16 remain release gates. No final release approval is implied.
