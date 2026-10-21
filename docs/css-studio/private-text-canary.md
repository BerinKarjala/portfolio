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

| Fixture | End-to-end latency | Prompt allowance after | Shared allowance after |
| --- | ---: | ---: | ---: |
| Winter, dark, high contrast | 2,228 ms | 9 | 7,000 Neurons |
| Diwali, light | 2,320 ms | 8 | 6,000 Neurons |

Each retained its full 1,000-Neuron reservation. These are application-ledger
charges, not measured Cloudflare usage or a semantic quality benchmark. Public
status remained unavailable before and after. The private session cookie was
verified as Secure, HttpOnly, SameSite=Strict, Path=/, with no Domain attribute.
This establishes a direct Worker integration; Netlify's real proxy remains a
separate acceptance gate. No proposal contents or credentials were logged.

The read-only [GPT-OSS schema projection](gpt-oss-schema-contract-2026-10-21.json)
contains chat `messages`/`max_tokens` and Responses `input`/`reasoning` alternatives,
but does not expose an explicit Responses total-output cap. GPT-OSS inference
therefore remains blocked on a documented total reasoning/output bound. No GPT
or image inference was performed, and no comparative model winner is claimed.

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

The workflow also reads a public GPT-OSS model-schema contract without running
that model. Current generic model documentation and generated binding types
expose different request shapes, so its exact output/total-reasoning cap must be
verified before comparative inference. Llama is a canary candidate, not a declared
benchmark winner. Fixed fixtures, schema/value validity and latency provide local
integration evidence; broader comparison and production acceptance remain open.

Image/refinement stays unavailable. The published FLUX.1 Schnell schema offers
prompt and step controls without a saved-image input or fixed width/height, so
it cannot establish the current refinement/geometry contract. A suitable approved
editing model, conservative costs, complete raster decoder and actual Free Worker
CPU feasibility are required before that lane can be enabled.

The browser connects to fixed same-origin endpoints only after the visitor opens
Studio, with manual fallback on failure. It follows session creation with a fresh
status read and exposes only server-supported operations. The Netlify proxy rule
is prepared before the SPA fallback; its actual proxy/cookie behavior must still
be verified after a separate frontend deployment. No canary secret is shipped in
that frontend. Public activation also requires reviewed model evaluation, free
supporting-service headroom and deployment evidence.
