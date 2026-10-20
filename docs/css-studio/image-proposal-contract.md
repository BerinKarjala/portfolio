# Client image-proposal contract

The production adapter remains `unavailableDesigner`: no live fetch, model choice,
credentials, provider usage or quota authority is implemented here. Tests inject
`designer` into StudioProvider; there is no production mock route or enable flag.

`makeRequest` returns a bounded prompt/history, request ID, `operation`
(`theme`, `image`, or `refine`) and intended family/preset/mode/contrast context.
Refinement requires the currently selected generated ID as `baseImageId`.
`designer.propose(request, {signal, baseImage?})` receives verified local Blob
bytes for refinement through options, not serialized request/chat history. A future
server adapter must replace this browser reference with an authorized media flow;
it must validate identity, media, context and all quota/cost rules independently.
No claim is made that a future selected model supports pixel editing.

Responses have `{requestId, message, overrides, image?}`. Overrides use the existing
safe token allowlist. An image response must contain an actual PNG/JPEG/WebP Blob
(no URL, SVG or CSS), bounded to 4 MiB and 64–2048 px per side. The cache validates
headers before decoding, decoded dimensions and SHA-256. Image/refine operations
require bytes; image-only responses use an empty overrides object. The provider
cannot nominate arbitrary generated IDs; local storage assigns them.

Images enter bounded history as proposals, without changing the active profile.
Apply checks the latest request, exact context, and original refinement-base
selection again inside the preference update. Canceled late responses are ignored;
cancellation while saving removes the newly saved record when unprotected. A
history choice is a separate explicit selection, restricted to the active preset.
The selected image can remain through appearance changes.

The cache protects IDs in every profile, active reset Undo, the pending proposal
and up to two comparison selections. Protected capacity rejection retains one
validated visit-only preview, keeps Apply disabled, and offers a byte download.
After clearing comparison/removing an unselected image, Save proposed background
retries local storage without another provider request. Denied storage instead
uses a bounded visit mirror with an explicit warning. Losing bytes falls back to
curated imagery without silently rewriting the saved reference.

Preferences store only the generated ID. IndexedDB stores bytes and bounded image
metadata, never prompts/chat or object URLs. Display URLs are created locally and
revoked on removal/eviction/unmount. The shared resolver checks preset ownership;
runtime uses these URLs, while portable CSS uses
`./css-studio/generated/generated-<uuid>.<extension>`. ZIP export includes exact
verified bytes and GENERATED_IMAGE.json. Curated exports retain their existing
CREDITS.json behavior. No curated-photo license is assigned to generated content.
The opaque examples iframe cannot decode a parent-origin blob URL: only that
preview converts the selected verified Blob to an ephemeral raster data URL. Its
CSP permits data images, while the scriptless sandbox remains intact. The shared
resolver still selects the same image and design tokens; only image transport
differs. Data URLs are never saved to preferences or portable exports.
