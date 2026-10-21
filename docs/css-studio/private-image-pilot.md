# One private image pilot

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
of this work. The observed live result will be retained after execution.
