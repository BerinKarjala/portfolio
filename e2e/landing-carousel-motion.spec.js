import {expect, test} from '@playwright/test';

test.use({video: 'on'});
test.describe.configure({mode: 'default'});
test.beforeEach(async ({page}) => {
  await page.route('**/*sanity.io/**', route => route.fulfill({json: {result: []}}));
  // Keep Date, animation timestamps, RAF and lazy-route scheduling native.
});
async function settle(page) {
  await expect(page.getByRole('link', {name: 'Open Sudoku Solver'})).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('.landing-card--center img,.landing-desk img')].map(image => image.decode().catch(() => {})));
  });
}
  for (const width of [390, 1440, 3840]) {
    test(`gradual adjacent motion and wraparound at ${width}px`, async ({page}, info) => {
      // Budget for four lossless captures/video at 4K; UI assertions are unchanged.
      test.setTimeout(90000);
      await page.setViewportSize({width, height: width === 3840 ? 2160 : 900});
      await page.emulateMedia({reducedMotion: 'no-preference'});
      await page.goto('/'); await settle(page);
      const first = page.locator('[data-card-key="/projects/SudokuSolver"]');
      const samplesPromise = first.evaluate(node => new Promise(resolve => {
        const frames = [], started = performance.now();
        const sample = now => {
          frames.push({ms: now - started, transform: getComputedStyle(node).transform});
          if (now - started < 2400) requestAnimationFrame(sample);
          else resolve(frames);
        };
        requestAnimationFrame(sample);
      }));
      await page.getByRole('button', {name: 'Previous project'}).click();
      // Hold the next idle cycle while slow 4K capture runs; current motion continues.
      await page.locator('.landing-card--center').focus();
      // Read native RAF without concurrent screenshot encoding blocking WebKit.
      const frames = await samplesPromise;
      await info.attach(`motion-transforms-${width}`, {body: Buffer.from(JSON.stringify(frames)), contentType: 'application/json'});
      const poses = new Set(frames.map(frame => frame.transform));
      expect(poses.size).toBeGreaterThan(3);
      const changing = frames.filter(frame => frame.transform !== frames[0].transform && frame.transform !== frames.at(-1).transform);
      expect(changing.at(-1).ms - changing[0].ms).toBeGreaterThan(700);
      expect(await first.evaluate(node => getComputedStyle(node).transitionDuration)).toContain('1.6s');
      // Replay the same adjacent direction for stills after the unimpeded sample.
      await page.getByRole('button', {name: 'Next project'}).click();
      await page.waitForTimeout(1700);
      await page.getByRole('button', {name: 'Previous project'}).click();
      await page.locator('.landing-card--center').focus();
      await info.attach(`motion-start-${width}`, {body: await page.screenshot({scale: 'css'}), contentType: 'image/png'});
      await page.waitForTimeout(500);
      await info.attach(`motion-middle-${width}`, {body: await page.screenshot({scale: 'css'}), contentType: 'image/png'});
      await expect(page.getByRole('heading', {name: 'CSS Theme Studio', exact: true})).toBeVisible();
      await info.attach(`motion-settled-${width}`, {body: await page.screenshot({scale: 'css'}), contentType: 'image/png'});
      await page.getByRole('button', {name: 'Next project'}).click();
      await page.locator('.landing-card--center').focus();
      await page.waitForTimeout(1700);
      await expect(page.getByRole('link', {name: 'Open Sudoku Solver'})).toBeVisible();
      await info.attach(`motion-wrap-return-${width}`, {body: await page.screenshot({scale: 'css'}), contentType: 'image/png'});
      if (width === 390) {
        await page.getByRole('button', {name: 'Next project'}).click();
        await page.getByRole('button', {name: 'Next project'}).click();
        await page.getByRole('button', {name: 'Previous project'}).click();
        await page.waitForTimeout(3400);
        await expect(page.getByRole('link', {name: 'Open Sudoku Solver'})).toBeVisible();
        await expect(page.locator('.landing-card--center')).toHaveCount(1);
      }
    });
  }
