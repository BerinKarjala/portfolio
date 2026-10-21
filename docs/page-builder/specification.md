# HTML Page Builder — Developer-Ready Product & Engineering Specification

**Project:** React Portfolio / Drag-and-Drop HTML Page Builder  
**Specification baseline:** 130 decisions, finalized October 17, 2026  
**Status:** Requirements approved; implementation, testing, release, and merge are **not** yet complete  
**Target repository:** https://github.com/BerinKarjala/portfolio  
**Portfolio:** https://berinkarjala.netlify.app/  
**Planned route:** `/projects/page-builder`  
**Audience:** Developer / Codex implementation, reviewers, and QA

## 1. Executive requirements contract

Build a client-only, mobile-capable, single-page HTML website designer as a new portfolio project. Users create and manage multiple local projects, drag and edit semantic elements on a visual canvas, manage reusable components and CSS presets, preview responsive pages, and download **standalone `index.html` + `styles.css`** (ZIP by default, individual files optional). The **exported website contains no JavaScript**. The designer is implemented in React/JavaScript and may use JavaScript internally.

The product specification is fixed by the **130 numbered decisions** in Appendix A. This document groups them into testable implementation domains without relaxing any selected requirements. **Every approved item is in scope**, including later Option C choices (advanced rich-text editing, cross-browser visual regression, and advanced collection backup/restore) and Option A exclusions (e.g., no canvas rulers, no PWA, no social cards).

### Success outcomes

1. A visitor can create a blank or template-based project, edit it visually on desktop or touch devices, and safely resume from `localStorage`.
2. Structured Flex/Grid, nested components (maximum depth four), and opt-in percentage-based absolute placement coexist without unpredictable parent/child changes.
3. A user can save, search, duplicate, restore, import/export, and migrate projects without a server account.
4. A two-file exported webpage is semantic, responsive, secure, readable, accessible at the **basic export support** level selected, and visually close to the editor's preview.
5. CI evidence, documentation, a requirements checklist, an issue log, and explicit user approval control the final merge/release.

### Non-goals / explicit exclusions

- No backend, authentication, cloud sync, server-side project publishing, or auto-deploy from the builder.
- No project binary uploads or locally managed external media assets; source images/fonts/videos/embeds use URLs. Template art may use approved inline SVG/CSS.
- No embedded arbitrary scripts, JavaScript in exported websites, unrestricted raw HTML, or raw CSS editing.
- No multi-page sites within one project; no global live-linked component dependency across projects.
- No offline service worker, installable PWA, or guaranteed reopening of the editor without connectivity.
- No visual canvas rulers, persistent grid overlay, or configurable custom guide system.
- No viewport-fixed position controls (`position: fixed`); supported sticky positioning remains available.
- No social sharing metadata editor, Open Graph/X cards, canonical URL/JSON-LD/advanced SEO audit.
- No fully customizable shortcut mapping; no advanced template library or user-built templates.
- No full HTML screenshot thumbnail requirement; thumbnails are deliberately approximate.
- No certification that exported websites meet WCAG 2.2 AA; **the builder application itself targets WCAG 2.2 AA**.

## 2. Verified host application & integration boundaries

At specification drafting, the repository's `package.json`, `README.md`, and `netlify.toml` were checked through the connected GitHub repository. The host currently uses **React 19, React Router 7, JavaScript/JSX, Vite 8, Tailwind CSS 4, Vitest**, and Sanity for the project gallery; Node **22.22.2** and npm **10+** are documented. `npm run build` emits `dist/` for Netlify. The current package metadata includes Vitest and Testing Library; **Playwright and its multi-engine browser setup must be added as a dev/testing dependency**. Existing routes, gallery component shapes, CI file paths, and Sanity schema field names must be inspected before editing; file structures below are **proposals**, not claims about existing paths.

Integration requirements:

- Register `/projects/page-builder` in React Router without breaking Sudoku, Minesweeper, or existing routes. **Approved launch-layout clarification (October 18, 2026):** first show the existing portfolio navigation, forest background, and two-column project layout. The left column contains a clickable builder placeholder image; the right uses the standard `SourceCode` panel to show builder implementation source. Activating the image opens the active dashboard/editor in a full-viewport workspace, with a clear close action returning to the project page. Hide portfolio navigation only inside that workspace. Do not require the browser Fullscreen API.
- Surface an appropriate Page Builder project card in the Sanity-backed Projects gallery (with a fallback if CMS data is unavailable, where existing patterns support one).
- Scope Page Builder CSS and CSS variables to its route; its neutral-dark shell with green accent should not leak into the rest of the portfolio. Responsive touch drawers replace desktop panels where needed.
- Do not edit `main` directly. Create a feature branch, open a **draft PR early**, maintain milestone checklists and a short change log, run Netlify Deploy Preview when configured, and obtain explicit final user approval before merging.
- Existing `Netlify` frontend build/publish settings remain `npm run build` / `dist/`. Do not require an extra hosting platform, server endpoint, or secrets for the builder.

## 3. Users, journeys, and product structure

### Primary persona and teaching intent

An entry-level React learner or portfolio visitor wants to assemble a professional single webpage without coding. The app also showcases state reducers, complex interaction models, DOM/CSS export generation, safety validation, schema migration, TDD, and cross-browser testing. Include read-only syntax-highlighted HTML/CSS output plus an educational React/JS source viewer and architecture/testing guides. The source viewer exposes **application source**, while the exported webpage contains only HTML/CSS.

### User journey A — Create, edit, preview, export

1. Open dashboard → create from blank or choose one of six polished templates: Portfolio, Landing, Business, Blog, Contact, Gallery.
2. Optionally use guided onboarding; searchable categorized component palette supports favorites and recent components.
3. Insert a component through mouse/touch drag/drop or keyboard alternative → select automatically → open a relevant Inspector tab with contextual quick-edit cues.
4. Arrange content within maximum four-level tree using Flex/Grid default, nesting, groups, clipboard, Layers, layout guides, alignment/distribution, and opt-in absolute positioning. Use text-rich editing or normal component properties as appropriate.
5. Preview in sandboxed iframe at 390px Mobile, 768px Tablet, 1280px Desktop, or manually resizable width. Inspect both responsive visibility and dynamic interaction states; no live form submission.
6. View read-only generated code; validate, fix errors, acknowledge warnings, and download project-named ZIP with **exactly** `index.html` and `styles.css` (or individual files).

### User journey B — Project dashboard and resilience

- Search/sort/filter by template and favorites; switch grid/list; see lazy approximate thumbnails and last-edited timestamps.
- Rename/duplicate/delete → Trash (no automatic purge) → restore/permanently delete. Both active and trashed records count toward local storage.
- Autosave approximately one second after edits settle. Show saving/saved/failed states; warn about unsaved navigation and quotas.
- On reload, restore editor workspace (selected element, scroll, zoom, viewport, panel/Layers expansion) but **not** Undo/Redo history or in-progress gestures.
- JSON project import/export; export selected/all projects as a versioned collection JSON backup, optionally including Trash; preview, compare, selectively restore/skip, and report potential duplicates/errors.

### User journey C — Linked masters and styles

- Define an in-project reusable master, insert linked instances, edit master through any linked instance, and propagate shared structure/content/style. An instance can override only allowed placement, size, lock/visibility, and z-index properties; no per-instance content editing until detached.
- Detach instance; on deletion of a used master, confirm and detach existing instances while preserving appearance. Protect locked descendants.
- Copy a master into another project as **an independent master**, with its transitive style preset dependencies copied, renamed as needed, and IDs/references remapped. Never create cross-project live links.

## 4. Proposed engineering architecture

### Technology and ownership

- **React 19 + JavaScript/JSX**, with `React.Context + useReducer` managing canonical project state; use focused custom hooks and JSDoc for complex contracts. Do **not** migrate to TypeScript or introduce Zustand.
- React Router isolates dashboard/editor routes. Tailwind remains available for the application shell; exported styles are generated by a dedicated **CSS compiler** from validated project data, not by copying Tailwind/React runtime CSS.
- A vetted React drag-and-drop library handles structured nesting; **Pointer Events** implement free-form dragging and resize handles. One controller translates both pathways into identical reducer commands. Choose the specific library after compatibility review; do not hardcode an unapproved library as a requirement.
- Rich-text content uses a custom **validated, versioned structured JSON node model**, not arbitrary `innerHTML`, an editor-framework-dependent binary/blob, or pasted executable HTML. Browser selection editing must preserve selection when toolbar inputs receive focus.
- Separate pure libraries for tree operations, layout, styling, rich-text serialization, refs, import/export, validation, and migrations. Reducer handlers orchestrate the pure operations.
- `localStorage` only for durable data. No IndexedDB or application backend. Use BroadcastChannel plus `storage` events when supported for best-effort multi-tab coordination.

### Suggested feature layout (to adapt to real repository structure)

```text
src/features/page-builder/
  routes/              PageBuilderDashboard.jsx, PageBuilderEditor.jsx
  state/               projectReducer.js, editorReducer.js, actions.js, selectors.js
  hooks/               useAutosave.js, useProjectOwnership.js, useCanvasPointer.js
  components/
    dashboard/         ProjectCard, TrashPanel, CollectionRestore
    shell/             Toolbar, LayersPanel, Inspector, StatusBar, MobileDrawers
    canvas/            CanvasSurface, SelectionOverlay, DragHandles, DropZones
    palette/           ComponentLibrary, TemplatePicker, Onboarding
    inspectors/        Content, Layout, Style, Effects, Accessibility
    richtext/          RichTextEditor, FloatingFormatToolbar
    shared/            ErrorRecovery, KeyboardReference, ValidationPanel
  domain/
    schema/            projectSchema, componentSchema, richTextSchema, migrations
    tree/              operations, nestingRules, locks, referenceRemap
    layout/            geometry, coordinateTransform, flexGrid, snapping
    styling/           resolver, presets, cascade, cssUnits
    templates/         immutable starter definitions
    exporters/         htmlCompiler, cssCompiler, zipPackager
    validation/        project, export, url, forms, media, imports
    storage/           localStorageRepository, ownership, backups
  test/                fixtures, unit, integration, visual
  docs/                user-guide, developer-guide, architecture, export-guide
```

Separate browser-specific services (clipboard, viewport geometry, file downloads, BroadcastChannel, `localStorage`, `ResizeObserver`) from pure functions so Vitest tests remain deterministic.

### Reducer command contracts

Use explicit commands with immutable updates, for example `ELEMENT_ADD`, `ELEMENT_MOVE`, `ELEMENT_REPARENT`, `ELEMENT_CONVERT`, `RICH_TEXT_COMMIT`, `STYLES_APPLY`, `PRESET_REMOVE_BAKE`, `MASTER_UPDATE`, `MASTER_DETACH`, `PROJECT_RESET_TEMPLATE`, `HISTORY_UNDO`, and `HISTORY_REDO`. Commands that touch many elements must calculate/validate the prospective state first, then commit as **one atomic history action**. Selection, viewport, panel toggles, search, and previews are UI events, not undoable content edits.

**History:** At most 50 semantic actions per open project session. Typing sessions, drag/resize gestures, sliders, color changes, and batch operations coalesce; a new edit after Undo clears Redo. Switching/reloading a project resets history. Do not persist history in JSON.

## 5. Canonical project model and storage

### Data principles

- Store each project as a separate localStorage record (proposed key: `page-builder:project:<uuid>`); keep dashboard index and preferences in separate keys. This reduces single-record corruption blast radius. A directory/index is rebuildable from intact records when feasible.
- Every project includes `schemaVersion`, stable `projectId`, display name, timestamps, origin template ID, one page with ordered semantic element tree, linked masters, style preset graph, global styles, metadata, and references. Keep editor workspaces and preferences separate from exportable page content.
- Each element has a stable internal ID and an independently tracked **unique HTML ID when needed**; HTML IDs and CSS classes are different concepts. Reparenting preserves IDs; duplication remaps IDs and internal references.
- Enforce tree max depth **four** (make depth convention explicit in code/tests, e.g., page-root excluded). No cycles; no illegal nesting; locks inherited. Component masters/instances and preset graphs also have no cycles.
- Enforce one active preset per category (Typography, Layout, Appearance, Effects) per element, plus inherited parent presets and individual overrides; presets may inherit other presets only without cycles. Style resolution must be deterministic.
- Persist records only after schema/semantic validation. Failed serialization or `QuotaExceededError` must surface clearly and leave last good saved record untouched when possible; keep unsaved in-memory content active without falsely displaying Saved.
- No blob asset storage, project screenshot archives, history snapshot series, or automatic Trash expiry. Lightweight thumbnails computed lazily and cached only when storage budget permits.

### Illustrative schema, not a normative final field list

```json
{
  "schemaVersion": 1,
  "projectId": "uuid-project",
  "name": "Personal Portfolio",
  "createdAt": "2026-10-17T00:00:00.000Z",
  "updatedAt": "2026-10-17T00:00:00.000Z",
  "revision": 12,
  "originTemplateId": "portfolio",
  "status": "active",
  "page": {
    "metadata": {"title": "My Portfolio", "description": "...", "lang": "en", "indexable": true},
    "rootElementIds": ["hero-uuid"],
    "elements": {
      "hero-uuid": {
        "id": "hero-uuid", "type": "container", "name": "Hero Section",
        "htmlId": "hero", "parentId": null, "children": [],
        "layoutMode": "flex", "positionMode": "flow",
        "styles": {"overrides": {}}, "presetIds": {},
        "visibility": {"globalHidden": false, "mobile": true, "tablet": true, "desktop": true},
        "locked": false
      }
    }
  },
  "masters": {}, "presets": {}, "globalStyles": {}, "assets": {"externalUrlsOnly": true}
}
```

Rich-text nodes are validated discriminated unions, e.g. text spans with marks/styles, link nodes with validated `href`, inline icon nodes with curated icon IDs, and line breaks. The exporter maps nodes to an allowlisted set of semantic tags and safe class names. Never feed untrusted source markup to the editing DOM directly.

### Multi-tab editing contract

- One tab is the intended active editor for a given project; additional tabs are read-only. Detect tab changes via BroadcastChannel/storage events where available.
- **Immediate takeover (Decision 76 A)**: requesting tab becomes editor without waiting for the old tab to acknowledge/save. Show the loss-of-unsaved-changes warning; old tab switches to read-only when notified.
- Before writing, confirm current owner token and stored `revision`. Reject stale writes and prompt reload/recovery. Browser-only `localStorage` has **no true atomic compare-and-swap across tabs**; these protections are best effort, not a guarantee of zero race windows.
- Do not silently merge concurrent edits or build a snapshot/CRDT system. Test ownership handoff, stale delayed writes, tab closure, and storage-event fallbacks.

### Import, migration, corruption and backup

- JSON import is untrusted: parse → version gate → transform to supported schema (in memory) → structurally/semantically validate → verify URLs/CSS/refs/master/preset graphs → request/resolve naming collisions → commit new record. Refuse scripts, event-handler props, unapproved HTML/CSS, unauthorized embeds, invalid nesting.
- Migration must preserve original record until the transformed replacement validates. Commit with one localStorage record write; if any step fails, the original remains intact. Test each supported older schema. No permanent automatic migration snapshots.
- Corrupted project records are flagged and isolated; provide Download Stored Data, Restore JSON Backup, and Delete Damaged Project. Never overwrite unreadable records with defaults.
- Trash retains records until explicitly deleted. Estimate stored sizes and warn near conservative app-defined thresholds; distinguish measured page-builder payload bytes from opaque browser quota.
- Collection backup (Decision 128 C): selective/all projects, optional Trash, versioned portable JSON, preview, duplicate comparisons, selective restore, individual validation/migration, conflict resolution, final report. Existing records are not overwritten. Roll back newly added records after batch failures where possible; allow partial restore only with explicit user choice.

## 6. Canvas, components, and interaction specification

### Layout and canvas geometry

- Default flow uses Flex/Grid; free-form mode is an **opt-in absolute position within a positioned parent** using percent X/Y. Switching modes preserves previous structured insertion point and retained percent coordinates; best-effort visual position preservation while reparenting.
- Canvas zoom 50–200%, reset/fit; Ctrl-wheel and space-drag pan; touchscreen pinch/two-finger pan. Separate zoom/scroll coordinates from stored document coordinates. In nested transforms, convert screen pixels → canvas logical position → local parent coordinate → percent of content box; handle scrolling, borders, zoom, and nonzero parent origins.
- Drag selected-element handles rather than hijacking inline text; Pointer Events for free-form movement/resizing; structured library for tree reordering. Support keyboard and long-press alternatives. Snap/guides active but **no rulers/grid overlay**.
- Multi-selection supports group/ungroup, consistent property editing, alignment/distribution, matching dimensions; use compatible parent/positioning contexts. Locked children cannot be changed through an unlocked parent operation.
- Parent overflow visible/hidden/auto, with x/y controls. Warn about clipping, stacking-context limitations, percentage-positioned overflow, and sticky-with-overflow interactions.
- Sticky positioning only for compatible structured nodes (`position:sticky`, configured top offset); **no fixed viewport positioning**.
- Globally hidden elements are retained in JSON but absent from preview and export. Breakpoint-hidden elements remain in HTML and receive responsive `display:none` media-query rules if visible somewhere.

### Component and content inventory

Core palette includes headings/paragraphs, image, button/link, divider, lists, navigation, forms, cards, containers, Flex/Grid, tables, video/audio, YouTube/Vimeo/Maps embeds, gallery, curated inline SVG icons, and reusable components. Search by name/keyword and category; favorites/recent from localStorage. New components select automatically, open Inspector, and offer placeholder-driven quick editing.

- **Navigation:** CSS-only responsive menu using native `<details>/<summary>`, internal anchors with stable IDs, HTTPS links, mailto/tel; warn for broken/hidden anchor targets.
- **Forms:** visual text/email/etc inputs, select/radio/checkbox/textarea, labels, required/pattern/min-max validation, reorder fields, GET/POST to **HTTPS external endpoint**. Warn GET with personal info. No submission from Preview. Never persist visitor-entered values in project data.
- **Media:** URL-only images with contain/cover/fill, aspect ratio and focal `object-position`; external backgrounds with fallback color, position, repeat and `background-size`; native audio/video with controls, loop/mute/autoplay/preload, poster, caption tracks; third-party trusted sandboxed embeds only. No custom media-player JavaScript in exported site.
- **Tables:** semantic row/column operations and header controls; responsive horizontal scroll as needed.
- **Gallery:** ordered external images, responsive grid, captions/alt, aspect ratio, CSS hover effects, image fitting.
- **Effects:** curated CSS animation presets (fade/slide/zoom/rotate/pulse/bounce), hover/focus/active/load triggers, repeat/direction/replay in editor, `prefers-reduced-motion` support.
- **Text:** structured rich text with per-span fonts/weights/sizes/colors/highlight/sup/sub/link/inline icons, contextual toolbar; preserve selection while formatting. Rich text takes precedence over earlier plain-text-only model (Q118 C and Q120 B).
- **Styles:** visual box model, units px/%/rem/em/auto where valid, margin/padding independent/linkable, border, radius, negative-margin warning; visual advanced typography and color picker with HEX/RGB/HSL/opacity, swatches/recent colors; background-image visual settings; interaction states for normal/hover/focus/active/disabled. No visual gradient editor or named color-token system.
- **Presets:** global defaults, hierarchical inheritance, typed category presets, preset variants, per-element overrides and state overrides; show effective vs inherited vs overridden values. Removing used preset requires confirmation and **baking computed appearance** into independent styles, including impacted descendants. Avoid dangling refs.

### Tree, selection, deletion, copying

- Layers panel supports hierarchical expand/collapse, search, reorder, rename, selection, inherited lock, global visibility, responsive visibility, direct numeric z-index, and stacking warnings.
- Parent deletion offers **Delete Container & Contents** or **Remove Container, Keep Children**; recalculate relevant child placement and validate locks/tree depth. Both one Undo/Redo action.
- Duplicate subtrees with fresh internal/HTML IDs. Internal links targeting descendants within the copied subtree remap to the matching copied descendants; references outside stay targeted to originals.
- Overlap selection: topmost click, Alt/Option-click cycling, a touch-accessible Select Layer menu, breadcrumb and keyboard alternative; hidden elements only selectable via Layers; locked inspectable but not editable.
- Search element name, text, type, HTML ID and hierarchy path; scroll to/expand and highlight match; no bulk search/replace.
- External clipboard: plain text into text editors; safe paragraph/link/image suggestions when pasted onto canvas, using valid HTTPS URLs; strip executable HTML. Internal structured clipboard remains supported.
- Change component types only for compatible conversions (heading levels, heading/paragraph, button/link, list ordered/unordered), retaining compatible styling, IDs, and refs.

## 7. Preview, code generation, export and validation

### Editor / Preview separation

- Edit mode renders React canvas and selection overlays. Preview mode renders **the same compiler output as export**, ideally from a shared intermediate document, inside a sandboxed iframe. Preview should not inherit the portfolio's CSS or JavaScript.
- Distinguish preview-specific disabling of submissions/external navigation from final exports. Preview may rewrite/inert external navigation for isolation, but production export retains validated links/forms. For forms, iframe sandbox must not grant form submission permissions.
- Avoid sandbox `allow-scripts` for user content. Avoid combinations that undermine isolation (such as enabling script plus same-origin privileges). Only allow necessary iframe capabilities after security review. Link navigation can be tested by safe internal anchors in preview.
- Read-only code viewer provides formatted HTML/CSS, syntax highlighting, line numbers, copy. Educational React/JS source viewer is a separate portfolio-app feature.

### Compiler pipeline

```text
validated project JSON
 -> resolve masters and effective preset cascade
 -> validate semantic tree, unique IDs, refs and URLs
 -> derive responsive layout rules and state/animation rules
 -> generate semantic HTML AST and deterministic CSS rule model
 -> generate formatted HTML and stable descriptive classes
 -> eliminate unused/compatible duplicate CSS rules (no minification by default)
 -> final error/warning report
 -> ZIP(index.html, styles.css) or individual file downloads
```

- ZIP file name derives from a sanitized project slug (e.g. `my-portfolio-2.zip`), while ZIP contains **exactly** `index.html` and `styles.css`. Asset loading uses external URLs and self-contained SVG/CSS decorative assets, not local asset files.
- Emit `styles.css` reference with relative link in `index.html`; no JS runtime, build tooling, framework dependencies, CDN-dependent CSS framework, or `<script>` tags. Modern CSS used by effects/menus/layouts must degrade gracefully.
- CSS class names are descriptive, stable for unchanged elements, collision-safe via IDs/suffixes, and consistent across repeat exports. Generated sections/comments remain readable. Same validated input yields byte-identical exports (aside from intentionally excluded timestamps).
- Responsive breakpoints fixed; presets 390/768/1280 viewports plus arbitrary preview width. Shared styles; media queries control generated grid/flex adjustments and breakpoint visibility. `position: sticky` supported; fixed not.
- Optimize with native lazy loading for below-fold media, appropriate high-priority image loading, dimensions/aspect-ratio to avoid CLS, unused CSS removal, and Google Font fallbacks/`font-display: swap` when supported. Do not add JavaScript or make external performance claims without measurement.
- Metadata is limited to title, description, HTML `lang`, viewport, favicon URL, indexability settings; no social cards or advanced SEO.

### Severity contract

- **Critical/blocking:** executable/unsafe attributes, unsupported URL schemes, invalid semantic nesting that cannot export correctly, duplicate IDs/unresolvable critical refs, invalid style schemas, corrupt layout graphs, forbidden embed destinations, failed compiler serialization.
- **Warnings/confirmable:** missing alt text, heading order, contrast concerns, missing internal section links where output remains safe, external image/font/media failures that are observable, overflow and breakpoint clipping, GET/privacy concerns, unsupported autoplay behavior.
- Export preflight always runs. Users can confirm and export with warnings but cannot export with unresolved critical errors. The validator highlights affected editor elements, and the same conditions govern ZIP/individual-file outputs. Do not misclassify unobservable cross-origin resource status as a definite failure.

## 8. Security, accessibility and failure containment

### Security model

- Reject scripts, inline event handlers, arbitrary HTML, raw CSS imports beyond approved font configuration, untrusted URL protocols, and unsupported iframe providers. Use allowlisted component schemas and property-level CSS validation instead of a fragile blacklist.
- Validate HTTPS for externally submitted form endpoints and supported externally hosted media; allow explicitly approved `mailto:`, `tel:`, and internal fragments only where semantically relevant. Sanitize exported `href`, `src`, `poster`, `srcset`, CSS `url()` values, and link targets according to context.
- Safe external links use appropriate `rel="noopener noreferrer"` when opening in a new browsing context. Embeds use a provider-specific origin allowlist and conservative `sandbox`, `allow`, referrer settings.
- Treat incoming clipboard, project JSON, media URLs, and presets as untrusted. Escape all user-controlled text; DOM-based rendering and AST serialization favored over string concatenation of raw HTML.
- Prevent editor Preview from submitting forms, running imported scripts, or navigating the top-level app.

### Accessibility scope

- **Builder UI: target WCAG 2.2 AA** (Q73 B): keyboard operability, accessible labels/announcements, screen-reader Layers and drag alternatives, focus management, contrast, reduced motion, responsive controls. Run automated axe-style checks plus manual keyboard/AT reviews; target does not equate to certification.
- **Exported webpage: basic accessibility support** (Q91 A): semantic HTML, alt text/form labels and native keyboard controls, with warnings and author responsibility. Do not silently upscale this decision to an AA-conformance guarantee.

### Error and storage failure states

- Error Boundaries isolate dashboard/sidebar/Inspector failures. A critical canvas failure uses a recovery screen and suspends unsafe autosave, while keeping last saved JSON export available where feasible.
- Provide saving/saved/failed status, missing external asset placeholders and editor warnings, invalid import/migration recovery, quota warnings, offline detection while app remains open, corrupted records in dashboard, and multi-tab read-only/force-takeover notices.
- Export and compiler errors must never corrupt persisted project state. No remote crash reporting required. Offer copyable sanitized diagnostics.

## 9. Acceptance criteria / executable test cases

Use these **acceptance IDs** in milestone PRs and link the related questions from Appendix A. These represent approved behavior; test fixtures and exact pixel/performance thresholds are implementation details to calibrate and document.

| ID | Acceptance scenario (Given / When / Then) | Coverage |
|---|---|---|
| AC-01 | Given a blank or starter template, when created, then one editable page with valid default hierarchy and local persistence exists. | Q4, Q12-14, Q23, Q82-83, Q129 |
| AC-02 | Given nested flow elements, when dragged/reparented on mouse, touch, or keyboard, then valid structure, four-level maximum, locks, and history hold. | Q1-3, Q15, Q25, Q34, Q46-47, Q79, Q123 |
| AC-03 | Given a free-form element, when zoomed/resized/reparented, then logical percentages remain correct and edit coordinates are preserved where practical. | Q2, Q25, Q47, Q56-57, Q66, Q98 |
| AC-04 | Given overlapping, hidden or locked elements, when selected via canvas/Layers/search, then inspect/edit privileges and search location are correct. | Q11, Q54-59, Q108, Q117 |
| AC-05 | Given a linked master and instances, when master is edited, detached, removed, or copied across projects, then shared/independent state and transitive preset copying are correct. | Q16, Q60-62, Q70-72, Q96-97 |
| AC-06 | Given rich text with links, icons and per-span styles, when edited/pasted/reloaded/exported, then structure/selection/security/semantic HTML survive. | Q28, Q65, Q103, Q115, Q118, Q120-21 |
| AC-07 | Given all supported components, when generated and previewed, then expected native HTML semantics, responsive behavior and safe external URL handling occur without exported JS. | Q5-7, Q26-27, Q45, Q48-53, Q91-93, Q104-12 |
| AC-08 | Given invalid nesting, URLs, IDs or unsafe project JSON, when inserted/imported/exported, then operation is rejected or validation blocks unsafe output; healthy state remains intact. | Q18, Q42, Q65, Q80, Q87, Q110, Q114, Q123 |
| AC-09 | Given projects in localStorage, when autosaved, deleted, restored, imported, migrated or backed up, then record isolation and recovery boundaries hold. | Q4, Q9, Q24, Q42, Q74-78, Q89-95, Q100, Q116, Q124, Q127-28 |
| AC-10 | Given two tabs for one project, when takeover occurs, then new owner edits immediately, old owner becomes read-only on notification and stale revisions are rejected; warn about unsaved loss. | Q75-76 |
| AC-11 | Given breakpoint visibility, layout, fonts, animations and sticky UI, when exporting, then responsive HTML/CSS resembles sandbox preview at multiple widths. | Q8, Q22, Q32-33, Q43, Q63-64, Q67, Q93, Q98-99, Q106-7, Q112, Q125-26 |
| AC-12 | Given critical vs warning diagnostics, when exporting ZIP or individual files, then only valid two-file output is offered; warnings require acknowledgment. | Q17-19, Q27, Q41, Q50, Q87, Q125 |
| AC-13 | Given a keyboard/screen-reader/touch user, when navigating major builder workflows, then equivalent functionality and visible focus are provided. | Q15, Q40, Q44, Q46, Q73, Q88, Q109 |
| AC-14 | Given project thumbnail or asset failure, when dashboard/preview loads, then fallbacks display without losing project data. | Q10, Q23, Q77, Q90, Q92, Q94, Q105 |
| AC-15 | Given staged failures or visual changes, when CI runs, then Vitest, build, Playwright Chromium/Firefox/WebKit, visual baselines, and failure artifacts enforce gates. | Q21, Q36-39, Q40, Q126, Q130 |
| AC-16 | Given all checklist items completed, when the PR is reviewed, then documentation, issues, known limitations, and user approval precede merge. | Q31, Q36-39, Q130 |

### Test design details

- **Unit (Vitest):** tree normalization/constraints, nesting, locks, ID/ref remap, converter, placement math, CSS unit validation, style inheritance and preset bake-in, rich-text AST, URL allowlists, serializers, import/migration, history action grouping, class determinism, storage errors.
- **Integration (React Testing Library):** palette, Layers, Inspector tabs, form controls, rich-text toolbar, keyboard focus, search/highlight, responsive visibility, dashboard/Trash/collection restore, validation panel, error boundaries.
- **E2E (Playwright):** mouse/touch/keyboard user journeys, sandbox preview, forms blocked, safe links, two-tab ownership, storage quota simulation, corrupted records, schema upgrades, ZIP inspection, exported-page rendering.
- **Visual regression (Playwright):** Chromium, Firefox, WebKit with separate baselines; mobile/tablet/desktop viewports, preview-versus-export comparisons, state-specific styles, reduced-motion, sticky and overflow. Pin test assets, fonts and timing. Capture screenshot diffs and traces in CI.
- **Manual:** current Chrome/Edge/Firefox/Safari desktops and Chrome Android/Safari iOS; screen reader spot checks, real touch behavior, actual font/media failure, Netlify deploy preview, end-to-end JSON backup on different browser instance.

### Approved verification exception

AC-EX-TV-REMOTE — approved by the project owner on October 21, 2026. Physical TV remotes will not be verified and are excluded from release acceptance. This exception does not establish physical remote compatibility. Responsive layouts for TV browsers and existing keyboard, mouse, touch, accessibility and security requirements remain in scope.

### Quality budgets and measurement

Known fixed requirement: warn around **200+ components**; no arbitrary hard component cap. Startup/load target and absolute performance budgets are **not newly invented**: measure baseline at Milestone 1, document agreed budgets with evidence before treating them as release-blocking. The Q126 C performance test infrastructure must be present and observable at release. No misleading claim of pixel identity across different engines; each engine has its own reviewed screenshot baseline, and fidelity comparisons use the same engine/viewport.

## 10. Five test-gated milestones and PR delivery

All milestones use the **same feature branch and draft PR**, with one release merge only after full acceptance. Tests, documentation, PR checklist, and one-page-or-less change log update are required for every milestone.

| Milestone | Scope and tangible deliverables | Gate to proceed |
|---|---|---|
| M1 — Foundation & persistence | Route/gallery card, dashboard CRUD/search/favorites/Trash, six templates, schema/validation, localStorage autosave/revision coordination, versioned JSON import/export, migration/collection backup foundation, shell and error boundaries. | Dashboard/state/storage unit and integration tests; baseline build; no corrupted/project overwrite regressions. |
| M2 — Canvas & structural editing | Component palette, Flex/Grid/freeform canvas, four-level nesting, structured drag and Pointer Events, responsive preview width, selection/Layers/search, groups, locks, snapping, undo/history, overlap cycling, safe structural transformations. | Mouse/touch/keyboard E2E; placement/locking/ID remap tests; representative visual baselines. |
| M3 — Content & design systems | Forms/tables/nav/media/galleries/icons; rich-text node editor; styles/presets/cascade and dependency copying; global/element effects; accessibility controls; interactions; responsive visibility; six polished template samples. | Rich-text/semantic/security test suite; preset/master invariants; component fixture coverage; accessible builder workflow review. |
| M4 — Export, preview, validation & resilience | Shared HTML/CSS compiler; code viewer; sandbox preview; ZIP/individual export; deterministic classes, performance optimizations, metadata; preflight severity checks; external resource/error fallbacks; finalized backup/migration/recovery. | Cross-browser exported-page/preview parity; ZIP exactly two files; zero exported JS; simulated import/quota/corruption/takeover failures. |
| M5 — Hardening, teaching & release evidence | GitHub Actions Chromium/Firefox/WebKit visual suite, performance budgets and reporting, complete TDD + manual device test matrix, developer guide, user guide, React source viewer/tutorials, acceptance trace, final change log and release notes. | All AC-01..AC-16 pass or have reviewed documented exception, no open criticals, approved screenshots, Netlify Deploy Preview check, **explicit user approval** before merge. |

**CI workflow proposal:** `npm ci`, schema/lint checks as available, Vitest, Playwright browser install, Chromium+Firefox+WebKit E2E/visual tests, `npm run build`, export fixture tests, image diff/traces and artifacts on failure. Avoid assuming an existing GitHub Actions setup; inspect before adding. Protect branch merge via required status checks where repository settings permit.

## 11. Dependency, precedence and ambiguity resolutions

These are **interpretations necessary to implement chosen decisions together**, not additional requirements or permission to alter scope:

1. **Two scopes of accessibility:** builder interface aims at WCAG 2.2 AA (Q73 B), but exported pages get basic accessibility support (Q91 A). Do not conflate them.
2. **No JavaScript export vs interactive editing:** React handles editing/preview; exported website uses native `<details>`, forms, links, CSS animations, native audio/video. No export-side JS.
3. **Immediate takeover vs stale write protection:** Q76 A wins on requiring no acknowledgment; Q75 B still requires conflict signaling and revision checks. Some race windows remain due to localStorage limitations; document this honestly.
4. **No raw CSS vs advanced styles:** all style transformations go through allowlisted visual controls and validated structured style data; no code editor with writable CSS.
5. **No asset upload vs polished templates:** built-in approved inline SVG/CSS art is allowed as generated markup; user media remains remote URLs. Keep ZIP exactly two files.
6. **Local storage vs portable backups:** collective JSON backups are downloaded manually, not synced or persisted to another account. Trash and extra backups consume storage; avoid automatic snapshots.
7. **Shared style presets vs cross-project copying:** import the complete transitive dependency chain, generating new IDs/names; no live cross-project linking.
8. **Rich text supersedes plain-text:** Q118 C and Q120 B broaden Q28; safe structured document model selected Q121 B. Plain text remains accepted for basic pasted content.
9. **Hidden vs responsive-hidden:** global hidden is completely omitted from output; breakpoint-specific hidden stays in exported HTML/CSS. Preview must mirror this distinction.
10. **Source-viewer exception:** React/JS source is visible only in the educational viewer and not part of exported HTML/CSS files.
11. **Full cross-browser automation:** Q126 C supersedes earlier Chromium-only automation implied by Q39/Q40; actual iOS/Android manual QA remains.
12. **Template resets:** built-in templates are immutable; reset replaces working content only after confirmation, with optional duplicate-current-project-first flow.
13. **Optimized yet readable export:** remove unused/duplicate CSS while maintaining formatted commented sections and stable names; minification is not required.
14. **Progress/requirements:** 130 decisions define scope; requested milestone gates and user sign-off apply even if implementation is proposed as an MVP in earlier planning.

## 12. Implementation checklist and sign-off protocol

- [ ] Create tracked feature branch and draft PR; establish architecture module boundaries and stable schema.
- [ ] Add requirement identifiers and link tests/commits to Appendix A; no untraceable omission.
- [ ] Implement all features across M1–M5 with change logs and per-milestone CI evidence.
- [ ] Confirm no JavaScript/extraneous assets in exported ZIP and no source runtime dependencies.
- [ ] Run security and migration regression tests; verify backup/restore/corruption/quota behavior.
- [ ] Run Chromium, Firefox and WebKit visual suites plus real-device manual checks.
- [ ] Review application keyboard/AT support; note separately that exported-page AA conformance is not guaranteed.
- [ ] Confirm README/user/developer/tutorial docs and final architecture/test/export explanations.
- [ ] Record known limitations, blocked failures and exceptions for explicit review.
- [ ] Obtain **explicit user approval** before merging the final PR or releasing from `main`.

**Implementation status at document creation:** Not started by this specification-writing task. Files were generated locally for handoff; no repository changes, PR, Netlify deployment, or tests have been performed by this task.

## Appendix A — Complete decision-to-requirement traceability (Q001–Q130)

Every row reflects the user's selected option. These records provide the release checklist's canonical cross-references.

| Decision | Selected option | Domain | Binding requirement |
|---|:---:|---|---|
| Q001 | **C** | Layout architecture | Hybrid structured Flex/Grid default; optional child absolute positioning. |
| Q002 | **B** | Free-form coordinate model | Percentage coordinates relative to parent. |
| Q003 | **B** | Nesting | Maximum four levels. |
| Q004 | **B** | Project persistence | Named projects with browser autosave, JSON import/export, HTML/CSS export. |
| Q005 | **C** | Component inventory | Advanced semantic component palette, media, forms, tables, gallery, icons, reusable units. |
| Q006 | **B** | Export interactions | Native HTML behavior; no exported JavaScript; external form endpoint. |
| Q007 | **B** | CSS editing | Advanced visual CSS controls, no raw CSS input. |
| Q008 | **B** | Responsive previews | Desktop/tablet/mobile toggles with shared styles. |
| Q009 | **B** | History | 50 undo actions; session-only; reset on reload/switch. |
| Q010 | **A** | Media storage | External URLs only; no media uploads. |
| Q011 | **B** | Layers | Collapsible selectable, renameable, reorderable layer hierarchy. |
| Q012 | **A** | Page scope | Exactly one webpage per project. |
| Q013 | **B** | Starter templates | Blank plus Portfolio, Landing, Business, Blog, Contact, Gallery. |
| Q014 | **B** | Editor shell | Collapsible three-panel editor, toolbar, mobile drawers. |
| Q015 | **C** | Input modalities | Full mouse/touch/keyboard drag/drop, long press, drop zones, autoscroll. |
| Q016 | **B** | Reusable masters | Within-project linked instances, master update and detach. |
| Q017 | **B** | Generated code viewer | Read-only HTML/CSS with highlights, line numbers, copy. |
| Q018 | **B** | Validation | HTML/accessibility warning panel, highlights, reject unsafe values. |
| Q019 | **B** | Page metadata | Title, description, lang, viewport, favicon, global styles, indexing. |
| Q020 | **B** | State management | React Context + useReducer + hooks, no Zustand. |
| Q021 | **B** | TDD | Vitest, React Testing Library, Playwright across workflows. |
| Q022 | **B** | Editor visual theme | Professional neutral dark shell with green accent, no theme toggle. |
| Q023 | **B** | Dashboard | Project CRUD, thumbnails, dates, template/JSON entry, browser-local. |
| Q024 | **B** | Autosave | Approximately one-second debounce, status, warnings, quota handling. |
| Q025 | **B** | Resize and snapping | Resize handles, alignment guides, snapping with modifier override. |
| Q026 | **B** | Trusted embeds | YouTube/Vimeo/Maps via constrained safe URLs and sandbox; no arbitrary HTML. |
| Q027 | **B** | Export readability | Semantic formatted HTML/CSS with descriptive classes and comments. |
| Q028 | **B** | Inline text editing | Double-click/tap editable content, Inspector sync, undo. |
| Q029 | **B** | Internal clipboard | Copy/cut/paste/duplicate entire nested structures with new IDs. |
| Q030 | **B** | Style management | Global styles, user presets and per-element overrides. |
| Q031 | **B** | Portfolio integration | Sanity gallery card, full-screen route /projects/page-builder, Netlify integration. |
| Q032 | **B** | Preview | Isolated sandbox iframe live preview, device modes, no form submit. |
| Q033 | **B** | Editor performance | Throttled drag, debounced preview, 200+ elements warning, no cap. |
| Q034 | **B** | Drag engine | Library for structured movement + Pointer Events for free-form, unified reducer. |
| Q035 | **A** | Language | JavaScript/JSX with JSDoc; no TypeScript migration. |
| Q036 | **B** | Delivery phases | Five test-gated milestones, feature branch, final release only. |
| Q037 | **B** | PR workflow | Early draft PR, milestone review/checklists/changelog, Netlify Preview, approval. |
| Q038 | **B** | Developer learning | Read-only React source viewer and architecture/reducer/testing/export tutorials. |
| Q039 | **B** | CI baseline | GitHub Actions npm ci, tests, Playwright, build, export checks/artifacts. |
| Q040 | **B** | Browser support | Current desktop Chrome/Edge/Firefox/Safari and mobile Chrome/Safari. |
| Q041 | **C** | Website export delivery | ZIP default exactly index.html and styles.css; individual downloads optional. |
| Q042 | **B** | JSON versioning | Versioned schema validation and migration; import as new copy. |
| Q043 | **B** | Responsive generation | Auto Flex/Grid responsiveness, shared styles/media queries, overflow warnings. |
| Q044 | **B** | Onboarding | Optional first-run guide, tooltips and restart, locally saved completion. |
| Q045 | **B** | Forms | Native GET/POST external endpoints and validation, preview submit blocked. |
| Q046 | **B** | Canvas dragging | Dedicated element move handles, resize handles, long press; double-click text. |
| Q047 | **B** | Mode switching | Retain structured insertion point and free-form coordinates with undo. |
| Q048 | **B** | Icon library | Safe curated searchable inline SVG with style/a11y, no export dependencies. |
| Q049 | **B** | Fonts | System fonts, curated Google Fonts, CSS imports, offline fallbacks. |
| Q050 | **A** | Publishing | Download files only; users manage hosting; no integrated publishing guide. |
| Q051 | **B** | Tables | Visual semantic rows/columns/headers/styles, responsive scroll. |
| Q052 | **B** | Galleries | Responsive external-image grid, aspect ratios, captions, hover, reorder. |
| Q053 | **B** | Navigation | Responsive native details/summary menu without JavaScript. |
| Q054 | **C** | Advanced Layers | Direct z-index numeric, reorder, locks, visibility, stacking warnings. |
| Q055 | **C** | Multi-selection and groups | Batch selection/editing and persistent nested grouping to level four. |
| Q056 | **B** | Overflow | Configurable overflow visible/hidden/auto by axis, visible default. |
| Q057 | **B** | Canvas camera | Zoom 50–200%, fit/reset, Ctrl-wheel/space-pan/pinch. |
| Q058 | **B** | Global visibility | Hidden persisted in JSON, omitted in Preview/export; locked visible. |
| Q059 | **B** | Hierarchical locking | Inherited protection and independently protected descendants. |
| Q060 | **B** | Master deletion | Confirm; detach instances preserving appearance; undo. |
| Q061 | **B** | Master editing | Edit master through linked instance; propagate, exit/detach. |
| Q062 | **B** | Instance overrides | Placement/size/visibility/lock/z-index local; content/styles shared master. |
| Q063 | **B** | Animations | Curated CSS animation and hover transition presets; reduced motion. |
| Q064 | **B** | Animation triggers | Load/hover/focus/active and repeats/direction/pause/replay in editor. |
| Q065 | **B** | Link manager | Stable section targets, approved external links, mailto/tel, missing-target warnings. |
| Q066 | **B** | CSS sizing | px/%/rem/em/auto, min/max, aspect locks, percent coordinates. |
| Q067 | **B** | Flex/Grid controls | Visual direction, alignment, gap, wrap, columns, responsive presets. |
| Q068 | **B** | Inspector tabs | Content, Layout, Style, Effects, Accessibility; contextual active tab. |
| Q069 | **B** | Multi-edit values | Mixed-value indicators, compatible batch properties, protected locks. |
| Q070 | **C** | Preset inheritance | Cascading preset graphs, variants, inherited/effective/overridden property view. |
| Q071 | **B** | Preset categories | One active preset per Typography/Layout/Appearance/Effects; parent inheritance. |
| Q072 | **B** | Preset removal | Confirm then bake effective styles, update descendants, remove refs/no cycles. |
| Q073 | **B** | Builder accessibility | Target WCAG 2.2 AA for editor, keyboard/screen reader/reduced motion. |
| Q074 | **A** | Browser database | localStorage exclusively for projects and preferences. |
| Q075 | **B** | Multi-tab conflicts | Active editor/read-only tabs, owner conflict and revision checks. |
| Q076 | **A** | Editing takeover | Immediate take over without old-tab acknowledgement; unsaved loss warning. |
| Q077 | **B** | Storage management | Estimate usage, warn, manual cleanup/backup, no auto deletion. |
| Q078 | **B** | Delete nested container | Delete all or unwrap/keep children, position recalculation, one undo. |
| Q079 | **B** | Reparenting | Intelligent mode-aware move, preserve visual position and valid references. |
| Q080 | **B** | Duplicate refs | Regenerate IDs and remap links within duplicated subtree. |
| Q081 | **B** | Undo granularity | Group typing, dragging, resizing, sliders and batch edits by intent. |
| Q082 | **B** | Template reset | Remember origin, confirm reset, optional duplicate backup, immutable templates. |
| Q083 | **B** | Template selection | Interactive sandbox preview with viewports, no unsafe navigation/submission. |
| Q084 | **B** | Palette organization | Search, category filter, preview, favorites and recent use. |
| Q085 | **B** | Insertion UX | Select inserted node, open relevant Inspector, placeholders and hints. |
| Q086 | **B** | Type conversion | Safe heading/paragraph, button/link, list conversion; compatible properties. |
| Q087 | **B** | Export preflight | Critical errors block; warnings confirm; affected-element navigation. |
| Q088 | **B** | Keyboard shortcuts | Context-aware shortcuts, searchable reference, focus conflict protection. |
| Q089 | **B** | Dashboard organization | Search/sort/template filter/favorites/grid-list, local preferences. |
| Q090 | **B** | Thumbnails | Lazy approximate thumbnails from component structure, no screenshot assets. |
| Q091 | **A** | Export accessibility | Basic semantic HTML, alt, labels, native controls and warnings only. |
| Q092 | **B** | External resource failures | Placeholders, warnings, fallback fonts and URL correction actions. |
| Q093 | **B** | Export performance | Lazy/priority loading, dimensions, CSS dedup/prune, font swap, no JS. |
| Q094 | **B** | Corrupted projects | Independent records, isolate errors, download raw, JSON restore. |
| Q095 | **B** | Trash | Manual restore/delete, never auto purge, storage shown. |
| Q096 | **B** | Cross-project components | Copy independent master between projects, no cross-project live links. |
| Q097 | **B** | Preset copy dependencies | Copy transitive preset graph and styles, fresh IDs, preserve appearance. |
| Q098 | **B** | Responsive widths | Resizable preview plus Mobile 390/Tablet 768/Desktop 1280 and fixed breakpoints. |
| Q099 | **B** | Multi-element geometry | Align/distribute/match compatible sizes and one history action. |
| Q100 | **B** | Project naming | Validate nonempty names, auto-number duplicates, stable IDs, safe ZIP slug. |
| Q101 | **B** | Color editing | HEX/RGB/HSL/alpha and saved swatches/recent, no advanced gradients. |
| Q102 | **B** | Box model | Four-side spacing, linked/unlinked, borders/radius, units, computed preview. |
| Q103 | **B** | Typography | Line height, letter spacing, transforms, decoration, shadow, wrapping. |
| Q104 | **B** | Image crop | Visual focal point, aspect/fit/object-position CSS, preserve URLs. |
| Q105 | **B** | Background images | External URL, size/position/repeat/fallback and contrast warnings. |
| Q106 | **B** | Interaction states | Normal/hover/focus/active/disabled styling with CSS transitions. |
| Q107 | **B** | Sticky positioning | Supported sticky header/section offsets; no fixed viewport. |
| Q108 | **B** | Element search | Search page content/type/name/ID, select/highlight/expand/scroll. |
| Q109 | **B** | Form editor | Visual fields and constraints, native validation, avoid actual preview submit. |
| Q110 | **B** | Form privacy/security | HTTPS external endpoints, GET warnings, no visitor value persistence. |
| Q111 | **B** | HTML5 media | Native video/audio controls, hosted URLs, poster/captions, autoplay restrictions. |
| Q112 | **B** | Responsive visibility | Breakpoint show/hide CSS vs global omission from export. |
| Q113 | **A** | Measurement aids | Existing smart guides/snapping only; no rulers or grid overlay. |
| Q114 | **B** | Import security | Strict schema/component/CSS/URL/refs sanitization; reject executable data. |
| Q115 | **B** | External paste | Smart text/link/image suggestions; plain text and sanitized safe URLs. |
| Q116 | **B** | Workspace recovery | Restore viewport, zoom, scroll, panels, selection; not in-progress edits/history. |
| Q117 | **B** | Overlap selection | Alt/Option cycling, touch layer menu, breadcrumbs, inspect locks. |
| Q118 | **C** | Rich-text formatting | Per-span formatting/fonts/colors/highlight, links, icons, superscript/subscript. |
| Q119 | **A** | SEO/social | Basic SEO only; no social metadata or advanced SEO editor. |
| Q120 | **B** | Rich-text interaction | Dedicated inline editing mode, contextual toolbar, selection preservation. |
| Q121 | **B** | Rich-text serialization | Versioned validated structured JSON AST; semantic safe HTML generation. |
| Q122 | **A** | Offline architecture | Online-first; continue open-session local editing; no service worker/PWA. |
| Q123 | **B** | Nesting legality | Prevent invalid semantic placement rather than permit then flag. |
| Q124 | **B** | Runtime error handling | Isolated React error boundaries and safe saved-data recovery. |
| Q125 | **B** | CSS class names | Stable, descriptive, collision-safe and deterministic export classes. |
| Q126 | **C** | Visual testing | Automated Chromium/Firefox/WebKit cross-browser baselines and performance checks. |
| Q127 | **B** | Schema migration | Validate new record before single-write replacement; leave original on failure. |
| Q128 | **C** | Collection backups | Complete/selective JSON backup/restore, preview, duplicate compare, detailed report. |
| Q129 | **B** | Template assets | Polished original samples using safe CSS/inline SVG assets and placeholders. |
| Q130 | **B** | Release acceptance | Full 130-item checklist, mapped tests, milestone evidence, user sign-off. |


## Appendix B — Handoff notes and reference commands

**Install/run (repository-verified baseline):**

```bash
# Node 22.22.2; npm 10+
npm ci
npm start            # local Vite development
npm test             # current Vitest script; expand tests without breaking repo
npm run build        # Netlify frontend output: dist/
```

**Implementation additions:** Add a Playwright config and scripts for multi-engine E2E/visual checks; create fixtures and CI job names during M1/M2 setup. Do not treat Playwright as presently installed in the verified package file.

**Suggested initial Codex task:**

> Read this specification completely, especially Appendix A and Section 11. Inspect the existing React portfolio routing, Sanity project card and tests. Produce an implementation proposal for Milestone M1 only, with a concrete file diff plan, schema contract, acceptance tests and CI changes. Work on a new feature branch with an early draft PR. Do not touch `main`, do not begin M2, and do not merge or deploy without explicit approval. Keep all 130 decisions in the traceability checklist.

**Source of truth:** This document captures the user's finalized choices; it does not assert that any code, tests, branch, PR or deploy has been created.
