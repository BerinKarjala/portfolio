# Portfolio development standards

The portfolio is a responsive React DOM website built with Vite and hosted on
Netlify. Develop mobile first and support phones, tablets, large monitors, and
TV browsers. Native mobile and TV applications are outside this platform scope.

## Development and quality control

Follow the [portfolio working methods](working-methods.md) for issue creation,
task branches, early draft PRs, mandatory Netlify previews, owner acceptance and
owner merge. Linked issues close on merge; merges into main deploy automatically.

1. Define observable acceptance criteria for each feature or fix.
2. Write a meaningful failing test before changing the affected behavior.
3. Implement the smallest change that satisfies the acceptance criteria.
4. Refactor while preserving passing tests. Add regression cases for discovered
   edge cases, rather than tests that duplicate implementation details.
5. Run relevant unit/integration tests, browser workflows, accessibility checks,
   production builds, and performance gates. Record the exact tested commit and
   browser/runtime versions when reporting release evidence.
6. Keep the draft PR current with the problem, resulting behavior, exact tested
   commit, test evidence, direct Netlify preview link, acceptance checklist and
   material limitations. Review the complete diff, required CI results and preview
   before marking it ready for the owner's acceptance test. The owner merges;
   verify the automatic production deployment and important live routes afterward.

Use the Node version in `.nvmrc` and `npm ci` with the committed lockfile.

## Local and cloud working methods

Follow the [browser testing split](browser-testing.md). The memory-constrained
local machine uses the existing React `localhost:3000` and Sanity `localhost:3333`
servers for three read-only smoke checks in one Chromium worker. The frontend
must serve the active task branch; identify its checkout before testing. Run
`npm run test:e2e:local`; the ordinary `test:e2e` command selects this tier outside
CI. Respect memory deferrals and do not start duplicate dev servers.

Use targeted local unit tests with `--maxWorkers=1`. Full browser matrices,
concurrent builds, Studio builds and native image/runtime checks run in cloud CI.
Use focused checks while iterating. The complete existing applicable cloud release
coverage and current Netlify preview must pass before marking a PR ready for
owner acceptance. Required GitHub checks block merging while pending or failing.
Run `npm run test:e2e:cloud` or `test:e2e:full` inside CI; use GitHub workflow
dispatch from the local machine. A local memory deferral is not a pass and does
not waive any release check. Record which checkout the existing servers serve.

## Responsive acceptance

- Test CSS viewports at 320×740, 390×844, 768×1024, 1440×900, 1920×1080,
  and 3840×2160. Check intermediate sizes when a breakpoint or layout changes.
- Keep content within the viewport without hiding overflow to mask layout bugs.
- Give header links at least 44×44 CSS pixels of interactive area and an obvious
  keyboard focus indicator.
- Preserve normal Tab, Shift+Tab, Enter, and browser shortcuts. Within the primary
  navigation, directional keys move between links in document order and wrap at
  the ends; Home/End reach the first/last link. Focus movement does not activate
  links. These handlers apply only to header links, leaving editors and games
  with their own keyboard behavior.
- At wide CSS viewports, scale rem-based typography, spacing, and content widths
  together, up to 150% of the reader's default font size. The scaling begins
  above 2560 CSS pixels with a default 16px font; it is bounded at 3840px.
- Test Chromium, Firefox, and WebKit in CI. Automated layout tests use controlled
  CMS content; they do not establish that every future content entry will fit.
- Inspect mobile and 4K screenshots. Check real phones and target TV browsers,
  viewing-distance readability, browser zoom, and
  assistive technology before claiming device-specific compatibility. A physical
  4K panel can expose a smaller CSS viewport; screen resolution alone does not
  identify viewing distance or request a TV layout.
- Physical TV remotes will not be verified and are excluded from release
  acceptance by the project owner's October 21, 2026 decision
  (AC-EX-TV-REMOTE). This does not establish physical remote compatibility;
  responsive TV-browser layouts and other input/accessibility checks remain
  in scope.

In cloud CI, run `npm run test:e2e:cloud -- e2e/portfolio-responsive.spec.js` after building for the
portfolio layout/navigation checks. The existing Page Builder CI workflow runs
this file with the rest of `e2e/` in all three browser engines.

## Security and release checks

- Review security impact alongside correctness: external content and links,
  generated HTML, browser storage, network requests, deployment configuration,
  and dependencies when a change affects those boundaries.
- Keep secrets out of source control and browser bundles. Review dependency and
  lockfile changes, Dependabot alerts, and the Studio dependency guardrails.
- Preserve preview isolation and validation contracts when changing Page Builder.
- Separate confirmed vulnerabilities from hardening suggestions. Document
  evidence, affected paths, remediation, and verification for security fixes.
- Do not treat a passing build, an accessibility scan, or a dependency check as a
  complete security audit. Report unavailable tools and unperformed checks.

The cloud release baseline is `npm run check:page-builder`, `npm test`,
`npm run build`, `npm run check:page-builder:build`, and `npm run test:e2e:cloud`.
Run Studio checks as well when Studio code or dependencies change.
