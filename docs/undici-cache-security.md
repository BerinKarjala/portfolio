# Undici cache dependency regression

Issue [#253](https://github.com/BerinKarjala/portfolio/issues/253) tracks
[Dependabot #458](https://github.com/BerinKarjala/portfolio/security/dependabot/458)
and [GHSA-4cwx-7wf7-3272](https://github.com/advisories/GHSA-4cwx-7wf7-3272).
Undici 7.0.0 through 7.28.x is affected; 7.29.0 is the first patched release.

## Change and observable acceptance

The root development dependency `miniflare@4.20260730.0` resolved Undici 7.28.0.
A scoped `miniflare > undici` override now selects registry version 7.30.0.
Both installed Miniflare consumers, including Wrangler's nested Miniflare,
resolve to that existing root copy. The root lockfile removes the redundant
7.28.0 and 7.29.1 copies; jsdom's Undici 8.12.2 and the separate Studio graph
are unchanged. Existing overrides are preserved.

The new `server/css-studio/undici-cache-security.test.js` exercises each
Miniflare consumer's public Undici `MockAgent`, cache interceptor, memory store,
and request/body interfaces. Network access is disabled. It verifies that private
responses remain readable and isolated across two users, including degenerate
and repeated directives, while explicitly public responses still use the cache.
A separate assertion excludes affected versions from the entire root lockfile.

## Red and green evidence

Tested October 25, 2026, on working-tree changes based on commit
`6752892311584332ef4550d347a621c733c72294`. No new commit was created.
Runtime: Node 22.22.2 from `.nvmrc`, npm 10.9.7, Vitest 5.0.5, Vite 8.3.4,
Playwright 1.64.1. Browser engines did not launch, so browser runtime versions
and browser compatibility are unverified.

Before changing either manifest or lockfile, ran:

```sh
npm test -- server/css-studio/undici-cache-security.test.js
```

Result: 7 assertion failures and 12 passes. Six behavioral assertions detected
response reuse or a rejected request; the seventh detected the vulnerable locked
version. No missing import or setup error caused these failures. After the
dependency change, the same command passed all 19 tests without test edits.

| Command | Outcome |
| --- | --- |
| `npm run check:page-builder` | Passed: 130 decisions and 16 acceptance gates. |
| `npm test` | Passed: 590 tests across 76 files. |
| `npm run build` | Passed. |
| `npm run check:page-builder:build` | Passed both bundle budgets. |
| `npm run test:e2e -- --retries=0` | Blocked: preview server could not start. |
| `npm run test:dependencies --prefix studio13` | Failed: unchanged js-yaml CLI guardrail received empty help output. Zod check file passed. |
| `npm run build --prefix studio13` | Passed. Generated Studio artifacts were restored/excluded from the change. |
| `npm run test:css-studio:server` | Blocked: Miniflare could not open a local socket. |
| `node --test server/css-studio/runtime/images.runtime.mjs` | Blocked: Miniflare could not open a local socket. |
| `npm run test:css-studio:server:browser` | Failed; HTTP browser diagnostic confirmed a local socket denial. |
| `node --test scripts/check-css-studio-image-contract.test.mjs` | Passed. |
| `node --test scripts/*dependabot*.test.cjs scripts/issue-automation.test.cjs` | Passed all three check files. |
| `npm ls undici --all` | Passed; both Miniflare consumers use 7.30.0, with no affected installed copy. |

Also attempted the full CSS Studio browser matrix and image storage matrix:

```sh
npm run test:e2e:full -- e2e/css-studio.spec.js e2e/css-studio-acceptance.spec.js --workers=2 --retries=0
npm run test:e2e -- --config=e2e/playwright.images.config.js --workers=2 --retries=0
```

Both stopped before running browser tests because their web server could not
start. Direct preview/Miniflare diagnostics reported `listen EPERM` on
`127.0.0.1`. No layout changed; mobile/4K screenshot review was not performed.

## Installation and release limitations

Registry DNS requests failed with `EAI_AGAIN`. The lockfile was first deduplicated
to its existing patched registry entry, then verified with
`npm install --package-lock-only --ignore-scripts --offline` using a writable
copy of the provided npm cache. This command completed without further changes.

Normal `npm ci --offline` failed in esbuild's install hook with `spawnSync EPERM`.
Packages were restored with `npm ci --ignore-scripts --offline` solely to run the
checks above. This does not establish a successful normal clean install. The
unchanged Studio guardrail's synchronous CLI invocation likewise returned
`EPERM` and empty stdout despite status 0; invoking the CLI directly printed the
expected help. Existing tests, scripts, configurations and validation gates were
preserved. Artifact output paths used writable temporary directories where needed.

The live `npm audit --json --fetch-retries=0 --fetch-timeout=15000` request failed
with `EAI_AGAIN`. An offline audit returned an empty report, which does not
establish current advisory clearance. Dependency versions and the security
regression pass locally; normal installation, Studio guardrails, browser/runtime
checks and the live target-advisory audit must pass in the independent validator
before a focused PR linking #253 can be published.

No issue mutation, PR, commit, push, merge or alert dismissal was performed.
After the reviewed fix reaches `main`, confirm Dependabot alert #458 is resolved.
That final acceptance criterion remains pending.
