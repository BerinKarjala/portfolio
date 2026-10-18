# Q001–Q130 implementation trace

All decisions remain approved. “M1 verified” means the foundation implementation has evidence; it does not mark the final product or release accepted. Partial rows require later milestone coverage. See `progress.md` for the actual test runs and `specification.md` for acceptance contracts.

| Decision | Option | Requirement | Implementation status / evidence |
|---|---|---|---|
| Q001 | C | Hybrid structured Flex/Grid default; optional child absolute positioning. | M1 foundation only — full behavior pending later milestones |
| Q002 | B | Percentage coordinates relative to parent. | Pending M2–M5 |
| Q003 | B | Maximum four levels. | M1 foundation only — full behavior pending later milestones |
| Q004 | B | Named projects with browser autosave, JSON import/export, HTML/CSS export. | M1 foundation only — full behavior pending later milestones |
| Q005 | C | Advanced semantic component palette, media, forms, tables, gallery, icons, reusable units. | Pending M2–M5 |
| Q006 | B | Native HTML behavior; no exported JavaScript; external form endpoint. | Pending M2–M5 |
| Q007 | B | Advanced visual CSS controls, no raw CSS input. | Pending M2–M5 |
| Q008 | B | Desktop/tablet/mobile toggles with shared styles. | M1 foundation only — full behavior pending later milestones |
| Q009 | B | 50 undo actions; session-only; reset on reload/switch. | Pending M2–M5 |
| Q010 | A | External URLs only; no media uploads. | M1 verified — URL allowlist; no asset upload |
| Q011 | B | Collapsible selectable, renameable, reorderable layer hierarchy. | Pending M2–M5 |
| Q012 | A | Exactly one webpage per project. | M1 verified — project.test.js |
| Q013 | B | Blank plus Portfolio, Landing, Business, Blog, Contact, Gallery. | M1 foundation only — full behavior pending later milestones |
| Q014 | B | Collapsible three-panel editor, toolbar, mobile drawers. | M1 foundation only — full behavior pending later milestones |
| Q015 | C | Full mouse/touch/keyboard drag/drop, long press, drop zones, autoscroll. | Pending M2–M5 |
| Q016 | B | Within-project linked instances, master update and detach. | Pending M2–M5 |
| Q017 | B | Read-only HTML/CSS with highlights, line numbers, copy. | Pending M2–M5 |
| Q018 | B | HTML/accessibility warning panel, highlights, reject unsafe values. | M1 foundation only — full behavior pending later milestones |
| Q019 | B | Title, description, lang, viewport, favicon, global styles, indexing. | M1 foundation only — full behavior pending later milestones |
| Q020 | B | React Context + useReducer + hooks, no Zustand. | M1 verified — builderReducer.test.js; BuilderProvider |
| Q021 | B | Vitest, React Testing Library, Playwright across workflows. | M1 foundation only — full behavior pending later milestones |
| Q022 | B | Professional neutral dark shell with green accent, no theme toggle. | M1 verified — Scoped dark shell; screenshot review |
| Q023 | B | Project CRUD, thumbnails, dates, template/JSON entry, browser-local. | M1 verified — PageBuilderProject.test.jsx |
| Q024 | B | Approximately one-second debounce, status, warnings, quota handling. | M1 verified — Autosave/quota integration + browser tests |
| Q025 | B | Resize handles, alignment guides, snapping with modifier override. | Pending M2–M5 |
| Q026 | B | YouTube/Vimeo/Maps via constrained safe URLs and sandbox; no arbitrary HTML. | Pending M2–M5 |
| Q027 | B | Semantic formatted HTML/CSS with descriptive classes and comments. | Pending M2–M5 |
| Q028 | B | Double-click/tap editable content, Inspector sync, undo. | Pending M2–M5 |
| Q029 | B | Copy/cut/paste/duplicate entire nested structures with new IDs. | Pending M2–M5 |
| Q030 | B | Global styles, user presets and per-element overrides. | M1 foundation only — full behavior pending later milestones |
| Q031 | B | Sanity gallery card, full-screen route /projects/page-builder, Netlify integration. | M1 foundation only — full behavior pending later milestones |
| Q032 | B | Isolated sandbox iframe live preview, device modes, no form submit. | Pending M2–M5 |
| Q033 | B | Throttled drag, debounced preview, 200+ elements warning, no cap. | Pending M2–M5 |
| Q034 | B | Library for structured movement + Pointer Events for free-form, unified reducer. | Pending M2–M5 |
| Q035 | A | JavaScript/JSX with JSDoc; no TypeScript migration. | M1 verified — JS/JSX with JSDoc; build |
| Q036 | B | Five test-gated milestones, feature branch, final release only. | M1 foundation only — full behavior pending later milestones |
| Q037 | B | Early draft PR, milestone review/checklists/changelog, Netlify Preview, approval. | M1 foundation only — full behavior pending later milestones |
| Q038 | B | Read-only React source viewer and architecture/reducer/testing/export tutorials. | M1 foundation only — full behavior pending later milestones |
| Q039 | B | GitHub Actions npm ci, tests, Playwright, build, export checks/artifacts. | M1 foundation only — full behavior pending later milestones |
| Q040 | B | Current desktop Chrome/Edge/Firefox/Safari and mobile Chrome/Safari. | M1 foundation only — full behavior pending later milestones |
| Q041 | C | ZIP default exactly index.html and styles.css; individual downloads optional. | Pending M2–M5 |
| Q042 | B | Versioned schema validation and migration; import as new copy. | M1 verified — project/storage/backup tests |
| Q043 | B | Auto Flex/Grid responsiveness, shared styles/media queries, overflow warnings. | Pending M2–M5 |
| Q044 | B | Optional first-run guide, tooltips and restart, locally saved completion. | Pending M2–M5 |
| Q045 | B | Native GET/POST external endpoints and validation, preview submit blocked. | Pending M2–M5 |
| Q046 | B | Dedicated element move handles, resize handles, long press; double-click text. | Pending M2–M5 |
| Q047 | B | Retain structured insertion point and free-form coordinates with undo. | Pending M2–M5 |
| Q048 | B | Safe curated searchable inline SVG with style/a11y, no export dependencies. | Pending M2–M5 |
| Q049 | B | System fonts, curated Google Fonts, CSS imports, offline fallbacks. | Pending M2–M5 |
| Q050 | A | Download files only; users manage hosting; no integrated publishing guide. | Pending M2–M5 |
| Q051 | B | Visual semantic rows/columns/headers/styles, responsive scroll. | Pending M2–M5 |
| Q052 | B | Responsive external-image grid, aspect ratios, captions, hover, reorder. | Pending M2–M5 |
| Q053 | B | Responsive native details/summary menu without JavaScript. | Pending M2–M5 |
| Q054 | C | Direct z-index numeric, reorder, locks, visibility, stacking warnings. | Pending M2–M5 |
| Q055 | C | Batch selection/editing and persistent nested grouping to level four. | Pending M2–M5 |
| Q056 | B | Configurable overflow visible/hidden/auto by axis, visible default. | Pending M2–M5 |
| Q057 | B | Zoom 50–200%, fit/reset, Ctrl-wheel/space-pan/pinch. | Pending M2–M5 |
| Q058 | B | Hidden persisted in JSON, omitted in Preview/export; locked visible. | M1 foundation only — full behavior pending later milestones |
| Q059 | B | Inherited protection and independently protected descendants. | Pending M2–M5 |
| Q060 | B | Confirm; detach instances preserving appearance; undo. | Pending M2–M5 |
| Q061 | B | Edit master through linked instance; propagate, exit/detach. | Pending M2–M5 |
| Q062 | B | Placement/size/visibility/lock/z-index local; content/styles shared master. | Pending M2–M5 |
| Q063 | B | Curated CSS animation and hover transition presets; reduced motion. | Pending M2–M5 |
| Q064 | B | Load/hover/focus/active and repeats/direction/pause/replay in editor. | Pending M2–M5 |
| Q065 | B | Stable section targets, approved external links, mailto/tel, missing-target warnings. | M1 foundation only — full behavior pending later milestones |
| Q066 | B | px/%/rem/em/auto, min/max, aspect locks, percent coordinates. | Pending M2–M5 |
| Q067 | B | Visual direction, alignment, gap, wrap, columns, responsive presets. | Pending M2–M5 |
| Q068 | B | Content, Layout, Style, Effects, Accessibility; contextual active tab. | Pending M2–M5 |
| Q069 | B | Mixed-value indicators, compatible batch properties, protected locks. | Pending M2–M5 |
| Q070 | C | Cascading preset graphs, variants, inherited/effective/overridden property view. | Pending M2–M5 |
| Q071 | B | One active preset per Typography/Layout/Appearance/Effects; parent inheritance. | Pending M2–M5 |
| Q072 | B | Confirm then bake effective styles, update descendants, remove refs/no cycles. | Pending M2–M5 |
| Q073 | B | Target WCAG 2.2 AA for editor, keyboard/screen reader/reduced motion. | M1 foundation only — full behavior pending later milestones |
| Q074 | A | localStorage exclusively for projects and preferences. | M1 verified — Injected localStorage repository |
| Q075 | B | Active editor/read-only tabs, owner conflict and revision checks. | M1 verified — Storage unit + two-tab browser test |
| Q076 | A | Immediate take over without old-tab acknowledgement; unsaved loss warning. | M1 verified — Immediate takeover browser test |
| Q077 | B | Estimate usage, warn, manual cleanup/backup, no auto deletion. | M1 verified — Measured project data; 3 MiB threshold; manual backup/cleanup |
| Q078 | B | Delete all or unwrap/keep children, position recalculation, one undo. | Pending M2–M5 |
| Q079 | B | Intelligent mode-aware move, preserve visual position and valid references. | Pending M2–M5 |
| Q080 | B | Regenerate IDs and remap links within duplicated subtree. | M1 foundation only — full behavior pending later milestones |
| Q081 | B | Group typing, dragging, resizing, sliders and batch edits by intent. | Pending M2–M5 |
| Q082 | B | Remember origin, confirm reset, optional duplicate backup, immutable templates. | M1 foundation only — full behavior pending later milestones |
| Q083 | B | Interactive sandbox preview with viewports, no unsafe navigation/submission. | M1 foundation only — full behavior pending later milestones |
| Q084 | B | Search, category filter, preview, favorites and recent use. | Pending M2–M5 |
| Q085 | B | Select inserted node, open relevant Inspector, placeholders and hints. | Pending M2–M5 |
| Q086 | B | Safe heading/paragraph, button/link, list conversion; compatible properties. | Pending M2–M5 |
| Q087 | B | Critical errors block; warnings confirm; affected-element navigation. | Pending M2–M5 |
| Q088 | B | Context-aware shortcuts, searchable reference, focus conflict protection. | Pending M2–M5 |
| Q089 | B | Search/sort/template filter/favorites/grid-list, local preferences. | M1 verified — Dashboard integration tests; preferences |
| Q090 | B | Lazy approximate thumbnails from component structure, no screenshot assets. | M1 verified — Lazy approximate CSS thumbnails; no image storage |
| Q091 | A | Basic semantic HTML, alt, labels, native controls and warnings only. | Pending M2–M5 |
| Q092 | B | Placeholders, warnings, fallback fonts and URL correction actions. | M1 foundation only — full behavior pending later milestones |
| Q093 | B | Lazy/priority loading, dimensions, CSS dedup/prune, font swap, no JS. | Pending M2–M5 |
| Q094 | B | Independent records, isolate errors, download raw, JSON restore. | M1 verified — Corruption unit/integration tests; raw recovery |
| Q095 | B | Manual restore/delete, never auto purge, storage shown. | M1 verified — Trash/restore/delete tests; no expiry |
| Q096 | B | Copy independent master between projects, no cross-project live links. | Pending M2–M5 |
| Q097 | B | Copy transitive preset graph and styles, fresh IDs, preserve appearance. | Pending M2–M5 |
| Q098 | B | Resizable preview plus Mobile 390/Tablet 768/Desktop 1280 and fixed breakpoints. | M1 foundation only — full behavior pending later milestones |
| Q099 | B | Align/distribute/match compatible sizes and one history action. | Pending M2–M5 |
| Q100 | B | Validate nonempty names, auto-number duplicates, stable IDs, safe ZIP slug. | M1 foundation only — full behavior pending later milestones |
| Q101 | B | HEX/RGB/HSL/alpha and saved swatches/recent, no advanced gradients. | Pending M2–M5 |
| Q102 | B | Four-side spacing, linked/unlinked, borders/radius, units, computed preview. | Pending M2–M5 |
| Q103 | B | Line height, letter spacing, transforms, decoration, shadow, wrapping. | Pending M2–M5 |
| Q104 | B | Visual focal point, aspect/fit/object-position CSS, preserve URLs. | Pending M2–M5 |
| Q105 | B | External URL, size/position/repeat/fallback and contrast warnings. | Pending M2–M5 |
| Q106 | B | Normal/hover/focus/active/disabled styling with CSS transitions. | Pending M2–M5 |
| Q107 | B | Supported sticky header/section offsets; no fixed viewport. | Pending M2–M5 |
| Q108 | B | Search page content/type/name/ID, select/highlight/expand/scroll. | Pending M2–M5 |
| Q109 | B | Visual fields and constraints, native validation, avoid actual preview submit. | Pending M2–M5 |
| Q110 | B | HTTPS external endpoints, GET warnings, no visitor value persistence. | Pending M2–M5 |
| Q111 | B | Native video/audio controls, hosted URLs, poster/captions, autoplay restrictions. | Pending M2–M5 |
| Q112 | B | Breakpoint show/hide CSS vs global omission from export. | Pending M2–M5 |
| Q113 | A | Existing smart guides/snapping only; no rulers or grid overlay. | Pending M2–M5 |
| Q114 | B | Strict schema/component/CSS/URL/refs sanitization; reject executable data. | M1 foundation only — full behavior pending later milestones |
| Q115 | B | Smart text/link/image suggestions; plain text and sanitized safe URLs. | Pending M2–M5 |
| Q116 | B | Restore viewport, zoom, scroll, panels, selection; not in-progress edits/history. | M1 foundation only — full behavior pending later milestones |
| Q117 | B | Alt/Option cycling, touch layer menu, breadcrumbs, inspect locks. | Pending M2–M5 |
| Q118 | C | Per-span formatting/fonts/colors/highlight, links, icons, superscript/subscript. | Pending M2–M5 |
| Q119 | A | Basic SEO only; no social metadata or advanced SEO editor. | M1 foundation only — full behavior pending later milestones |
| Q120 | B | Dedicated inline editing mode, contextual toolbar, selection preservation. | Pending M2–M5 |
| Q121 | B | Versioned validated structured JSON AST; semantic safe HTML generation. | M1 foundation only — full behavior pending later milestones |
| Q122 | A | Online-first; continue open-session local editing; no service worker/PWA. | M1 verified — Offline notice; browser-local open session |
| Q123 | B | Prevent invalid semantic placement rather than permit then flag. | M1 foundation only — full behavior pending later milestones |
| Q124 | B | Isolated React error boundaries and safe saved-data recovery. | M1 foundation only — full behavior pending later milestones |
| Q125 | B | Stable, descriptive, collision-safe and deterministic export classes. | Pending M2–M5 |
| Q126 | C | Automated Chromium/Firefox/WebKit cross-browser baselines and performance checks. | M1 foundation only — full behavior pending later milestones |
| Q127 | B | Validate new record before single-write replacement; leave original on failure. | M1 verified — Migration validation/failure/single-write tests |
| Q128 | C | Complete/selective JSON backup/restore, preview, duplicate compare, detailed report. | M1 foundation only — full behavior pending later milestones |
| Q129 | B | Polished original samples using safe CSS/inline SVG assets and placeholders. | M1 foundation only — full behavior pending later milestones |
| Q130 | B | Full 130-item checklist, mapped tests, milestone evidence, user sign-off. | M1 foundation only — full behavior pending later milestones |

## Acceptance gates

| Gate | M1 evidence / remaining work |
|---|---|
| AC-01 | Creation, local persistence and six starter structures verified; polished assets M3. |
| AC-08 | M1 component/property/schema/URL/tree validation verified; expanded inventory and export validation M3/M4. |
| AC-09 | Record isolation, migration, autosave failures, JSON copy restore and collection rollback verified; final backup reports/resilience M4. |
| AC-10 | Lease ownership, immediate takeover and stale revisions verified in unit and real two-tab Chromium tests; cross-browser CI configured. |
| AC-13 | M1 launcher/dialog keyboard, focus return and mobile sizing verified; canvas/drag/AT workflows pending. |
| AC-14 | Approximate thumbnails avoid stored screenshot assets; media fallback foundation present. Full external resource checks M4. |
| AC-15 | Unit/build + Playwright smoke CI configured; calibrated cross-browser visual/performance baselines M5. |
| AC-16 | Draft PR, requirements trace and milestone evidence present; final sign-off pending. |

AC-02–AC-07 and AC-11–AC-12 require canvas, design systems and compiler milestones.
