import {expect, test} from '@playwright/test';

test.use({video: 'on'});
test.beforeEach(async ({page}) => {
  await page.route('**/*sanity.io/**', route => route.fulfill({json: {result: []}}));
  await page.clock.setFixedTime(new Date('2026-10-25T16:00:00-04:00'));
});
async function settle(page) {
  await expect(page.getByRole('link', {name: 'Open Sudoku Solver'})).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
  });
}
  for (const width of [390, 1440, 3840]) {
    test(`gradual adjacent motion and wraparound at ${width}px`, async ({page}, info) => {
      await page.setViewportSize({width, height: width === 3840 ? 2160 : 900});
      await page.emulateMedia({reducedMotion: 'no-preference'});
      await page.goto('/'); await settle(page);
      const first = page.locator('[data-card-key="/projects/SudokuSolver"]');
      const before = await first.evaluate(node => getComputedStyle(node).transform);
      await page.getByRole('button', {name: 'Previous project'}).click();
      await info.attach(`motion-start-${width}`, {body: await page.screenshot(), contentType: 'image/png'});
      await page.waitForTimeout(500);
      const middle = await first.evaluate(node => getComputedStyle(node).transform);
      expect(middle).not.toBe(before);
      await info.attach(`motion-middle-${width}`, {body: await page.screenshot(), contentType: 'image/png'});
      await page.waitForTimeout(1200);
      const settled = await first.evaluate(node => getComputedStyle(node).transform);
      expect(settled).not.toBe(middle);
      await expect(page.getByRole('heading', {name: 'CSS Theme Studio', exact: true})).toBeVisible();
      await info.attach(`motion-settled-${width}`, {body: await page.screenshot(), contentType: 'image/png'});
      await page.getByRole('button', {name: 'Next project'}).click();
      await page.waitForTimeout(1700);
      await expect(page.getByRole('link', {name: 'Open Sudoku Solver'})).toBeVisible();
      await info.attach(`motion-wrap-return-${width}`, {body: await page.screenshot(), contentType: 'image/png'});
    });
  }
