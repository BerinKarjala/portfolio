# M5 client accessibility and reflow verification

October 21, 2026. Branch `css-studio`. This records the failed three-engine run
at `ad59d104b6f0e97ded44b4e36d5607bc60b1a026` and its local follow-up. The follow-up
commit and new three-engine results will be recorded with the PR after CI; they
are pending here. These client checks perform no live inference.

## Three-engine evidence before the follow-up

[Focused run 39570343916](https://github.com/BerinKarjala/portfolio/actions/runs/39570343916)
used zero retries and retained separate reports, screenshots and traces:

| Engine | Studio cases | Actual image-storage cases |
| --- | ---: | ---: |
| Chromium 156.0.8078.4 | 20 passed, 1 failed | 5 passed |
| Firefox 157.0 | 19 passed, 2 failed | 5 passed |
| WebKit 27.2 | 20 passed, 1 failed | 5 passed |

All 17 established Studio cases and all 15 storage cases passed. Both new
representative photo/surface cases passed in every engine. The keyboard/resize
case passed Chromium and WebKit; Firefox failed in the keyboard helper. The
enlarged-text case failed in all three engines. A failed overall run is not
cross-browser acceptance for the new increment.

The baseline at `6fa22a2` had passed all 66 earlier Studio/storage checks across
the three engines. Broader portfolio run
[39564020424](https://github.com/BerinKarjala/portfolio/actions/runs/39564020424)
passed 219 checks with six recorded skips. Those results do not replace the new
M5 regressions above.

## Root causes and corrections

At a 320 CSS-pixel viewport with the root text preference set to 200%, all three
CI engines reported a 341-pixel document width. Enlarged headings and long gallery
words painted beyond their narrower content boxes. This was a product overflow,
not an allowance to hide or clip content. The local Chromium build reproduced it
deterministically with the supported monospace preference: document width was
354 pixels, and the Projects heading had a 190-pixel content box with 289 pixels
of text. The Studio canvas now inherits `overflow-wrap: anywhere`, preserving
the text while allowing words to fit. The regression checks every supported
system/serif/monospace choice at 200%, retaining the same maximum of 321 pixels
for the 320-pixel viewport.

Firefox's trace showed focus reaching the final Page Builder card and remaining
there through repeated forward Tab presses. Newly inserted nonmodal tools were
earlier in DOM order; the helper assumed the browser would wrap through browser
chrome back to them. Firefox did not. The helper now chooses real Tab or Shift+Tab
according to the target's position relative to current focus. It retains the same
reachability, focus, modal and state assertions, without a focus trap or
programmatic shortcut to each target.

The earlier M5 implementation also corrected a dark-themed Return Home
link-as-button at 1.34:1 contrast, fixed-size Studio typography that ignored an
enlarged root preference, and reduced-motion transitions/fixed-photo scrolling.
Its styles use relative text sizing, wrap the enlarged example-dialog header and
apply the appropriate button foreground to that existing button surface.

## Local follow-up results

Node 22.22.2; system Chromium 154.0.8037.57 through
`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`:

| Check | Result |
| --- | --- |
| New three-font enlarged-text regression before the wrapping correction | Failed at 354 pixels, confirming the local red case. |
| Four new M5 acceptance cases after the correction | All passed, 18.6 seconds. |
| Existing 17 plus four new Studio browser cases | All 21 passed, approximately one minute, zero retries. |
| Production build | Passed, 381 modules. |
| `git diff --check` | Passed. |

```sh
npm run build
npm run test:e2e -- e2e/css-studio.spec.js e2e/css-studio-acceptance.spec.js --project=chromium --workers=2 --retries=0
```

The focused CI selector includes both files. The pending matrix consists of
21 Studio plus five storage cases per engine, 78 cases total. Local Chromium
success does not establish that the follow-up passes Firefox or WebKit.

## Coverage and remaining scope

The bounded photo sample includes the four seasons and representative Christmas,
Holi, Diwali and Hanukkah appearances, spanning Light/Dark and High Contrast
on/off. Actual paragraph, navigation-link, button and control colors are measured
against their opaque painted ancestor surfaces; focus outlines are checked
against their adjacent surface. Loaded bright-snow and dark-aurora crops at
390 and 1440 pixels were captured and visually inspected. This supplements the
separate complete 80-palette token traversal; it is not a 248-photo-by-appearance
matrix or a complete cultural/subject review.

Keyboard coverage includes launch, native selection, Styles/Chat, draft entry,
examples Tab/Shift+Tab/Escape, ordinary page links, close-to-moon/gallery focus,
and resizing through 320/390/1440/3840 while retaining theme/draft and phone
drawer exclusivity. Enlarged text checks use an emulated 320-pixel viewport and a
200% root-text preference proxy, not native browser zoom or physical devices.
The enlarged dialog keeps its Close action within the viewport and scrolls
vertically. Reduced-motion evidence checks the actual Return Home transition and
photo attachment; it does not establish a complete animated-template or
JavaScript smooth-scroll sweep.

No full WCAG AA conformance, assistive-technology certification, physical
phone/TV compatibility, real microphone matrix, native zoom coverage or full
photo/cultural acceptance is claimed. Physical TV remotes are excluded from
release acceptance by the owner's recorded October 21 decision. Public inference,
image/refinement, provider evaluation and production deployment have separate
gates; this client follow-up does not satisfy them.
