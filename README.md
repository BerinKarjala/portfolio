# Portfolio + Sanity Studio

## Local development
- Node `18.19.x` (`.nvmrc`), npm `>=9`.
- Frontend (CRA):
  - Install: `npm install`
  - Dev: `npm start` (http://localhost:3000)
  - Build: `npm run build` (outputs to `build/`)
- Sanity Studio (v2, `studio13/`):
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
