# Learn from the Page Builder

The portfolio’s standard source panel displays the actual React/JSX/CSS modules, read-only. Expand **How this builder works** beside the launcher for an introduction. This guide follows four paths through that source. Generated HTML/CSS is a separate, read-only viewer inside the workspace.

## 1. Follow a user action through the architecture

Start in `PageBuilderProject.jsx`: the portfolio card opens a lazy `BuilderWorkspace` in a native full-viewport dialog. `BuilderProvider` supplies Context. `Dashboard` creates/opens a browser-local project; `Editor` chooses the interactive canvas or compiled preview/export workspace.

Follow a Library insertion through `sendCommand` → `builderReducer` → `applyCommand` in `domain/structure.js`. Pure domain functions clone the project, apply an operation, validate the result and return the new project and selection. A rejected operation leaves the previous project intact. `domain/project.js` is the canonical schema boundary for import, creation, mutation and export. Do not put persistence or DOM measurements in these pure functions.

Geometry measured by the canvas is converted to parent-relative percentages by `domain/geometry.js`. The editing canvas includes selection handles and approximate visuals; the final preview uses the compiler’s native HTML/CSS.

## 2. Understand the reducer and one-action Undo

`state/builderReducer.js` stores canonical content and session history. `commit` snapshots page metadata/content, global styles/effects, presets and masters together. It clears Redo after a new edit, limits history to 50 actions and coalesces repeated input with the same intent key inside 800ms. Discrete formatting operations and complete gestures form separate actions.

For a small experiment in a test, create a project and insert a heading:

```js
const start = createProject({ name: "Example" });
const result = applyCommand(start, { type: "ADD", component: "heading" });
expect(start.page.rootElementIds).toHaveLength(0);
expect(result.project.page.rootElementIds).toHaveLength(1);
```

Open that project with the reducer’s `OPEN` action, dispatch a `COMMAND`, then `UNDO` and `REDO`. Read `domain/structure.test.js` and `designInvariants.test.js` for lock, nesting and shared-style examples. UI events use the provider rather than dispatching editing commands directly: it checks editing ownership before mutation.

`RESET_TEMPLATE` is a useful complete example. `domain/reset.js` generates fresh template element IDs while retaining project identity and revision. The reducer commits it as one undoable action. The provider validates the reset and, when requested, saves an independent copy of current content first. A failed backup aborts the reset. Undo restores content but does not delete that independent backup.

## 3. Write a regression that protects a contract

Use `npm ci`, then `npm run check:page-builder`, `npm test` and `npm run build`. After installing Playwright browsers, run `npm run test:e2e`. The development runtime is pinned by `.nvmrc`; the build also has size checks via `npm run check:page-builder:build`.

Choose the layer matching the failure. For a URL or import problem, add a pure-domain test that reproduces unsafe data and asserts the original bytes remain unchanged. For focus or selection problems, use React Testing Library. For actual drag, opaque-frame isolation, native scrolling or downloads, add a Playwright workflow. Assert observable outcomes: IDs remain stable, a download contains the expected files, a cancelled gesture changes nothing.

The M5 reset tests began with a failing missing-module import, then verified identity, one-action Undo and read-only behavior. Integration tests simulate quota failure before backup creation and verify preserved saved/current content. Browser tests add confirmation, cancellation, independent-copy content, autosave, reload and keyboard focus.

CI uses Ubuntu 24.04, lockfile browser versions, two workers and one failure retry. A retried pass is visible as flaky evidence and needs investigation. Do not automatically update images after a failed comparison: inspect actual/expected/diff attachments first. Existing per-engine native-font images are canonical for that CI environment. Local OS fonts can rasterize differently. See [release evidence and limits](m5-release.md).

## 4. Trace safe, standalone export

`exporters/compiler.js` validates the current project and resolves effective styles and materialized linked components. It creates a compiler-owned HTML AST; `html.js` escapes text and attributes. User-authored HTML, scripts and raw CSS are never accepted. CSS uses allowlisted visual properties, deterministic descriptive classes, shared declarations and only used fonts/keyframes.

`preflight.js` separates blocking errors from confirmable warnings. `ExportWorkspace` memoizes and debounces previews but invalidates stale downloads immediately; each download revalidates the live project. Warnings must be acknowledged for ZIP and individual files.

`previewDocument` uses the same compiled AST/CSS with isolation transformations: restrictive CSP, no external navigation or form actions, and `about:srcdoc#...` section links. `SandboxPreview` adds an empty iframe sandbox. Exported documents retain ordinary links and validated form actions; the project never stores visitor field values.

`zip.js` writes a deterministic UTF-8 stored ZIP with CRC32 checks and exactly `index.html` and `styles.css`. The generated website has no application runtime or generated JavaScript. Approved provider iframe documents may execute their own code under their separate conservative sandbox. Remote assets and endpoints depend on their providers; local project JSON is the editable backup, not the website ZIP.

For implementation contracts and limitations, read [developer guide](developer-guide.md), [M4 export contracts](m4-export.md) and [130-decision trace](requirements-trace.md).
