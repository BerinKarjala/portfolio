# Temporary security overrides

The Studio dependency tree requires two overrides while upstream releases still
include packages affected by the following advisories:

- [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c):
  `@vercel/frameworks -> js-yaml 3 -> argparse 1 -> sprintf-js`. Override only
  js-yaml's argparse to 2.0.1, which retains its legacy API and removes sprintf-js.
  Keep js-yaml 3 because the framework reader uses its `safeLoad` API.
- [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm):
  codegen's chokidar 3 and globby/fast-glob/micromatch both use braces 3. Override
  braces with the exact npm alias `@dieub/braces-depth-guard@3.0.3-pn.3`.
  This third-party fork keeps the upstream implementation and adds a hard
  100-level nesting/traversal limit, including parentheses and direct AST inputs.
  Excessive string nesting raises a controlled SyntaxError before recursive
  traversal; direct AST traversal raises a depth-limit RangeError.

The fork's published runtime source was compared with braces 3.0.3. Its npm
tarball integrity is pinned in package-lock.json. This is a temporary maintained
derivative, not an upstream braces security release. Normal expansion cardinality
limits remain unchanged; this override addresses the reported nesting failure.

Run `npm ci`, `npm run test:dependencies`, `npm audit --audit-level=moderate`, and
`npm run build` in this directory when updating either override. The regression
checks cover both consumer resolutions, deep string/AST inputs, ordinary globs,
real file watches, YAML parsing and the js-yaml command-line interface.
Remove an override only after its parents stop resolving the vulnerable package
or an upstream fix passes these same checks.
