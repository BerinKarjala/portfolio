# Landing redesign implementation

Branch: `feat/landing-page-scene`, based on
`c1f7645b1ac8488fc93a9b095ab47f839d011f62`. Evidence below applies to this
branch's implementation, not a production release. The user requested a commit
and push without deployment; its commit message includes `[skip netlify]`.
No merge or deployment is authorized by that request.
The supplied October 22 implementation brief governs this work.

## Decisions and visual references

The user supplied desktop and mobile Text Editor images and explicitly called
them “the approved images” on October 23. Both are now reference approvals;
this supersedes the brief's mobile-draft designation. Their green center shell,
parchment sheet, document controls, neighboring cards and foreground writing set
are the editor's visual direction. Approval of the references does not imply
approval of the actual browser renders in `screenshots/`.

Confirmed user decisions, quoted:

- “when a utility the carousel will stop spinning.”
- “Save in this browser; download plain text”
- “Date browsing only”
- “Use location only after a visitor grants permission”
- “extrapolate from geo location.”
- “Move feather and inkwell together”

Reviewable implementation defaults: eight-second idle rotation plus manual
arrows; utilities temporarily replace the selected card; Close restores that
card; explicit Save stores one document locally; closing or switching utilities
keeps the unsaved draft in memory. Reload/navigation warns when it is unsaved.
Object positions reset on reload/viewport resize, with explicit Reset controls.
The calendar also has visible keyboard-accessible launchers. Weather uses
Open-Meteo with a 15-minute visible refresh. No unanswered planning option is
represented as a separate user approval.

## Requirement map

| Behavior | Source | Evidence |
| --- | --- | --- |
| Three navigation links, normal Tab and scoped directional keys | NavBar.jsx | NavBar.test.jsx; portfolio-responsive.spec.js |
| Scene replaces biography; identity, SEO and social metadata retained | Home.jsx | Home.test.jsx |
| CMS projects, bundled application routes, safe destination handling | Home.jsx | Home.test.jsx, including late CMS and normalized owned routes |
| Original forest; separate transparent desk/quill/inkwell | landing-scene.css; assets/landing | Six-size scene/editor/calendar renders; asset README |
| Idle rotation, Start/Pause, manual arrows, utility pause | useCarouselRotation.js; SceneContext.jsx | Home.test.jsx; Studio/editor idle browser checks |
| Center utilities, focus/return, retained editor draft | Home.jsx; SceneContext.jsx; WritingContext.jsx | Home.test.jsx; editor browser workflows |
| Editor formatting, history, browser Save, plain-text Download | TextEditor.jsx; writingDocument.js | TextEditor.test.jsx; writingDocument.test.js; actual browser download/reload checks |
| Quill/inkwell click/drag/reset, keyboard movement | WritingSet.jsx; useObjectGesture.js | Shared gesture tests; bounded writing-set browser check |
| Real grids, Today, month/year/leap boundaries, keyboard dates | Calendar.jsx | Calendar.test.jsx; six-size browser/axe checks |
| Minute clock, midnight/DST/resume, approximate moon helper | useMinuteClock.js; WeatherWidget.jsx | useMinuteClock.test.jsx |
| Permission-only location, inferred units/timezone, stale/error states | weather.js; WeatherWidget.jsx | WeatherWidget.test.jsx; weather.test.js; mocked provider browser check |
| Weather drag/click/right-click/two-contact intent isolation | useObjectGesture.js | Gesture tests; real mouse drag/right-click browser checks |
| Existing Studio and Page Builder contracts | Existing providers/routes; optional RichTextEditor extensions | Full unit suite; existing rich-formatting/wizard browser workflows |

## Interaction and storage

All center utilities and the existing nonmodal CSS Studio stop automatic and
manual carousel movement. Hover, pointer gestures and hidden tabs pause idle
rotation. Keyboard interaction holds rotation until Start is pressed.
Reduced-motion users receive the static manual presentation. Resumption starts
a fresh interval without catching up missed slides. Inactive cards are inert.
Navigation arrow handlers remain scoped to header links.

The editor is a real DOM writing surface. It reuses Page Builder's selection,
UTF-16 range mapping, IME reconciliation, safe paste and formatting engine via
optional editor props; default Page Builder tools remain available. It supports
paragraphs, two visual heading styles, bold/italic/underline, bullet/numbered
lists, undo/redo, word count, title, Save, Download and Close. On narrow screens,
numbered lists remain available through the paragraph-style selector. Toolbar
controls and date targets retain the 44px minimum, so narrow toolbars can wrap.
Paragraph boundaries have separate undo steps from adjacent typing.

Save writes a validated versioned document to
`portfolio:writing-document:v1` in localStorage. It is one browser-local document,
not a file manager or synchronized account. History is bounded to 50 entries;
documents to 20,000 text characters and the existing rich-node limits. Only text,
line breaks, three formatting marks and allowlisted paragraph styles are stored.
No arbitrary HTML, links, icons or CSS enter the writing format. Paste/drop use
plain text, and React renders it as text. Download creates a UTF-8 `.txt` Blob,
removes rich formatting, preserves line breaks and emits simple list prefixes.
Object URLs use the existing revocation helper. Failed saves leave the draft
intact and report failure. Malformed/unsupported stored data is left untouched;
editing and downloading remain available, while overwrite Save is disabled.
The UI explains the draft and plain-text behavior. Unsaved text does not survive
reload; an explicit successful Save does.

The writing set moves together using pointer capture and an eight-pixel drag
threshold. The inkwell remains inside an inner tabletop rectangle; the feather
rises above it. Click opens the editor, arrows move a focused assembly by 10px,
and Enter/Space open it. Drag completion/cancellation cannot activate the editor.
Pinch zoom is allowed on both object handles; surrounding scrolling and native
context menus remain available. The desk is directly below the cards, with
carousel controls following it. Narrow perspective cards are deliberately
cropped by the scene window rather than expanding page width.

The weather object opens existing Studio on click and the calendar on right-click
or a stationary two-finger tap. Both contacts are tracked through completion;
motion/pinch, third contacts, mixed pointer types and long-press are rejected as
calendar taps. Cancellation rolls back movement and releases capture. The full
weather/time group stays bounded to the viewport, including after content changes.

Granted coordinates stay in memory and are rounded to two decimals before a
request to the fixed HTTPS Open-Meteo endpoint. Requests omit credentials and
referrers, have an eight-second timeout, and validate timezone/data with a 16 KiB
response limit. Last/stale readings are labeled honestly. Readings older than
45 minutes are stale. Units inferred from IANA timezone are approximate; a unit
switch is available. Weather, clock and calendar share the location timezone;
before weather is available they use device time. The moon uses the existing
approximate mean-synodic calculation and northern-view orientation. Compact
mobile weather controls keep navigation separate and date/time readable; the
phase explanation remains accessible to assistive technology.

## Setup and verification

Use `.nvmrc` (Node 22.22.2), `npm ci`, and `npm run dev`. No new dependencies,
lockfile changes, provider secrets or environment variables are required.
Geolocation needs HTTPS or localhost. Automated weather/CMS data are mocked;
actual provider availability and physical-device permission behavior are not
established by these tests.

Session runtime: Node 22.22.2, npm 11.9.0, Playwright 1.64.1 and system Chromium
154.0.8037.57. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium` for this
session's browser tests. Matching Playwright browser installation was rejected
with HTTP 403 “Domain forbidden” for cdn.playwright.dev. Firefox, WebKit and the
matching Chromium build were unavailable. This is not three-engine release
approval.

Latest completed full unit suite: **565 tests passed across 70 files**, run alone
with `npm test -- --maxWorkers=1`. Existing photo-export tests can hit their
five-second timeout under concurrent heavy browser load; timeouts were not raised.
The editor's browser workflow already verified formatting, local save/reload,
plain-text file contents, literal pasted HTML, failed storage writes, retained
drafts and the beforeunload guard. Existing Page Builder rich-formatting and
wizard-local-undo workflows passed after extending the shared editor.

Earlier broad Chromium suite: **89 passed, 2 failed out of 91**. The cross-engine
JSON restore scenario timed out after 120 seconds. Export snapshots differed at
390/768/1280px. An untouched detached checkout of the base reproduced the exact
same differences (47,584 / 11,180 / 11,247 pixels), establishing that those image
differences predate this patch. Existing snapshots were not updated. That
checkout was removed. Final focused results are recorded below after completion.

Security boundary review covers HTTP(S)-only project destinations, React-rendered
CMS/document text, strict bounded local document validation, plain-text paste and
download, fixed bounded weather requests and no credential persistence. Page
Builder preview/export isolation is unchanged. This is not a complete security
assessment.

## Renders and remaining review

Actual browser PNGs live under `screenshots/`: `landing-{width}.png`,
`calendar-{width}.png` and `editor-{width}.png` for 320, 390, 768, 1440, 1920 and
3840 CSS pixels. Captures wait for image decoding, use reduced motion and empty
controlled CMS results, and grant no weather location. Clocks show capture-time
values. No live weather or personal events are fabricated. Editor renders are
new visual-review drafts against the now-approved supplied references.

Reviewable differences include current header/weather art, card order, necessary
44px controls, explanatory draft/save text and the scrollable scene. The original
forest is preserved. Real phones with actual keyboards, physical two-finger taps,
zoom/assistive technology, and target TV browsers remain unverified. Viewport
height changes approximate keyboard occlusion but do not establish real-device
compatibility. Physical TV remotes are excluded by repository policy.

Final focused Chromium run: **33/33 passed** using
`npm run test:e2e -- e2e/landing-scene.spec.js e2e/portfolio-responsive.spec.js
--project=chromium --workers=1`. This includes all six scene/calendar/editor
viewports, scoped axe scans, Studio light/dark high-contrast editor surfaces,
44px utility controls, permission/units, weather and writing-set gestures,
local persistence and actual text downloads, unsaved draft retention, caret/list
editing through a smaller viewport, editor/Studio idle rotation holds, navigation
across routes and bounded 4K scaling. A regression case reproduces CMS loading
finishing between pointerdown and pointerup: reserving status space prevents the
launcher from shifting and cancelling the click. Final focused unit rerun:
**19/19 passed** after the paragraph-style indicator and footer stabilization.

Production build passed (394 modules), Page Builder source requirements passed
(all 130 canonical decisions/options), and both bundle budget gates passed.
`git diff --check` passed. Existing Page Builder rich-formatting and wizard-local
undo browser regressions passed separately (**2/2**). The broader suite's earlier
failures and unavailable engines remain as described above; they are not claimed
fixed by this focused pass.

## Cross-browser stabilization (October 23)

The [first PR CI run](https://github.com/BerinKarjala/portfolio/actions/runs/39911569965)
passed all 565 unit tests, then finished the browser suite with 305 passed,
6 skipped and 4 failed. The failures were Firefox weather drag/reset, Firefox
writing-set drag/reset, Firefox synthetic paste and WebKit's suggested filename.

The gesture hook now ends a captured mouse session when the pointer returns
without any buttons pressed, preserving the last position. This recovers from
a missed release outside the window and leaves Reset controls usable. A new unit
regression failed against the original hook and passes with the fix. The weather
browser regression still releases the pointer outside the viewport.

The writing-set browser test now crosses the tabletop boundary with an in-viewport
pointer and explicitly checks that the object moved; Firefox does not reliably
deliver synthetic moves outside the window. The paste fixture fills the actual
ClipboardEvent transfer, following the existing Page Builder fixture. The download
assertion accepts WebKit's space-to-underscore normalization while retaining the
exact plain-text byte assertion.

Verification on Windows with Node 22.22.2 and the matching installed Playwright
engines:

- **43/43 focused unit tests**, across 9 files, with one worker.
- **12/12 browser checks**, covering all four affected workflows in Chromium,
  Firefox and WebKit, with one worker and no retries.
- Production build, all 130 Page Builder source decisions, both bundle budget
  gates and `git diff --check` passed.

The browser command was `npm run test:e2e -- e2e/landing-scene.spec.js --workers=1
--retries=0 --grep 'dragging the weather|plain pasted|writing set moves|editor formats'`.
The focused unit command was `npm test -- src/features/landing-scene
src/components/Home.test.jsx src/components/Calendar.test.jsx
src/components/NavBar.test.jsx --maxWorkers=1`.

These are focused results. Broader local attempts hit test deadlines, including
the 4K responsive route workflow; a complete local suite pass is not established.
No test deadlines or visual snapshots were changed. Full PR CI must run against
the stabilization commit, and the physical-device review gaps above remain open.
