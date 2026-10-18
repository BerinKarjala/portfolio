# Milestone 3: content and design systems

## Delivered editor behavior

The existing portfolio project page still launches the full-viewport builder from the left illustration and displays implementation source in the shared right panel. M3 extends the canvas rather than changing that host layout.

The palette now offers 18 component types: Container, Card, Heading, Paragraph, Link, Button, Divider, Image, Navigation, List, List item, Form, Table, Gallery, Icon, Video, Audio and Embed. Search/categories/favorites/recent usage and expandable component previews share the M2 insertion paths. Containers provide Flex/Grid layouts; form fields, table cells and gallery items have visual add/remove/reorder/property controls within their semantic components.

- Forms store definitions only: labels, unique names, types, options, required/pattern/length/min/max constraints and autocomplete. Actions require HTTPS and GET/POST. GET shows a privacy warning. Canvas controls are disabled; visitor values are never bound to project data and submission is blocked.
- Tables provide rectangular row/column editing, captions, column/row/both/no header modes with native header scope, stripes and horizontal scrolling.
- Navigation contains link/button components and uses native details/summary below 768px. All canvas links remain inactive. Shared visibility uses Mobile <600px, Tablet 600–1023px and Desktop >=1024px; responsive grids use the same device ranges.
- Images offer URL/alt/loading-priority settings, fit, aspect ratio and a visual focal point. Galleries retain image order, alt/captions, columns, ratios, fitting and hover effects. Failed sample images show original curated SVG artwork with a correction hint; external URLs remain editable.
- Native audio/video retain hosted URLs, controls, loop/mute, preload, poster/captions and caption language. Autoplay settings require muted playback; autoplay stays off in the editing canvas.
- Embeds accept constrained YouTube, Vimeo and Google Maps hosts/paths, never arbitrary HTML. They load only after an explicit button click and use an opaque iframe sandbox with scripts/presentation only: no same-origin, forms, popups or top-navigation privileges. Loading contacts the selected provider.
- Icons use 12 original curated SVG path IDs with search, color/size and accessible/decorative labels. Project JSON never accepts SVG markup.

## Rich text

Project schema **3** stores rich-text document version **2**. The flat, validated node union contains text/link spans with marks and allowlisted inline styles, line breaks, and curated inline icon nodes. Marks include bold, italic, underline, strike, superscript and subscript. Subscript/superscript are mutually exclusive. Span controls include font family, weight, size, color and highlight. Links use the shared safe URL contract.

Double-click/double-tap text or choose **Edit rich text**. The contextual toolbar is docked outside the scaled canvas, retaining usable physical target sizes at 50–200% zoom. Selection ranges use UTF-16 offsets with explicit line-break/icon units; toolbar focus preserves the last valid selection. Native beforeinput handles edits, deletion uses browser target ranges or grapheme boundaries, and composition/input reconciliation retains formatting outside the changed range. React creates the editing DOM from nodes; pasted HTML is never interpreted. Typing/paste coalesce into session history; formatting and icons form separate actions. Ctrl/Command Z and Redo reach canonical history; Escape/Done finish editing.

The plain **Text content** field deliberately replaces formatting. External canvas paste and **Paste external content** present explicit paragraph/link/image suggestions from plain clipboard text and validated HTTPS URLs. Internal structured clipboard behavior remains available.

## Styles, cascade and effects

Style validation is centralized in `domain/styles.js`. Controls cover typography, four-side linked/unlinked spacing, px/%/rem/em/auto sizing and min/max, borders/radii, shadows, opacity, image/background settings, Flex sizing, sticky offsets, transitions and normal/hover/focus/active/disabled states. Fixed positioning and raw CSS are rejected. HEX/RGB(A)/HSL(A) inputs normalize to HEX; saved/recent swatches are separate browser preferences at `page-builder:colors`.

Global styles apply to the page. Inheritable text properties flow from the effective parent styles. Parent presets cascade by category, then the current element's preset/variant and individual overrides apply; state overrides apply last. The inspector shows inherited, effective and overridden values. Rendering uses the same pure resolution functions tested by the model suites. Four preset categories are Typography, Layout, Appearance and Effects, with one active reference per category, same-category acyclic parent graphs and named variants.

Preset removal requires confirmation. It bakes computed preset contributions and state deltas into affected elements, flattens dependent preset inheritance and removes references. Where an inherited parent context cannot be represented by a shared master, the confirmation explicitly explains that affected linked components are detached to preserve their appearance. Other instances stay linked. Locked affected content blocks removal. The command is one undoable action.

Global and element animations include fade, slide, zoom, rotate, pulse and bounce; load/hover/focus/active triggers; duration/delay/repeats/direction. Elements can inherit global animation or select None. Pause/Replay are editor session controls and create no content history. Reduced-motion preferences disable animations/transitions. Fonts include system families and curated Inter, DM Sans, Lora and Space Grotesk with external Google Font loading and system fallbacks; no font upload or arbitrary font CSS.

## Reusable components

`masters` store validated project-local template trees. Materialized page instances retain stable IDs and reference `{ masterId, sourceId, rootId }`. Validation rejects incomplete/forged instance trees or changes to shared fields outside master editing. Nested linked masters are rejected, preventing dependency cycles; ordinary nested component structures remain supported to depth four.

**Make reusable component** captures inherited appearance and preset dependencies. **Edit master** through any instance applies shared content/structure/styles to every instance atomically while preserving local placement, size, visibility, lock and stacking. The provider routes those local controls directly to the instance even during master editing. Updates cannot bypass an independently locked instance/descendant. **Detach** preserves content and styling. Removing a used master explicitly confirms detachment of every instance and is undoable.

The Reusable library copies a saved project's master as an independent definition, recursively copying its preset dependency graph, assigning fresh IDs, remapping references and resolving names. No cross-project live link is created. Whole-project duplication retains independent cloned definitions and remaps page instance roots. Subtree clipboard operations remap rich links and HTML anchors; copying only a linked descendant yields an independent subtree on paste.

## Migration and persistence

Schema-2 records gain effects, accessibility, state styles, preset variants and instance fields, plus version-2 text documents, image priority/navigation defaults and global effects. Schema 1 upgrades through the existing geometry step, and the documented v0 fixture uses that path. Transformations occur in memory and full validation precedes the existing guarded single-record replacement. Original record bytes remain intact on failure. New template composition does not rewrite existing saved projects.

History now snapshots masters, presets and global effects along with page/styles. Shared style actions preserve selection. Master/text editing modes, effects pause/replay, clipboard and history are session-only. Ownership/revision and last-good-save protections continue to apply. Existing 4 MiB project/16 MiB backup/complexity bounds remain; no element-count cap was added.

## Verification and remaining gates

Tests cover every palette type, native component fixtures, rich-text ranges/security/composition/grapheme deletion/selection/Undo/reload, style validation and inherited rendering, preset variants/cycles/baking, master propagation/locks/forged references/independent dependency copies, history and schema migration. Seven M3 browser workflows join the 16 existing cases, including a six-template mobile rendering/review loop. M3 cases fail on unhandled page errors and run in all three CI engines. Automated axe checks cover desktop/mobile editor controls and the rich editing surface/toolbar; authored page designs are excluded from shell accessibility certification.

The two representative Chromium canvas images were intentionally refreshed for the new template navigation, typography and original SVG mark. Normal runs compare committed baselines without update mode. Manual screenshot review and automated checks are milestone evidence, not final screenshot approval or a complete device/screen-reader audit.

HTML/CSS compilation, final compiler-backed sandbox Preview, ZIP export, complete preflight/resource diagnostics, template reset/interactive compiled template preview and comprehensive recovery reporting remain M4. Final visual/performance/device/assistive-technology acceptance and release approval remain M5. See `progress.md` for exact local/CI/preview results.
