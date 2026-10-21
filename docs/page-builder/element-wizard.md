# Element configuration wizard

The Configure wand arms a single-element picker. Click the canvas or activate a
Layers row with Enter/Space to open the target's configuration. Empty canvas
keeps picking armed; Escape, Cancel, or the wand cancels it. The picker suppresses
canvas drag, resize, navigation, form actions, and inline text activation.

## Configuration contract

- Ordinary elements use Content, Layout, Appearance, Accessibility/Visibility,
  and Review. Elements without content properties skip Content. All 18 catalog
  types use existing native controls and domain validation.
- Essential controls are shown first. Advanced controls are collapsed. Invalid
  steps retain their inputs, reveal Advanced controls, announce the error, and
  focus a matching field when the validator identifies it.
- Fields edit transient drafts. Next validates and applies the entire step
  before advancing. A changed step creates one normal project-history entry,
  even when completed rapidly. Unchanged steps and Finish create none.
- Back preserves pending entries. Close and modal Escape discard unfinished
  inputs and retain completed steps. Rich text handles its own editing Escape
  first. Text inputs keep native typing Undo; rich text uses local draft history.
- Linked copies show only existing permitted local size, placement, and
  visibility overrides. Shared properties, masters, detachment, and propagation
  are outside the wizard. Master-edit mode disables the wand.
- Completion rechecks ownership, project identity, target existence, locks, and
  the target baseline. Conflicting changes block application and retain inputs;
  explicit Reload discards them. Autosave revision bookkeeping alone is allowed.
- Completed steps use existing autosave and recovery. The save indicator describes
  the applied project, including pending or failed saves. Wizard drafts are never
  added to saved project JSON, exports, backups, or Undo snapshots.

## Responsive preview and access

At widths above 63rem the settings and contextual preview sit beside each other.
At narrower widths a Settings/Preview switch preserves mounted controls and
drafts. The design viewport stays independent of the dialog viewport. Short
screens can scroll to the footer. Focus wraps through visible controls, errors
are announced, and closing restores an available target, layer, or wand.

The preview uses the existing compiler and CSP in an empty sandbox with no
referrer and supports scrolling through long pages. Links have no destinations, forms and inputs are disabled, media cannot
autoplay, and external embeds become inert placeholders. Invalid previews keep
the last valid rendering and explain the failure. Images/media URLs still follow
the existing HTTPS loading policy. Preview controls never apply a step.

## Test and review evidence

Development began with nine failing domain/history tests and eight failing UI
tests before their implementation. Additional regressions cover hidden focus
targets, read-only draft retention, invalid Advanced CSS/colors, collection item
identity, all 18 type flows, no-op history, input Escape, and preview isolation.

- `domain/elementWizard.test.js`: atomic validation, field ownership, stale or
  missing targets, locks, linked-copy restrictions, no-op identity, Undo/Redo,
  and master-edit rejection.
- `components/ElementWizard.test.jsx`: real provider/editor integration,
  collection drafts, view switching, explicit reload, ownership loss, and safe
  preview output.
- `components/Dialog.test.jsx`: focus wrap excludes hidden controls.
- `e2e/page-builder-wizard.spec.js`: active-input completion, autosave/reload,
  step Undo/Redo, validation focus, 320px reflow and short-screen access, scoped
  axe checks, 4K side-by-side layout, sandbox policy, and local rich-text Undo.

Run the repository's five baseline commands from `docs/development-standards.md`.
Record the tested commit and actual engine/runtime versions in the pull request.
Keep failed checks visible; do not update existing image baselines merely to
make a different browser/font environment pass. The CI workflow includes this
spec automatically in its Chromium, Firefox, and WebKit matrix. A separate
wizard gate runs with retries disabled before the full regression suite.

CI follow-up regressions keep picker instructions visible while the prospective
target changes, so hover cannot shift the canvas under the pointer. They also
verify that visible opaque previews return keyboard focus to the dialog without
depending on a host-window blur event. Preview clicks must return focus before
Tab or Escape is tested; the sandbox and script policy remain unchanged.

Security review scope includes every changed source file, the command/reducer
boundary, existing project validation and master permissions, browser ownership,
and the compiler/preview boundary. No dependency or deployment configuration
changes are included. The Codex Security scan helper and required preflight
reference are unavailable in this host; manual review and targeted security
tests do not constitute a completed automated Codex Security scan.

Physical TV remotes will not be verified and are excluded from release
acceptance under AC-EX-TV-REMOTE, approved by the project owner on October 21,
2026. Actual on-screen keyboards, assistive technology, and viewing-distance
readability remain manual release checks. Browser viewport tests establish
responsive behavior, not physical remote compatibility or device certification.
