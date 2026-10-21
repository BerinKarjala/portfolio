# Live AI prerequisite checklist

Live AI is disabled in the shipped browser: `unavailableDesigner` performs no
network request. The injected `designer` seam exists for deterministic tests and
future server integration. It is not a browser-to-provider implementation.

1. Establish actual Cloudflare account access through its official flow. Do not
   request an OpenAI API key. Keep account details out of the visitor interface.
2. Recheck the official references in `handoff/Security_and_Live_AI.md` for Workers
   Free, Workers AI pricing and the exact candidate models. Verify all endpoint,
   durable coordination, abuse-control and storage allowances fit a $0 budget.
3. Review the implemented Worker/SQLite authority in server-boundary.md. It has
   no AI binding or provider plan and is not deployed. The current app remains
   static on Netlify; configure and verify a same-origin proxy only after actual
   Worker access and free allowances are established.
4. Retain and deploy-verify the implemented signed HttpOnly browser identity and
   single transactional SQLite authority. Browser allowance and shared cost are
   reserved atomically before dispatch. Defaults remain 3 images, 10 submitted
   prompts and 8,000 shared Neurons per UTC day. The conservative current policy
   counts image/refinement prompts in both counters. These remain revisable
   defaults; Cloudflare and $0 are explicit choices. Never partition the shared
   authority by preset, browser or evaluation route.
5. Cover concurrent admission, retries/idempotency, conservative ambiguous charges,
   reservations settling across midnight, earlier provider exhaustion, oversized
   input/output, unknown identity, origin/CSRF and storage/service failures. An
   in-memory or localStorage counter cannot satisfy this requirement.
6. Validate server-owned operation/context schemas, fixed approved models/settings,
   trusted media references, byte/type/dimension limits and safe theme tokens.
   The client cannot declare cost, remaining quota or choose arbitrary URLs.
7. Retain and verify the implemented client persistence, protected eviction, bounded
   history, comparison, portable downloads and proposal preview/Apply against the
   eventual server adapter. Current tests inject responses; they do not establish
   provider access or image-editing capability. Image bytes and credentials must
   never enter localStorage. See verification-m3.md and image-proposal-contract.md.
8. Only after all gates pass, compare the two named chat candidates on identical
   bounded tasks and validate the FLUX route. Include comparison compute in the
   same limits. Record validity, latency, actual usage and rationale; no winner
   has been selected. Never automatically upgrade or choose paid fallback.

Local server/runtime tests cover these controls with an injected provider; they
do not establish live eligibility, real model costs or production proxy behavior.
See verification-m4-server.md.

No account resources, secrets, paid services, inference, or deployments were
created by this increment. Manual styling and export work without this setup.
