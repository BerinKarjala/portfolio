# Private production session proof

Passed October 21, 2026 in [run 39627226949](https://github.com/BerinKarjala/portfolio/actions/runs/39627226949)
from source `a79c818ce53f600b6626e1785899d5c566ac03f2`, based on feature
commit `28ddcb1`. Its 113 local-boundary tests and three actual workerd tests
passed before deployment. The inference step was skipped. Real Chromium verified
identity/cookie reuse, reload and untrusted-Origin rejection while ten prompts,
three image slots and 2,000 shared Neurons stayed unchanged. Identity and quota
namespace were preserved; public inference stayed unavailable before/after.
See the [safe retained result](production-session-result-2026-10-21.json).

This isolated `css-studio-production-check` branch starts at `28ddcb1` and pins
the existing proxy helper to `https://berinkarjala.netlify.app`. The export name
`PROXY_PREVIEW` remains for compatibility with the existing deploy/check code;
its value on this branch is the fixed production origin.

After review, the existing **CSS Studio private canary** workflow can be
dispatched on this branch with input `check=proxy`. That selects
`scripts/deploy-css-studio-proxy.mjs`, whose default check uses only status and
session routes. No workflow modification is needed. The `theme` option invokes
a different inference check and is outside this proof.

The deployment requires the existing identity secret and quota namespace,
dry-runs the locked Worker CLI, rotates only the private canary gate, and verifies
the same namespace plus fixed origins afterward. The config keeps the same
Worker/account, AI/QUOTA bindings and v1 SQLite migration, with no Images binding.
No Netlify deployment or public AI activation is performed.

The browser verifies public unavailability before/after, the production host's
Secure/HttpOnly/SameSite=Strict cookie, script exclusion, session reuse, reload
persistence and unchanged counters. A request from untrusted `https://example.com`
must have the expected Origin and no cookie, then receive the exact backend 403
without Set-Cookie. Intercepted Fetch Metadata may be absent; it is logged as an
allowlisted category and forwarded only when observed. The proof makes no claim
about metadata added later on the browser's wire request.

The shared daily ceiling stays at 8,000 Neurons. Local fixtures verify the current
2,000 remaining balance stays unchanged; the live proof compares its actual
before/after snapshot and never submits a proposal, resets allowance or refunds
an earlier reservation. All target URLs remain fixed literals. No credentials,
cookie values, traces or screenshots are retained.
