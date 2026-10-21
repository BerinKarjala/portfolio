# Private text-provider canary

October 21, 2026. This increment deploys a private Cloudflare evaluation endpoint.
It does not enable public inference or claim the v2.2 release is complete.

## Observed deployment

[GitHub Actions run 39558243040](https://github.com/BerinKarjala/portfolio/actions/runs/39558243040)
passed from source `0813a3d7719544f9a94d4d615300c9823770ab0c` on the
`css-studio-canary` branch. It installed the locked dependencies, passed 49
server/deployment tests and three actual workerd checks, provisioned the initial
identity secret, and deployed the Worker with SQLite quota and AI bindings.
No Workers Paid upgrade or payment configuration was performed.

The two fixed fixtures passed safe-token validation on October 21 UTC:

| Fixture                     | End-to-end latency | Prompt allowance after | Shared allowance after |
| --------------------------- | -----------------: | ---------------------: | ---------------------: |
| Winter, dark, high contrast |           2,228 ms |                      9 |          7,000 Neurons |
| Diwali, light               |           2,320 ms |                      8 |          6,000 Neurons |

Each retained its full 1,000-Neuron reservation. These are application-ledger
charges, not measured Cloudflare usage or a semantic quality benchmark. Public
status remained unavailable before and after. The private session cookie was
verified as Secure, HttpOnly, SameSite=Strict, Path=/, with no Domain attribute.
This establishes a direct Worker integration. The later
[real Netlify identity and scoped cross-site Chromium check](private-proxy-verification.md)
passed; production proxy acceptance remains open. No credentials were logged.

The initial GPT-OSS projection was followed by the complete public input/output
schema in [metadata-only run 39559393158](https://github.com/BerinKarjala/portfolio/actions/runs/39559393158),
source `62537f8` on `css-studio-model-contract`. Its seven guard tests and one
fixed GET passed without inference, deployment or quota changes. The complete
[schema snapshot](gpt-oss-schema-contract-2026-10-21.json) contains chat
`messages`/`max_tokens` and Responses `input`/`reasoning` alternatives. Responses
does not declare `max_output_tokens`, states that reasoning cannot be disabled,
and returns only a generic output-object contract. The schema does not establish
whether chat `max_tokens` caps all billable reasoning as well as visible output.
At that metadata-only stage GPT-OSS inference remained blocked on a documented
total bound. The later [whole-context proof](model-evaluation.md) uses Cloudflare's
combined input/reasoning/completion definition and 128,000-token GPT context to
bound one native generation at 3,491 Neurons, with a retained 4,000 reservation.
The subsequent [private GPT evaluation](model-evaluation.md) passed one Winter
fixture in 827 ms, retained 4,000 Neurons and left 2,000 shared Neurons. Its
safe tokens/metrics artifact is retained; no image inference or winner is claimed.

## Fixed bounds and remaining gates

The fixed text model is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Its reviewed
pricing is 26,668 input and 204,805 output Neurons per million tokens. Using its
entire published 24,000-token context plus a 512-token output ceiling costs at
most `ceil((24000*26668 + 512*204805)/1000000) = 745` Neurons. Each admitted
request reserves and retains 1,000 Neurons; generated usage fields never refund
that charge. The system prompt, request/context/history, schema and wire framing
are additionally bounded to 8 KiB. Output is non-streaming JSON mode, bounded to
64 KiB on the wire, and independently validated against the safe theme tokens.
The reviewed plan expires October 27, 2026 at 8 PM America/New_York (October 28,
00:00 UTC); expiration makes the route unavailable rather than refreshing itself.

Official references checked:

- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Fixed Llama model](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/)
- [JSON mode](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [Binding implementation](https://github.com/cloudflare/workerd/blob/main/src/cloudflare/internal/ai-api.ts)
- [Free Worker limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)

`wrangler.canary.toml` targets only the user's existing `css-studio-ai` Worker,
its AI binding and one SQLite `QuotaAuthority`. The existing identity secret and
quota namespace are preserved across deployments. An initial identity secret is
provisioned only when absent. A freshly generated private canary credential is
rotated for evaluation; it is never sent to the browser build or printed. The
normal public request path remains unavailable even when every binding exists.
There is no environment flag that turns this into public inference.

The canary workflow validates tests and bundle construction before changing
secrets or deploying. It permits at most two fixed theme submissions per run,
through the same signed-session and durable admission path as future visitors.
They reserve at most 2,000 Neurons, count against browser prompt allowances and
the existing shared 8,000-Neuron UTC-day ceiling, and are separated by the burst
interval. There are no inference retries, accounting resets or automatic refunds.
The private credential itself authorizes the normal quota path; the two-call
restriction belongs to the test runner, while the durable shared ceiling applies
to all requests. Evaluation refuses to start close to UTC midnight or without
allowance for both fixtures. Ambiguous response/transport failures retain the
reservation and close new admission pending reviewed reconciliation.

The deployment workflow also reads a public GPT-OSS model-schema projection
without running that model; the separate metadata-only workflow preserves the
full result. The observed schema and generated binding types do not establish a
separate reasoning/output request cap. The subsequent
[model evaluation](model-evaluation.md) instead bounds the entire native
GPT generation using the published context and maximum token price. That exact
private plan expires October 28 at 00:00 UTC and permits no retry, tools, batch,
gateway or fallback. Its one successful integration fixture is recorded there. Llama remains
a canary candidate; fixed-fixture schema validity and latency provide integration
evidence while broader comparison and production acceptance remain open.

Image/refinement stays unavailable. The published FLUX.1 Schnell schema offers
prompt and step controls without a saved-image input or fixed width/height, so
it cannot establish the current refinement/geometry contract. That is a finding
about Schnell, not every image model. Newly documented Klein 4B and Images Free
paths are under contract/account/runtime review, with no image inference run.
A suitable approved editing model, conservative costs, complete raster decoder
and actual Free Worker CPU feasibility are required before that lane can be
enabled.

The browser connects to fixed same-origin endpoints only after the visitor opens
Studio, with manual fallback on failure. It follows session creation with a fresh
status read and exposes only server-supported operations. The Netlify proxy rule
precedes the SPA fallback. Actual preview identity/cookie reuse/reload passed;
the scoped live cross-site Chromium check passed, while production acceptance
remains open. No canary secret is
shipped in the frontend. Public activation also requires reviewed comparative
evaluation, Free supporting-service headroom and deployment evidence.
