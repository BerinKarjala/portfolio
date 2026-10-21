# CSS Studio server boundary

October 21, 2026. The Worker has a deployed private Llama canary, signed browser
identity and one durable quota authority. Public inference and image/refinement
remain unavailable. The browser discovers capabilities through fixed same-origin
endpoints only after Studio opens and retains manual tools on failure. Private
evaluation requires a server-only credential; an environment enable flag cannot
expose inference to visitors.

The GPT-OSS adapter and its whole-context cost proof are preflight work. No new
GPT execution or live proxy result is recorded here. See
[model-evaluation.md](model-evaluation.md) for the exact private scope and
[private-text-canary.md](private-text-canary.md) for the two observed Llama calls.

## Entry point and identity

The entry point is a Cloudflare Worker with one SQLite-backed Durable
Object, named `css-studio-global-v1`, for all visitors, presets and accounting
operations. It is not partitioned by browser, theme family, UTC day or location.
The default Wrangler example disables workers.dev and preview URLs and has no
public inference configuration. The separate private-canary configuration targets
the user's existing `css-studio-ai` Worker with AI and SQLite bindings. Its first
deployment provisioned the missing identity secret and quota namespace; subsequent
deployments must preserve both identity and accounting state.

`APP_ORIGIN` is the exact HTTPS browser origin. `ENDPOINT_ORIGIN` optionally names
a different, fixed Worker backend origin for the same-origin frontend proxy.
The frontend calls relative `/api/css-studio/*` URLs; the proxy must preserve
Origin, Cookie, Sec-Fetch-Site and Set-Cookie, and must not cache API responses.
The Netlify rewrite precedes the SPA fallback. Actual preview proxy/cookie
verification is planned separately; production proxy acceptance is not claimed.
Direct cross-origin
browser access is not offered; there are no CORS response headers. Forwarded-host
headers are not trusted to choose an origin or upstream.

POST requires the configured public Origin, a supported content type, X-CSS-Studio: 1,
and same-origin fetch metadata when present. Unsupported encodings, query strings,
methods and origins are rejected. The API uses no-store and nosniff responses.

A server-only, randomly provisioned 32-byte hex `IDENTITY_SECRET` signs a random
UUID and a seven-day lifetime with HMAC-SHA-256. The `__Host-css-studio` cookie is
Secure, HttpOnly, SameSite=Strict, Path=/, without Domain. Its signature, timestamps,
format and unique cookie occurrence are checked on the server. A valid session
reuses the identity; invalid/missing identity cannot submit a proposal. Rotation
invalidates old cookies but must not reset the shared ledger. An anonymous browser
ID is not a person: clearing cookies can obtain a new browser allowance, while the
single shared ceiling still applies.

## Durable admission and accounting

All state transitions run in `ctx.storage.transactionSync` over normalized SQLite
tables. Counter writes, idempotency admission and the reservation either commit
together or roll back. Indexes bound pending/age/day queries; DO memory and browser
localStorage are not quota authorities. Provider work takes place outside the DO,
after its reservation has committed.

| Rule | Implemented behavior |
| --- | --- |
| Browser/day | At most ten admitted submitted prompts. Image/refinement submissions additionally consume one of three image slots. This conservative interpretation counts an image prompt in both counters; the counters remain separate. Invalid/denied requests do not consume admission; admitted provider failures do. |
| Shared/day | Reserve an integer, conservatively rounded Neuron bound before dispatch; reject when the total would exceed 8,000. Only a server-owned reviewed cost plan supplies the bound. The private Llama plan retains 1,000 per request; the preflight GPT plan retains 4,000 against its documented 3,491 maximum. These are conservative ledger charges, not measured provider usage. |
| Burst / concurrency | Five seconds between new admissions per browser; at most two pending operations across every visitor and day. Retries are checked before burst/counter admission. |
| Idempotency | Bind a browser/request UUID to a SHA-256 fingerprint of canonical input for 72 hours. Pending repeats return 202; completed repeats return 409, without redispatch. Different input with the same key returns 409. Old response content is not stored or replayed. |
| Reliable completion | Trusted adapter measurements can reduce the original day's conservative reservation. Missing usage retains the whole bound. Invalid or above-bound usage latches accounting closed. Model text/client fields are never usage authority. |
| Timeout / uncertainty | Retain the whole reservation; latch all new admission closed, including subsequent days. Expired pending reservations do the same. There is no public reset endpoint or automatic refund. Recovery requires reviewed operator reconciliation. |
| Provider exhaustion | Keep the admission and charge, and stop for its accounting day (also the settlement day if different). No paid fallback is selected. |
| Midnight | Charge browser counters and settle against the UTC admission day. Also hold the full bound in each overlapping UTC day while pending; the settlement-day hold is not refunded. This prevents midnight completion from silently freeing a fresh shared budget. |
| Failure | Storage/admission errors never dispatch. Settlement failure returns unavailable and leaves the durable reservation charged; expiry later closes accounting. |

The ten/three/8,000 ceilings are maximums, not promised availability. Provider or
supporting-service limits can stop earlier. Do not rename the authority, create a
parallel namespace, clear its storage or reset counters while a live route is in
use; evaluations and future deployment contexts must use the same shared authority.

## HTTP and provider contract

- GET `/api/css-studio/status`: unavailable publicly by default; an authenticated,
  ready private route returns supported operations, browser counters and shared
  remainder. Text-only providers expose `theme`, never image/refinement.
- POST `/api/css-studio/session`: empty JSON object; issue/reuse the signed cookie
  only when configuration and the reviewed provider plan are ready.
- POST `/api/css-studio/propose`: server-owned request schema, valid identity and
  atomic admission precede provider dispatch. Public dispatch remains unavailable.
  Image/refinement requires an additional trusted image adapter, decoder/inspector
  and bounded image cost/geometry/step plan. A local generated ID alone is never
  proof of server media ownership. See [owned-media.md](owned-media.md).

JSON bodies are bounded to 96 KiB, 2,048 chunks and five seconds independently of
Content-Length. Prompt length is 4,000 characters; history is at most ten messages
of 2,000 characters each. Only the shipped preset IDs, known appearance/operation
values and exact schema keys are accepted. Client cost, model, endpoint and
remaining-quota fields are rejected. Proposal output accepts only bounded message
text and safe color/font/radius tokens, never selectors, HTML fields, CSS source,
URLs or generated references nominated by the model.

Ordinary providers retain the 512-output-token ceiling and a timeout no longer
than 25 seconds. The private GPT exception requires the exact
`@cf/openai/gpt-oss-20b` identity, its 128,000-token context declaration and every
field of the fixed reviewed plan: 4,000 Neurons, 18 seconds and expiration at
`2026-10-28T00:00:00Z`. Its internal `maxOutputTokens: 128000` denotes the
conservative whole-context ceiling, not a requested or verified visible-output
parameter. It does not relax the ordinary ceiling for other models or accept
client-selected policy. Cloudflare defines context to include input, reasoning
and completion; the complete proof and official references are in
[model-evaluation.md](model-evaluation.md).

Both private text adapters bound complete serialized input to 8 KiB and raw
non-streaming output to 64 KiB. GPT uses one native `AI.run` with low reasoning
effort and no tools, batch, continuation loop, inference retry, AI Gateway or
fallback. It accepts only one completed assistant message after ignoring reasoning
items, then applies the existing safe-token validator. Neither adapter reports
trusted measured usage, so successful or invalid-output requests retain their
entire reservation. Byte/time bounds do not establish that remote computation
stopped; uncertain outcomes retain the charge and close admission.

The plan expires and must remain valid through the reservation window. An
expired admission never dispatches. Provider exceptions are redacted; no full
prompts, transcripts, model results, secret values or signed cookies are logged.
Ledger tables retain pseudonymous UUIDs, fingerprints, operation/status, counters,
integer costs and timestamps. Request records expire after 72 hours; UTC aggregate
rows can remain up to four days. Unresolved accounting retains its record/day
until reviewed. It stores no prompt, chat, image bytes or response content.

## Verification and activation limits

`npm test -- server/css-studio` tests actual SQLite through Node 22's experimental
node:sqlite driver. `npm run test:css-studio:server` runs the same authority inside
Miniflare/workerd, including simultaneous admission and a full persistent-runtime
restart. `npm run test:css-studio:server:browser` uses Chromium, real cookie rules
and a proxy simulation against the local Worker fixture. The simulation is not a
live Netlify deployment. Dedicated CI and the earlier private deployment have
run; consult their source-specific records rather than treating fixtures as live
model evidence.
Miniflare 4.20260730.0 is pinned as a development-only dependency; existing locked
package records/versions are unchanged. Native binaries are local test tooling,
not browser bundles.

The observed October 21 canary accepted the Free-account bindings and two Llama
requests, retained 2,000 Neurons and reported 6,000 shared Neurons remaining. It
does not establish measured billing, a model winner, public-traffic supporting
headroom or new GPT/proxy results. The prepared evaluator verifies private proxy
session/cookie behavior before admitting at most one fixed GPT Winter fixture
through the same authority; it does not reset counters or retry inference.

Public activation remains blocked on reviewed comparative results, actual
same-origin proxy evidence, supporting-service headroom and operational review.
Image/refinement additionally needs an approved editing contract, conservative
costs, complete raster validation and Free Worker feasibility. Schnell's limits
do not rule out every newer image model; current image research has made no live
image call. The full photo/cultural and physical-device checks also remain open.
See cloudflare-readiness.md, model-evaluation.md and live-ai-setup.md.
