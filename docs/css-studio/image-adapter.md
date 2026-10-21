# Private image adapter implementation

October 21, 2026. The Worker does not select the Klein adapter. No remote image
inference or transformation has been requested. Public inference remains off.
The private metadata-only binding check and actual local decoding evidence are
tracked in [Images runtime verification](image-runtime-verification.md).

`server/css-studio/kleinProvider.js` implements the fixed native
`@cf/black-forest-labs/flux-2-klein-4b` multipart transport. It requests one
512×512 output with the model's fixed four steps. Refinement accepts exactly
one owned source, normalized to a 256×256 PNG under `input_image_0`. It accepts
no model, remote URL, batch, retry, output-size or cost field from the client.
The pure request validator bounds the complete server-built prompt to 8 KiB.
The existing authenticated receipt/digest check binds the original refinement
bytes and preset to their owner before admission.

The initial reviewed plan retains **500 Neurons** per generation or refinement,
including failures. This covers the published model-wide tile bound, rather
than depending on the requested dimensions for the initial cost proof. See
[the pricing derivation and source documents](image-model-research.md).
HTTP readiness requires the exact reviewed 500/512/512/4 plan for this adapter;
image usage fields cannot request a refund. Its independent image review expires
October 28 at 00:00 UTC; extending a text review does not extend it. The text
provider's readiness and request deadline also gate image readiness.

Admission reserves daily Neurons, browser prompt/image slots, concurrency and
monthly Images transformations in one transaction in the existing SQLite quota
authority. Generation reserves one transformation; refinement reserves two.
The monthly application ceiling is 5,000. A denial changes none of the admitted
request's counters and dispatches no external work. Transform reservations are
retained even when no work is dispatched or a Neuron charge is refunded.
Pending and uncertain work is covered in each overlapping UTC month. Existing
daily accounting and namespace identity are preserved during schema migration.

`imageNormalizer.js` uses an Images decode/re-encode transformation over bounded
raster bytes. It requests still PNG output, verifies the completed output's
format, byte bound and exact dimensions, and records proof against that exact
Blob in a private WeakMap. Receipt inspection uses this proof without another
transformation. A copied Blob cannot reuse it. Numeric Images exhaustion code
9422 halts media for the month while leaving text available; unknown external
failures retain their uncertainty and conservative accounting halt.

All external transformations occur after admission. Abort checks before and
after asynchronous stages prevent a late base transformation from starting
inference after the request has timed out. Images exposes no AbortSignal
parameter, so cancellation cannot prove that already submitted work stopped.
It must not release its reserved allowance. The adapter makes at most one
model invocation and never retries.

Unit tests exercise transport, validation, accounting and cancellation with
explicit fixtures. Actual workerd tests exercise SQLite admission and persistence.
Native local Images tests additionally exercise full decode/re-encode, generated
receipts, refinement ordering and corrupt-raster rejection with fixture AI output.
The browser Fetch regression uses intercepted fixtures. None establishes remote
model quality, full Cloudflare production decoding or billed Worker CPU.

Activation still requires evidence of Images Free account status and available
headroom, preserving deployment of the binding, and a separately bounded private
runtime pilot. Measure Worker CPU/memory, base64 handling, decode completion,
dimensions, latency and output quality before selecting the adapter in the
Worker. Bounded JavaScript base64 parsing is not evidence that the largest
accepted output fits the Workers Free CPU allowance. No paid service, billing
change, automatic retry or ledger reset is part of this implementation.
