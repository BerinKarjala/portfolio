# Post-merge release verification

The repository owner merged M5 [PR #233](https://github.com/BerinKarjala/portfolio/pull/233) as `095d567db1a1f18a9a81a87f8945ea677ed486a6` on 2026-10-18. Netlify automatically published production deploy [`6ad49077f682b72b45d60c11`](https://app.netlify.com/projects/berinkarjala/deploys/6ad49077f682b72b45d60c11), ready at 09:25:45 UTC. Codex performed no merge or manual production deployment.

Live URL: https://berinkarjala.netlify.app/projects/page-builder

## Immutable M5 and production evidence

[CI run 39114567236](https://github.com/BerinKarjala/portfolio/actions/runs/39114567236), on feature head `feecc3c`, passed **130 unit/integration tests across 21 files**, **95 browser cases**, four intentional skips and zero flaky retries. All nine exported-page images and both Chromium canvas images compared normally; trace integrity, production build, bundle and large-page gates passed. The merged application/public/package/configuration tree was compared with that tested tree and matches.

Live production workflows in Linux Chromium **154.0.8037.57**, at **1440×1000** and **390×844**, passed: HTTP 200/source panel; keyboard launch/full-viewport dialog/close focus; guide completion; project creation/autosave/reload; reset cancellation/independent copy; opaque compiled preview; scoped export-controls axe; actual ZIP CRC32/exact two files/zero scripts; zero unhandled page errors. Production headers match configured HSTS, nosniff, frame-denial, referrer and device-permission values. Desktop launcher and mobile export appearance were inspected. Isolated browser contexts held only synthetic local project data; no form or CMS writes occurred.

These live viewport checks do not establish physical Android/iOS, current branded-browser or screen-reader conformance. Remaining acceptance is tracked in [issue #234](https://github.com/BerinKarjala/portfolio/issues/234).

## Additional automated release coverage

[Follow-up PR #235](https://github.com/BerinKarjala/portfolio/pull/235) adds `e2e/page-builder-acceptance.spec.js`. It changes tests and documentation only; no application code, dependency versions or visual baseline images change.

- **Six directed browser-engine transfers:** each target engine restores JSON actually downloaded by each other engine, using separate browser processes. A structured rich-text project includes Unicode, internal links, two linked instances and a two-level preset graph. Checks include source autosave, native JSON download/file input/restore report, fresh project/element IDs, validated master/preset references, effective style/content equivalence and compiled preview rendering. Master/preset identifiers remain project-local, as in the existing whole-project backup contract.
- **Failed resources/providers:** real route aborts cover external background, native audio/video and YouTube/Vimeo/Maps frames. Native media is loaded on demand without playback. Observable media failures appear in preflight; cross-origin iframe/background status stays unknown. Fallback content/color, blocked export until warning acknowledgment and exact unchanged saved project data are checked. This does not claim that a browser can reliably detect all cross-origin failures.
- **320px keyboard/reflow:** guide Tab/Shift+Tab containment, Escape, drawers, insertion, separate text/insertion Undo/Redo, generated preview, horizontal workspace fit, scoped axe and close/focus restoration. Each activated control must be focused, within the viewport and unobscured. Reduced motion is enabled. This exercises narrow CSS reflow; actual browser UI zoom at 200%, physical keyboards/switches and assistive technology still require manual review.

Local Chromium verification passed the resource/provider and 320px cases. Firefox/WebKit binaries are available in CI, not this local workspace; transfer evidence must come from the three-engine run. Current follow-up head status and reports are on [PR #235 checks](https://github.com/BerinKarjala/portfolio/pull/235/checks). Do not interpret coverage descriptions as results for a run that has not completed.

## Remaining human acceptance

Keep these open until actual results or explicit, individually reviewed exceptions are recorded in #234:

- Current desktop Chrome/Edge/Firefox/Safari, physical Chrome Android and Safari iPhone/iPad workflows.
- NVDA/VoiceOver, switch operation, actual 200% browser zoom, IME and visible/unobscured focus review.
- Real operating-system file-picker/download transfer and provider behavior beyond controlled browser-engine tests.
- User design/screenshot and performance-threshold acceptance; final approval of remaining exceptions.

The owner's merge and production publication are recorded facts. They do not assert that these unperformed checks passed. No additional merge or production deployment is part of this follow-up.
