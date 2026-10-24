# Sharp SVG decoder dependency regression

Issue [#265](https://github.com/BerinKarjala/portfolio/issues/265) tracks
[GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).
The advisory fixes the bundled librsvg dependency in Sharp 0.35.5, which supplies
librsvg 2.63.2. The root Miniflare dependency still resolved Sharp 0.35.2 while
Wrangler's newer Miniflare already used 0.35.5.

A narrow `miniflare > sharp` override selects 0.35.5 without changing either
Miniflare version or Wrangler. Regenerating the root lockfile deduplicates the
patched Sharp/native binary packages across both consumers. Studio has a
separate dependency graph and lockfile.

`server/css-studio/sharp-security.test.js` verifies every locked Sharp copy,
every installed Miniflare consumer's Sharp and librsvg versions, and ordinary
native SVG-to-raster decoding with exact dimensions and RGBA pixels. The
lockfile regression failed on the unchanged base's 0.35.2 copy before the fix.
Run it with:

```sh
npm ci
npm test -- server/css-studio/sharp-security.test.js
node --test server/css-studio/runtime/images.runtime.mjs
```

These checks establish selection of patched binaries and compatibility of the
normal conversion path. They do not reproduce the upstream memory-corruption
exploit or constitute a complete security audit. Retain the standard root
requirements/unit/build/browser checks and CSS Studio server/browser workflows.
Audit the target advisory separately from unrelated findings, and confirm the
Dependabot alert resolves after the reviewed fix reaches main.
