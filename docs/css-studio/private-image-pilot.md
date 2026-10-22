# One private image pilot

## Observed result

[Run 39676838032](https://github.com/BerinKarjala/portfolio/actions/runs/39676838032)
from `c73bffb426f4f193d445fcbac54222289015da26` submitted one proposal and
received HTTP 504. No image completion, full production decoding or CPU budget
was verified. The [exact safe result](image-pilot-result-2026-10-21.json) records
19,544 ms total elapsed time, including setup and post-checks. This is consistent
with the existing 18-second request deadline, but does not distinguish the
upstream cause or establish CPU exhaustion.

The same visitor's prompts changed 10 → 9 and image slots 3 → 2. Shared Neurons
changed 2,000 → 1,500, and monthly application transformation reservations
5,000 → 4,999. These are retained reservations, not measured provider billing.
No generation retry, refund, quota reset or reconciliation was performed.
Public inference remained unavailable. No PNG was retained or quality-approved.

All 248 preflight boundary/helper cases and three native SQLite cases passed;
the preserving deployment and full Chromium proxy proof passed before the
proposal. The theme and metadata inference-free options were skipped. After
writing the failure result, the process stayed open until the job's 15-minute
timeout; the always-run artifact step preserved the JSON. GitHub's final workflow
conclusion is `cancelled` after that timeout; the image check failed.

A separate shutdown defect was reproduced and fixed at `ed9c4c9`: native Node
WebSocket CLOSE can wait on the peer indefinitely. The existing pinned `ws`
client now supplies a forced termination after bounded tail cleanup. All 55
focused runner/trace cases passed, and a real loopback Node 22.22.2 peer that
ignored CLOSE confirmed process exit in 5.1 seconds. This does not prove the
image failure's cause. Missing CPU data remains unavailable.

The new explicit `check=image-status` / `--status-only` path issues no proposal,
creates no tail and does not require a successful inference-readiness browser
proof. It reads the actual private quota even when admission is halted, while
preserving deployment identity/namespace and public unavailability. Its separate
`status.json` cannot overwrite the failed image result. An unrecognized CLI mode
fails before deployment. The ordinary image mode retains its complete browser
proof and single-proposal limit. A red-first halted-ledger case verifies no
proposal or trace; all 56 combined runner/trace tests pass afterward.

## Quota inspection after the failure

[Run 39694420073](https://github.com/BerinKarjala/portfolio/actions/runs/39694420073)
at `75e89a1fd54dbcb2255611b3aa44545942fc4175` passed the explicit `image-status`
mode. The [retained status](image-quota-status-2026-10-21.json), observed at
23:36:28.663 UTC on October 21, records zero proposals, admission unavailable,
1,500 shared Neurons and 4,999 monthly application transformation slots. Public
inference remained unavailable. No CPU measurement or model completion is claimed.
The workflow skipped every model-producing step and did not create a tail.

The new signed visitor had ten prompts and three image slots. Those are that new
visitor's counters; they do not refund the failed request's original visitor,
whose retained result records nine prompts and two image slots. The existing
identity secret, quota namespace and shared reservations were preserved.

Admission being unavailable is consistent with the conservative uncertainty
halt; the status response does not expose the control reason. Source review
confirms that `accounting-uncertain` persists across UTC day rollover, even when
daily counters refresh. No reconciliation, refund, reset or further proposal was
performed. A day change alone does not authorize another model request.

## Private failure diagnostics

The follow-up adds local, fixed-phase diagnostics for future admitted private
image/refinement requests. The existing secret and exact image header must select
the Worker configuration, and `createApp` must receive `diagnostics === true`.
Public and text responses omit the projection; request flags cannot enable it.

The error diagnostic can contain only the validated request ID, last phase
(`provider`, `response-body`, `raster`, `normalize` or `receipt`), a fixed failure
category, elapsed wall milliseconds and the configured request deadline. A typed
deadline error is recorded before signaling abort, so a provider's abort handler
cannot replace it with an ordinary operation failure. Late callbacks/completion
cannot change the terminal projection or cause a second settlement.

The pilot runner reads at most 2 KiB for one second, accepts only that exact field
set for its submitted request ID and matching HTTP status, and retains the safe
projection as `failureDiagnostic`. Invalid, oversized, stalled or unrelated
responses leave the diagnostic unavailable. Error text, provider bodies, prompts,
credentials and receipts are never retained. The existing 18-second request
deadline and all quota/settlement rules are unchanged.

This increment is verified with local fixtures; it has not been deployed or used
for another model call. It does not retrospectively identify the original HTTP
504's cause, prove upstream cancellation, or measure Worker CPU/memory.

## Plan evidence

October 21, 2026. The user's earlier complete Billing → Subscriptions screenshot
showed only Workers Free and no payment method. No subsequent billing changes
were performed or reported. Cloudflare documents default Images Free until a Paid
subscription is purchased, so this existing evidence is sufficient for a bounded
private test. It does not require another billing-navigation loop. See the
[explicit plan-evidence basis](image-free-evidence-2026-10-21.json).

The latest user screenshot shows 0 / 5,000 unique transformations on the Zones
page. Both Free and Paid include 5,000; that counter cannot identify the plan by
itself, and its coverage of binding usage has not been established. The raw-byte
Images Worker binding requires no zone, DNS migration or subscription change.
The prior API result remains truthfully unknown/403; it has not been rewritten
as an API-confirmed Free plan.

## Scope and admission

The Worker selects Klein only when the existing private canary secret is valid
and `X-CSS-Studio-Canary-Image` is exactly `klein-4b`, with an approved text
provider configuration and available native Images binding. Public and ordinary
private text requests retain their previous operations. The exact image gate
also enables a private status diagnostic for the remaining monthly application
transformations; request query parameters cannot turn it on.

The manually selected workflow input `check=image` runs one fixed winter-forest
generation. It runs the complete private Chromium session/foreign-Origin proof
first, then uses a fresh signed identity for one fixed Worker proposal. It
requires current readiness, daily and monthly headroom, the reviewed image plan
and distance from UTC midnight. It never retries generation or submits a second
fixture/refinement. The unchanged SQLite authority must retain 500 Neurons, one
prompt slot, one image slot and one monthly transformation. Existing identity,
namespace, reservations and public unavailability are preserved.

The runner bounds the multipart response, requires its request ID and receipt
contract, and independently fully decodes the returned still 512×512 PNG with
the existing pinned local Sharp dependency. Only the PNG and safe metadata are
retained. Cookie values, receipts, credentials, provider responses and tail
frames are never written to artifacts or logs. A submitted failure is recorded
without retry or inferred refunds. Public availability is checked afterward
even when private status or image validation fails; unknown results stay unknown.

## Resource changes and telemetry

Klein base64 decoding now checks decoded length before allocation and uses
native `Uint8Array.fromBase64` when available. The existing fallback and unused
padding-bit acceptance are preserved. Actual local workerd tests exercise the
real native built-in, with full PNG decode/re-encode afterward. JPEG header
inspection bounds both marker steps (2,048) and aggregate repeated fill bytes
(4,096). Unusually complex valid JPEGs can be rejected conservatively.

An optional transient Cloudflare tail correlates only the proposal's fixed
Worker route and non-secret request UUID. The existing Workers Scripts Edit
permission can create/delete a tail; no wider token scope is requested. Only
actual integer CPU/wall timings are projected when the provider includes them.
Missing, ambiguous, truncated or invalid measurements remain unavailable; local
elapsed time never substitutes for billed CPU. The socket is closed and the
tail deleted after the attempt. Setup failure does not cause a generation retry.

This single pilot cannot establish the largest accepted response's CPU/memory
budget, production refinement, model-quality comparison or public release
readiness. The private image plan still expires October 28 UTC. Public image
generation remains disabled, and no paid upgrade or zone configuration is part
of this work. Further model execution must respect the durable uncertainty halt;
status inspection does not reopen admission.
