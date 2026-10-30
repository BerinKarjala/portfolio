# Landing redesign implementation

Current owner direction supersedes the historical target-TV requirements below:
online TV browsers and devices are outside the project's scope. Phone, tablet,
and desktop web layouts remain in scope.

The current moon and carousel revision also supersedes historical sizing and
idle timing below. The moon diameter is 65px smaller than the prior responsive
size; its callout stays to its left and may leave the viewport while dragging.
Project cards share the reduced Four Seasons Studio dimensions, with a 160px
minimum width on narrow phones for usable controls. The idle carousel advances
continuously over each 12-second interval, pausing for interaction and honoring
reduced motion. The phone minimum is an implementation assumption for owner
review, not a separate approved requirement.

The October 25 carousel refinements at the end of this document supersede the
original carousel timing, bottom controls, and fullscreen behavior below. Earlier
sections retain the original implementation and its historical evidence.

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
arrows; the text editor temporarily replaces the selected card; Close restores that
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
| Center editor, focus/return, retained editor draft; full-screen calendar | Home.jsx; SceneContext.jsx; LiveMoon.jsx; WritingContext.jsx | Home.test.jsx; live moon and editor browser workflows |
| Editor formatting, history, browser Save, plain-text Download | TextEditor.jsx; writingDocument.js | TextEditor.test.jsx; writingDocument.test.js; actual browser download/reload checks |
| Quill/inkwell click/drag/reset, keyboard movement | WritingSet.jsx; useObjectGesture.js | Shared gesture tests; bounded writing-set browser check |
| Real grids, Today, month/year/leap boundaries, keyboard dates | Calendar.jsx | Calendar.test.jsx; six-size browser/axe checks |
| Minute clock, midnight/DST/resume, approximate moon helper | useMinuteClock.js; LiveMoon.jsx; lunar.js | useMinuteClock.test.jsx; lunar.test.js |
| Permission-only location, inferred units/timezone, stale/error states | weather.js; useCurrentWeather.js; LiveMoon.jsx | WeatherWidget.test.jsx; weather.test.js; mocked provider browser check |
| Floating moon drag/click/right-click/two-contact intent isolation | FloatingMoon.jsx; useFloatingMoon.js | Motion tests; real mouse drag/right-click browser checks |
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

The floating moon is outside the header on Home, Projects and About. Clicking it
opens weather and time details; Calendar, right-click and a stationary two-finger
tap open the full-screen calendar. Both contacts are tracked through completion;
motion/pinch, third contacts, mixed pointer types and long-press are rejected as
calendar taps. A drag returns toward the home anchor over eight seconds under
normal motion. The separate header Studio control and project-gallery entry open
the existing tools; the moon does not open Studio.

Granted coordinates stay in memory and are rounded to two decimals before a
request to the fixed HTTPS Open-Meteo endpoint. Requests omit credentials and
referrers, have an eight-second timeout, and validate timezone/data with a 16 KiB
response limit. Last/stale readings are labeled honestly. Readings older than
45 minutes are stale. Units inferred from IANA timezone are approximate; a unit
switch is available. Weather, clock and calendar share the location timezone;
before weather is available they use device time. The moon uses the existing
approximate mean-synodic calculation and selected-location hemisphere. Until a
weather reading is available it shows no weather overlays. Manual city/ZIP input
and additional concurrent precipitation and wind observations remain separate
follow-up work in epic #290.

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

## Carousel refinements (October 25, 2026)

Source brief: `Landing_Page_Carousel_Handover_2026-10-25.zip`, beginning with
`CODEX_PROMPT.md`; all nine manifest-listed files matched their SHA256 hashes.
Baseline: `98fafc9039858018ba8f5526a241214f08b7aff6`. Branch:
`feat/landing-carousel-refinements`. The handover's `after.png` governs arrow
placement and the desk boundary; its pasted arrow backgrounds are not UI assets.

Reviewable defaults are 12,000 ms between slide starts, a 1,600 ms transform
transition, and immediate adjacent arrow stepping followed by slow rotation in
that direction. A selected/focused card holds persistently until an arrow
command. Rapid commands keep only the latest pending direction. Reduced-motion
users retain immediate manual stepping without an automatic timer. Utility,
Studio, visibility, pointer and object-gesture protections remain independent.

The gallery owns two real side gutters. Its final flow child is the desk, with
spare viewport height added above it and real scrolling when content needs it.
Loading/status text lives in a stable gallery overlay; the bottom utility,
rotation and counter groups are removed. Header height is measured rather than
assumed. Quill and header Calendar refs provide connected utility return targets.
The desk art frame clips the unchanged WebP's 44 transparent bottom rows
(680/724 of its natural height), so the painted desk reaches that boundary.
Its image is positioned within the frame so intrinsic content cannot enlarge
the crop. The quill keeps its ordinary rem-based size but is capped at 38vw
to prevent horizontal overflow at 200% text sizing.

Each card keeps one inline nonmodal dialog. Expansion calls native `showModal`
to promote that same DOM into the browser top layer, outside ancestor clipping
and perspective. This preserves editor DOM/selection/history and calendar local
state without duplicate tools or remounting. The native modal makes the
background inert; Exit/Escape restore scroll/body styles and focus. Escape is
captured before the editor's own Close shortcut. Inherited Studio selectors and
tokens remain available in the top layer. Project/Studio actions first exit
the modal, and exiting fullscreen does not close an open utility.
The landing editor opts into preserving its formatting selection while blurred;
keyboard/pointer completion records it before focus moves. The shared rich-text
component's default Page Builder behavior remains unchanged. Weather refitting
respects the header's natural document position during scrolling/modal resizing,
and the mobile header stacks its columns when enlarged text needs the width.

Card gestures are separate from the weather/quill gesture hook: upward motion
of at least 60 px, at least 1.5 times horizontal movement, within 500 ms; double
taps within 300 ms and 24 px. Multi-contact, cancellation, drag-return, nested
controls and editor/date text are excluded. The accessible Expand button is an
additional route, and trailing synthetic clicks are suppressed.

| Acceptance | Implementation and evidence |
| --- | --- |
| T01–T02: side controls and stable loading | Home, scene CSS; six-size geometry/hit/focus checks; retained loading-during-press regression |
| T03–T04: cadence, wrap and bounded intent | useCarouselRotation units; motion file with intermediate transforms, PNGs and video |
| T05–T07: real launchers and desk edge | Home, SceneContext, WritingSet, WeatherWidget; six-size document geometry and short-viewport cases |
| T08–T12: selection, direction and blockers | rotation and Home units; browser directional/utility holds; existing visibility/reduced-motion tests |
| T13–T16: gestures and exclusions | useCardGesture units; cross-engine gesture/nested-control browser cases |
| T17–T20: viewport, state, focus and theme | CardPresentation/Home units; six-size project/editor/calendar expand/exit; short-viewport theme/axe checks |
| T21: late CMS and safe identity | retained Home normalization, unsafe destination, and late Studio CMS tests |
| T22: retained features | migrated landing-scene browser tests plus existing Page Builder, CSS Studio/image and server release workflows |

Local targeted units passed 64 tests across 11 files with one worker before the
final edge-case additions. Focused weather tests later passed 6/6; editor
selection tests passed 7/7 after two new keyboard/pointer cases failed against
the previous behavior. Full-source validation is assigned to cloud CI.
The local smoke command returned resource result **75 / deferred**
with 171,589,632 bytes (163 MiB) available. No browser was launched; this is not
a pass. Runner Node: 22.22.2. The existing React/Sanity listeners serve
`C:/dev/portfolio/portfolio` at commit
`6cf6150d8f44f251765c5579405d5e71654f0f7b`, with an unrelated modified lockfile.
The test runner is this isolated worktree, not the server checkout. Neither
existing server nor its checkout was changed. No local full matrix, build,
native-image suite or extra server was run. Collection alone confirmed the
unchanged three-smoke contract and the full cloud matrix's 357 cases.

Final release/test head: `d35808a1c352282530bc5bed345b4e715e0c0bb9`.
Landing captures/dedicated checks: `da9c708d4d285c82f99e8ecedc34f31f1301328a`.
Runtime, assets, server and dependency files are byte-identical between those
commits. The only difference is CSS-pixel encoding for existing responsive
route PNG attachments, retaining native layout density, all assertions and the
30-second deadline. A prior passing 4K WebKit route case spent 17.1 of 29.1
seconds producing two high-density PNGs; a later full run reached its final
axe scan and exhausted that budget. No accessibility checks were removed. The final 4K WebKit route case
completed in 15.4 seconds with its geometry and axe checks intact.
Cloud runtime: Ubuntu 24.04, Node 22.22.2, Playwright 1.64.1; Chromium
156.0.8078.4, Firefox 157.0, WebKit 27.2. No dependency or artwork files changed.

| Validation on that commit | Result |
| --- | --- |
| [Complete release matrix, source/contracts, units, build and bundle gates](https://github.com/BerinKarjala/portfolio/actions/runs/40176793522) | 351 passed, 6 existing engine-specific skips; 631/631 units in 80 files; source/contracts, production build and both bundle budgets passed |
| [Focused landing evidence](https://github.com/BerinKarjala/portfolio/actions/runs/40174553495) | 42/42 browser cases; 631/631 units across 80 files; build and source/bundle checks passed |
| [Dedicated CSS Studio / image storage](https://github.com/BerinKarjala/portfolio/actions/runs/40174955819) | 21 CSS Studio + 5 image-storage cases per engine; 78/78 across three engines; focused units/build passed |
| [Server and native runtimes](https://github.com/BerinKarjala/portfolio/actions/runs/40174959094) | 143 focused units and 8 admission/image/browser-fetch runtime checks passed |
| Cloud rehearsal of the local smoke contract | Three smoke checks and eight launcher/resource-policy checks passed; this does not change the local deferral above |

The six existing full-matrix skips come from three Chromium-only Page Builder
cases in Firefox/WebKit. No new landing case is skipped.
Browser workers remain capped at two, with zero retries. The default 181-case
matrix remains enabled for PRs; the complete matrix contains 357 cases. A final
documentation-only commit records this evidence without changing runtime/tests.

The new cloud cases attach browsing, editor, calendar and expanded variants at
320×740, 390×844, 768×1024, 1440×900, 1920×1080 and 3840×2160. Separate motion
cases record non-reduced video and PNG stills at mobile, desktop and 4K.
The timing cases normalize pixel density to 1 across engines (3840 CSS pixels
therefore produce physical 4K), while layout tests retain engine defaults,
including WebKit at 2x density. Native RAF samples begin at the actual click;
PNG encoding runs afterward. These new motion cases retain video plus failure
DOM/network/source traces without a second continuous trace screencast. Their
gates still require more than three distinct poses, over 700 ms of observed
intermediate movement, and the 1.6-second CSS duration. New six-state/motion
cases have a 90-second capture budget; existing UI deadlines and retries are
unchanged. The manual `landing` workflow option is diagnostic coverage only;
full/default and dedicated release workflows remain required.
Gesture evidence includes trusted touchscreen double taps in Chromium/WebKit
and a trusted Chromium swipe; Firefox exercises synthetic pointer paths because
Playwright does not expose a native Firefox touchscreen context. The motion
sampler records native frames without a pending evaluation blocking WebKit
input dispatch. Editor state cases type through normal `beforeinput` handling,
rather than replacing the controlled editable DOM with a fixture.
These renders require visual review against the supplied arrangement. Physical
phones/OS gestures, keyboard occlusion, zoom/assistive technology and target TV
browsers remain unverified; physical TV remotes remain excluded. No merge,
production publication or CMS mutation is authorized by this handover.

The focused run's `page-builder-browser-evidence` artifact contains 144 PNGs,
nine native motion videos and nine transform streams. PNG widths were checked
against their CSS viewports. Representative mobile/desktop/4K renders and
extracted intermediate WebKit video frames were inspected against the supplied
arrangement: side arrows, the painted desk edge, and expanded utility controls
are visible. The full set remains a visual-review draft for the owner. A local
index at `C:/dev/portfolio/.handover/review/da9c708/index.html` groups the same
source artifacts by browser and viewport; its player only crops gray recorder
padding for viewing and also links the original video bytes.
