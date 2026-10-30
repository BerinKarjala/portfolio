import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.route('**/*sanity.io/**', route => route.fulfill({json: {result: []}}));
});

test('dragging the inkwell steers the carousel and glides back to its resting place', async ({page}) => {
  await page.setViewportSize({width: 1200, height: 900});
  await page.clock.install({time: new Date('2026-10-27T12:00:00Z')});
  await page.goto('/');
  await expect(page.getByRole('link', {name: 'Open Sudoku Solver'})).toBeVisible();
  await page.clock.pauseAt(new Date('2026-10-27T12:00:01Z'));
  const inkwell = page.getByRole('button', {name: 'Open text editor with the inkwell'});
  const card = page.locator('[data-card-key="/projects/SudokuSolver"]');
  const stage = page.locator('.landing-stage');
  const home = await inkwell.boundingBox();
  const x = home.x + home.width / 2, y = home.y + home.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(1200 - home.width / 2, y, {steps: 8});
  await expect(stage).toHaveAttribute('data-auto-motion', 'running');
  const start = (await card.boundingBox()).x;
  await page.clock.runFor(800);
  const right = (await card.boundingBox()).x;
  expect(right).toBeGreaterThan(start + 20);
  await page.mouse.move(home.width / 2, y, {steps: 8});
  const reversed = (await card.boundingBox()).x;
  expect(Math.abs(reversed - right)).toBeLessThan(2);
  await page.clock.runFor(800);
  const left = (await card.boundingBox()).x;
  expect(left).toBeLessThan(reversed - 20);
  await page.mouse.up();
  await expect(page.getByRole('textbox', {name: 'Writing area'})).toHaveCount(0);
  await page.clock.runFor(1300);
  const returned = await inkwell.boundingBox();
  expect(returned.x).toBeCloseTo(home.x, 0);
  expect(returned.y).toBeCloseTo(home.y, 0);
  const slowStart = (await card.boundingBox()).x;
  await page.clock.runFor(800);
  const slowEnd = (await card.boundingBox()).x;
  expect(Math.abs(slowEnd - slowStart)).toBeLessThan(Math.abs(reversed - left) / 2);
  expect(Math.abs(slowEnd - slowStart)).toBeGreaterThan(2);
});

test('a single click does not open the editor; a double click does', async ({page}) => {
  await page.goto('/');
  const inkwell = page.getByRole('button', {name: 'Open text editor with the inkwell'});
  await inkwell.click();
  await expect(page.getByRole('textbox', {name: 'Writing area'})).toHaveCount(0);
  await inkwell.dblclick();
  await expect(page.getByRole('textbox', {name: 'Writing area'})).toBeVisible();
});

test('a double tap on the inkwell opens the editor', async ({browser, browserName}) => {
  test.skip(browserName === 'firefox', 'Playwright does not provide native touchscreen emulation in Firefox.');
  const context = await browser.newContext({viewport: {width: 390, height: 844}, hasTouch: true});
  try {
    await context.route('**/*sanity.io/**', route => route.fulfill({json: {result: []}}));
    const page = await context.newPage();
    await page.goto('/');
    const inkwell = page.getByRole('button', {name: 'Open text editor with the inkwell'});
    await inkwell.scrollIntoViewIfNeeded();
    const box = await inkwell.boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.touchscreen.tap(x, y);
    await expect(page.getByRole('textbox', {name: 'Writing area'})).toHaveCount(0);
    await page.touchscreen.tap(x, y);
    await expect(page.getByRole('textbox', {name: 'Writing area'})).toBeVisible();
  } finally {await context.close();}
});
