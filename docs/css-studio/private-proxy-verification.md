# Private Netlify proxy verification

The full private Chromium preview check passed on October 21, 2026 in
[run 39623388528](https://github.com/BerinKarjala/portfolio/actions/runs/39623388528),
source `27ada3aee9f3d41af24d39caa008cadfa375b2ed`, Node 22.22.2. The existing
signing identity and quota namespace were preserved. It requested no inference.

A real browser on untrusted `https://example.com` attempted a POST to the preview
session endpoint. Interception observed that exact foreign Origin and no Studio
cookie. The bounded server-side relay forwarded those observed headers, added
private test authentication, and observed the proxied Worker's expected 403
rejection body without Set-Cookie. Browser identity survived return navigation;
ten prompts, three image slots and **2,000 shared Neurons** remained unchanged.
Public preview and direct Worker inference stayed unavailable before and after.

Fetch Metadata was **absent at Chromium interception**. The probe forwards it
only when actually observed and rejects incompatible values; it does not invent
a cross-site header or claim wire-level metadata observation. The real foreign
Origin, Strict-cookie exclusion and bounded backend rejection are independently
required. Chromium may hide the opaque JSON response from page scripts, so a
generic browser fetch error alone can never pass this check.

## Earlier identity evidence and corrected probe

October 21, 2026. [Run 39575443574](https://github.com/BerinKarjala/portfolio/actions/runs/39575443574),
source `f6b9633a0a0a4a364475cd42d1a928693bf93efe`, verified a real Chromium
session through `https://deploy-preview-245--berinkarjala.netlify.app`.
The frontend was the `ad59d10` preview; its proxy rule and client protocol are
unchanged by the subsequent accessibility fixes. The Worker was built from the
evaluation source. Existing signing identity and quota namespace were preserved.

The fresh browser received 401 before session creation, then exactly one
`__Host-css-studio` cookie: Secure, HttpOnly, SameSite=Strict, Path=/, with no
Domain attribute. Chromium retained it on the preview host; JavaScript could not
read it. Session reuse issued no replacement cookie, and the same identity
survived a real page reload. Authenticated status remained authoritative and
unchanged at ten prompts, three image slots and 6,000 shared Neurons before the
separate GPT test. Public preview and direct Worker status remained unavailable
before and after. No inference is made by this identity probe.

Six preceding full probes stopped at the
deliberate foreign fetch and therefore never reached GPT. Fixed diagnostics
observed a browser fetch failure, then no response event, and finally no
intercepted request/upstream rejection even from a real separate HTTPS origin.
The cause was subsequently reproduced in native Chromium: Fetch rejects
`mode:no-cors` combined with `redirect:error` before sending a request. The
corrected browser request uses `follow`; guarded forwarding still uses
`redirect:error` and requires the exact cookie-free 403. A permanent offline
browser regression reproduces both outcomes without external requests.

The next diagnostic run, 39622116468 at source `219446d`, reached interception
but failed because Chromium omitted Fetch Metadata there. Its then-current
production source was also an approved application Origin and could not prove
untrusted-Origin rejection without that header. The final probe uses actual
untrusted `example.com`, forwards only observed metadata and records its absence.
No backend 403 or cross-site cookie exclusion is claimed from failed probes.

The full probe retains mandatory original-request cookie absence, foreign Origin,
compatible optional metadata, an observed bounded upstream 403 without Set-Cookie,
the expected Worker rejection body, and unchanged identity/counters afterward.
Its intercepted foreign response can be inspected outside the page because a
browser may conceal opaque JSON. It never treats a generic fetch failure as proof
of a server rejection. Unit regressions reject successful/unrelated responses,
cookie changes and missing observations. Local actual-Worker/browser tests also
cover cross-site rejection, but do not replace this open live gate.

The private model workflow explicitly uses the narrower identity probe and logs
`crossOriginRejected: false`. It requires session/cookie proof before its one
fixed GPT call; it does not silently recover from a failed full probe. Public
inference stays off. The later full probe now establishes the scoped Chromium
preview check. Production-origin proxy verification, other browser engines'
live cookie behavior and supporting-service headroom remain release work.
