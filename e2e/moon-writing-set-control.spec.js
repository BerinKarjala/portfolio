import {expect, test} from '@playwright/test';

test('moon dragging leaves the writing set in place and preserves its carousel controls', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.route('**/*sanity.io/**', route => route.fulfill({json: {result: []}}));
  await page.goto('/');

  const moon = page.getByRole('button', {name: 'Moon and weather'});
  const ink = page.getByRole('button', {name: 'Open text editor with the inkwell'});
  const quill = page.locator('.landing-quill');
  const stage = page.locator('.landing-stage');
  await expect(page.getByRole('link', {name: 'Open Sudoku Solver'})).toBeVisible();
  await expect(stage).toHaveAttribute('data-auto-motion', 'running');
  // Let the writing set reach its running position before recording it.
  await page.waitForTimeout(1400);
  const originalInk = await ink.boundingBox();
  const originalQuill = await quill.boundingBox();
  const moonBox = await moon.boundingBox();
  const moonX = moonBox.x + moonBox.width / 2, moonY = moonBox.y + moonBox.height / 2;
  const inkX = originalInk.x + originalInk.width / 2, inkY = originalInk.y + originalInk.height / 2;
  const unchanged = async () => {
    for (const [element, original] of [[ink, originalInk], [quill, originalQuill]]) {
      const box = await element.boundingBox();
      expect(Math.abs(box.x - original.x)).toBeLessThan(1);
      expect(Math.abs(box.y - original.y)).toBeLessThan(1);
    }
  };

  await page.mouse.move(moonX, moonY);
  await page.mouse.down();
  await expect(stage).not.toHaveAttribute('data-auto-motion', 'running');
  await page.mouse.move(60, 180, {steps: 10});
  expect(Math.abs((await moon.boundingBox()).x - moonBox.x)).toBeGreaterThan(20);
  // Outlast the writing set's 1.2 s transition and the card's 1.6 s transition:
  // checking just after pointerdown would miss delayed movement of the set.
  await page.waitForTimeout(1800);
  await unchanged();
  const cardKey = await page.locator('.landing-card--center').getAttribute('data-card-key');
  const card = page.locator(`[data-card-key="${cardKey}"]`);
  const pausedX = (await card.boundingBox()).x;
  await page.waitForTimeout(300);
  expect(Math.abs((await card.boundingBox()).x - pausedX)).toBeLessThan(1);

  // Pass the captured moon directly across the inkwell and out the other side.
  await page.mouse.move(inkX, inkY, {steps: 12});
  await page.mouse.move(inkX - 160, inkY, {steps: 8});
  await page.waitForTimeout(1400);
  await unchanged();
  await expect(stage).not.toHaveAttribute('data-auto-motion', 'running');
  // Return the moon under the pointer before releasing, so it does not cover
  // the inkwell while the next gesture begins.
  await page.mouse.move(moonX, moonY, {steps: 12});
  await page.mouse.up();
  await expect(stage).toHaveAttribute('data-auto-motion', 'running');
  await page.waitForTimeout(1400);
  await unchanged();

  const homeInk = await ink.boundingBox(), homeQuill = await quill.boundingBox();
  await page.mouse.move(homeInk.x + homeInk.width / 2, homeInk.y + homeInk.height / 2);
  await page.mouse.down();
  await page.mouse.move(1400, homeInk.y + homeInk.height / 2, {steps: 10});
  expect((await ink.boundingBox()).x).toBeGreaterThan(homeInk.x + 20);
  expect((await quill.boundingBox()).x).toBeGreaterThan(homeQuill.x + 20);
  await expect(stage).toHaveAttribute('data-auto-motion', 'running');
  const steeringStart = (await card.boundingBox()).x;
  await page.waitForTimeout(800);
  expect((await card.boundingBox()).x).toBeLessThan(steeringStart - 20);
  await page.mouse.up();
  await expect(page.getByRole('textbox', {name: 'Writing area'})).toHaveCount(0);
});
