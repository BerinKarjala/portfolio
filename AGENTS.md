# Working methods

Follow `docs/working-methods.md`, `docs/development-standards.md` and
`docs/browser-testing.md`. These methods apply only to this portfolio repository.

- Every task has a GitHub issue and its own branch. Open an early draft PR with
  a closing reference; keep the issue open until the owner merges the PR.
- Never skip Netlify previews. Required tests and a successful preview of the
  current PR head precede owner acceptance. The owner tests the preview and
  merges; agents never merge, enable auto-merge or push directly to main.
- Every merge into main automatically deploys to production. When the owner's
  merge is detected, verify production, sync local main and serve it locally.
- Localhost must show the active task branch. Identify the serving checkout,
  preserve unrelated edits and reuse the frontend process where safe; otherwise
  replace only that identified frontend process without duplicate servers.

- Use the existing React server at http://localhost:3000 and Sanity server at
  http://localhost:3333 for local smoke tests. Do not start duplicate servers.
- Localhost is memory constrained. Use `npm run test:e2e:local`: one Chromium
  worker, three read-only checks, no traces/videos. Respect the memory guard;
  exit 75 means deferred, never passed. Do not lower thresholds or set CI locally
  to bypass it. Stop only the test's own process tree when memory pressure occurs.
- Run targeted local unit tests with one worker. Do not run full browser
  matrices, concurrent builds, Studio builds, native image suites or parallel
  dependency installations on this host. Use cloud CI for those checks.
- Cloud release gates retain the full default three-browser coverage, dedicated
  CSS Studio/image-storage suites, accessibility/snapshot/performance checks,
  unit/runtime checks and builds. Local smoke success does not replace them.
- Preserve test-first development, existing assertions and zero browser retries.
  Record the exact tested commit/runtime and distinguish local dev-server
  checkout state from the test runner's worktree.
- Keep unrelated working-tree edits and active dev servers intact. Use an
  isolated branch/worktree for changes. Never write or publish CMS records as
  part of the read-only environment smoke checks.
- Before starting a dependency ticket, check its live alert and default-branch
  lockfile. If already fixed, record that evidence and close the stale ticket;
  a dismissed alert does not by itself prove remediation.
