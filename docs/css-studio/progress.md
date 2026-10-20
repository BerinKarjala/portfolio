# CSS Studio development progress

Date: October 20, 2026 (America/New_York). Branch: `css-studio`.

## Baseline and source priority

The user's pasted 24-point development request governs this work. The attached
v2.2 specification, decision record, and four implementation guides are project
context used within that request. The unrelated maintenance recovery attachment
was not executed. Unmodified supplied documents are retained under `handoff/`;
all seven Markdown files match their entries in the supplied SHA-256 manifest.
The manifest describes the original delivery, not files actually available here.
The large ZIP initially could not be transferred (32 MiB tool limit). The user
subsequently supplied the connected Google Drive handoff folder; its catalog,
photos, thumbnails and notices have now been downloaded and integrated. See the
M2 update below for evidence.

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
The exact supplied 248-photo catalog is now integrated with automatic matching,
manual selections, attribution, bounded lazy thumbnails, selected backgrounds and
portable exports. Backgrounds also support a solid-fill choice. Full cross-browser,
device and per-appearance photo/crop accessibility review remains incomplete;
metadata verification is not a legal clearance claim.

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

## M2 update — connected Drive library

The user supplied `My Drive/CSS_Studio_Codex_Handoff` and explicitly instructed
continuation. Source folder: https://drive.google.com/drive/folders/1HJuK5FAA8RTOnMXBD9HrP-grY-UdgKxF.
Drive was read only; no sharing, organization or source files were changed.
All 248 samples and 248 thumbnails were materialized through authenticated Drive
file references. Catalog, ATTRIBUTION.md and standalone index.html match the
original handoff manifest hashes. Four original contact sheets are included.

`public/css-studio/` owns the complete local library (approximately 97 MiB). Its
bytes are static assets rather than JavaScript embeds. A small index supplies
trusted IDs/paths; full credit metadata and picker code load on demand. The picker
shows 12 thumbnails per page, uses native lazy images, and supports matching/all,
season, kind and title/holiday search. Only the selected full sample loads.

Seasonal auto-selection uses wilderness on every ordinary day, including the
adopted weekend fallback. Holidays match explicit tags across all seasons; there
is no date/locale inference. Manual `backgroundId` fields are validated and saved
per existing schema-2 profile (optional backward-compatible field). `none` means
solid fill; absence means automatic matching. Reset/Undo uses the same profile
path. A failed manual photo falls back without erasing its saved ID; two failed
loads in one selection context stop image attempts and retain the solid palette.

The resolver provides the same selected image/design values to canvas, examples
and exports. Runtime image paths begin `/css-studio/`; copying/downloading CSS
normalizes that base to `./css-studio/` for portability, leaving the selected
relative file and all color/font/button values unchanged. A theme ZIP includes
styles.css, selected WebP bytes and the full matching CREDITS.json. Downloaded
bytes must match the catalog SHA-256, WebP type and a 4 MiB bound. This separate
binary ZIP utility reuses the existing CRC helper without weakening Page Builder's
strict two-file export contract. No generated-image persistence is implied.

Photo credits retain creator, source, license, original resolution, modification
notes and additional rights restrictions. `spring-55` and `summer-51` carry
`personality` notes. Eleven source license URLs use legacy HTTP and are preserved;
credit validation permits HTTP(S) links while rejecting unsupported URL schemes.
A browser regression caught the initial overly strict HTTPS-only metadata guard;
allowing the supplied legacy license links restores credits/downloads.

TDD evidence: background-selection tests failed before backgrounds.js existed;
the photo-picker behavior test failed before its entry point was implemented.
Binary archive tests verify exact selected bytes, relative CSS and matching
credits, and reject corrupted bytes. Chromium tests cover tag precedence, lazy
loading, no inference requests, retained manual images after reload, actual ZIP
downloads, missing-photo fallback and standalone catalog filters.

`python scripts/check-css-studio-assets.py` decodes all 496 WebP files and verifies
paths, dimensions, hashes, unique original/sample identity metadata, 62 per season,
50/12 split and complete attribution fields. Contact sheets for all four seasons
were reviewed, plus actual Winter canvas/picker crops at 390, 1440 and 3840 px.
Opaque text/control surfaces protect readability; these representative checks do
not establish all-photo/all-appearance or physical-device conformance.

## M3 increment: generated-image storage foundation

Implemented an independently tested storage module, not a visible generated-image
feature. `imageCache.js` provides save/list/get/remove with IndexedDB transactions,
24-image/96-MiB limits, 4-MiB raster-image admission and least-recently-used eviction.
The caller supplies protected IDs from saved profiles, Undo, pending proposals and
comparison state; callbacks are evaluated inside the write transaction. The Studio
caller and these pins are not yet wired. Full protected storage rejects admission
without removing protected bytes. Writes are serialized, including independent
clients using the same IndexedDB store.

Records store bytes, dimensions, MIME, SHA-256, preset/appearance context,
timestamps and optional parent ID. Saves do not persist prompts, chat, remote URLs
or object URLs. The companion media module checks raster header dimensions before
calling a browser decoder, bounds images to 64–2048 px per side, and compares
actual decoded dimensions. Restoring bytes checks dimensions and SHA-256 again;
damaged records are removed. Browser storage failure switches to a bounded
in-memory mirror and returns an explicit visit-only warning for the future UI.

Eight unit tests pass, including two initial failing tests before implementation.
Four Chromium tests use actual IndexedDB, browser raster decoding and module imports
from a separate Vite test server. They verify reload, exact digest/byte length,
pinned eviction, corrupt-data recovery, denied-storage fallback and independent
client transaction ordering. No production test route or mock provider was added.
See verification-m3-storage.md for exact commands and scope limits.

Next work is to connect validated image proposals and generated IDs to the existing
explicit Apply flow and shared resolver, then add history, comparison and portable
downloads. AC-31 remains partial. No inference, deployment, push or merge into main
was performed in this increment.

## M3 increment: client image workflow

Connected the bounded cache to StudioProvider, including saved-ID restoration,
per-preset resolver ownership, preview/Apply, refinement context, history,
two-image comparison, selected-image protection, byte downloads and portable
exports. New generated profiles use the existing optional schema-2 backgroundId;
Blobs and object URLs remain outside localStorage. Only locally created URLs are
used for runtime display, and they are revoked on removal/eviction/unmount.

Image-only responses now pass through the adapter contract and raster validation
before a proposal is shown. Exact request/preset/appearance checks remain inside
Apply; refinement also checks the original base image. Old canceled responses do
not paint the canvas. History choices check the current preset again after loading.
Full protected capacity preserves a downloadable preview, disables Apply, and lets
the user free space and retry saving without another provider request. Denied
storage keeps a bounded visit session with warnings and falls back after its bytes
are lost. Current selections, all other saved presets, active Undo and comparison
images are protected from deletion/eviction.

The same resolver now supplies generated images to the live canvas, real Page
Builder examples and CSS export. Only the examples-specific CSP adds inline raster data images;
Page Builder's compiler and scriptless preview sandbox are unchanged. A browser
decode regression caught that blob URLs resolve in CSS but cannot decode from
the opaque iframe origin. The example now embeds only the selected validated
raster bytes as an ephemeral data URL; canvas object URLs and portable file paths
retain their existing roles. Portable
ZIPs verify and include exact cached bytes with GENERATED_IMAGE.json and relative
paths; no visit URLs or chat are exported. Existing curated credit/license exports
are preserved. image-proposal-contract.md documents the adapter and data boundary.

Tests inject actual local raster fixture bytes, not a live provider. Browser seeds
are explicit test setup, not public generator functionality. Production inference
remains disabled. Account/free-tier eligibility, identity, durable shared quotas,
provider comparison and physical/other-browser acceptance still remain. Full
commands, source commit and scope limits are recorded in verification-m3.md.

## M4 increment: disabled server boundary and durable quota authority

Source commit `e9bd317` adds a Cloudflare Worker boundary, signed browser identity,
server-owned schemas and one transactional SQLite Durable Object for global
admission. Miniflare/workerd tests exercise actual storage concurrency, persistence
through a full runtime restart, cookie sessions and the disabled production entry.
Chromium additionally checks real HttpOnly/host/Strict cookie behavior and a
same-origin frontend-proxy simulation. The frontend designer remains unavailable;
there is no AI binding, live provider, deployed endpoint or media-ownership path.

The authority atomically reserves browser allowance and a server-owned conservative
Neuron bound before dispatch. Adopted ceilings remain three images/refinements,
ten prompts and 8,000 shared Neurons per UTC day. The current conservative counter
interpretation counts image/refinement submissions in both counters. It is explicit
and revisable. Burst protection, two global pending slots, canonical-input
idempotency, delayed-response accounting, rollback, provider exhaustion, trusted
usage reconciliation and conservative cross-midnight holds are implemented.
Unknown execution or a violated cost bound keeps the charge and latches new work
closed until reviewed reconciliation; there is no automatic reset/refund endpoint.

Current official Cloudflare documentation source was checked: Workers Free permits
SQLite-backed Durable Objects and describes hard free-limit failures; Workers AI
lists a 10,000-Neuron daily allocation. This supports the local design choice but
does not establish this account's eligibility, real model terms/costs, operational
billing allowances or a live deployment. See cloudflare-readiness.md. No existing
account, credentials or paid plan were assumed or provisioned.

Miniflare 4.20260730.0 is an exact development dependency for real runtime tests.
Existing lockfile package records/versions are unchanged. Offline npm ci succeeds;
all 196 unit/integration tests, three workerd runtime tests, one browser boundary
test, 17 existing Studio browser checks, build and Page Builder gates pass.
A dedicated CI workflow is included; remote CI has not run. Browser bundles retain
the same frontend hashes and contain no server bindings/authority/internal route.

The next work requires actual Free-plan account evidence, verified model bounds,
owned server media handling and a real same-origin proxy before any provider is
wired or enabled. AC-30/33–37/42 are partial, not completed live acceptance. No
push, deployment, inference, account mutation or merge into main was performed.
