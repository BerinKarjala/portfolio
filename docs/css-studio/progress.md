# CSS Studio development progress

Date: October 20, 2026 (America/New_York). Branch: `css-studio`.

## Baseline and source priority

The user's pasted 24-point development request governs this work. The attached
v2.2 specification, decision record, and four implementation guides are project
context used within that request. The unrelated maintenance recovery attachment
was not executed. Unmodified supplied documents are retained under `handoff/`;
all seven Markdown files match their entries in the supplied SHA-256 manifest.
The manifest describes the original delivery, not files actually available here.
The large ZIP could not be transferred (32 MiB tool limit); no photographs or
catalog have been imported.

Initial/current feature base before implementation:
`5644de5b9f7eeb809ed8ce2d6b9f2e03ac84e2da` (#237). The checkout was clean.
No AGENTS.md files were found. Initial network access failed through the proxy;
the local branch was therefore created from the available checkout. Subsequent
network-enabled commands fetched remote default `main` at
`ab303a6a06905e0541627a09f8be25b3a19e08c1` (#238). Its mobile/4K
navigation changes were merged into the feature branch at `e6f0148`, preserving
the moon launcher and reading the new development standards. No merge into main
was performed.

The existing app is React 19/Vite with React Router, Tailwind, npm lockfiles,
Vitest/Testing Library, Playwright and Netlify static hosting. The theme provider
lives above routes in App. NavBar owns the moon launcher; Project adds a local
entry independent of CMS availability. Page Builder's actual immutable TEMPLATES,
createProject, compiler and sandboxed previewDocument supply examples. Its modal
workspace is portaled outside the themed canvas and has not been changed.

Initial baseline: 119 tests passed, 8 failed plus one suite failed to import;
build failed because the preinstalled node_modules lacked @dnd-kit/core. The
container initially ran Node 24 instead of .nvmrc's 22.22.2. Reproducible `npm ci
--ignore-scripts --cache /workspace/.npm-cache` restored the committed dependencies
without package or lockfile edits. Node 22.22.2 was then obtained as a temporary
execution tool. Neither missing dependency nor Node 24 is a product regression.

## Implemented increments

M0 is complete. M1's manual workflow is implemented: two entry points, live
canvas, independently collapsible nonmodal drawers, one expanded phone drawer,
seasonal profiles, Light/Dark and independent High Contrast, controls for three
colors/system font stacks/button shape, autosave/reload/recovery, reset/Undo,
original appearance restoration, export/selectable fallback, local moon utility
and refresh on visibility return/every 15 minutes while visible.

M2 is implemented for the proposed sixteen holiday palettes, per-holiday
profiles, contextual reset/recovery, and lazy-loaded previews of all seven actual
Page Builder starters. The starting holiday catalog is HD-02's **revisable
proposal**, not an additional explicit user selection or an exhaustive cultural
catalog. Names/context and imagery require entry-specific review before release.
The exact 248-photo catalog, image selection, attribution, crop and license
verification are **blocked by missing supplied assets**. No substitute image
inventory has been fabricated. Background controls currently provide solid fills.

M3 has an injectable, default-disabled designer contract, bounded conversation,
structured token validation, request/preset/appearance binding, explicit proposal
preview/Apply, stale-result protection, cancellation, retained drafts, and speech
recognition with explicit listening/Stop and separate Send. Tests inject explicit
mocks; production receives no mock responses. Generated-image bytes, IndexedDB
history/comparison/downloads and image refinement are **not implemented**.

M4 is **blocked**: account/access status, current model/free-plan eligibility,
endpoint topology, supporting-service free allowances and reliable cost bounds
are unknown/unverified. There is no live endpoint, inference dispatch, credentials,
model winner, anonymous-ID issuance, or durable quota ledger. No inference was
performed. See `live-ai-setup.md`; client counters must never stand in for quotas.

M5 is in progress. Consult `requirements-trace.md` for acceptance-specific status;
passing unit/Chromium checks do not establish full conformance, other browser
engines, physical TV/microphone compatibility or accessible photo overlays.

## Engineering decisions

- Breakpoint: 900 CSS pixels. Reserve columns for wide-screen drawers rather than
  covering page controls. On narrow screens, show the drawer above the scrollable
  canvas with a bounded internal scroll area. No whole-page inert/focus trap.
- Initial state preserves the original portfolio until a preset/control is chosen.
  Closing tools preserves an applied theme. Restoring original removes opt-in CSS
  variables/attribute and retains saved profiles. Export requires an applied theme.
- `css-studio:preferences`, schema 2: whitelist tokens and catalog IDs. Schema 1
  migration accepts seasonal `profiles`. This is a defined compatibility format,
  not a claim that an older CSS Studio shipped in this repository.
- Precedence: curated preset + selected appearance, then profile's validated
  manual edits, then contrast protection. Text/link/button labels are repaired
  to at least 4.5:1 against their resolved solid surface. High Contrast protects
  foregrounds/backgrounds without deleting saved edits. Photos still need review.
- Exact same resolver supplies style variables, examples, proposals and CSS export.
  Fonts are installed system stacks; no external font dependency is needed.
- Color transitions on the active canvas exclude color/background to avoid an old
  foreground temporarily becoming unreadable on a new surface during switches.
- Moon: mean synodic period 29.530588853 days, 2000-01-06 18:14 UTC epoch;
  approximate shading with northern-view waxing-right/waning-left orientation.
  Four independently published USNO 2024 primary-phase dates are test fixtures,
  with a 0.04-cycle tolerance. This is not an eclipse/calendar prediction utility.
- Chat is visit-only and bounded to 30 displayed messages/10 context messages;
  prompt 4,000 chars, context entries 2,000 chars, response text 4,000 chars.
  This client contract provides no server authorization or quota guarantee.
- Permissions-Policy changes only microphone from deny-all to self. Camera and
  geolocation remain denied. Microphone recognition still needs user activation
  and browser permission; no speech action sends inference automatically.

## TDD and verification record

The initial theme/lunar suite failed on the absent theme module; implementation
made its 9 cases pass. The initial workspace suite failed on the absent Studio
module. A reset/original-state test caught property precedence reapplying the
active theme; fixing it made workspace tests pass. The real-starter test failed
before adding lazy Examples. The AI contract suite failed before adding its
module. A conflicting text/background test failed before readable-color repair.
The first browser runs exposed exact-label selectors including mutable nested
control text, and a test assuming drawers reset when reopening; role-based
selectors and state-preserving expectations corrected those tests. An axe scan
caught a missing toolbar landmark; a labeled section fixes that finding. Final
review added a failing seasonal-identity test: dark High Contrast had used one
uniform accent. Its protected bright accents now retain each preset hue. Mobile
screenshot review also caught tooltip text inheriting the canvas foreground; the
tooltip now explicitly preserves its white text on a dark surface.

Commands use the temporary Node tool without changing repository dependencies:

```sh
npm exec --offline --cache /workspace/.npm-cache --package=node@22.22.2 -- npm test
npm exec --offline --cache /workspace/.npm-cache --package=node@22.22.2 -- npm run build
npm exec --offline --cache /workspace/.npm-cache --package=node@22.22.2 -- npm run check:page-builder
npm exec --offline --cache /workspace/.npm-cache --package=node@22.22.2 -- npm run check:page-builder:build
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm exec --offline --cache /workspace/.npm-cache --package=node@22.22.2 -- npm run test:e2e -- e2e/css-studio.spec.js e2e/page-builder.spec.js --project=chromium --workers=1 --retries=0
```

The browser executable override is an environment-specific test-tool selector.
CI can use its standard installed browser builds. Final results are recorded in
`verification.md`. Intermediate screenshots/reports are local test artifacts.
No production deployment or merge into main is authorized by this task.
