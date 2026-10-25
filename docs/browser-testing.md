# Browser testing across localhost and cloud

Localhost runs the fast development smoke tier. GitHub Actions runs the complete
release evidence. The split bounds local resource use without dropping cloud
coverage or treating a deferred local run as a pass.

| Tier | Work | Environment |
| --- | --- | --- |
| Local smoke | Mobile navigation, Page Builder route, Sanity login/workspace boot | Existing React at http://localhost:3000 and Sanity at http://localhost:3333; one headless Chromium worker |
| Cloud regression | Default 167 cases; complete 315-case matrix when selected | Production build/preview in Chromium, Firefox and WebKit |
| Dedicated cloud checks | Full CSS Studio and image-storage matrices, server/native image/browser runtimes, accessibility/snapshots/performance, full units and builds | Existing GitHub Actions workflows |
| Smoke contract rehearsal | The same three local smoke checks with isolated dev servers | Separate cloud job in Page Builder checks |

## Local loop

Use Node from `.nvmrc`. Leave the existing two dev servers running. Run:

```sh
npm run test:e2e:local
# Or npm run test:e2e: outside CI, which selects the same local tier.
npm run test:e2e:local -- --list
npm test -- path/to/changed.test.js --maxWorkers=1
node --test scripts/run-browser-tests.test.cjs
```

Local tests never start another Vite preview or Sanity process, authenticate,
or mutate CMS records. React smoke data is controlled; the Sanity check is
read-only. Each test uses an isolated browser context in the same single worker.
The launcher disables interactive debug mode, fixes workers/retries/configuration,
caps its Node runner heap at 256 MiB and avoids traces/videos. Screenshots are
saved only on failure.

At least **1024 MiB available physical RAM** is required before launching the
browser. Two consecutive one-second samples below **384 MiB** stop only the
owned test process tree. Both cases return **exit 75 (deferred)** and write
`test-results-local/resource-result.json`; this is not a successful test result.
Leave the user's dev servers and other apps intact. Free memory before trying
again or continue cloud checks. Do not lower thresholds or fake `CI=true` locally.

Avoid full local unit runs, multiple browsers, simultaneous dependency installs,
Studio builds and native image/runtime suites. Move these tasks to cloud instead.
Collection with `--list` launches no browser; it can inspect the cloud matrix.

The URLs identify existing servers, not necessarily the runner's checkout.
Record the application server's commit/dirty state, runner commit, Node/browser
versions and the local outcome when reporting evidence. HTTP 200 only confirms
server readiness. A low-memory deferral does not certify rendered behavior.

## Cloud loop and release gate

Push the feature branch, then dispatch the registered workflows against it:

```sh
gh workflow run page-builder.yml --repo BerinKarjala/portfolio --ref BRANCH
gh workflow run css-studio-browser.yml --repo BerinKarjala/portfolio --ref BRANCH
gh workflow run css-studio-server.yml --repo BerinKarjala/portfolio --ref BRANCH
# Optional complete 315-case matrix:
gh workflow run page-builder.yml --repo BerinKarjala/portfolio --ref BRANCH -f browser_matrix=full
```

Inside CI, `npm run test:e2e` and `npm run test:e2e:cloud` select the existing
default matrix. `npm run test:e2e:full` selects the complete matrix. Execution
of cloud/full tiers outside CI is rejected; `--list` is permitted for inspection.
The cloud regression workers remain limited to two and all browser retries are
zero. CSS Studio and image-storage workflows keep their full browser coverage.

The separate smoke-contract job tests the resource policy and starts its own
React/Sanity pair in the cloud before running the three smoke checks. Its
localhost belongs to the cloud worker; it does not connect to the developer's
computer or expose either local server. The regular production-build regression
job and dedicated browser/server workflows remain required release evidence.

Retain evidence on the exact tested commit. A local smoke pass or cloud smoke
rehearsal does not substitute for the complete applicable release gates. Report
missing physical-device/manual checks separately, as required by the development
standards. Browser evidence is retained in workflow artifacts.
