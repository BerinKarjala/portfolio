# Portfolio + Sanity Studio

## Local development
- Node `20.19.x` (`.nvmrc`), npm `>=10`.
- Frontend (CRA):
  - Install: `npm install`
  - Dev: `npm start` (http://localhost:3000)
  - Build: `npm run build` (outputs to `build/`)
- Sanity Studio (v3, `studio13/`):
  - Install: `cd studio13 && npm install`
  - Dev: `npm start` (http://localhost:3333)
  - Build: `npm run build` (outputs to `studio13/dist`)

## Deployment (Netlify)
- Frontend: build `npm run build`, publish `build/`.
- Studio (if deployed): build in `studio13`, publish `studio13/dist`. Configure project ID/dataset via env vars.
- Prefer `npm ci` in CI/Netlify for reproducible installs.

## Notes
- Keep secrets out of git; use `.env` locally and Netlify environment variables in production.
- Use VS Code with the recommended extensions (`.vscode/extensions.json`) and format-on-save settings (`.vscode/settings.json`).

## CRA -> Vite migration plan (draft)
1) Add Vite tooling: install `vite` + `@vitejs/plugin-react` and add `vite.config.js`.
2) Move CRA `public/index.html` content to root `index.html` with a `#root` mount.
3) Point `index.html` to `src/index.js` and ensure imports work in Vite.
4) Replace scripts with `vite` (`dev`, `build`, `preview`) and remove `react-scripts`.
5) Update env vars: rename `REACT_APP_*` to `VITE_*`.
6) Update Netlify publish dir to `dist/` and build command to `npm run build`.
7) Verify: `npm run dev`, `npm run build`, `npm run preview`, and Netlify deploy.
