# Dependency security checks

## Zod collection bounds

The lockfile resolves Zod 4.6.7 after PR #267, including the 4.6.6 fix for
[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
(tracking issue #266). No additional override is needed. `npm run test:dependencies`
checks every locked copy and installed consumer, then exercises the v4 and Mini
entry points with synchronous, asynchronous, and compiled forward parsing.

Small oversized arrays, sets, and maps must fail a leading maximum or exact-size
constraint before validating elements or accumulating element errors. Valid
collections, nested error paths, and rewrites preceding a bound remain supported.
These checks cover constrained v4 collections; they do not establish bounds for
unconstrained schemas or the legacy `zod/v3` entry point. Confirm the Dependabot
alert separately after GitHub processes the default branch; do not dismiss it
based only on a passing local test.

## Temporary security overrides

The Studio dependency tree uses temporary overrides while upstream releases still
include packages affected by the following advisories:

- [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c):
  `@vercel/frameworks -> js-yaml 3 -> argparse 1 -> sprintf-js`. Override only
  js-yaml's argparse to 2.0.1, which retains its legacy API and removes sprintf-js.
  Keep js-yaml 3 because the framework reader uses its `safeLoad` API.
  The postinstall script applies a checked, idempotent one-line fix to argparse
  2.0.1's legacy version action: it must use the supplied constructor option,
  rather than an unset instance field. This preserves `js-yaml --version` output.
- [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm):
  codegen's chokidar 3 and globby/fast-glob/micromatch both use braces 3. Override
  braces with the exact npm alias `@dieub/braces-depth-guard@3.0.3-pn.3`.
  This third-party fork keeps the upstream implementation and adds a hard
  100-level nesting/traversal limit, including parentheses and direct AST inputs.
  Excessive string nesting raises a controlled SyntaxError before recursive
  traversal; direct AST traversal raises a depth-limit RangeError.
- Undici is pinned to 7.30.1 under `@module-federation/dts-plugin`, including fixes
  for [EventSource retention](https://github.com/advisories/GHSA-4qv8-2p9j-2685),
  [SRI algorithm case](https://github.com/advisories/GHSA-f72v-6w45-q472), and
  [excessive content encodings](https://github.com/advisories/GHSA-xjj6-f33q-929c).
  The current hoisted copy also serves get-it's fetch implementation. Keep this
  patch pin until the parent resolves a patched release without the override.

The fork's published runtime source was compared with braces 3.0.3. Its npm
tarball integrity is pinned in package-lock.json. This is a temporary maintained
derivative, not an upstream braces security release. Normal expansion cardinality
limits remain unchanged; this override addresses the reported nesting failure.

First run `npm ci` at the repository root for the shared PostCSS configuration.
Then run `npm ci`, `npm run test:dependencies`, `npm audit --audit-level=moderate`, and
`npm run build` in this directory when updating these dependencies. The regression
checks cover both consumer resolutions, deep string/AST inputs, ordinary globs,
real file watches, YAML parsing and the js-yaml command-line interface.
Remove an override only after its parents stop resolving the vulnerable package
or an upstream fix passes these same checks.
