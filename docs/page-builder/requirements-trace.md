# Q001–Q130 implementation trace

Approved exception AC-EX-TV-REMOTE (project owner, October 21, 2026): physical TV remotes will not be verified and are excluded from release acceptance. Responsive TV-browser layouts and other existing acceptance requirements remain in scope. See the acceptance exception in `specification.md` and `decisions.json`.

All decisions remain approved. “M1 verified” means the foundation implementation has evidence; it does not mark the final product or release accepted. Partial rows require later milestone coverage. M2 adds structural/canvas evidence in `m2-canvas.md`; M3 adds content/design evidence in `m3-design.md`; M4 adds compiler, preflight, sandbox and recovery evidence in `m4-export.md`. M4 remote results are recorded in `progress.md`; M5 implementation and acceptance mapping are in `m5-release.md`. Post-merge evidence and additional acceptance coverage are in `release-verification.md`. Final acceptance remains open. See `progress.md` for the actual test runs and `specification.md` for acceptance contracts.

| Decision | Option | Requirement | Implementation status / evidence |
|---|---|---|---|
| Q001 | C | Hybrid structured Flex/Grid default; optional child absolute positioning. | M2 verified for implemented canvas contracts — Flex/Grid + opt-in free-form; structure/geometry/browser tests |
| Q002 | B | Percentage coordinates relative to parent. | M2 verified for implemented canvas contracts — Percentage geometry with measured scale/scroll/content boxes |
| Q003 | B | Maximum four levels. | M2 verified for implemented canvas contracts — Four-level validation and disabled illegal drop/insertion targets |
| Q004 | B | Named projects with browser autosave, JSON import/export, HTML/CSS export. | M4 implemented/tested; final release acceptance pending — Local persistence/JSON retained; M4 adds compiled two-file website downloads and delivery tests |
| Q005 | C | Advanced semantic component palette, media, forms, tables, gallery, icons, reusable units. | M4 implemented/tested; final release acceptance pending — All 18 validated types compile to native semantics; compiler and M3 component fixtures |
| Q006 | B | Native HTML behavior; no exported JavaScript; external form endpoint. | M4 implemented/tested; final release acceptance pending — Native forms, links, media and details menus; no generated scripts or runtime dependency |
| Q007 | B | Advanced visual CSS controls, no raw CSS input. | M3 verified for implemented editor contracts — Validated visual CSS controls, state styles and no raw CSS input |
| Q008 | B | Desktop/tablet/mobile toggles with shared styles. | M4 implemented/tested; final release acceptance pending — Shared responsive CSS and exact-width device preview; per-node parity checks at three widths |
| Q009 | B | 50 undo actions; session-only; reset on reload/switch. | M2 verified for implemented canvas contracts — Session history/coalescing/50-action tests; no persisted history |
| Q010 | A | External URLs only; no media uploads. | M1 verified — URL allowlist; no asset upload |
| Q011 | B | Collapsible selectable, renameable, reorderable layer hierarchy. | M2/M3 verified for implemented editor contracts — Searchable expandable Layers, nested form/table/gallery content + rename/reorder/selection |
| Q012 | A | Exactly one webpage per project. | M1 verified — project.test.js |
| Q013 | B | Blank plus Portfolio, Landing, Business, Blog, Contact, Gallery. | M5 implemented; acceptance open — Blank plus six editable immutable templates; no-write preview and original-template reset/copy/Undo tests |
| Q014 | B | Collapsible three-panel editor, toolbar, mobile drawers. | M2 verified for implemented canvas contracts — Collapsible three-panel workspace and mobile drawers |
| Q015 | C | Full mouse/touch/keyboard drag/drop, long press, drop zones, autoscroll. | M2/M5 automated coverage; device review open — dnd-kit mouse/touch/keyboard sensors, explicit autoScroll, move/resize/drop/cancel tests; real-device long-press/autoscroll acceptance pending |
| Q016 | B | Within-project linked instances, master update and detach. | M3 verified for implemented editor contracts — Project-local linked master propagation, detach and independent-copy tests |
| Q017 | B | Read-only HTML/CSS with highlights, line numbers, copy. | M4 implemented/tested; final release acceptance pending — Escaped highlighted HTML/CSS, line numbers, clipboard copy and read-only selection fallback |
| Q018 | B | HTML/accessibility warning panel, highlights, reject unsafe values. | M4 implemented/tested; final release acceptance pending — Critical/warning preflight and affected-element selection/Inspector navigation; unsafe input blocks output |
| Q019 | B | Title, description, lang, viewport, favicon, global styles, indexing. | M4 implemented/tested; final release acceptance pending — Escaped title/description/lang/favicon/indexing plus viewport and compiled global styles |
| Q020 | B | React Context + useReducer + hooks, no Zustand. | M1 verified — builderReducer.test.js; BuilderProvider |
| Q021 | B | Vitest, React Testing Library, Playwright across workflows. | M1–M5 automated coverage — Vitest/RTL domain, UI, storage and recovery; Playwright production-build workflows across three engines; latest PR checks |
| Q022 | B | Professional neutral dark shell with green accent, no theme toggle. | M1 verified — Scoped dark shell; screenshot review |
| Q023 | B | Project CRUD, thumbnails, dates, template/JSON entry, browser-local. | M1 verified — PageBuilderProject.test.jsx |
| Q024 | B | Approximately one-second debounce, status, warnings, quota handling. | M1 verified — Autosave/quota integration + browser tests |
| Q025 | B | Resize handles, alignment guides, snapping with modifier override. | M2 verified for implemented canvas contracts — Pointer resize, six-pixel snapping/guides and Alt override |
| Q026 | B | YouTube/Vimeo/Maps via constrained safe URLs and sandbox; no arbitrary HTML. | M4 implemented/tested; final release acceptance pending — Validated provider URLs, conservative export iframe and inherited empty-sandbox preview restrictions |
| Q027 | B | Semantic formatted HTML/CSS with descriptive classes and comments. | M4 implemented/tested; final release acceptance pending — Compiler-owned semantic AST, escaped serializer, formatted CSS sections and stable type/ID classes |
| Q028 | B | Double-click/tap editable content, Inspector sync, undo. | M3 verified for implemented editor contracts — Inline node editor, double-click/Edit controls and synchronized inspector/history |
| Q029 | B | Copy/cut/paste/duplicate entire nested structures with new IDs. | M2 verified for implemented canvas contracts — Internal clipboard, fresh IDs/anchors and subtree refs |
| Q030 | B | Global styles, user presets and per-element overrides. | M3 verified for implemented editor contracts — Global styles, category presets/variants and per-element/state overrides |
| Q031 | B | Sanity gallery card, full-screen route /projects/page-builder, Netlify integration. | M1–M5 implemented — CMS-aware gallery integration with bundled fallback, existing portfolio styling, clickable full-viewport workspace and source column; Netlify preview checks; no CMS write |
| Q032 | B | Isolated sandbox iframe live preview, device modes, no form submit. | M4 implemented/tested; final release acceptance pending — Shared compiler preview, empty sandbox/CSP, native controls and no navigation/submission/parent access |
| Q033 | B | Throttled drag, debounced preview, 200+ elements warning, no cap. | M4 implemented/tested; final release acceptance pending — 200ms memoized/debounced preview, disabled stale downloads and observable 250-component browser fixture; drag throttling retained |
| Q034 | B | Library for structured movement + Pointer Events for free-form, unified reducer. | M2 verified for implemented canvas contracts — dnd-kit structured sensors + native Pointer Events; shared commands |
| Q035 | A | JavaScript/JSX with JSDoc; no TypeScript migration. | M1 verified — JS/JSX with JSDoc; build |
| Q036 | B | Five test-gated milestones, feature branch, final release only. | Five milestone branches/PRs and gates recorded in progress.md; M1–M4 owner-merged; M5 final release and approval remain open |
| Q037 | B | Early draft PR, milestone review/checklists/changelog, Netlify Preview, approval. | Early draft PRs and per-milestone test/preview evidence retained; M5 #233 review/checklist/changelog; final approval and merge pending |
| Q038 | B | Read-only React source viewer and architecture/reducer/testing/export tutorials. | M5 implemented — Actual read-only React source, on-page architecture/reducer/testing/export introduction and four code-linked tutorials; duplicate source entry removed |
| Q039 | B | GitHub Actions npm ci, tests, Playwright, build, export checks/artifacts. | M5 automated gates — npm ci, canonical trace guard, Vitest, production build/chunk budgets, Chromium/Firefox/WebKit visual/export/runtime checks and reports/traces |
| Q040 | B | Current desktop Chrome/Edge/Firefox/Safari and mobile Chrome/Safari. | Partial acceptance — Automated Chromium/Firefox/WebKit coverage; current branded desktop browsers and physical Android/iOS matrix pending in m5-release.md |
| Q041 | C | ZIP default exactly index.html and styles.css; individual downloads optional. | M4 implemented/tested; final release acceptance pending — Deterministic UTF-8 ZIP exactly index.html/styles.css; individual outputs use the same gate |
| Q042 | B | Versioned schema validation and migration; import as new copy. | M1 verified — project/storage/backup tests |
| Q043 | B | Auto Flex/Grid responsiveness, shared styles/media queries, overflow warnings. | M4 implemented/tested; final release acceptance pending — Flex/Grid shared styles, fixed responsive grid queries and clipping/overflow warnings |
| Q044 | B | Optional first-run guide, tooltips and restart, locally saved completion. | M5 implemented/tested — Optional five-step guide, dismissible hover/focus hint, restart and locally stored completion; focus/mobile axe/reload regressions |
| Q045 | B | Native GET/POST external endpoints and validation, preview submit blocked. | M4 implemented/tested; final release acceptance pending — Labelled constrained native controls and HTTPS GET/POST endpoints; sandbox submission blocked |
| Q046 | B | Dedicated element move handles, resize handles, long press; double-click text. | M2/M3 automated coverage — Dedicated move/resize handles, long-press sensor and double-click rich mode; physical device acceptance remains open |
| Q047 | B | Retain structured insertion point and free-form coordinates with undo. | M2 verified for implemented canvas contracts — Mode switches preserve percentage placements and insertion indices |
| Q048 | B | Safe curated searchable inline SVG with style/a11y, no export dependencies. | M4 implemented/tested; final release acceptance pending — Curated SVG paths serialized directly, decorative/label semantics and no icon runtime dependency |
| Q049 | B | System fonts, curated Google Fonts, CSS imports, offline fallbacks. | M4 implemented/tested; final release acceptance pending — Only used curated fonts requested with swap/local fallbacks; unused preset fonts pruned |
| Q050 | A | Download files only; users manage hosting; no integrated publishing guide. | M4 implemented/tested; final release acceptance pending — Download-only files; no publishing integration or hosting changes |
| Q051 | B | Visual semantic rows/columns/headers/styles, responsive scroll. | M4 implemented/tested; final release acceptance pending — Semantic table groups, headers/scopes/captions and horizontal overflow styling |
| Q052 | B | Responsive external-image grid, aspect ratios, captions, hover, reorder. | M4 implemented/tested; final release acceptance pending — Responsive external-image grid with captions, aspect/fit and hover rules |
| Q053 | B | Responsive native details/summary menu without JavaScript. | M4 implemented/tested; final release acceptance pending — Native details/summary menu and responsive desktop CSS; browser native-interaction tests |
| Q054 | C | Direct z-index numeric, reorder, locks, visibility, stacking warnings. | M2 verified for implemented canvas contracts — Layers order/locks/global visibility and local z-index controls/warnings |
| Q055 | C | Batch selection/editing and persistent nested grouping to level four. | M2 verified for implemented canvas contracts — Batch selection/touch checkboxes; nested group/ungroup with depth validation |
| Q056 | B | Configurable overflow visible/hidden/auto by axis, visible default. | M2 verified for implemented canvas contracts — Axis overflow controls and clipping/stacking warnings |
| Q057 | B | Zoom 50–200%, fit/reset, Ctrl-wheel/space-pan/pinch. | M2 verified for implemented canvas contracts — 50–200% zoom/fit/reset, wheel, mouse pan and CDP pinch |
| Q058 | B | Hidden persisted in JSON, omitted in Preview/export; locked visible. | M4 implemented/tested; final release acceptance pending — Global-hidden subtrees omitted; breakpoint visibility stays in HTML/CSS; locked content retained |
| Q059 | B | Inherited protection and independently protected descendants. | M2 verified for implemented canvas contracts — Inherited/descendant lock tests and guarded parent transformations |
| Q060 | B | Confirm; detach instances preserving appearance; undo. | M3 verified for implemented editor contracts — Confirmed master removal detaches instances, preserves appearance and supports Undo |
| Q061 | B | Edit master through linked instance; propagate, exit/detach. | M3 verified for implemented editor contracts — Edit through either instance, propagate, exit and detach browser coverage |
| Q062 | B | Placement/size/visibility/lock/z-index local; content/styles shared master. | M3 verified for implemented editor contracts — Shared content/styles guarded; instance placement/size/visibility/lock/z-index remain local |
| Q063 | B | Curated CSS animation and hover transition presets; reduced motion. | M4 implemented/tested; final release acceptance pending — Used keyframes/state transitions and reduced-motion override emitted without scripts |
| Q064 | B | Load/hover/focus/active and repeats/direction/pause/replay in editor. | M3 verified for implemented editor contracts — Load/hover/focus/active triggers, repeats/direction and session pause/replay |
| Q065 | B | Stable section targets, approved external links, mailto/tel, missing-target warnings. | M4 implemented/tested; final release acceptance pending — Safe fragments/HTTPS/mailto/tel with missing or hidden-target warnings; internal preview links retained |
| Q066 | B | px/%/rem/em/auto, min/max, aspect locks, percent coordinates. | M3 verified for implemented editor contracts — Validated sizing/min/max/units/aspect/focal controls and percentage geometry |
| Q067 | B | Visual direction, alignment, gap, wrap, columns, responsive presets. | M4 implemented/tested; final release acceptance pending — Compiled direction/alignment/gap/wrap/columns plus fixed responsive grid reflow |
| Q068 | B | Content, Layout, Style, Effects, Accessibility; contextual active tab. | M3 verified for implemented editor contracts — Content/Layout/Style/Effects/Accessibility/Page contextual inspector tabs |
| Q069 | B | Mixed-value indicators, compatible batch properties, protected locks. | M2 verified for implemented canvas contracts — Compatible batch changes and Mixed indicators; protected locks |
| Q070 | C | Cascading preset graphs, variants, inherited/effective/overridden property view. | M3 verified for implemented editor contracts — Acyclic same-category parent graphs, variants and inherited/effective/override table |
| Q071 | B | One active preset per Typography/Layout/Appearance/Effects; parent inheritance. | M3 verified for implemented editor contracts — One preset reference per category with ancestor cascade and instance validation |
| Q072 | B | Confirm then bake effective styles, update descendants, remove refs/no cycles. | M3 verified for implemented editor contracts — Confirmed contribution/state-delta baking, dependent graph flattening and contextual instance detachment |
| Q073 | B | Target WCAG 2.2 AA for editor, keyboard/screen reader/reduced motion. | Partial acceptance — Keyboard alternatives, focus/reduced-motion tests and scoped desktop/mobile axe; manual AT/device/zoom review remains open; no AA certification claim |
| Q074 | A | localStorage exclusively for projects and preferences. | M1 verified — Injected localStorage repository |
| Q075 | B | Active editor/read-only tabs, owner conflict and revision checks. | M1 verified — Storage unit + two-tab browser test |
| Q076 | A | Immediate take over without old-tab acknowledgement; unsaved loss warning. | M1 verified — Immediate takeover browser test |
| Q077 | B | Estimate usage, warn, manual cleanup/backup, no auto deletion. | M1 verified — Measured project data; 3 MiB threshold; manual backup/cleanup |
| Q078 | B | Delete all or unwrap/keep children, position recalculation, one undo. | M2 verified for implemented canvas contracts — Delete vs unwrap choices, destination placements, one history action |
| Q079 | B | Intelligent mode-aware move, preserve visual position and valid references. | M2 verified for implemented canvas contracts — Measured reparenting, stable IDs, semantic/cycle/depth guards |
| Q080 | B | Regenerate IDs and remap links within duplicated subtree. | M3 verified for implemented editor contracts — Rich/plain anchor remapping and unique IDs through clipboard and project duplication |
| Q081 | B | Group typing, dragging, resizing, sliders and batch edits by intent. | M3 verified for implemented editor contracts — Typing/property coalescing, distinct formatting/icon actions and shared graph snapshots |
| Q082 | B | Remember origin, confirm reset, optional duplicate backup, immutable templates. | M5 implemented/tested — Remembered origin, explicit confirmation, optional independent unsaved-content backup, abort on copy failure, immutable template and one-action Undo |
| Q083 | B | Interactive sandbox preview with viewports, no unsafe navigation/submission. | M4 implemented/tested; final release acceptance pending — No-write compiled template preview with device widths and empty sandbox; browser evidence |
| Q084 | B | Search, category filter, preview, favorites and recent use. | M3 verified for implemented editor contracts — Search/categories/favorites/recent and expandable component previews |
| Q085 | B | Select inserted node, open relevant Inspector, placeholders and hints. | M3 verified for implemented editor contracts — Insertion selects node/opens inspector; contextual controls and replacement hints |
| Q086 | B | Safe heading/paragraph, button/link, list conversion; compatible properties. | M3 verified for implemented editor contracts — Heading/paragraph, button/link and ordered-list conversion preserve safe content/IDs |
| Q087 | B | Critical errors block; warnings confirm; affected-element navigation. | M4 implemented/tested; final release acceptance pending — Critical failures block every delivery; acknowledgement and selected-element correction for warnings |
| Q088 | B | Context-aware shortcuts, searchable reference, focus conflict protection. | M2 verified for implemented canvas contracts — Context shortcuts, input protection and searchable reference |
| Q089 | B | Search/sort/template filter/favorites/grid-list, local preferences. | M1 verified — Dashboard integration tests; preferences |
| Q090 | B | Lazy approximate thumbnails from component structure, no screenshot assets. | M1 verified — Lazy approximate CSS thumbnails; no image storage |
| Q091 | A | Basic semantic HTML, alt, labels, native controls and warnings only. | M4 implemented/tested; final release acceptance pending — Native semantics, alt/decorative icons, labels/scopes/media and basic warnings; no conformance guarantee |
| Q092 | B | Placeholders, warnings, fallback fonts and URL correction actions. | M4 implemented/tested; final release acceptance pending — React image fallback, observed resource warning/correction and font/native export fallbacks; unknown status stays unknown |
| Q093 | B | Lazy/priority loading, dimensions, CSS dedup/prune, font swap, no JS. | M4 implemented/tested; final release acceptance pending — Native lazy/eager priority, image dimensions/aspects, CSS sharing/pruning, used fonts/keyframes and no generated JS |
| Q094 | B | Independent records, isolate errors, download raw, JSON restore. | M4 implemented/tested; final release acceptance pending — Corruption remains isolated; raw recovery retained; mixed valid/invalid collection browser case |
| Q095 | B | Manual restore/delete, never auto purge, storage shown. | M1 verified — Trash/restore/delete tests; no expiry |
| Q096 | B | Copy independent master between projects, no cross-project live links. | M3 verified for implemented editor contracts — Saved-project independent master copy in Reusable library; no cross-project live links |
| Q097 | B | Copy transitive preset graph and styles, fresh IDs, preserve appearance. | M3 verified for implemented editor contracts — Transitive preset copy with fresh IDs, names and preserved inherited appearance |
| Q098 | B | Resizable preview plus Mobile 390/Tablet 768/Desktop 1280 and fixed breakpoints. | M4 implemented/tested; final release acceptance pending — Actual 390/768/1280 iframe widths, numeric/pointer/keyboard resize 320–1920px and fixed CSS breakpoints |
| Q099 | B | Align/distribute/match compatible sizes and one history action. | M2 verified for implemented canvas contracts — Compatible absolute sibling align/distribute/match geometry |
| Q100 | B | Validate nonempty names, auto-number duplicates, stable IDs, safe ZIP slug. | M4 implemented/tested; final release acceptance pending — Existing name validation/numbered copies; normalized safe project ZIP slug and fixed archive paths |
| Q101 | B | HEX/RGB/HSL/alpha and saved swatches/recent, no advanced gradients. | M3 verified for implemented editor contracts — HEX/RGB(A)/HSL(A), alpha, local saved swatches/recent |
| Q102 | B | Four-side spacing, linked/unlinked, borders/radius, units, computed preview. | M3 verified for implemented editor contracts — Four-side linked/unlinked spacing, borders/radii and measured box-model preview |
| Q103 | B | Line height, letter spacing, transforms, decoration, shadow, wrapping. | M3 verified for implemented editor contracts — Advanced typography and per-span formatting/weights/shadow/wrapping |
| Q104 | B | Visual focal point, aspect/fit/object-position CSS, preserve URLs. | M3 verified for implemented editor contracts — Image fit, aspect and visual percentage focal-point controls |
| Q105 | B | External URL, size/position/repeat/fallback and contrast warnings. | M4 implemented/tested; final release acceptance pending — Validated external backgrounds retained with fallback color and confirmable contrast/status warnings |
| Q106 | B | Normal/hover/focus/active/disabled styling with CSS transitions. | M4 implemented/tested; final release acceptance pending — Resolved normal/hover/focus/active/disabled rules and transitions emitted as CSS |
| Q107 | B | Supported sticky header/section offsets; no fixed viewport. | M4 implemented/tested; final release acceptance pending — Structured sticky offsets emitted; fixed placement remains invalid |
| Q108 | B | Search page content/type/name/ID, select/highlight/expand/scroll. | M2 verified for implemented canvas contracts — Layers name/text/type/ID/path search, selection/expand/reveal |
| Q109 | B | Visual fields and constraints, native validation, avoid actual preview submit. | M4 implemented/tested; final release acceptance pending — Exported labelled fields/constraints/options and browser-native validation; preview values isolated |
| Q110 | B | HTTPS external endpoints, GET warnings, no visitor value persistence. | M4 implemented/tested; final release acceptance pending — HTTPS actions retained only in final files; GET warning; visitor values absent from project storage |
| Q111 | B | Native video/audio controls, hosted URLs, poster/captions, autoplay restrictions. | M4 implemented/tested; final release acceptance pending — Native controls/loop/mute/autoplay/preload/poster/caption tracks with limitations in preflight |
| Q112 | B | Breakpoint show/hide CSS vs global omission from export. | M4 implemented/tested; final release acceptance pending — Global omission vs responsive display media queries verified in compiler/browser fixtures |
| Q113 | A | Existing smart guides/snapping only; no rulers or grid overlay. | M2 verified for implemented canvas contracts — Smart guides only; no rulers or permanent grid overlay |
| Q114 | B | Strict schema/component/CSS/URL/refs sanitization; reject executable data. | M4 implemented/tested; final release acceptance pending — Full schema/URL/CSS/component/ID/tree/master validation before serialization; unsafe output tests |
| Q115 | B | Smart text/link/image suggestions; plain text and sanitized safe URLs. | M3 verified for implemented editor contracts — Plain-text paste and validated link/image suggestions; no pasted HTML interpretation |
| Q116 | B | Restore viewport, zoom, scroll, panels, selection; not in-progress edits/history. | M2 verified for implemented canvas contracts — Persisted workspace camera/selection/panels/expansion; no gestures/history |
| Q117 | B | Alt/Option cycling, touch layer menu, breadcrumbs, inspect locks. | M2 verified for implemented canvas contracts — Alt hit cycling, touch layer picker, breadcrumbs and lock inspection |
| Q118 | C | Per-span formatting/fonts/colors/highlight, links, icons, superscript/subscript. | M4 implemented/tested; final release acceptance pending — Rich AST marks/styles/links/icons serialize to escaped semantic HTML and shared classes |
| Q119 | A | Basic SEO only; no social metadata or advanced SEO editor. | M4 implemented/tested; final release acceptance pending — Basic metadata emitted; no social cards or advanced SEO |
| Q120 | B | Dedicated inline editing mode, contextual toolbar, selection preservation. | M3 verified for implemented editor contracts — Dedicated inline editing and unscaled contextual toolbar, selection retention and canonical Undo |
| Q121 | B | Versioned validated structured JSON AST; semantic safe HTML generation. | M4 implemented/tested; final release acceptance pending — Validated version-2 rich AST -> semantic safe HTML AST; serializer/security tests |
| Q122 | A | Online-first; continue open-session local editing; no service worker/PWA. | M1 verified — Offline notice; browser-local open session |
| Q123 | B | Prevent invalid semantic placement rather than permit then flag. | M2 verified for implemented canvas contracts — Insertion/move/import validity checked before atomic commit |
| Q124 | B | Isolated React error boundaries and safe saved-data recovery. | M4 implemented/tested; final release acceptance pending — Library/Inspector retry boundaries; critical canvas failure suspends autosave and preserves saved/unsaved recovery bytes |
| Q125 | B | Stable, descriptive, collision-safe and deterministic export classes. | M4 implemented/tested; final release acceptance pending — Stable complete type/ID class namespace; shared span classes, deterministic repeated files and ZIP |
| Q126 | C | Automated Chromium/Firefox/WebKit cross-browser baselines and performance checks. | M5 automated gates — Nine per-engine exported-page baselines, two canvas images, three-width parity, native state/reduced-motion/failure tests, 250-component timing/DOM/output and build budgets; final threshold/device review open |
| Q127 | B | Validate new record before single-write replacement; leave original on failure. | M4 implemented/tested; final release acceptance pending — Prior safe migration/single-write/last-good-byte regression coverage retained through M4 |
| Q128 | C | Complete/selective JSON backup/restore, preview, duplicate compare, detailed report. | M4 implemented/tested; final release acceptance pending — Selective/all/Trash JSON retained; duplicate preview, detailed per-entry report, default rollback and explicit partial retention |
| Q129 | B | Polished original samples using safe CSS/inline SVG assets and placeholders. | M3 verified for implemented editor contracts — Original editable template compositions, curated SVG artwork and external URL placeholders |
| Q130 | B | Full 130-item checklist, mapped tests, milestone evidence, user sign-off. | M5 trace complete — All 130 choices preserved and checked automatically; AC-01–AC-16 mapped in m5-release.md; manual acceptance, screenshots and explicit final user approval open |

## Acceptance gates

| Gate | Current evidence / remaining release work |
|---|---|
| AC-01 | Creation/persistence, six polished editable templates, compiled selection preview and confirmed reset/copy/Undo/reload tests. |
| AC-02–AC-04 | M2 structural/geometry/selection/input evidence retained. |
| AC-05 | M3 master/preset dependency and appearance tests; M4 validates materialized references before export. |
| AC-06 | M3 selection/composition/formatting; M4 rich semantic serialization/escaping and reload-safe AST. |
| AC-07 | M4 native semantic component/compiler fixtures, safe URLs and script-free standalone files. |
| AC-08 | Strict import and export validation, blocked unsafe serialization and intact saved state. |
| AC-09 | Record isolation/migration/quota/copy restore/rollback retained; M4 adds explicit partial retention and detailed reports. Follow-up coverage adds six directed cross-engine rich/master/preset JSON transfers; see release-verification.md for results. |
| AC-10 | Lease/takeover/stale revision and ownership-replacement listeners retained through M4 regression suite. |
| AC-11 | M4 same-compiler device preview, per-node computed-layout parity and exported-page per-engine images; final visual states/device acceptance M5. |
| AC-12 | All formats revalidate current input; criticals block, warnings confirm, exact two-file ZIP/CRCs and individual-file equivalence. |
| AC-13 | Existing mouse/touch/keyboard/rich-text paths plus preview/code/export/scoped axe; follow-up covers 320px keyboard/reflow. Manual AT, actual zoom and physical-device acceptance remain open. |
| AC-14 | Lazy approximate thumbnails, editor image fallback, resource correction warnings and native no-JS export fallbacks; unknown cross-origin status stays unknown. |
| AC-15 | Unit/build and browser regression CI; M4 cross-browser exported-page baselines and observable large-page metrics; calibrated release matrix M5. |
| AC-16 | Early draft PRs, full trace and milestone evidence; final 130-decision acceptance and user sign-off pending M5. |

M4 implementation results, reviewed baselines, CI and deployment checks are recorded in `progress.md`. A milestone status does not imply final release acceptance. M5 implements onboarding, template reset/optional duplicate, teaching tutorials and fixture-based performance ceilings. The detailed 16-gate map, manual device/assistive-technology matrix, threshold/screenshot review and final approval remain open in `m5-release.md`.
