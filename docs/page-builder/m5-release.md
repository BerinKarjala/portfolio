# M5 release candidate and acceptance evidence

M4 was merged by the repository owner as `00f074c` (PR #232). M5 [PR #233](https://github.com/BerinKarjala/portfolio/pull/233) was subsequently owner-merged as `095d567` and automatically published by Netlify. This document records implementation and review evidence; [post-merge verification](release-verification.md) records the production revision and follow-up coverage. Final release acceptance is **open**. Unperformed checks below are not approved exceptions. Remaining manual acceptance and final approval are tracked in [issue #234](https://github.com/BerinKarjala/portfolio/issues/234).

## Implemented in M5

- Optional first-run five-step guide, keyboard/focus-aware hint, restart, local completion/dismissal; dashboard settings remain independent.
- Confirmed remembered-origin reset, initially selected optional independent backup of current/unsaved work, fresh template IDs, stable project identity and one-action Undo. Backup failure aborts reset. Templates remain immutable.
- On-page architecture/reducer/testing/export introduction, actual read-only source without a duplicate entry, [four teaching tutorials](tutorials.md), updated user/developer guides.
- Automated 130-record canonical trace checks, all 16 acceptance mappings, production chunk budgets and large-page runtime/output ceilings.
- Additional all-engine workflows for onboarding/mobile axe/focus/persistence, reset/cancellation/backup/Undo/reload, reduced motion, hover/focus/sticky CSS and failed external image/font requests.

## Acceptance map

“Automated” describes implementation/test coverage, not approval of all devices, authored designs or accessibility. Test paths below are relative to the repository; feature domain/component tests are under `src/features/page-builder/`.

| Gate | Concrete evidence | Status / remaining work |
|---|---|---|
| AC-01 | `domain/project.test.js`, `domain/reset.test.js`, `components/Milestone5.test.jsx`; `e2e/page-builder.spec.js` and `page-builder-release.spec.js` create/reset/reload | Automated; template visual sign-off open |
| AC-02 | `domain/structure.test.js`, `domain/geometry.test.js`; `e2e/page-builder-canvas.spec.js` mouse/keyboard/CDP-touch/move/locks/depth/history | Automated; real touch/device checks open |
| AC-03 | Geometry/structure tests; scaled nested drag/resize/reparent/cancel browser workflows | Automated; real mobile gestures open |
| AC-04 | Canvas/Layers search/overlap/locks/breadcrumb/multi-select workflows | Automated; screen-reader location review open |
| AC-05 | `domain/design.test.js`, `domain/designInvariants.test.js`; linked instance/preset browser workflows | Automated |
| AC-06 | `domain/richText.test.js`, design browser selection/composition/paste/history; compiler semantic escaping | Automated; physical IME/AT review open |
| AC-07 | `components/ComponentContent.test.jsx`, `exporters/compiler.test.js`; native control/ZIP/compiled-page browser workflows | Automated; actual Safari/Edge/media-provider review open |
| AC-08 | Project/structure/design/storage/backup/compiler validation and last-good-byte regressions | Automated |
| AC-09 | `domain/storage.test.js`, backups and restore-report tests; corruption/quota/reload browser cases; reset-copy failure integration | Automated; cross-browser backup transfer manual check open |
| AC-10 | Storage lease/revision tests; shared-origin two-tab takeover browser case | Automated; non-atomic localStorage race limitation documented |
| AC-11 | Nine exported-page golden images; every compiled node’s preview/export parity at 390/768/1280; reduced-motion/state/sticky and failed-asset workflow | Automated; final screenshots/real browsers and devices open |
| AC-12 | Compiler/preflight/ZIP tests; actual downloads/CRC32/exact entries/acknowledgment and warning-location workflows | Automated |
| AC-13 | Keyboard drag, rich editing, guide/focus/resize, desktop/mobile scoped axe scans | Partial acceptance: manual screen-reader/device review open; AA conformance not certified |
| AC-14 | Lazy structure thumbnails, image fallback/resource warning controls, injected remote failures and isolated corrupted record recovery | Automated; provider/device appearance review open |
| AC-15 | `.github/workflows/page-builder.yml`: trace checks, clean install, unit/build/budgets, three engines, normal visual comparisons and retained reports | Automated gates; latest run linked from PR checks |
| AC-16 | All 130 canonical choices preserved; milestone changelog, source/tutorial/user/developer docs and this checklist | Open: manual results, screenshot approval and explicit final user approval required |

## Performance and visual gates

The M4 Ubuntu 24.04 two-worker CI observation for 250 paragraphs was open/preview **1467/269ms Chromium, 1959/424ms Firefox, 4022/1093ms WebKit**, 511 DOM nodes, 44,788 preview-document bytes and zero scripts. M5 sets deliberately broad regression ceilings above the slowest observed result: **open <12s, preview <5s, ≤600 preview nodes, ≤60,000 preview HTML bytes, zero scripts**. These are failure gates for this named fixture and shared runner, not user-perceived latency targets, a general component cap or mobile performance guarantees. Metrics remain attached per engine; investigate failures before adjusting limits. Threshold review is part of final acceptance.

Production bundle gates, measured after `npm run build`, are **PageBuilderProject ≤600KiB raw/150KiB gzip** (includes the educational raw-source strings) and **BuilderWorkspace ≤350KiB raw/110KiB gzip**. M5's initial measured build was about 478KB/116KB and 275KB/85KB respectively. The compiler/ZIP add no runtime dependency. Workspace loading remains lazy. `scripts/check-page-builder-build.mjs` enforces these ceilings rather than relying on Vite’s optional warnings.

Nine M4 per-engine exported-page images and two representative Chromium canvas images remain unchanged. CI pins Ubuntu 24.04; npm lockfile pins Playwright/browser revisions. Golden fixtures use system fonts/native controls without remote font/image requests; animation timing is disabled during screenshot capture. Additional M5 remote-failure testing aborts requests explicitly and checks computed state, fallback stacks, native alt text and zero scripts. This avoids making live provider availability a condition of CI. Hover/focus/reduced-motion/sticky checks supplement static images. Real OS/browser font and device appearance still require manual review. Never copy images from a different font environment or use update mode solely to pass CI.

## Manual verification matrix — not yet performed

For every entry record reviewer, date, OS/device, browser/AT version, result and evidence link here or in the linked release issue. Desktop browser engines in Playwright do not prove current branded-browser or physical-device support.

| Environment | Required actions | Result |
|---|---|---|
| Current Chrome and Edge, desktop | Launch/close focus; create/edit/save/reload; keyboard/mouse drag and autoscroll; ZIP open; mobile/tablet/desktop preview and native exported controls | Pending |
| Current Firefox, desktop | Same workflow; rich selection, formatting/paste/IME; resize/cancel; collection restore | Pending |
| Current Safari, macOS | Same workflow; native dialog/focus; downloads; pointer/keyboard resize; media/font failure | Pending |
| Chrome, physical Android | Long-press drag with scroll, cancel, two-finger zoom; drawers/touch target visibility; rich text/keyboard; backup/export | Pending |
| Safari, physical iPhone/iPad | Same touch workflows; keyboard/viewport changes and no clipped controls; storage/download handling | Pending |
| NVDA with Chrome/Firefox; VoiceOver with Safari/macOS/iOS | Landmarks/names/order; dialog entry/exit/focus; Layers search/location; alternative move/resize; rich toolbar/selection; save/error announcements; warning navigation/code/downloads | Pending |
| 200% zoom, reduced motion, contrast/focus and switch/keyboard-only | All major workflows remain reachable, focus visible/unobscured, no traps; animated effects respect reduced motion | Pending |
| Browser-to-browser backup transfer | Create rich template/master/preset project in one browser, collection JSON download/import in each other engine, compare content/style/links; failure/Trash/partial restore reports | Pending |
| Provider/resource failure | Block image/background/font/audio/video/embed provider; confirm usable fallback and truthful warnings, correction and no loss of project bytes | Automated image/font subset; remaining manual checks pending |
| Final design approval | Review original forest/green two-column launcher/source layout, guide/editor mobile/desktop, all six templates and preview/export at 390/768/1280 | Pending user approval |

## Release checklist

- [x] Dedicated M5 branch and early draft PR; original requirements remain intact.
- [x] Product gaps implemented; meaningful unit/integration/browser regressions added.
- [x] Teaching/user/developer/export/storage-limit documentation and canonical trace guard.
- [x] Performance/visual gates defined; evidence uploaded by CI.
- [x] M5 final-head unit/build/budget/all-engine workflow and Netlify preview checks verified; immutable run and production evidence in [post-merge verification](release-verification.md).
- [ ] Physical-device, current-branded-browser, AT and remaining resource/backup manual matrix completed or explicit exceptions reviewed and approved.
- [ ] User-approved final screenshots and performance thresholds recorded.
- [ ] Open release blockers resolved or approved exceptions recorded; no known unresolved project-critical failures.
- [x] Repository owner merged #233 and Git-connected production publication completed. Manual acceptance/approved exceptions above remain open.

Codex performed no merge, manual production deployment or CMS record mutation. Netlify automatically published the owner’s M5 merge; live production checks are recorded separately from the production-build CI interactions in the linked post-merge evidence. The gallery continues to prefer matching Sanity content with a bundled discoverable fallback.

Known limits remain: browser-local, best-effort non-atomic ownership; 4MiB project input and 16MiB backup limits; no automatic cloud backup; native script-free output with remote resource/provider dependencies; opaque preview deliberately blocks submissions/navigation; basic exported-page accessibility does not certify user-authored designs. The repository also reports existing dependency alerts independently of this feature; M5 does not claim a repository-wide security audit.
