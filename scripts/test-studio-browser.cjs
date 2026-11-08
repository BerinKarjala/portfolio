// Cloud-only smoke: intercept every request and serve a built Studio from disk.
// All API responses are synthetic; Chromium is offline and has no credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const { classifyRequest, studioFilePath, ORIGIN } = require('./test-studio-network.cjs');

const dist = fs.realpathSync(path.resolve(__dirname, '../studio13/content-agent-test/dist'));
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const cors = { 'access-control-allow-origin': ORIGIN, 'access-control-allow-credentials': 'true' };

async function main() {
  assert.equal(process.env.CI, 'true', 'This browser smoke runs in cloud CI only');
  const browser = await chromium.launch({ args: ['--disable-background-networking', '--host-resolver-rules=MAP * ~NOTFOUND'] });
  const context = await browser.newContext({ offline: true, serviceWorkers: 'block' });
  const violations = [];
  const evidence = new Set();
  try {
    await context.routeWebSocket('**/*', (socket) => {
      violations.push('WebSocket attempted');
      socket.close();
    });
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const kind = classifyRequest(request.url(), request.method());
      if (kind === 'asset') {
        const relative = studioFilePath(url.pathname);
        if (!relative) return route.abort();
        const filename = path.resolve(dist, relative);
        try {
          const actual = fs.realpathSync(filename);
          if (!actual.startsWith(`${dist}${path.sep}`) || !fs.statSync(actual).isFile()) return route.abort();
          return route.fulfill({ status: 200, contentType: types[path.extname(actual)] || 'application/octet-stream', body: fs.readFileSync(actual) });
        } catch { return route.abort(); }
      }
      if (kind === 'violation') {
        // Do not log full URLs, request bodies, or headers.
        violations.push('Unexpected project, dataset, or write request');
        return route.abort();
      }
      if (kind === 'blocked') return route.abort();
      const apiPath = url.pathname.replace(/^\/v\d{4}-\d{2}-\d{2}/, '');
      let body;
      if (kind === 'test-query') {
        evidence.add('test-dataset');
        body = { result: [], ms: 0 };
      } else if (kind === 'test-acl') {
        evidence.add('test-dataset');
        body = [];
      } else if (apiPath === '/users/me') {
        body = { id: 'synthetic-user', name: 'Synthetic User', displayName: 'Synthetic User', roles: [] };
      } else if (apiPath === '/auth/providers') {
        body = { providers: [] };
      } else {
        body = {};
      }
      return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });
    });

    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', () => pageErrors.push('Uncaught browser error'));
    await page.goto(`${ORIGIN}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('[data-testid="studio-navbar"]').waitFor({ state: 'visible', timeout: 45000 });
    await page.getByText('Landing Page', { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 });
    assert.match(await page.title(), /TEST ONLY/i, 'The rendered Studio must identify itself as the test workspace');
    // A mock response counts only after the actual built application requests
    // an endpoint containing the exact test project and dataset.
    const deadline = Date.now() + 30000;
    while (!evidence.has('test-dataset') && Date.now() < deadline && violations.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    // Allow late boot requests and errors to surface before final assertions.
    await page.waitForTimeout(1000);
    assert.equal(await page.locator('[data-testid="studio-error-screen"]').count(), 0, 'Studio rendered its error screen');
    assert.deepEqual(pageErrors, [], 'Studio raised an uncaught browser error');
    assert.deepEqual(violations, [], 'The Studio attempted an unexpected target or write');
    assert.ok(evidence.has('test-dataset'), 'No test-dataset query or ACL request was observed');
    console.log('Built Studio rendered navigation and test workspace title and requested the synthetic test dataset; no request was forwarded.');
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
