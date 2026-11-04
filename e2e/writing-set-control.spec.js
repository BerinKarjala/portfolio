import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.route('**/*sanity.io/**', route => route.fulfill({json: {result: []}}));
});

test('the resting writing set reflects slow direction and a stopped carousel', async ({page}) => {
  await page.setViewportSize({width: 1200, height: 900});
  await page.goto('/');
  await expect(page.getByRole('button', {name: 'Open text editor with the inkwell'})).toBeVisible();
  const offset = () => page.evaluate(() => {
    const desk = document.querySelector('.landing-desk').getBoundingClientRect();
    const ink = document.querySelector('.landing-inkwell').getBoundingClientRect();
    return ((ink.left + ink.right) / 2 - (desk.left + desk.right) / 2) / desk.width;
  });
  await expect.poll(offset).toBeGreaterThan(.21);
  await page.getByRole('button', {name: 'Previous project'}).click();
  await expect.poll(offset).toBeLessThan(.09);
  await page.locator('.landing-card--center').focus();
  await expect.poll(async () => Math.abs((await offset()) - .15)).toBeLessThan(.01);
});

test('hovering the carousel pauses it without moving the inkwell', async ({page}) => {
  await page.setViewportSize({width: 1200, height: 900});
  await page.goto('/');
  const stage = page.locator('.landing-stage');
  const inkwell = page.getByRole('button', {name: 'Open text editor with the inkwell'});
  await expect(stage).toHaveAttribute('data-auto-motion', 'running');
  const original = await inkwell.boundingBox();
  const bounds = await stage.boundingBox();
  await page.mouse.move(bounds.x + 10, bounds.y + 10);
  await expect(stage).toHaveAttribute('data-auto-motion', 'paused');
  await page.waitForTimeout(1400);
  expect(Math.abs((await inkwell.boundingBox()).x - original.x)).toBeLessThan(1);
  await page.mouse.move(0, 0);
  await expect(stage).toHaveAttribute('data-auto-motion', 'running');
  expect(Math.abs((await inkwell.boundingBox()).x - original.x)).toBeLessThan(1);
});

test('dragging the inkwell steers the carousel and glides back to its resting place', async ({page}) => {
  await page.setViewportSize({width: 1200, height: 900});
  await page.goto('/');
  await expect(page.getByRole('link', {name: 'Open Sudoku Solver'})).toBeVisible();
  const inkwell = page.getByRole('button', {name: 'Open text editor with the inkwell'});
  const selectedKey = await page.locator('.landing-card--center').getAttribute('data-card-key');
  const card = page.locator(`[data-card-key="${selectedKey}"]`);
  const stage = page.locator('.landing-stage');
  const home = await inkwell.boundingBox();
  const x = home.x + home.width / 2, y = home.y + home.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(1200 - home.width / 2, y, {steps: 8});
  await expect(stage).toHaveAttribute('data-auto-motion', 'running');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1201);
  const start = (await card.boundingBox()).x;
  await page.waitForTimeout(800);
  const left = (await card.boundingBox()).x;
  expect(left).toBeLessThan(start - 20);
  const reversalStarted = performance.now();
  await page.mouse.move(home.width / 2, y, {steps: 8});
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1201);
  const reversed = (await card.boundingBox()).x;
  // Reversal may take real time; allow the distance a card can physically
  // travel during that time, but no instantaneous jump to another position.
  expect(Math.abs(reversed - left)).toBeLessThan(5 + (performance.now() - reversalStarted) * .1);
  await page.waitForTimeout(800);
  const right = (await card.boundingBox()).x;
  expect(right).toBeGreaterThan(reversed + 20);
  await page.mouse.up();
  await expect(page.getByRole('textbox', {name: 'Writing area'})).toHaveCount(0);
  await expect.poll(async () => {
    const ink = await inkwell.boundingBox();
    const desk = await page.locator('.landing-desk').boundingBox();
    return Math.abs(ink.x + ink.width / 2 - (desk.x + desk.width * .57));
  }).toBeLessThan(1);
  const returned = await inkwell.boundingBox();
  expect(Math.abs(returned.y - home.y)).toBeLessThan(1);
  const slowStart = (await card.boundingBox()).x;
  await page.waitForTimeout(800);
  const slowEnd = (await card.boundingBox()).x;
  expect(Math.abs(slowEnd - slowStart)).toBeLessThan(Math.abs(reversed - right) / 2);
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
