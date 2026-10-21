# Private text-model evaluation

October 21, 2026. This records the reviewed GPT-OSS cost bound and one-fixture
evaluation plan and observed private integration result. Public
inference and image/refinement remain unavailable; no model winner is selected.

## Observed GPT and proxy identity result

[Run 39575443574](https://github.com/BerinKarjala/portfolio/actions/runs/39575443574)
passed from `f6b9633a0a0a4a364475cd42d1a928693bf93efe` on October 21 UTC:
77 server/runner tests, three actual workerd checks, deployment preserving the
existing identity secret and SQLite namespace, and real Chromium preview cookie
issuance/reuse/reload all passed. The preview remained publicly unavailable.

The runner then made exactly one direct private GPT Winter request. It returned
validated tokens in **827 ms**, retained its full **4,000-Neuron** reservation,
decremented its fresh session to nine prompts and left **2,000 shared Neurons**.
No retry, image call, paid upgrade or accounting reset occurred. These are
application-ledger reservations, not measured provider usage.

The [safe artifact](gpt-winter-evaluation-2026-10-21.json) retains the fixed
fixture's tokens and metrics only. Raw text/background contrast was 16.52:1.
The returned palette exactly matches the system prompt's example; this verifies
transport/schema compatibility, not independent design quality. The one-fixture
latency observation does not establish a model winner.

**Cross-site acceptance remains unverified.** Earlier full probes stopped at the
foreign browser fetch before observing the request or an upstream rejection.
They made no GPT calls. The successful private evaluation explicitly runs
`runProxyIdentityCheck`, reports `crossOriginRejected: false`, and requires
verified identity/cookies before inference. The separate full `runProxyCheck`
still fails closed when it cannot prove the foreign rejection. This is not public
activation approval; see [proxy evidence](private-proxy-verification.md).

## Observed baseline

[Private canary run 39558243040](https://github.com/BerinKarjala/portfolio/actions/runs/39558243040),
source `0813a3d7719544f9a94d4d615300c9823770ab0c`, performed two fixed Llama
submissions on October 21 UTC using
`@cf/meta/llama-3.3-70b-instruct-fp8-fast`:

| Fixture | Validated result | Submission-through-accounting latency | Retained reservation |
| --- | --- | ---: | ---: |
| Winter, dark, high contrast | Safe theme-token schema passed | 2,228 ms | 1,000 Neurons |
| Diwali, light | Safe theme-token schema passed | 2,320 ms | 1,000 Neurons |

The application ledger reported 6,000 of its 8,000 shared Neurons remaining
after those two charges. This is the recorded snapshot, not a new current-status
read. Reservations are not measured Cloudflare usage. These fixtures establish
private integration and schema validity, not broad design quality or a winner.

The earlier complete GPT schema snapshot did not establish whether chat
`max_tokens` includes reasoning, and its Responses alternative has no declared
`max_output_tokens`. The proof below uses the documented whole-context ceiling;
it does not infer a reasoning/output cap from an unsupported request parameter.

## Whole-context GPT bound

Official sources reviewed on October 21, 2026:

- [Workers AI glossary](https://developers.cloudflare.com/workers-ai/platform/glossary/)
  defines the context window as the combined input, reasoning and completion
  tokens.
- [GPT-OSS-20B model](https://developers.cloudflare.com/workers-ai/models/gpt-oss-20b/)
  publishes a 128,000-token context window for `@cf/openai/gpt-oss-20b`.
- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
  lists 18,182 Neurons per million input tokens and 27,273 per million output
  tokens for that model. Workers Free has a 10,000-Neuron daily allocation; the
  application's shared limit remains 8,000.
- [Workers AI changelog](https://developers.cloudflare.com/workers-ai/changelog/),
  entry February 21, 2025, describes context as combined prompt and response.
- [Native binding implementation](https://github.com/cloudflare/workerd/blob/main/src/cloudflare/internal/ai-api.ts)
  supports the reviewed native `AI.run` and raw-response path. The adapter uses
  that path without gateway options or a generation retry/continuation loop.

Let `I`, `R` and `O` be the input, reasoning and completion tokens of one native
generation. The documented ceiling gives `I + R + O <= 128000`. Charging every
token at the higher published output rate conservatively bounds its cost:

```text
ceil(128000 × 27273 / 1000000) = ceil(3490.944) = 3491 Neurons
```

The server reserves and retains **4,000 Neurons** before that generation. This
bound includes hidden reasoning; a short serialized answer is not its cost
argument. It applies only to this exact model, its reviewed context/rates and one
native generation. The plan expires at **2026-10-28 00:00:00 UTC** and does not
refresh itself. Changed or expired policy makes the private route unavailable.

The normal HTTP policy still permits at most 512 requested output tokens. Its
private GPT exception requires the exact model, a declared context of 128,000,
the complete fixed reviewed plan, the 4,000 reservation and an 18-second deadline.
The internal `maxOutputTokens: 128000` records the conservative context ceiling;
the adapter does not send an invented `max_output_tokens` field or claim that
128,000 visible output tokens were requested. Other providers cannot acquire
this exception merely by supplying a larger output value.

## Private dispatch and evaluation scope

The adapter makes exactly one native `AI.run` for each admitted theme request.
It sends bounded Responses input, `reasoning: { effort: "low" }` and
`stream: false`. It sends no tools and has no batch, agent loop, continuation,
inference retry, AI Gateway, paid fallback or automatic model switch. Complete
serialized input is limited to 8 KiB and the raw response to 64 KiB. The HTTP
layer imposes an 18-second deadline; a transport bound is not proof that remote
generation was canceled.

The parser accepts one completed assistant message, ignores reasoning items and
validates the resulting JSON against the safe theme-token schema. It never uses
model-reported usage to refund the reservation. Unsupported completed output
retains the charge; timeout, interrupted/oversized transport or uncertain
settlement retains it and closes admission for reviewed reconciliation.

The private evaluation workflow first verifies the real preview's private
session/status identity and cookie behavior without inference. Only after that
preflight may it submit **at most one** fixed GPT Winter/dark/high-contrast
fixture, identical to the earlier Llama Winter prompt. It opens a fresh anonymous
session using the existing signing secret and `css-studio-global-v1` SQLite authority, with no namespace
replacement, budget reset or inference retry. The runner requires at least one
browser prompt and 4,000 shared Neurons, a stable UTC day and at least two minutes
before midnight/plan expiration. Public status must remain unavailable before
and after. Credentials, cookie values, full prompts, reasoning and raw responses
are withheld from logs; only validated fixed-fixture tokens and safe metrics may
be retained.

The planned summary reports latency, schema/value validity, raw returned
text/background contrast where both tokens exist, and the retained reservation.
A single GPT fixture adds one integration observation; it does not complete
the representative seasonal/holiday comparison or establish a winner. The
observed result above supersedes the original preflight's pending status.

Public activation still requires reviewed evaluation and actual proxy/operational
evidence, plus Free supporting-service headroom. The 248-photo/cultural review,
native browser zoom, physical-device and real microphone checks remain separate.
Image/refinement has made no live model call and remains disabled while editing
contract, pricing, decoder and runtime feasibility are reviewed. Newer image
model research does not turn the earlier Schnell limitation into a general
finding that every image model is unsuitable.
