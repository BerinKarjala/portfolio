# Page Builder architecture and implementation

## Integration

`/projects/page-builder` is lazy-loaded through the existing React Router application. It retains the portfolio navigation, forest background, green project card, and shared `SourceCode` panel. The preview image is an original SVG illustration, not a screenshot of completed canvas controls. Its button opens a full-viewport native dialog. Closing/Escape returns focus to the launcher. Fullscreen API permission is not required.

The gallery prefers a matching Sanity project document and supplies a bundled card if none is returned, including when the CMS request fails. No CMS records or hosting configuration were changed.

## State and boundaries

- `state/BuilderProvider.jsx` owns the injected browser repository, React Context/reducer, one-second autosave, lease heartbeat, storage/BroadcastChannel notifications, and unsaved-work guards.
- `state/builderReducer.js` holds canonical in-memory project edits. Viewport, scroll, dashboard view and sort are separate workspace/preferences state, not content edits. No history snapshots are persisted. Session history snapshots page, styles, presets, masters and global effects.
- `domain/project.js` creates, clones, migrates and strictly validates projects. Element trees exclude the page root when measuring the maximum depth of four. Every element must be reachable exactly once, with matching parent/child references and unique HTML IDs. Whole-project duplication remaps internal IDs while retaining document-local HTML anchor IDs.
- `domain/templates.js` contains immutable blank plus six starter definitions. `templateDesign.js` composes the six polished samples with editable components and original curated SVG placeholders.
- `domain/storage.js` is the only durable-data adapter. Inject a Storage-compatible object and clock for deterministic tests.
- `domain/backups.js` produces versioned project/collection JSON, previews duplicates and invalid entries, and restores selected entries as independent copies. Naming collisions receive numbered suffixes. Newly created records are rolled back after batch failures if they have not changed; retained copies are identified if rollback fails.
- `browser/files.js` contains browser-only file operations. Preview text uses React escaping; no user HTML is inserted into the DOM.

## Storage contracts

Records use `page-builder:project:<id>`. There is no authoritative index: the dashboard rebuilds its directory by scanning independent records. Damaged or unsupported records are reported separately and never replaced with defaults. Raw downloads preserve their original bytes. Only explicitly confirmed damaged records or trashed projects can be deleted from the dashboard.

Ownership lives in `page-builder:owner:<id>`. Leases expire after 45 seconds and renew every 15 seconds. A second tab opens read-only. Explicit takeover writes a new owner token immediately, without waiting for the previous editor. Writes check both token and saved revision. Cross-tab notices pause old editors and preserve their in-memory content. A stale tab must download its unsaved JSON and explicitly reload/take over; there is no silent merge.

These are best-effort browser protections: `localStorage` has no cross-tab atomic compare-and-swap. A crashed or suspended owner may require lease expiry or explicit takeover. A clean page exit releases its lease where possible. Normal close/back actions flush content synchronously; failed saves require an explicit decision before discarding in-memory changes. `beforeunload` also requests the browser's unsaved-work warning. Mobile/browser process termination can skip lifecycle events, so regular backups remain necessary.

Preferences are stored separately at `page-builder:preferences`; workspaces at `page-builder:workspace:<id>`. The UI restores width, zoom, scroll, selection, expanded Layers, panel state and tabs, including a synchronous workspace flush on `pagehide`. Transient gestures, clipboard and history are excluded. Workspace changes never set content dirty.

Project payload size is measured as approximately two bytes per localStorage code unit, including keys, active projects and Trash. A conservative 3 MiB project-data warning is an application threshold, not a claim about the browser's actual quota or other origin data. Auxiliary workspace/preferences keys are not included in that project-data estimate.

## Schema and import safety

The current schema is version 3; see [M3 data and design contracts](m3-design.md). It supports all 18 palette types, validated version-2 structured rich text, effects/accessibility, preset graphs/variants and project-local linked masters. `styles.js`, `richText.js`, `components.js`, `masters.js` and `designCommands.js` isolate the pure contracts. Unsupported properties are rejected. URL, component and CSS values use allowlists; no user HTML enters the editing DOM. Imports reject prototype keys, unsupported versions, executable properties, cycles, illegal nesting, duplicate IDs and broken references.

Each canonical project is limited to 4 MiB of JSON for input/serialization safety; collection files to 16 MiB. JSON complexity also has a traversal budget. There is no separate element-count limit. Oversized backups ask users to split selected projects instead of producing files that cannot be imported.

Version 1 (M1) migrates through version 2 geometry defaults, then version 3 effects/styles/rich-text defaults, without changing existing content/IDs. Version 2 (M2) records migrate directly to version 3. The additional older shape is the documented **unreleased development v0 fixture**: the same canonical project shape with `schemaVersion: 0` and optional `status`, `favorite`, `revision`. Migration defaults these to `active`, `false`, `0`, validates the new object, checks the original stored bytes again, then performs exactly one replacement. This is a tested migration mechanism, not a claim of compatibility with a previously released builder or arbitrary third-party JSON.

Raw project objects and version-1 `page-builder-project` / `page-builder-collection` envelopes are accepted. Preview performs no writes. Users choose valid entries and confirm restore. Copies receive new project/element IDs; existing records are preserved. Recovery downloads from an invalid in-progress metadata edit may themselves need correction before import; they intentionally preserve the unfinished data.

## Verification

Use Node `22.22.2` and npm `10+`:

```sh
npm ci
npm test
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

The browser tests use the production build through `vite preview`, desktop and 390px layouts, real downloads, reload recovery, quota failure injection, and two tabs sharing origin storage. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` only when intentionally testing an installed Chromium binary. HTML reports, screenshots and failure traces live in ignored `playwright-report/` and `test-results/`; CI uploads them as artifacts. Two reviewed Chromium canvas regression baselines are committed; ordinary runs compare them without update mode. Other screenshot attachments are review evidence, not approved release screenshots. Automated axe scans cover the editor shell and rich-text tools; user-authored canvas styling is excluded. M5 adds calibrated visual/performance gates and manual mobile/assistive-technology evidence.

The editing canvas is interactive and does not claim export parity: M4 replaces final Preview with the shared HTML/CSS compiler in a sandboxed iframe. No HTML/CSS export is offered before that compiler is implemented.
