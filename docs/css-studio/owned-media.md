# Owned-media transport foundation

The production Worker and browser remain unavailable by default. This increment
adds an explicitly injected HTTP designer and server image-adapter seam; it adds
no AI binding, external provider call, deployment, storage service or paid fallback.

Generation returns multipart JSON metadata and raster bytes. Refinement uploads
exactly three fields: validated request JSON, the cached raster, and its opaque
receipt. The server verifies the receipt before reserving quota or dispatching.
Images remain limited to 4 MiB and 64–2,048 pixels per dimension. Multipart transfer
has a bounded total envelope, chunk count and read deadline independent of the
advertised Content-Length. JSON retains its 96 KiB limit.

Receipts use AES-256-GCM with a domain-separated HKDF key derived from the
server-only identity secret. They encrypt the owner UUID, server-generated media
ID, SHA-256, byte count, MIME type, dimensions, family/preset and seven-day expiry.
Random nonces and authenticated encryption protect integrity and conceal the
cookie identity. Rotation invalidates old receipts. Receipts provide stateless
verification; the server stores no raster. A lost cookie, expired receipt, changed
preset or changed bytes requires a newly generated image. Receipts are scoped to
family/preset, allowing appearance changes within that preset.

Issuance requires a trusted adapter inspector to validate the complete raster;
header dimension checks alone are insufficient. The adapter must also enforce
fixed output dimensions and steps and a verified conservative Neuron reservation.
Local tests use a real bundled raster with an injected inspector, not a live image
decoder or provider. Real decoding, provider wire bounds and account eligibility
remain activation requirements. Verification of a previously issued receipt checks
the exact bytes already inspected at issuance.

The client adapter uses only relative same-origin API paths, browser cookies,
redirect rejection and bounded response reads. It performs no automatic proposal
retry. It is available for explicit injection; App still uses unavailableDesigner.
The receipt is optional cache metadata for compatibility with local image fixtures.
It persists with the raster in IndexedDB, never in theme preferences or portable
exports. A safe verification error leaves existing themes and cached media usable.

Validation covers ownership, tampering, expiry, key rotation, unsupported output,
missing/duplicate upload fields, verification before admission, client handshake,
refinement reattachment, safe error messages, cache persistence and export omission.
These are local unit/contract checks. The existing workerd and Chromium suites
exercise the unchanged quota/session foundation; they do not establish a live
image-provider deployment or browser-to-provider image workflow.
