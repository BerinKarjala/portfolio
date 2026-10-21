# Image model research — 2026-10-21

This review includes documentation and a completed metadata-only account check,
not an image pilot. No image inference, account mutation, binding change, paid
upgrade, or new API key was used. Live image and refinement gates remain closed.
Runtime inference access, response decoding, runtime cost, and output quality
still require separate verification.

## Candidate and current availability

`@cf/black-forest-labs/flux-2-klein-4b` is the strongest documented candidate for
both generation and reference-image editing. Its current canonical
[model page](https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/)
is available, identifies it as Cloudflare-hosted, and declares one base64 `image`
response. It does not declare a PNG/JPEG selector or an encoded-output byte cap.

The current [catalog](https://developers.cloudflare.com/workers-ai/models/)
also includes SDXL Base, SDXL Lightning, and Stable Diffusion 1.5 Inpainting.
However, the canonical
[Stable Diffusion 1.5 img2img page](https://developers.cloudflare.com/workers-ai/models/stable-diffusion-v1-5-img2img/)
redirects to `?unavailable=stable-diffusion-v1-5-img2img` and displays a model-not-
available notice. Cached search results, preview documentation, generated types,
and the remaining mention in the rate-limit table do not establish availability.

| Model | Verified documentation | Remaining cost/capability limit |
| --- | --- | --- |
| `@cf/black-forest-labs/flux-2-klein-4b` | Dimensions, reference inputs, fixed four steps, explicit Neuron rates; account metadata read succeeded | Runtime inference access and actual raster output remain untested |
| `@cf/stabilityai/stable-diffusion-xl-base-1.0` | Width/height 256–2048, `image`/`image_b64`, `strength`, `num_steps` at most 20 | Model page displays `$0.00/step`; current pricing lacks a Neuron formula |
| `@cf/bytedance/stable-diffusion-xl-lightning` | Similar generic image fields and dimensions | Same pricing ambiguity; generic fields alone do not validate editing behavior |
| `@cf/runwayml/stable-diffusion-v1-5-inpainting` | Base-image/mask fields and dimensions | Same pricing ambiguity; mask workflow would need validation |
| `@cf/runwayml/stable-diffusion-v1-5-img2img` | Canonical unavailable notice | Exclude from an implementation plan |

Sources for the older schemas: [SDXL Base](https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-base-1.0/),
[SDXL Lightning](https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-lightning/),
[SD1.5 Inpainting](https://developers.cloudflare.com/workers-ai/models/stable-diffusion-v1-5-inpainting/).
The rounded `$0.00` display is not evidence that a request consumes zero Neurons.

## Observed account metadata

The [metadata-only workflow run](https://github.com/BerinKarjala/portfolio/actions/runs/39570908098)
succeeded from [source commit `def91ad`](https://github.com/BerinKarjala/portfolio/commit/def91ad044c7c43b97278ce7fa328e34e152c53b)
on `css-studio-image-contract`. Seven helper tests passed, followed by two fixed
GETs: the Klein schema endpoint and the existing Worker's settings endpoint.
The [retained artifact](flux-2-klein-schema-contract-2026-10-21.json) was observed
at `2026-10-21T08:39:32.361Z`.

The complete returned input schema requires `multipart`, with `body` typed as
an object and `contentType` as a string. It does not describe the form's inner
fields, image dimensions, reference limits, file sizes, MIME types, or steps.
The output schema declares an `image` string described as base64, without a
required-field list, MIME selector, byte ceiling, or raster-dimension guarantee.
The nested limits below therefore remain supported by the published launch
contract, not by a more specific account schema.

Safe Worker flags show `AI` and `QUOTA` present with their expected binding types.
`IMAGES` is absent, and no binding with type `images` exists under another name.
The artifact explicitly retains `liveImageReady: false`,
`inferencePerformed: false`, and `bindingChangesPerformed: false`. Schema
retrieval demonstrates metadata permission; it does not demonstrate runtime
inference eligibility, quota headroom, Images Free enrollment, or decoder
operation. The helper does not read billing or model-run endpoints.

## Klein request contract

Cloudflare's [Klein 4B launch contract](https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/)
documents multipart input, required `prompt`, optional `width`/`height` from
256 through 1920, `guidance`, and `seed`. Inference uses four fixed steps;
`steps` cannot be adjusted. References are binary multipart parts named
`input_image_0` through `input_image_3`; each must be smaller than 512×512.
The documented workflow includes iterating on generated images. It does not
specify an accepted-input MIME list, maximum reference-file bytes, prompt byte
limit, model-specific timeout, batch/count selector, or output-format parameter.

The proposed application request is narrower: one output, `width=512`,
`height=512`, a bounded server-built prompt, and either no reference or exactly
one fully decoded, owned 256×256 PNG under `input_image_0`. Other source-image
dimensions need normalization before inference. These are application choices,
not additional provider guarantees.

The documented native binding transport serializes a `FormData` into a stream
and retains its generated multipart boundary. An illustrative payload is:

```js
const form = new FormData();
form.set("prompt", boundedPrompt);
form.set("width", "512");
form.set("height", "512");
if (ownedBasePng) {
  form.set("input_image_0", new Blob([ownedBasePng], { type: "image/png" }), "base.png");
}
const serialized = new Response(form);
const inputs = {
  multipart: {
    body: serialized.body,
    contentType: serialized.headers.get("content-type"),
  },
};
```

This is a future implementation sketch, not executed code. The corresponding
REST model path is `/accounts/{account_id}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`.
No arbitrary remote-image URL should be fetched: refinement must retain the
existing owned-image receipt and digest checks.

## Cost reservation and Free eligibility

The current [Workers AI pricing page](https://developers.cloudflare.com/workers-ai/platform/pricing/)
(updated October 20) lists Klein 4B at **5.37 Neurons per input 512×512 tile**
and **26.05 per output 512×512 tile**. Unlike FLUX.2 Dev, these Klein rates have
no per-step multiplier. Klein 4B is absent from the published paid-only list.
Workers Free stops at its 10,000-Neuron daily allowance; the Studio's shared
8,000 ceiling remains stricter. The metadata read succeeded, but runtime model
access in this account is untested.

For a 512×512 result and one 256×256 reference, the dimensions fit one output tile
and one input tile. The corresponding published-rate calculation is 31.42
Neurons; a fresh image without a reference is 26.05. A 100-Neuron reservation
would depend on the narrow dimension contract being honored. It is not the
initial recommended reservation.

Use **500 retained Neurons per single generation** for a first private pilot.
A conservative rectangular cover of the published model maximum is:

```text
output tiles <= ceil(1920 / 512) * ceil(1920 / 512) = 16
reference tiles <= 4
cost <= 16 * 26.05 + 4 * 5.37 = 438.28 Neurons
```

With the application restricted to one reference, that cover is 422.17 Neurons.
The pricing page does not publish the partial-tile rounding algorithm; the
rectangular cover is a conservative derivation, not a claim that billing uses
that exact `ceil` formula. The 512×512/256×256 plan avoids partial output tiles.
This ceiling assumes one invocation producing the documented single image,
with no retry, batch, tool loop, gateway fallback, or model substitution. Retain
the full reservation on timeout, cancellation, malformed output, or failure.
Do not use an application timeout or response byte limit as a generation-cost
proof. No published model-specific latency guarantee was found.

## Full decoding through Images Free

Current [Images pricing](https://developers.cloudflare.com/images/pricing/)
(updated October 19) says users default to Images Free, which includes 5,000
unique transformations per calendar month. New transformations beyond the
allowance fail with `9422`; Free overages are not charged. Images storage is a
separate Paid feature and is not needed for direct-byte transformations.
Do not enable Images Paid or paid storage for this plan.

The [Images binding](https://developers.cloudflare.com/images/optimization/binding/)
accepts raw bytes and documents that an uncached transformation performs a full
decode and re-encode. `.info()` is free, but metadata inspection alone is not
the full decoding check. `.output()` requires an explicit format; `anim:false`
requests a still image. A completed PNG transformation provides a stronger
server-controlled normalization boundary than a header-only raster inspector.
The observed Worker has no Images binding; decoder execution and account error
behavior remain untested. No binding was added by the metadata check.

The [limits and formats page](https://developers.cloudflare.com/images/get-started/limits/)
lists PNG and JPEG inputs and PNG output. The binding's input ceiling is 20 MB.
That provider ceiling is not the application's acceptable payload size: retain
tighter encoded and decoded bounds. Reject unsupported/vector/animated content
according to the Studio contract before issuing owned-image receipts.

A prospective normalization sequence is:

```js
const normalized = await env.IMAGES.input(boundedRasterStream)
  .transform({ width: 512, height: 512, fit: "cover" })
  .output({ format: "image/png", anim: false });
const response = normalized.response();
```

This sketch does not provision or invoke the binding. Fully read the bounded
normalized output, require PNG, verify exact dimensions, and hash those final
bytes before issuing a receipt. For refinement, normalize the validated owned
source to a 256×256 reference first, preserving its link to the owned original.
Each distinct source/parameter combination may consume a transformation; base
normalization and output normalization are separate operations. Keep an atomic
application-wide calendar-month reservation counter capped at 5,000, and retain
reservations on uncertain failures. Other account consumers can reduce provider
headroom earlier; provider exhaustion must preserve curated/manual fallback.
Complete atomic request admission, including reservations for every required
Images transformation, before invoking any transformation. This includes base-
image normalization before inference; an early decoder call must not bypass the
monthly authority when the later inference request is rejected.

This route moves raster decode/re-encode work to Images, but does not prove that
base64 parsing, hashing, bounded reads, and receipt work fit the Worker Free CPU
allowance. Runtime measurement remains necessary. A local complete decoder is
an alternative only after its own resource limits are verified.

## Next evidence before an image pilot

1. The metadata-only
   [model schema endpoint](https://developers.cloudflare.com/api/resources/ai/subresources/models/subresources/schema/methods/get/):
   `GET /accounts/{account_id}/ai/models/schema?model=@cf/black-forest-labs/flux-2-klein-4b`
   has now been read, with complete public definitions retained above. The
   dedicated helper at the linked source commit performs only the two fixed
   metadata GETs. Future refreshes must use that isolated helper. The canary
   deployment helper performs secret/deployment writes after its schema read
   and must not be used merely to inspect image metadata.
2. Read-only account status must establish Images Free, available monthly
   headroom, Worker/AI Free status, and compatible existing bindings. This review
   established the current binding flags only: `AI`/`QUOTA` available, no Images
   binding. It did not read account billing or provision Images.
3. Build offline fixtures for multipart serialization, one-image extraction,
   PNG normalization, owned-reference linkage, abort/failure accounting, and
   exhausted daily/monthly ledgers. Do not call AI in local-mode tests: the
   [AI limits page](https://developers.cloudflare.com/workers-ai/platform/limits/)
   says Wrangler local model inference still counts toward provider limits.
4. Verify runtime CPU, memory, timeout handling, exact returned dimensions,
   format, image count, and quality in a separately bounded private pilot. No
   image pilot is authorized or performed by this research document.

The model page links [BFL hosted terms](https://bfl.ai/legal/terms-of-service),
which require rights to submitted inputs. Preserve the owned-image requirement;
an upstream weights license alone does not establish hosted-service terms.
