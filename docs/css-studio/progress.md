# CSS Studio development progress

Updated: October 21, 2026 (America/New_York). Branch: `css-studio`.

## Current position

The manual Studio, supplied asset catalog, generated-image client workflows and
durable server boundary are implemented. The private Llama text canary is deployed
and passed two actual model requests. One private GPT fixture then passed in
827 ms; its retained 4,000 reservation leaves 2,000 shared Neurons on October 21
UTC. Real preview identity/cookie reuse/reload and the deliberate untrusted-origin
Chromium check passed; the latter preserved all counters without inference.
Public inference and image/refinement remain disabled. The private production
Chromium session/proxy check also passed without inference or quota changes;
see [its retained proof](production-session-proof.md). Other engines' live proxy
behavior, broader model evaluation and public operational headroom remain open.
M5 fixes cover contrast, enlarged text/reflow and reduced motion; the follow-up at
`cab3636` passed all 78 focused checks across Chromium, Firefox and WebKit.
Klein metadata and an offline adapter/Images normalization pipeline are implemented
with atomic monthly transformation accounting. Actual native local Images tests
now pass generation, owned refinement, corrupt-raster rejection and the private
metadata route. The free metadata-only live check then passed, confirming the
native Images binding and fixed PNG metadata without inference, transformations
or shared quota changes. Billing visibility returned 403; Images Free status and
production decoding/CPU behavior remain unverified. The adapter
is not selected by the Worker. See [the implementation](image-adapter.md) and
[runtime evidence and activation limits](image-runtime-verification.md).
Earlier increment
sections below are chronological records; later entries supersede their status.
The branch also incorporates owner-merged main `8c11250`, preserving the Page
Builder keyboard sensor fix and the metadata-only image-contract helper. The
helper's seven native Node tests run separately from Vitest. The expanded browser
workflow keeps zero retries and has a 25-minute job limit; its previous complete
run took about 19.5 minutes before the added keyboard preflight.
See [model evaluation](model-evaluation.md), [proxy evidence](private-proxy-verification.md)
and [M5 verification](verification-m5.md) for evidence and limits. Reservations
are not measured provider usage; no model winner is established.

The metadata increment passed 433 unit tests, six native Images/SQLite runtime
cases and the production build (382 modules) locally. A subsequent focused
four-case runner test passed after review tightened missing-allowance validation
and removed comparisons between different browser identities. The frontend and
dependencies are unchanged; the earlier three-engine and Page Builder evidence
at `28ddcb1` remains the applicable browser baseline.

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

## M4 owned-media transport increment

Added an encrypted, owner/preset/byte-bound seven-day receipt and bounded multipart
image/refinement protocol. Verification precedes quota admission. The server seam
requires a trusted raster inspector and fixed geometry, steps and cost plan; no
real adapter or provider is configured. The explicit client HTTP adapter handles
session readiness and image uploads without proposal retries. Studio preserves
receipts with cached media and surfaces safe verification errors; portable exports
omit receipts. App still uses unavailableDesigner.

Local verification: 204 tests across 37 files, production build (377 modules),
130 Page Builder decisions/options and 16 mapped gates, and build budgets pass.
The three real workerd checks and Chromium cookie/proxy check also pass. These
runtime checks cover the existing session/accounting foundation, not a live image
provider. See [owned-media.md](owned-media.md) for the new contract and limits.

Chromium regression checks also pass: 17 production Studio tests (including
responsive layouts from phone through 4K) and four actual browser image-storage
and raster-decoder checks. No external inference was performed.

## Cloudflare credential readiness, October 21, 2026

The user created the Cloudflare starter Worker and `AI` binding, confirmed its
account ID/URL as text, and provided Workers Free account evidence. Read-only
GitHub Actions run 39552385317 passes token validity dates, Worker settings/binding
and AI catalogue access. Earlier failures were caused by the token's future TTL
start date, which the user corrected. The helper remains in a separate branch and
draft PR #241; no feature merge or CSS Studio deployment occurred. Twenty local
simulated verification paths pass. See cloudflare-readiness.md for exact evidence
and the remaining live-provider, cost, decoder, durable quota and proxy gates.

## Private text canary, October 21, 2026

Source `faca280` adds the fixed Llama provider and an opt-in private route through
the existing signed identity and durable accounting. The complete provider
payload is capped at 8 KiB before admission, output at 512 generated tokens and
64 KiB transport, and each admitted request retains 1,000 Neurons without usage
refunds. Incomplete/oversized/interrupted provider responses keep the reservation
and halt new work. A real SQLite test verifies that uncertain execution cannot
reopen admission. The cost plan expires October 28 UTC. No flag enables public
inference, and no image provider or paid fallback is configured.

The feature merged latest main `459c951` (Page Builder guided element setup) at
`0813a3d`, with no merge into main. From that source, GitHub Actions run
39558243040 passed 49 server/deployment tests and three workerd checks, deployed
the user's existing Worker, provisioned its initial identity secret and SQLite
quota binding, and completed the two fixed private theme fixtures. Validated
responses took 2,228/2,320 ms, with browser prompt allowance 9/8 and shared
allowance 7,000/6,000. Both retained the full reservation; public status stayed
unavailable. The GPT-OSS metadata projection was retrieved without inference but
does not resolve a total reasoning/output bound, so GPT remains disabled.

Studio now discovers the server's operations only when opened, using fixed
same-origin endpoints and signed-session cookies. Unsupported image operations
are disabled locally; manual controls and draft text remain usable on failure.
The Netlify redirect is prepared before the SPA fallback. The real production
proxy is still unverified and no frontend release was published.

Local checks at `0813a3d`: 283 tests in 45 files, production build (381 modules),
three actual workerd checks, Chromium cookie/proxy simulation, four image-storage
browser checks, all 130 Page Builder decisions/options and 16 mapped gates, and
build budgets pass. The initial complete Studio Chromium run passed 16 of 17
checks and exposed an intermittent example-frame navigation race. FileReader
completed and the iframe's srcDoc contained the generated bytes, while Chromium
sometimes retained the earlier curated document. Source `9a9b904` waits for
inlining before mounting the frame and reports reader failure explicitly. Its new
regression failed before the fix and passes after it; the previously failing
browser case passes eight repetitions, and all 17 Studio Chromium checks pass.
The production build also passes again. No inference was repeated for this fix.

Read-only metadata run 39559393158, source `62537f8` on the separate
`css-studio-model-contract` branch, then retrieved the complete GPT-OSS schema
after seven guard tests. The snapshot is retained with the canary evidence. It
still does not establish a total billable reasoning/output bound, so GPT remains
disabled; this follow-up made no inference, deployment or quota changes.

## Browser CI follow-up

Draft [PR #245](https://github.com/BerinKarjala/portfolio/pull/245) now holds the
feature and a Netlify deploy preview. Server CI passed at `843a2da`. Broader run
39559699491 passed 212 browser checks but exposed five failures and two flaky
Studio checks: a local-only screenshot path, WebKit's response-backed fixture
Blob persistence, a delayed media-query drawer race, and a traversal exceeding
the default 30-second scenario budget. The initial failure remains recorded;
passing local Chromium checks did not establish cross-browser acceptance.

Source `748a7d7` moves screenshots to each test's output directory, materializes
network fixture bytes before direct database seeding, gives the complete
appearance traversal a 90-second budget without changing its assertions, and
reads the current media query when toggling phone drawers. The delayed-query
regression failed before the product fix and passes after it. Product image
storage is unchanged; a new focused CI matrix independently exercises its real
IndexedDB/decoder paths in Chromium, Firefox and WebKit with zero retries. Its
current results are retained in the PR checks, with separate artifacts per engine.

Latest main `9e98f13` was merged into the feature before this follow-up. Local
verification at `748a7d7`: 285 tests across 46 files, production build (381 modules),
requirements/trace gates and build budgets pass. Four targeted Chromium cases
cover generated-image restoration/history and the appearance traversal. The
private Worker remains at its verified deployment source; no further inference,
quota mutation or public activation was performed for these frontend fixes.

## Portable image storage follow-up

Focused run 39562442307 passed all 17 Studio and four storage cases in Chromium
and Firefox with zero retries. WebKit still failed to persist even freshly
materialized Blob records. Its real cache reload and fresh-client checks exposed
the product compatibility issue; the fixture-only change was insufficient.

Source `20752af` stores bounded ArrayBuffer bytes in IndexedDB and reconstructs
the public Blob API at the backend boundary. The database name/version and saved
image IDs remain unchanged. Blob-only legacy records still read and migrate when
validated; asynchronous byte preparation stays outside transactions. Admission,
pins, eviction and writes remain synchronous on fresh transaction rows. A second
guarded transaction updates usage metadata after validation without reviving
evicted images or deleting a concurrently changed record.

Portable rows must have a supported MIME and matching byte length of at most
4 MiB before Blob allocation. Hash and full raster validation still guard reads;
binary backing fields never appear in public metadata or localStorage. The
24-image/96-MiB logical cache limits and denied-storage visit fallback remain.
The browser suite retains its network/canvas Blob inputs and now requires actual
persistence through reload and a fresh third client. A fifth storage case checks
malformed, oversized and wrong-MIME rows without losing valid images.

Local verification at `20752af`: 288 unit/integration tests in 46 files, production
build (381 modules), 12 cache unit cases and five actual Chromium storage cases
pass. The focused CI matrix now covers 66 browser cases (17 Studio + five storage
per engine) with zero retries; final results are linked from PR #245. These are
frontend storage changes, with no additional model calls or quota changes.
