# Private Netlify proxy verification

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

Cross-site acceptance is still open. Six preceding full probes stopped at the
deliberate foreign fetch and therefore never reached GPT. Fixed diagnostics
observed a browser fetch failure, then no response event, and finally no
intercepted request/upstream rejection even from a real separate HTTPS origin.
The exact browser/environment cause is unresolved; an opaque-response blocking
hypothesis is not a proven explanation. No backend 403 or cross-site cookie
exclusion is claimed from those failed live probes.

The full probe retains mandatory original-request cookie absence, foreign Origin
and cross-site fetch metadata, an observed bounded upstream 403 without Set-Cookie,
the expected Worker rejection body, and unchanged identity/counters afterward.
Its intercepted foreign response can be inspected outside the page because a
browser may conceal opaque JSON. It never treats a generic fetch failure as proof
of a server rejection. Unit regressions reject successful/unrelated responses,
cookie changes and missing observations. Local actual-Worker/browser tests also
cover cross-site rejection, but do not replace this open live gate.

The private model workflow explicitly uses the narrower identity probe and logs
`crossOriginRejected: false`. It requires session/cookie proof before its one
fixed GPT call; it does not silently recover from a failed full probe. Public
inference stays off. Full live cross-site acceptance, production-origin proxy
verification and supporting-service headroom remain release work.
