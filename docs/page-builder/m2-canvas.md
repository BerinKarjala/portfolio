# Milestone 2: canvas and structural editing

## Delivered behavior

The existing portfolio launch page and shared source panel stay in place. The full-screen workspace now contains a component library, interactive canvas, Layers tree, and contextual inspector. Desktop panels collapse; mobile panels open as drawers. Creating/inserting an element selects it and opens Content, including the inspector drawer on mobile.

Core elements are Container, Heading, Paragraph, Link, Divider, Image, Navigation, List and List item. Search and category filtering include favorites/recent usage, stored separately from project content. This is the M2 structural palette; M3 adds the full form/table/media/gallery/icon inventory, rich text, masters, presets and complete style controls.

- Insert by Add button, mouse drag, touch long press, or keyboard drag. Structured movement uses dedicated move handles; it never captures normal text entry. Reordering and reparenting also work through Layers buttons and the Move into selector.
- Flex/Grid controls cover direction, wrap, columns, gap, alignment, distribution and overflow. Flow sizing accepts validated px/%/rem/em/auto values. Free-form placement is opt-in within the current parent, using percentage X/Y/width/height, with numeric controls and resize/move handles.
- Resize and movement preview through requestAnimationFrame and commit once on release. Alt bypasses six-screen-pixel snapping; Shift or the aspect checkbox preserves resize ratio. Cancelling leaves the original project untouched. Locked descendants prevent parent operations that transform/remove them; inherited locks cannot be bypassed by unlocking a child.
- Multi-select using Shift/Ctrl/Command click or Layers checkboxes. Group/ungroup, copy/cut/paste, duplicate, compatible batch properties, and free-form sibling alignment/distribution/matching dimensions are atomic actions. Mixed inspector values display Mixed. Container deletion offers deleting content or keeping/unwrapping children.
- Layers supports expansion, name/text/type/HTML-ID/path search, selection, reorder, lock and global visibility. Selecting a search result expands its ancestors, highlights it, and reveals it on the canvas where visible. Hidden elements remain available in Layers. Z-index is numeric and local to its stacking context; the UI warns about stacking/overflow limitations.
- Alt/Option click cycles the hit-tested overlapping elements. The Select layer menu and selection breadcrumbs provide touch/keyboard alternatives, including inspection of locked elements.
- Viewports include 390/768/1280 presets, custom width and an edge resize handle. Zoom is 50–200%, with fit/reset, Ctrl/Command wheel, Space/middle-drag pan, and touch pan/pinch. Workspace changes do not create content history.

## Data model and migration

Schema version **2** adds validated `layout` and `geometry` objects to each element. M1 version-1 records upgrade in memory, are fully validated, checked against the original stored bytes, then replaced once. The documented v0 fixture upgrades through the same path. Unknown versions and malformed records remain isolated/downloadable. Stable project/element/HTML IDs, existing content, names, timestamps and revisions survive migration.

`layout` contains direction, wrap, align/justify, grid columns, axis overflow and the group flag. `geometry` contains percentage coordinates/sizes, local z-index, aspect lock, retained flow parent/index and whether a percentage placement was previously measured. Free-form roots are relative to the page; nested nodes are relative to their parent's padding-free content box. Imported percentage coordinates are bounded to -1000..1000, sizes to 0.1..1000, z-index to -10000..10000 and columns to 1..12. These are validated render bounds, not executable CSS strings.

`domain/structure.js` is the shared command layer for all input paths. It creates a private prospective copy, checks locks/nesting/refs, performs the operation, and validates before returning a commit. Maximum depth remains four, excluding the page root. Cycles, orphan nodes, duplicate HTML IDs and illegal semantic nesting are rejected atomically. Reparenting preserves internal IDs; duplication/paste generates fresh IDs and collision-safe HTML anchors, remapping links inside the copied subtree while retaining outside references. Batch moves and clipboard roots preserve document order.

The renderer measures actual `getBoundingClientRect()` values of content boxes, including current scale and scroll. `domain/geometry.js` handles pure percentage conversion, pointer deltas, snapping and resizing. Reparenting and unwrapping pass measured destination placements for absolute children; purely absolute parent transforms also have a tested percentage-composition fallback. Free-form coordinates survive mode switches; retained flow indices track the new parent/order after structural moves.

## History and persistence

History is session-only in the Context reducer, capped at 50 semantic actions. Pointer gestures commit once. Typing/property changes with the same history key coalesce within 800ms; keyboard nudges coalesce. New edits after Undo clear Redo. Selection, camera and panels create no content history. Undo/Redo restores document snapshots while retaining the current saved revision, so it cannot resurrect stale storage revisions. Switching/reloading/taking over resets history.

Only canonical validated content reaches the existing debounced storage repository. Pointer previews, gestures, clipboard and history are never serialized. Ownership/revision checks also apply to structural commands and history; read-only tabs can inspect/select/change their workspace but cannot alter the document. A takeover cancels active editing gestures. Workspace state separately restores width, zoom, scroll, selected IDs, expanded Layers, panels and tabs, with page-exit flushes. Browser-only coordination retains the M1 best-effort race limitation.

## Input library review

`@dnd-kit/core` 6.3.1 was selected after checking its React/react-dom peer contract (`>=16.8.0`, including the host React 19) and verifying mouse, long-press touch, KeyboardSensor, accessible announcements, nested droppables and autoscroll. No extra state manager, TypeScript migration or backend was added. The library handles structured placement; native Pointer Events handle free-form movement/resizing and the camera. All document changes converge on the same validated reducer commands.

## Verification and remaining gates

Unit/integration coverage includes depth/semantic legality/cycles, inherited and descendant locks, copied IDs and anchors, unwrapping percentages, mode switches, ordered batch moves, alignment/distribution, real M1 schema migration, coordinate offsets/scroll/scale, snapping/aspect, history grouping/limit/revisions, and keyboard/input separation.

Browser cases cover mouse insertion/reparenting, actual KeyboardSensor drops, Layers keyboard movement, scaled free-form move/resize and one-step undo, groups/locks/clipboard, workspace restoration, overlap selection, pointer cancellation, mobile inspector/checkbox selection, canvas width resizing, and camera controls. Chromium CDP drives real long-press, touch-cancel and pinch gestures; this CDP-specific case is explicitly skipped on Firefox/WebKit. The ordinary pointer/keyboard/mobile layout cases run in every engine. Actual iOS/Android and assistive-technology review remain M5 gates.

Two committed Chromium/Linux image baselines cover representative structured and grid canvas layouts. They use fixed viewport/content/font, hide editor handles, and allow a 1.5% differing-pixel ratio for rasterization variation. These are initial M2 regression baselines, not final user-approved release screenshots. The complete Chromium/Firefox/WebKit visual/performance matrix remains M5. Update baselines only after inspecting a known intentional visual change; normal CI compares them without update mode.

HTML/CSS export, final compiler-backed sandbox preview, full component/style/rich-text systems, comprehensive backup reports, and final release approval remain M3–M5 work. No implementation merge or production release is included in this milestone.
