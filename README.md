# Portfolio + Sanity Studio

## Local development
- Follow the [portfolio working methods](docs/working-methods.md): issue, task
  branch, early draft PR, tests and mandatory Netlify preview, owner acceptance
  and owner merge, then issue closure. Localhost follows the active task branch.
- Follow the [development, responsive design, security, and release standards](docs/development-standards.md).
- Label an issue `in progress` to start [test-first issue resolution and weekly reporting](docs/issue-automation.md).
- Node `22.22.2` (`.nvmrc`), npm `>=10`.
- [Browser working methods](docs/browser-testing.md): `npm run test:e2e:local`
  reuses React at `localhost:3000` and Sanity at `localhost:3333` in one Chromium
  worker with memory guards. Full browser/build/runtime validation runs in cloud CI.
- Frontend (Vite):
  - Install: `npm ci`
  - Dev: `npm start` (http://localhost:3000, configured in `vite.config.mjs`)
  - Build in cloud CI: `npm run build` (outputs to `dist/`)
- Sanity Studio (v6, `studio13/`):
  - Install: `cd studio13 && npm ci`
  - Dev: `npm start` (http://localhost:3333)
  - Build in cloud CI: `npm run build` (outputs to `studio13/dist`)

## Deployment (Netlify)
- Every PR, including drafts and documentation changes, needs a successful
  current-head Deploy Preview. Required tests and the preview block merging.
- The owner acceptance-tests the preview and merges. Every merge into `main`
  automatically deploys to production; agents do not merge or push to main.
- Frontend: build `npm run build`, publish `dist/`.
- Studio (if deployed): build in `studio13`, publish `studio13/dist`. Configure project ID/dataset via env vars.
- Prefer `npm ci` in CI/Netlify for reproducible installs.

## Notes
- Keep secrets out of git; use `.env` locally and Netlify environment variables in production.
- Use VS Code with the recommended extensions (`.vscode/extensions.json`) and format-on-save settings (`.vscode/settings.json`).
- Minesweeper source viewer is served from `public/code/minesweeper-source.html` and fetches the raw file from GitHub.
- If Sanity data fails to load locally, ensure CORS allows `http://127.0.0.1:3000` and `http://localhost:3000`:
  - `cd studio13`
  - `npx.cmd sanity login`
  - `npx.cmd sanity cors add http://127.0.0.1:3000 --credentials`
  - `npx.cmd sanity cors add http://localhost:3000 --credentials`
  - Keep the Netlify URL in the Sanity CORS list as well.

## CRA -> Vite migration plan (complete)
- Migrated to Vite; update any future env vars to use the `VITE_*` prefix.

## HTML Page Builder (release candidate)

The portfolio project at `/projects/page-builder` uses the existing project layout: clickable launch preview on the left and implementation source on the right. The full-screen workspace supports browser-local project management, an interactive Flex/Grid/free-form canvas, the full component palette, rich text, style presets, reusable linked components, effects, Layers, locks, grouping, clipboard, undo/redo, page settings, autosave, JSON backups and recovery. Milestone 4 adds compiler-backed sandbox/device previews, read-only generated code, critical/warning preflight, a two-file HTML/CSS ZIP, individual downloads and detailed recovery reports. See the [export and preview contracts](docs/page-builder/m4-export.md). Milestone 5 adds optional onboarding, confirmed original-template reset with independent backup, teaching tutorials, acceptance mapping and performance gates. M1–M5 is live after owner merge #233; [production verification and follow-up checks](docs/page-builder/release-verification.md) record current evidence. Final manual verification/exception acceptance remains open in [the release checklist](docs/page-builder/m5-release.md).

See [requirements and milestones](docs/page-builder/progress.md), the [user guide](docs/page-builder/user-guide.md), [developer guide](docs/page-builder/developer-guide.md), [teaching tutorials](docs/page-builder/tutorials.md), and [130-decision implementation trace](docs/page-builder/requirements-trace.md).

Run the full source/build checks and browser installation in cloud CI. Locally,
use targeted unit tests with one worker and `npm run test:e2e:local` against the
existing dev servers. `npm run test:e2e` selects local smoke outside CI and the
full default release matrix inside CI. A low-memory exit 75 is a deferral.

See [browser testing](docs/browser-testing.md) for current matrix counts. It retains
cross-browser storage ownership/recovery, import/export and sandbox boundaries,
pointer/keyboard dragging, mobile focus, and wizard focus/reflow. Viewport
permutations and the other feature cases run in Chromium; dedicated CSS Studio
and image-storage workflows keep their full browser coverage. CI runs this
matrix once with zero retries. In CI, use `npm run test:e2e:full` for the complete
matrix, or select `browser_matrix=full` on the Page Builder workflow.
`npm run test:e2e:cloud -- --list` and `npm run test:e2e:full -- --list` inspect
those cases locally without launching browsers.
