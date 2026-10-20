# M4 server foundation verification

October 20, 2026. Branch `css-studio`. Tested source commit `e9bd317`.
Previous increment `92691cd`; documentation-only evidence updates follow.

The new Worker boundary and single durable quota authority prevent browser-owned
identity/cost/counter values from controlling inference admission. Production
remains unavailable: no AI binding/provider, deployment, route activation or
browser-to-server designer adapter was added. Test providers exist only in local
fixtures. server-boundary.md records the contract and its operational limits.

| Check | Outcome |
| --- | --- |
| Offline `npm ci` | Passed with Node 22.22.2; new Miniflare runtime tooling is reproducibly installed. |
| `npm test` | 196 tests across 34 files passed on final source, including 21 server tests in four files. |
| `npm run test:css-studio:server` | Three passed in Miniflare 4.20260730.0 / workerd 1.20260730.1. |
| `npm run test:css-studio:server:browser` | One passed in Chromium 154.0.8037.57 using real cookie semantics and a local proxy simulation. |
| Chromium `e2e/css-studio.spec.js` | All 17 passed against production Vite output, including manual/curated fallback, generated-image fixtures, viewport checks and axe scans. |
| `npm run build` | Passed, 374 modules. Existing browser chunk hashes remain unchanged. |
| `npm run check:page-builder` | Passed, all 130 canonical decisions/options and 16 mapped gates. |
| `npm run check:page-builder:build` | Passed, launcher 3,992 bytes / 1,863 gzip; workspace 208,797 / 61,842 gzip. |
| Existing lockfile records | Every previous non-root package record is identical; only Miniflare/new dependency records are added. No existing dependency upgrade is hidden in the lockfile. |
| Browser bundle boundary inspection | No QuotaAuthority, IDENTITY_SECRET, quota.internal or accounting-uncertain implementation appears in dist/assets JavaScript. |
| `git diff --check` | Passed. |

Commands use the established Node 22.22.2 offline npm-exec cache selector.
Browser commands set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`.
The dedicated new CI workflow runs server unit, workerd and Chromium boundary
checks; it has not run remotely because the branch has not been pushed.

```sh
npm test
npm run test:css-studio:server
npm run test:css-studio:server:browser
npm run test:e2e -- e2e/css-studio.spec.js --project=chromium --workers=1 --retries=0
npm run build
npm run check:page-builder
npm run check:page-builder:build
```

TDD: quota, identity, protocol and HTTP tests initially failed for missing modules.
An incomplete-body test initially timed out; the implementation now returns 408
and releases its reader. A proxy-origin test initially returned 403; separate,
fixed public/backend origins now pass while incorrect origins remain rejected.
The first browser-boundary command lacked a local executable override; rerunning
with installed Chromium passes. No downloaded browser or real provider is assumed.

Actual workerd tests send twelve simultaneous 4,000-Neuron reservations through
one SQLite-backed object and admit exactly two. After settlement and a complete
runtime disposal/restart on the same persistent directory, the shared remainder
stays zero and new admission remains rejected. Real Worker HTTP sessions prove
that retries do not redispatch and identity-bound status decrements to nine prompts.
The production entry stays unavailable even with a forged AI_ENABLED binding.

Node's actual SQLite driver covers ten-prompt and three-image limits, separate
browser/day scope, burst/concurrency, idempotency conflicts, atomic rollback after
an interrupted write, trusted measurement, a response crossing midnight, provider
exhaustion and uncertain/cost-bound latches across UTC days. Node 22 reports its
SQLite API as experimental; production uses workerd's separate, tested storage API.

HTTP tests cover mandatory origin/JSON/CSRF headers, invalid cookie, unknown schema
keys, oversized/unfinished/malformed bodies, unsupported model output, expired
policy/reservation, storage errors, timeout and provider-exhaustion redaction.
The HTTP image/refinement route deliberately returns unavailable before reservation:
a local generated ID is not a trusted server media reference. Integer cost bounds
and usage in fixtures are not a verified reservation model for live inference.

Chromium retains the actual Secure/HttpOnly/SameSite=Strict host cookie through
reload, excludes it from document.cookie and a cross-origin request, rejects a
JavaScript overwrite, and ignores a forged localStorage quota value. The browser
API requests are routed through a simulated same-origin proxy into local workerd;
this does not verify a real Netlify proxy, DNS/TLS deployment or Cloudflare account.
All fixture-provider outbound calls are blocked by the runtime harness.

Remaining limits: actual account/Free-plan and model eligibility; fixed real-model
settings and conservative cost/usage conversion; owned media handling; live proxy,
quota-store/provider failures and abuse/traffic billing measurements; bounded live
candidate comparison; Firefox/WebKit and physical device/microphone verification.
The general free-tier documentation observations are recorded separately in
cloudflare-readiness.md. No live request, billing change, account resource, secret,
public route, push or merge into main was created by this work.
