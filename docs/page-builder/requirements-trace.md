# Q001–Q130 implementation trace

All decisions remain approved. “M1 verified” means the foundation implementation has evidence; it does not mark the final product or release accepted. Partial rows require later milestone coverage. M2 adds structural/canvas evidence in `m2-canvas.md`; M3 adds content/design evidence in `m3-design.md`. See `progress.md` for the actual test runs and `specification.md` for acceptance contracts.

| Decision | Option | Requirement | Implementation status / evidence |
|---|---|---|---|
| Q001 | C | Hybrid structured Flex/Grid default; optional child absolute positioning. | M2 verified for implemented canvas contracts — Flex/Grid + opt-in free-form; structure/geometry/browser tests |
| Q002 | B | Percentage coordinates relative to parent. | M2 verified for implemented canvas contracts — Percentage geometry with measured scale/scroll/content boxes |
| Q003 | B | Maximum four levels. | M2 verified for implemented canvas contracts — Four-level validation and disabled illegal drop/insertion targets |
| Q004 | B | Named projects with browser autosave, JSON import/export, HTML/CSS export. | M1 foundation only — full behavior pending later milestones |
| Q005 | C | Advanced semantic component palette, media, forms, tables, gallery, icons, reusable units. | M3 editor verified; final export/acceptance pending — Full 18-type palette and native component fixtures; export semantics still M4 |
| Q006 | B | Native HTML behavior; no exported JavaScript; external form endpoint. | Pending M2–M5 |
| Q007 | B | Advanced visual CSS controls, no raw CSS input. | M3 verified for implemented editor contracts — Validated visual CSS controls, state styles and no raw CSS input |
| Q008 | B | Desktop/tablet/mobile toggles with shared styles. | M1 foundation only — full behavior pending later milestones |
| Q009 | B | 50 undo actions; session-only; reset on reload/switch. | M2 verified for implemented canvas contracts — Session history/coalescing/50-action tests; no persisted history |
| Q010 | A | External URLs only; no media uploads. | M1 verified — URL allowlist; no asset upload |
| Q011 | B | Collapsible selectable, renameable, reorderable layer hierarchy. | M2/M3 verified for implemented editor contracts — Searchable expandable Layers, nested form/table/gallery content + rename/reorder/selection |
| Q012 | A | Exactly one webpage per project. | M1 verified — project.test.js |
| Q013 | B | Blank plus Portfolio, Landing, Business, Blog, Contact, Gallery. | M3 editor verified; final export/acceptance pending — Six polished editable compositions and original artwork placeholders; compiled template preview/reset pending M4 |
| Q014 | B | Collapsible three-panel editor, toolbar, mobile drawers. | M2 verified for implemented canvas contracts — Collapsible three-panel workspace and mobile drawers |
| Q015 | C | Full mouse/touch/keyboard drag/drop, long press, drop zones, autoscroll. | Pending M2–M5 |
| Q016 | B | Within-project linked instances, master update and detach. | M3 verified for implemented editor contracts — Project-local linked master propagation, detach and independent-copy tests |
| Q017 | B | Read-only HTML/CSS with highlights, line numbers, copy. | Pending M2–M5 |
| Q018 | B | HTML/accessibility warning panel, highlights, reject unsafe values. | M1 foundation only — full behavior pending later milestones |
| Q019 | B | Title, description, lang, viewport, favicon, global styles, indexing. | M1 foundation only — full behavior pending later milestones |
| Q020 | B | React Context + useReducer + hooks, no Zustand. | M1 verified — builderReducer.test.js; BuilderProvider |
| Q021 | B | Vitest, React Testing Library, Playwright across workflows. | M1 foundation only — full behavior pending later milestones |
| Q022 | B | Professional neutral dark shell with green accent, no theme toggle. | M1 verified — Scoped dark shell; screenshot review |
| Q023 | B | Project CRUD, thumbnails, dates, template/JSON entry, browser-local. | M1 verified — PageBuilderProject.test.jsx |
| Q024 | B | Approximately one-second debounce, status, warnings, quota handling. | M1 verified — Autosave/quota integration + browser tests |
| Q025 | B | Resize handles, alignment guides, snapping with modifier override. | M2 verified for implemented canvas contracts — Pointer resize, six-pixel snapping/guides and Alt override |
| Q026 | B | YouTube/Vimeo/Maps via constrained safe URLs and sandbox; no arbitrary HTML. | M3 editor verified; final export/acceptance pending — Approved provider/path validation and opt-in opaque sandbox embeds; compiled preview pending M4 |
| Q027 | B | Semantic formatted HTML/CSS with descriptive classes and comments. | Pending M2–M5 |
| Q028 | B | Double-click/tap editable content, Inspector sync, undo. | M3 verified for implemented editor contracts — Inline node editor, double-click/Edit controls and synchronized inspector/history |
| Q029 | B | Copy/cut/paste/duplicate entire nested structures with new IDs. | M2 verified for implemented canvas contracts — Internal clipboard, fresh IDs/anchors and subtree refs |
| Q030 | B | Global styles, user presets and per-element overrides. | M3 verified for implemented editor contracts — Global styles, category presets/variants and per-element/state overrides |
| Q031 | B | Sanity gallery card, full-screen route /projects/page-builder, Netlify integration. | M1 foundation only — full behavior pending later milestones |
| Q032 | B | Isolated sandbox iframe live preview, device modes, no form submit. | Pending M2–M5 |
| Q033 | B | Throttled drag, debounced preview, 200+ elements warning, no cap. | Pending M2–M5 |
| Q034 | B | Library for structured movement + Pointer Events for free-form, unified reducer. | M2 verified for implemented canvas contracts — dnd-kit structured sensors + native Pointer Events; shared commands |
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
| Q047 | B | Retain structured insertion point and free-form coordinates with undo. | M2 verified for implemented canvas contracts — Mode switches preserve percentage placements and insertion indices |
| Q048 | B | Safe curated searchable inline SVG with style/a11y, no export dependencies. | M3 verified for implemented editor contracts — Curated searchable original SVG path IDs with labels and styling |
| Q049 | B | System fonts, curated Google Fonts, CSS imports, offline fallbacks. | M3 editor verified; final export/acceptance pending — Curated system/Google fonts with fallback loading; export font CSS pending M4 |
| Q050 | A | Download files only; users manage hosting; no integrated publishing guide. | Pending M2–M5 |
| Q051 | B | Visual semantic rows/columns/headers/styles, responsive scroll. | M3 verified for implemented editor contracts — Visual rectangular table editing, scope/captions and horizontal scrolling fixtures |
| Q052 | B | Responsive external-image grid, aspect ratios, captions, hover, reorder. | M3 verified for implemented editor contracts — Ordered external images, captions/alt, ratios, fitting and hover controls |
| Q053 | B | Responsive native details/summary menu without JavaScript. | M3 editor verified; final export/acceptance pending — Native details/summary navigation in the editor; generated responsive CSS pending M4 |
| Q054 | C | Direct z-index numeric, reorder, locks, visibility, stacking warnings. | M2 verified for implemented canvas contracts — Layers order/locks/global visibility and local z-index controls/warnings |
| Q055 | C | Batch selection/editing and persistent nested grouping to level four. | M2 verified for implemented canvas contracts — Batch selection/touch checkboxes; nested group/ungroup with depth validation |
| Q056 | B | Configurable overflow visible/hidden/auto by axis, visible default. | M2 verified for implemented canvas contracts — Axis overflow controls and clipping/stacking warnings |
| Q057 | B | Zoom 50–200%, fit/reset, Ctrl-wheel/space-pan/pinch. | M2 verified for implemented canvas contracts — 50–200% zoom/fit/reset, wheel, mouse pan and CDP pinch |
| Q058 | B | Hidden persisted in JSON, omitted in Preview/export; locked visible. | M1 foundation only — full behavior pending later milestones |
| Q059 | B | Inherited protection and independently protected descendants. | M2 verified for implemented canvas contracts — Inherited/descendant lock tests and guarded parent transformations |
| Q060 | B | Confirm; detach instances preserving appearance; undo. | M3 verified for implemented editor contracts — Confirmed master removal detaches instances, preserves appearance and supports Undo |
| Q061 | B | Edit master through linked instance; propagate, exit/detach. | M3 verified for implemented editor contracts — Edit through either instance, propagate, exit and detach browser coverage |
| Q062 | B | Placement/size/visibility/lock/z-index local; content/styles shared master. | M3 verified for implemented editor contracts — Shared content/styles guarded; instance placement/size/visibility/lock/z-index remain local |
| Q063 | B | Curated CSS animation and hover transition presets; reduced motion. | M3 editor verified; final export/acceptance pending — Curated keyframes/transitions and reduced-motion rules; export emission pending M4 |
| Q064 | B | Load/hover/focus/active and repeats/direction/pause/replay in editor. | M3 verified for implemented editor contracts — Load/hover/focus/active triggers, repeats/direction and session pause/replay |
| Q065 | B | Stable section targets, approved external links, mailto/tel, missing-target warnings. | M1 foundation only — full behavior pending later milestones |
| Q066 | B | px/%/rem/em/auto, min/max, aspect locks, percent coordinates. | M3 verified for implemented editor contracts — Validated sizing/min/max/units/aspect/focal controls and percentage geometry |
| Q067 | B | Visual direction, alignment, gap, wrap, columns, responsive presets. | M3 editor verified; final export/acceptance pending — Shared Flex/Grid controls and fixed responsive reflow ranges; export rules pending M4 |
| Q068 | B | Content, Layout, Style, Effects, Accessibility; contextual active tab. | M3 verified for implemented editor contracts — Content/Layout/Style/Effects/Accessibility/Page contextual inspector tabs |
| Q069 | B | Mixed-value indicators, compatible batch properties, protected locks. | M2 verified for implemented canvas contracts — Compatible batch changes and Mixed indicators; protected locks |
| Q070 | C | Cascading preset graphs, variants, inherited/effective/overridden property view. | M3 verified for implemented editor contracts — Acyclic same-category parent graphs, variants and inherited/effective/override table |
| Q071 | B | One active preset per Typography/Layout/Appearance/Effects; parent inheritance. | M3 verified for implemented editor contracts — One preset reference per category with ancestor cascade and instance validation |
| Q072 | B | Confirm then bake effective styles, update descendants, remove refs/no cycles. | M3 verified for implemented editor contracts — Confirmed contribution/state-delta baking, dependent graph flattening and contextual instance detachment |
| Q073 | B | Target WCAG 2.2 AA for editor, keyboard/screen reader/reduced motion. | M1 foundation only — full behavior pending later milestones |
| Q074 | A | localStorage exclusively for projects and preferences. | M1 verified — Injected localStorage repository |
| Q075 | B | Active editor/read-only tabs, owner conflict and revision checks. | M1 verified — Storage unit + two-tab browser test |
| Q076 | A | Immediate take over without old-tab acknowledgement; unsaved loss warning. | M1 verified — Immediate takeover browser test |
| Q077 | B | Estimate usage, warn, manual cleanup/backup, no auto deletion. | M1 verified — Measured project data; 3 MiB threshold; manual backup/cleanup |
| Q078 | B | Delete all or unwrap/keep children, position recalculation, one undo. | M2 verified for implemented canvas contracts — Delete vs unwrap choices, destination placements, one history action |
| Q079 | B | Intelligent mode-aware move, preserve visual position and valid references. | M2 verified for implemented canvas contracts — Measured reparenting, stable IDs, semantic/cycle/depth guards |
| Q080 | B | Regenerate IDs and remap links within duplicated subtree. | M3 verified for implemented editor contracts — Rich/plain anchor remapping and unique IDs through clipboard and project duplication |
| Q081 | B | Group typing, dragging, resizing, sliders and batch edits by intent. | M3 verified for implemented editor contracts — Typing/property coalescing, distinct formatting/icon actions and shared graph snapshots |
| Q082 | B | Remember origin, confirm reset, optional duplicate backup, immutable templates. | M1 foundation only — full behavior pending later milestones |
| Q083 | B | Interactive sandbox preview with viewports, no unsafe navigation/submission. | M1 foundation only — full behavior pending later milestones |
| Q084 | B | Search, category filter, preview, favorites and recent use. | M3 verified for implemented editor contracts — Search/categories/favorites/recent and expandable component previews |
| Q085 | B | Select inserted node, open relevant Inspector, placeholders and hints. | M3 verified for implemented editor contracts — Insertion selects node/opens inspector; contextual controls and replacement hints |
| Q086 | B | Safe heading/paragraph, button/link, list conversion; compatible properties. | M3 verified for implemented editor contracts — Heading/paragraph, button/link and ordered-list conversion preserve safe content/IDs |
| Q087 | B | Critical errors block; warnings confirm; affected-element navigation. | Pending M2–M5 |
| Q088 | B | Context-aware shortcuts, searchable reference, focus conflict protection. | M2 verified for implemented canvas contracts — Context shortcuts, input protection and searchable reference |
| Q089 | B | Search/sort/template filter/favorites/grid-list, local preferences. | M1 verified — Dashboard integration tests; preferences |
| Q090 | B | Lazy approximate thumbnails from component structure, no screenshot assets. | M1 verified — Lazy approximate CSS thumbnails; no image storage |
| Q091 | A | Basic semantic HTML, alt, labels, native controls and warnings only. | Pending M2–M5 |
| Q092 | B | Placeholders, warnings, fallback fonts and URL correction actions. | M1 foundation only — full behavior pending later milestones |
| Q093 | B | Lazy/priority loading, dimensions, CSS dedup/prune, font swap, no JS. | Pending M2–M5 |
| Q094 | B | Independent records, isolate errors, download raw, JSON restore. | M1 verified — Corruption unit/integration tests; raw recovery |
| Q095 | B | Manual restore/delete, never auto purge, storage shown. | M1 verified — Trash/restore/delete tests; no expiry |
| Q096 | B | Copy independent master between projects, no cross-project live links. | M3 verified for implemented editor contracts — Saved-project independent master copy in Reusable library; no cross-project live links |
| Q097 | B | Copy transitive preset graph and styles, fresh IDs, preserve appearance. | M3 verified for implemented editor contracts — Transitive preset copy with fresh IDs, names and preserved inherited appearance |
| Q098 | B | Resizable preview plus Mobile 390/Tablet 768/Desktop 1280 and fixed breakpoints. | M2 verified for implemented canvas contracts — 390/768/1280 presets, custom/edge resize and separate workspace |
| Q099 | B | Align/distribute/match compatible sizes and one history action. | M2 verified for implemented canvas contracts — Compatible absolute sibling align/distribute/match geometry |
| Q100 | B | Validate nonempty names, auto-number duplicates, stable IDs, safe ZIP slug. | M1 foundation only — full behavior pending later milestones |
| Q101 | B | HEX/RGB/HSL/alpha and saved swatches/recent, no advanced gradients. | M3 verified for implemented editor contracts — HEX/RGB(A)/HSL(A), alpha, local saved swatches/recent |
| Q102 | B | Four-side spacing, linked/unlinked, borders/radius, units, computed preview. | M3 verified for implemented editor contracts — Four-side linked/unlinked spacing, borders/radii and measured box-model preview |
| Q103 | B | Line height, letter spacing, transforms, decoration, shadow, wrapping. | M3 verified for implemented editor contracts — Advanced typography and per-span formatting/weights/shadow/wrapping |
| Q104 | B | Visual focal point, aspect/fit/object-position CSS, preserve URLs. | M3 verified for implemented editor contracts — Image fit, aspect and visual percentage focal-point controls |
| Q105 | B | External URL, size/position/repeat/fallback and contrast warnings. | M3 editor verified; final export/acceptance pending — Validated HTTPS backgrounds with size/position/repeat/fallback color; contrast diagnostics pending M4 |
| Q106 | B | Normal/hover/focus/active/disabled styling with CSS transitions. | M3 verified for implemented editor contracts — Normal/hover/focus/active/disabled style rules and transition controls |
| Q107 | B | Supported sticky header/section offsets; no fixed viewport. | M3 verified for implemented editor contracts — Sticky structured containers and top offsets; fixed positioning rejected |
| Q108 | B | Search page content/type/name/ID, select/highlight/expand/scroll. | M2 verified for implemented canvas contracts — Layers name/text/type/ID/path search, selection/expand/reveal |
| Q109 | B | Visual fields and constraints, native validation, avoid actual preview submit. | M3 verified for implemented editor contracts — Visual field inventory, labels/constraints/options/order and disabled canvas inputs |
| Q110 | B | HTTPS external endpoints, GET warnings, no visitor value persistence. | M3 verified for implemented editor contracts — HTTPS GET/POST enforcement, GET privacy warning and no visitor-value serialization |
| Q111 | B | Native video/audio controls, hosted URLs, poster/captions, autoplay restrictions. | M3 verified for implemented editor contracts — Native hosted media settings/poster/captions; muted autoplay contract |
| Q112 | B | Breakpoint show/hide CSS vs global omission from export. | M3 editor verified; final export/acceptance pending — Persisted breakpoint visibility and editor omission; generated media queries pending M4 |
| Q113 | A | Existing smart guides/snapping only; no rulers or grid overlay. | M2 verified for implemented canvas contracts — Smart guides only; no rulers or permanent grid overlay |
| Q114 | B | Strict schema/component/CSS/URL/refs sanitization; reject executable data. | M1 foundation only — full behavior pending later milestones |
| Q115 | B | Smart text/link/image suggestions; plain text and sanitized safe URLs. | M3 verified for implemented editor contracts — Plain-text paste and validated link/image suggestions; no pasted HTML interpretation |
| Q116 | B | Restore viewport, zoom, scroll, panels, selection; not in-progress edits/history. | M2 verified for implemented canvas contracts — Persisted workspace camera/selection/panels/expansion; no gestures/history |
| Q117 | B | Alt/Option cycling, touch layer menu, breadcrumbs, inspect locks. | M2 verified for implemented canvas contracts — Alt hit cycling, touch layer picker, breadcrumbs and lock inspection |
| Q118 | C | Per-span formatting/fonts/colors/highlight, links, icons, superscript/subscript. | M3 verified for implemented editor contracts — Per-span fonts/weights/colors/highlight, links, icons and sup/sub node model |
| Q119 | A | Basic SEO only; no social metadata or advanced SEO editor. | M1 foundation only — full behavior pending later milestones |
| Q120 | B | Dedicated inline editing mode, contextual toolbar, selection preservation. | M3 verified for implemented editor contracts — Dedicated inline editing and unscaled contextual toolbar, selection retention and canonical Undo |
| Q121 | B | Versioned validated structured JSON AST; semantic safe HTML generation. | M3 editor verified; final export/acceptance pending — Validated version-2 AST and semantic React rendering; HTML compiler serialization pending M4 |
| Q122 | A | Online-first; continue open-session local editing; no service worker/PWA. | M1 verified — Offline notice; browser-local open session |
| Q123 | B | Prevent invalid semantic placement rather than permit then flag. | M2 verified for implemented canvas contracts — Insertion/move/import validity checked before atomic commit |
| Q124 | B | Isolated React error boundaries and safe saved-data recovery. | M1 foundation only — full behavior pending later milestones |
| Q125 | B | Stable, descriptive, collision-safe and deterministic export classes. | Pending M2–M5 |
| Q126 | C | Automated Chromium/Firefox/WebKit cross-browser baselines and performance checks. | M1 foundation only — full behavior pending later milestones |
| Q127 | B | Validate new record before single-write replacement; leave original on failure. | M1 verified — Migration validation/failure/single-write tests |
| Q128 | C | Complete/selective JSON backup/restore, preview, duplicate compare, detailed report. | M1 foundation only — full behavior pending later milestones |
| Q129 | B | Polished original samples using safe CSS/inline SVG assets and placeholders. | M3 verified for implemented editor contracts — Original editable template compositions, curated SVG artwork and external URL placeholders |
| Q130 | B | Full 130-item checklist, mapped tests, milestone evidence, user sign-off. | M1 foundation only — full behavior pending later milestones |

## Acceptance gates

| Gate | M1 evidence / remaining work |
|---|---|
| AC-01 | Creation, local persistence and six starter structures verified; polished assets M3. |
| AC-08 | M1 component/property/schema/URL/tree validation verified; expanded inventory and export validation M3/M4. |
| AC-09 | Record isolation, migration, autosave failures, JSON copy restore and collection rollback verified; final backup reports/resilience M4. |
| AC-10 | M1 lease/takeover tests retained; M2 also verifies camera listeners after drag-context ownership replacement. |
| AC-13 | M1 launcher/dialog keyboard, focus return and mobile sizing verified; canvas/drag/AT workflows pending. |
| AC-14 | Approximate thumbnails avoid stored screenshot assets; media fallback foundation present. Full external resource checks M4. |
| AC-15 | Unit/build + Chromium/Firefox/WebKit smoke CI passed; calibrated cross-browser visual/performance baselines M5. |
| AC-16 | Draft PR, requirements trace and milestone evidence present; final sign-off pending. |

AC-02/AC-03/AC-04 have M2 structural, geometry, selection and input evidence. AC-05–AC-07 and AC-11–AC-12 still require design systems and compiler milestones.

M2 browser evidence and remote results are recorded in `progress.md`; initial visual baselines cover Chromium only. No partial M2 row implies completion of M3–M5 export/design-system requirements.
