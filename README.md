# Portfolio + Sanity Studio

## Local development
- Node `22.22.2` (`.nvmrc`), npm `>=10`.
- Frontend (Vite):
  - Install: `npm install`
  - Dev: `npm start` (http://localhost:3000, configured in `vite.config.mjs`)
  - Build: `npm run build` (outputs to `dist/`)
- Sanity Studio (v6, `studio13/`):
  - Install: `cd studio13 && npm install`
  - Dev: `npm start` (http://localhost:3333)
  - Build: `npm run build` (outputs to `studio13/dist`)

## Deployment (Netlify)
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

## HTML Page Builder (in development)

The portfolio project at `/projects/page-builder` uses the existing project layout: clickable launch preview on the left and implementation source on the right. The full-screen workspace supports browser-local project management, an interactive Flex/Grid/free-form canvas, core components, Layers, locks, grouping, clipboard, undo/redo, page settings, autosave, JSON backups and recovery. Advanced components/rich text/styles and HTML/CSS export follow in later milestones. See the [M2 canvas guide](docs/page-builder/m2-canvas.md).

See [requirements and milestones](docs/page-builder/progress.md), the [user guide](docs/page-builder/user-guide.md), [developer guide](docs/page-builder/developer-guide.md), and [130-decision implementation trace](docs/page-builder/requirements-trace.md).

Run `npm test` and `npm run build` for the foundation checks. After building and installing Playwright browsers with `npx playwright install --with-deps chromium firefox webkit`, run `npm run test:e2e` for browser smoke tests.
