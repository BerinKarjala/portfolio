# M3 image-storage foundation verification

October 20, 2026. Branch `css-studio`; previous commit `545d3d1`.

This increment adds a storage API and tests. It does not expose generated-image
controls or enable inference. Production code does not import the module yet.

| Check | Outcome |
| --- | --- |
| `npm test` | 164 tests across 28 files passed with the first six cache tests. |
| `npm test -- src/features/css-studio/imageCache.test.js` | All eight cache tests passed after adding queued-pin and same-size corruption regressions. |
| `npm run build` | Passed, 369 modules; the cache remains outside production bundles pending UI integration. |
| `npm run test:e2e -- --config e2e/playwright.images.config.js --project=chromium --workers=1 --retries=0` | All four storage browser tests passed. |
| `git diff --check` | Passed. |

Commands used Node 22.22.2 via the existing offline npm-exec cache selector.
Chromium 154.0.8037.57 used `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`.
The separate Playwright configuration runs Vite on port 4174; browser tests import
the module directly, without adding a production test page. Its `.browser.js`
suffix keeps these development-server tests out of the normal preview-server suite.

Browser tests use the supplied Spring WebP as explicit fixture bytes, plus native
canvas PNG/JPEG/WebP encoders. They do not claim AI-generated provenance. Actual
IndexedDB bytes persist across reload, decode at expected dimensions, retain the
same SHA-256 and byte length, and preserve pinned IDs under eviction. Concurrent
independent clients stay within count limits. A deliberately damaged digest is
removed on read. An injected denied-open factory exercises bounded in-memory
fallback without putting image bytes in localStorage.

Unit tests additionally cover byte/count capacity rejection with all images pinned,
invalid formats/context, over-4-MiB input, corrupt same-length bytes and pixel
headers that exceed the dimension limit before decoder invocation. Failed storage
can preserve only records already mirrored in the current client; it cannot recover
unread persistent bytes when the browser refuses access.

AC-31 remains partial: no Studio selection restoration, proposal Apply, comparison,
image download or export integration is claimed. A caller must pass the current
protected IDs for every mutation. Actual disk-quota exhaustion, private browsing,
Firefox/WebKit, physical mobile/TV devices and live provider execution have not
been verified in this increment. The existing Cloudflare eligibility, identity,
shared quota and $0-budget prerequisites remain unchanged.
