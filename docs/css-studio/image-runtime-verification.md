# Images runtime and private metadata verification

October 21, 2026. The live private metadata check passed; image generation
remains disabled. This increment adds that diagnostic and actual local Images
runtime tests. Neither selects the Klein provider in production.

## Observed live result

[Run 39637036922](https://github.com/BerinKarjala/portfolio/actions/runs/39637036922)
passed from `7ef774a3a187fabda3c821ae16f86ae0dabd970d` on the isolated
`css-studio-image-info-check` branch, based on feature `5bc6297`. Its 177 boundary
and helper tests and three actual SQLite tests passed before deployment. The
inference step was skipped. The preserving deployment confirmed the existing
identity secret, quota namespace, fixed origins and exact native Images binding.

At 16:42:38 UTC, native Cloudflare `Images.info()` returned the fixed PNG's
64×64 geometry and `image/png` format in **9 ms elapsed wall time**. No inference
or transformation was requested. This does not measure CPU or full decoding.
See the [exact safe metadata result](image-info-result-2026-10-21.json) and
[read-only account snapshot](image-readiness-2026-10-21.json). Snapshot flags
describe only the read-only readiness helper, not the later deployment.

The two real Chromium proxy checks passed identity/cookie reuse, reload and
foreign-Origin rejection. Each fresh visitor retained ten prompts and three
image slots within its own proof; the shared balance stayed **2,000 Neurons**
across both checks. Fetch Metadata was absent at interception and was not
invented. Public inference was unavailable before and after each proof.

The first run, [39636307320](https://github.com/BerinKarjala/portfolio/actions/runs/39636307320)
at `5bc6297`, deployed the binding but stopped at browser session creation before
any metadata request. Its cause is unconfirmed. The later source adds only safe
HTTP-status/availability/cookie-count diagnostics and associated regression tests;
it does not relax checks or add automatic retries. The second run was explicitly
dispatched after review. No image inference, transformation or quota reset occurred
in either run.

Billing returned HTTP 403 in both runs. Images plan and transformation headroom
therefore remain unknown; a functioning binding does not resolve that gate.

## Local decoding evidence

`server/css-studio/runtime/images.runtime.mjs` runs the production adapter,
normalizer, HTTP boundary, signed identity and SQLite quota authority in
Miniflare/workerd with its native Images binding. Only AI inference is replaced
by a fixed PNG fixture. An outbound-service guard rejects external requests.

Generation produces an owned 512×512 PNG. Refinement verifies ownership before
admission, decodes its base to 256×256, invokes the fixture once, and decodes the
output to 512×512. Binding-entry events establish admission before each external
stage. Reservations retain 500 Neurons and one transformation for generation,
then 500 Neurons and two transformations for refinement. Receipt validation
adds no transformation. A plausible PNG with a corrupt compressed raster fails
full decoding, receives no receipt, and retains its conservative reservation.

A third case runs the production Worker's private metadata route against native
`Images.info()`: exactly one valid call returns 64×64 PNG metadata. Missing or
wrong private authentication returns 404 without a binding call. It changes no
identity, quota, receipt, inference or transformation state. All three runtime
cases pass locally. These tests establish local Sharp-backed decode/re-encode
behavior, not Cloudflare's production decoder, billed CPU, memory headroom or
image quality. Timings are elapsed wall time only.

## Bounded live diagnostic

The existing private-canary workflow accepts `check=image-info`. It reads the
fixed account's subscriptions and Worker settings, then uses the existing
preserving deployment helper to add only `[images] binding="IMAGES"`. The helper
requires the existing identity secret and quota namespace, rejects unexpected
resource bindings before deployment, and checks the exact Images binding and
same quota namespace afterward. It rotates only the private canary gate.

The runner performs full Chromium session/cookie and foreign-Origin checks
before and after exactly one metadata request. It submits a fixed, complete
64×64 PNG to `Images.info()` with a five-second Worker deadline. It accepts no
upload, URL, model or transformation parameters, never calls `Images.input()`
or `AI.run()`, and does not access the quota authority. The runner requires the
same UTC day and unchanged shared balance. Each browser proof independently
checks its own identity and unchanged allowances; the two proofs use different
fresh identities. The local SQLite regression establishes same-visitor budget
invariance around the metadata call. Safe JSON artifacts contain no credentials,
cookie values or raw provider responses.

Cloudflare documents metadata calls as free and not billed on all plans:

- [Binding `info(stream)`](https://developers.cloudflare.com/images/optimization/binding/#infostream)
- [Images pricing](https://developers.cloudflare.com/images/pricing/)

Binding deployment does not subscribe to a paid plan. A billing-read denial is
recorded as unknown visibility; it never requests wider token permissions or
infers Images Free status. Legacy billing error 9432 is retained as a fixed
numeric category without changing billing. Metadata success establishes only
the binding and metadata operation, not full production decoding or Free-plan
eligibility. The observed live results are retained above.

## Remaining activation gates

Confirm the account's Images plan before the first remote transformation. The
generic subscriptions schema has no documented Images Free discriminator;
missing records, free-looking names and a working binding are insufficient.
On confirmed Images Free, the provider hard-stops at its transformation limit
with code 9422. The application independently reserves at most 5,000 monthly
transformations; neither limit is evidence of the account's current headroom.

A separately bounded private pilot still needs full production decoding,
request-correlated Worker CPU/memory evidence and output-quality review.
JavaScript base64 conversion and repeated container scans at the accepted 4 MiB
bound remain resource concerns. A future optimization can feature-detect native
`Uint8Array.fromBase64` (available in the pinned local workerd) while preserving
all current wire bounds and fallback behavior. JPEG limits must cover both marker
steps and fill-byte scanning. Neither change is part of this increment, and local
elapsed time does not prove the Workers Free CPU allowance. No paid upgrade,
inference, remote transformation, public
activation, automatic retry, ledger reset or allowance refund is authorized by
the metadata workflow.
