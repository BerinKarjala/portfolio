# M4 — Export, preview, validation and resilience

M4 uses one pure compiler for safe, deterministic standalone HTML/CSS and isolated preview. The browser-local project schema remains version 3. The portfolio launch layout and educational application-source panel remain shared with the other projects.

## Compiler and delivery

`exporters/compiler.js` validates the project, including tree/IDs, materialized master instances, preset graphs, component properties, URLs, rich-text AST and styles. It resolves category inheritance, variants and element overrides, constructs a compiler-owned HTML AST, and collects CSS rules. `html.js` serializes that AST with escaped author text/attributes. Unsupported input or serialization failure yields no output and never writes project storage.

The generated document includes native semantic headings, text, links/buttons-as-links, lists, containers/cards, navigation, labelled forms, table scopes/captions, galleries, curated inline SVG icons, media and approved embeds. It includes title, description, language, viewport, indexability and optional favicon. Media uses HTTPS URLs, native controls, alt/caption data, loading priority and image dimensions/aspect ratios. There are no generated scripts, inline event handlers, React dependencies or CSS framework downloads. Trusted third-party frames are external documents; their providers may run their own code within the restricted export iframe.

Element class names combine the component type with its complete stable internal ID. Generated form/option IDs use a separate collision-checked namespace. Identical span/declaration rules are shared; unused component rules, fonts and keyframes are pruned. Only actually used curated Google fonts are requested, with local fallback stacks and `display=swap`. CSS is formatted with section comments. Quoted URL punctuation is preserved. Same validated input produces identical files, including the ZIP; no timestamps enter them.

`zip.js` writes deterministic uncompressed UTF-8 ZIP entries with CRC32 and a fixed ZIP date. The archive contains exactly `index.html` and `styles.css`. The project name becomes a normalized ASCII filename slug; author paths never become archive entries. Individual HTML/CSS downloads use the same preflight and correct MIME types. Opening the webpage requires keeping both files together; JSON is the editable backup.

## Preview and generated code

The editor's **Preview and export** workspace and **Preview selected template** use `SandboxPreview` with the compiled document. Preview inlines the generated CSS and applies only explicit isolation changes: external links become inert, form endpoints are removed, and a restrictive CSP denies scripts, objects, base changes and submission. The outer iframe uses `sandbox=""`: no scripts, origin access, forms, popups or top navigation. Nested provider frames inherit these restrictions; a live third-party player may therefore be unavailable in preview. Final exports retain validated links and form endpoints.

Device widths are 390, 768 and 1280px; numeric entry and a pointer/keyboard resize handle support 320–1920px. Width is the actual iframe layout width. A keyboard-focusable viewport scrolls horizontally when necessary, avoiding scaling native controls. Pointer release commits its final coordinate; cancellation/Escape restores the starting width. The frame has a 640px viewing height and scrolls vertically for longer pages. Native details/summary menus, focus/hover/active styles and form controls can be inspected. Visitor values stay inside the isolated frame and are never stored in project data.

Compilation is memoized and updates are debounced by 200ms. Changing the input resets warning acknowledgement; pending compilation disables download. The click handler always reruns preflight on the live project. HTML/CSS tabs provide escaped syntax tokens, line numbers, copy, and a read-only selection fallback. They show exported files, not the preview-only CSP/navigation changes. The portfolio source viewer continues to expose the implementation separately.

## Preflight and failure containment

Critical schema/component/CSS/URL/tree/reference/master errors block every delivery mode. Component/property failures are located when possible; graph or metadata failures remain page-level. Confirmable warnings include missing alt/descriptions, empty or skipped headings, missing/hidden section targets, plausible low contrast, external backgrounds, geometry overflow/clipping, GET privacy, media controls/captions and autoplay limitations. Solid opaque color pairs can be checked; this is basic accessibility support, not conformance certification.

Image/media errors captured in the editing canvas produce URL-correction warnings tied to the affected element. Changing the URL makes stale observations irrelevant. Editor images retain their original SVG fallback; exported images use native alt text and a CSS background fallback without a JavaScript error handler. Unknown remote load status is not reported as a definite failure. Browser autoplay, font loading and provider availability remain browser/provider dependent.

**Show affected element** returns to the editor, selects the node, expands its ancestors and opens its Inspector. Copy/download diagnostics contain only feature and diagnostic codes, without author text, URLs, record keys or stack traces. Compiler/download failures do not alter saved data. Library and Inspector render errors are isolated and can be retried. A critical canvas failure pauses autosave and retains last-saved and unsaved JSON recovery actions; an integration test waits beyond the autosave interval and verifies unchanged saved bytes.

Collection restore defaults to best-effort rollback of newly added records after failure. An explicit checkbox permits partial retention. Every selected entry receives a restored/failed/rolled-back/retained result; a downloadable report identifies retained copies if concurrent changes prevent rollback. Existing records are preserved. Migration, quota, ownership, corruption and offline behavior retain the earlier storage contracts.

## Verification

Tests began with a missing compiler, then progressed through compiler, UI and browser integration. Local verification: **123 unit/integration tests across 19 files**, production build, and the seven new Chromium workflows passed. The final combined CI passed **86 browser cases with four intentional engine-specific skips**, including all nine reviewed per-engine exported-page baselines, with no flaky retries. The latest upstream portfolio changes are included; `progress.md` records exact commit/run and preview evidence.

The M4 browser suite verifies sandbox isolation, native menus/forms, no persisted visitor values, all download modes, ZIP CRCs/names, warning navigation, template preview without writes, scoped desktop/mobile axe checks, corruption/restore reports and a 250-component page. Preview/export comparisons inspect each compiled node's computed typography, color, background, display, spacing and document-space bounds at all three device widths. Exported-page screenshots use separate per-engine baselines; screenshots of the preview are retained for review. Performance measurements report open/preview duration, DOM count and HTML size without inventing release timing budgets.

M5 still owns the complete 130-decision release checklist, remaining onboarding/reset/tutorial work, calibrated performance acceptance, broader visual states, real-device/assistive-technology checks and user sign-off. This milestone is not a final release approval.
