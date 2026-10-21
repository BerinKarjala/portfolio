# Keyboard drag readiness (#239)

Issue [#239](https://github.com/BerinKarjala/portfolio/issues/239) reports a
Chromium drop that left the palette handle pressed and inserted no heading.
The original CI logs confirm the failure and successful retry; they do not
record listener readiness or focus. The original trace was not inspected in
this investigation because its artifact download redirected to a storage host
blocked by the development environment.

## Controlled cause and fix

In `@dnd-kit/core` 6.3.1, `KeyboardSensor.attach()` calls `handleStart()` before
registering its document keydown listener in `setTimeout`. Follow-up arrow,
drop, and cancel keys arriving before that callback are lost. Canvas collision
detection falls back to `closestCenter`, so a blank page's only drop zone can
already have `data-over=true` without an arrow being processed. That attribute
does not establish sensor readiness.

The sensor unit test holds timers, dispatches pickup/arrow/drop with focus
preserved, and reproduces the lost keys using the stock sensor. Running only
the pending attachment makes the same keys work with the same focus/context.
This confirms a readiness defect consistent with the report; it does not prove
that the unavailable original trace had the identical cause.

`ReadyKeyboardSensor` registers listeners synchronously and ignores the exact
pickup native event as it bubbles to document. Coordinate calculation,
scrolling, termination, and cancellation continue through dnd-kit. The adapter
uses compiled private members of version 6.3.1; its contract tests must pass
when upgrading the library.

Unit cases cover immediate arrows, Space/Enter completion, Escape, focus loss,
resize/visibility cancellation, and removal of listeners without a deferred
reattachment. Browser regressions hold the page clock after boot, verify that
the focused pressed handle and active drop zone render before any deferred
timer runs, then check Space/Enter insertion or Escape cancellation and a second
gesture. The existing native-keyboard/Layers workflow remains covered.

## Verification

The CI workflow runs keyboard cases across Chromium, Firefox, and WebKit with
two workers and zero retries. Its full browser suite also uses zero retries.
No sleep, assertion tolerance, or retry was added to accommodate this defect.
The final run and results are recorded in the pull request.
