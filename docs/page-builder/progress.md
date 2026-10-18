# Page Builder implementation evidence

Branch: `codex/page-builder`. Requirements baseline: PR #226. Implementation: [draft PR #227](https://github.com/BerinKarjala/portfolio/pull/227). M2 is implemented with local verification; remote M2 gates are in progress. M3–M5 remain pending. No implementation merge or production release has been performed by Codex.

The approved October 18 launch layout overrides the original direct-to-editor route: portfolio project page, clickable preview on the left, existing source viewer on the right, full-viewport workspace after activation.

## Milestones

- [x] M1 — foundation and persistence: local, GitHub CI and Netlify preview gates passed
- [ ] M2 — canvas and structural editing: implementation/local checks complete; CI/preview verification pending
- [ ] M3 — content and design systems
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
- [ ] M2 GitHub Chromium/Firefox/WebKit verification and Netlify Deploy Preview

The browser matrix includes a CDP touchscreen case and representative visual-baseline case on Chromium only; both are explicitly skipped on Firefox/WebKit. All ordinary pointer/keyboard/mobile layout/ownership workflows run in every engine. Full visual/performance/manual-device acceptance remains M5. See [M2 contracts and verification](m2-canvas.md).

## Change log

- Added the portfolio project page, full-screen workspace and source viewer integration.
- Added browser-local project lifecycle, starter content, safe record storage, autosave and revision/lease coordination.
- Added JSON backup/restore foundations, damaged-data recovery, unit/integration/browser tests, CI and documentation.
- Fixed a browser-discovered reload race by flushing workspace state on page exit.
- M2: added the interactive canvas, structural command/history/geometry services, Layers/inspector/camera controls and schema migration.
- M2: added mouse/keyboard/real-touch/mobile/overlap/cancellation tests and representative visual regression images; documented contracts and remaining release gates.

## Known limits and release gates

Canvas tools are implemented in M2; full component/rich-text/style support and polished template assets remain M3; HTML/CSS compilation and complete backup/recovery reports in M4. The interactive canvas is not the final compiler-backed sandbox/export preview. The initial schema intentionally rejects unsupported component/style/master/preset data until those contracts are implemented. M1 schema version 1 and the documented unreleased v0 fixture migrate to schema version 2.

Browser storage revision checks have no atomic cross-tab compare-and-swap and remain best effort. Project input is bounded to 4 MiB; backup files to 16 MiB. The 3 MiB storage warning estimates project records, not the browser's actual quota. Calibrated cross-browser visual/performance baselines, manual mobile/assistive-technology checks, all 130 decisions and AC-01–AC-16 remain release gates. No final release approval is implied.
