# M4 server boundary foundation

This source is implemented and locally tested, but is not deployed or connected
to the browser designer. `server/css-studio/worker.js` contains no AI binding,
provider implementation, model selection or environment enable flag. The public
browser still uses unavailableDesigner. Tests inject a local provider fixture;
no test can make an external provider request.

## Entry point and identity

The proposed entry point is a Cloudflare Worker with one SQLite-backed Durable
Object, named `css-studio-global-v1`, for all visitors, presets and accounting
operations. It is not partitioned by browser, theme family, UTC day or location.
The example Wrangler configuration disables workers.dev and preview URLs and
contains no production route or secrets. No Cloudflare resources were created.

`APP_ORIGIN` is the exact HTTPS browser origin. `ENDPOINT_ORIGIN` optionally names
a different, fixed Worker backend origin for a future same-origin frontend proxy.
The frontend would call relative `/api/css-studio/*` URLs; the proxy must preserve
Origin, Cookie, Sec-Fetch-Site and Set-Cookie, and must not cache API responses.
No production Netlify proxy has been configured or verified. Direct cross-origin
browser access is not offered; there are no CORS response headers. Forwarded-host
headers are not trusted to choose an origin or upstream.

POST requires the configured public Origin, JSON content type, X-CSS-Studio: 1,
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
| Shared/day | Reserve an integer, conservatively rounded Neuron bound before dispatch; reject when the total would exceed 8,000. Only a server-owned verified cost plan can supply the bound. Current plan values in tests are fixtures, not verified model costs. |
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

- GET `/api/css-studio/status`: unavailable by default; an active test-injected
  route returns the authenticated browser's counters and shared remainder.
- POST `/api/css-studio/session`: empty JSON object; issue/reuse the signed cookie
  only when configuration and the injected provider plan are ready.
- POST `/api/css-studio/propose`: server-owned request schema, valid identity and
  atomic admission precede provider dispatch. Production always returns unavailable.
  Image/refinement dispatch remains unavailable even in the injected theme route:
  a local generated ID is not proof of server media ownership.

Bodies are bounded to 96 KiB, 2,048 chunks and five seconds independently of
Content-Length. Prompt length is 4,000 characters; history is at most ten messages
of 2,000 characters each. Only the shipped preset IDs, known appearance/operation
values and exact schema keys are accepted. Client cost, model, endpoint and
remaining-quota fields are rejected. Proposal output accepts only bounded message
text and safe color/font/radius tokens, never selectors, HTML fields, CSS source,
URLs or generated references nominated by the model.

The internal provider seam receives at most 512 output tokens and a timeout no
longer than 25 seconds. An approved future adapter must enforce fixed models,
actual input/output wire bounds, reliable usage conversion and trusted media
ownership. The plan expires and must remain valid through the reservation window.
An expired admission never dispatches. Provider exceptions are redacted; no full
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
live Netlify deployment. A dedicated CI workflow is added; remote CI has not run.
Miniflare 4.20260730.0 is pinned as a development-only dependency; existing locked
package records/versions are unchanged. Native binaries are local test tooling,
not browser bundles.

Activation remains blocked on actual Cloudflare account/Free-plan eligibility,
current model availability/terms and conservative costs, supporting-service usage
measurement, an owned-media path, a verified same-origin proxy, live model tests,
and public-route operational review. No AI binding should be added to the example
configuration before those gates pass. See cloudflare-readiness.md and live-ai-setup.md.
