# Images runtime and private metadata verification

October 21, 2026. Image generation remains disabled in the deployed Worker.
This increment adds a private metadata diagnostic and actual local Images
runtime tests. Neither selects the Klein provider in production.

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
eligibility. Live results will be retained separately after execution.

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
bound remain resource concerns; local elapsed time does not prove the Workers
Free CPU allowance. No paid upgrade, inference, remote transformation, public
activation, automatic retry, ledger reset or allowance refund is authorized by
the metadata workflow.
