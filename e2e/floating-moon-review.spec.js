import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('floating preview keeps navigation reachable and opens the calendar', async ({ page }, testInfo) => {
  for (const viewport of [
    { width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 },
    { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 3840, height: 2160 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/artwork-review/floating.html');
    const moon = page.getByRole('button', { name: 'Moon and weather' });
    await expect(moon).toBeVisible();
    expect(await moon.evaluate(node => Boolean(node.closest('header')))).toBe(false);
    const moonBox = await moon.boundingBox();
    expect(moonBox.width).toBeGreaterThanOrEqual(110);
    expect(moonBox.width).toBeLessThanOrEqual(161);
    expect(moonBox.x + moonBox.width).toBeLessThanOrEqual(viewport.width);
    for (const link of await page.getByRole('navigation', { name: 'Primary' }).getByRole('link').all()) {
      const box = await link.boundingBox();
      expect(box.x + box.width <= moonBox.x || box.y >= moonBox.y + moonBox.height).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
    if (viewport.width === 320 || viewport.width === 3840) {
      await testInfo.attach(`floating-review-${viewport.width}`, { body: await page.screenshot({ scale: 'css' }), contentType: 'image/png' });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/artwork-review/floating.html');
  await page.getByLabel('Weather sample').selectOption('45');
  const moon = page.getByRole('button', { name: 'Moon and weather' });
  await expect(moon.locator('[data-weather-layer="sun"]')).toHaveAttribute('data-artwork-variant', 'sun-fog');
  await page.getByLabel('Daytime').uncheck();
  await expect(moon.locator('[data-weather-layer="sun"]')).toHaveCount(0);
  await moon.click();
  const details = page.getByRole('region', { name: 'Moon and weather details' });
  await expect(details.getByText(/fog.*sample/i)).toBeVisible();
  await details.getByRole('button', { name: 'Calendar', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Calendar' });
  await expect(dialog).toBeVisible();
  const rect = await dialog.boundingBox();
  expect(rect.width).toBeGreaterThanOrEqual(389);
  expect(rect.height).toBeGreaterThanOrEqual(843);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(moon).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('the callout follows an eight-second return and a new drag interrupts it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date('2026-10-27T12:00:00Z') });
  await page.goto('/artwork-review/floating.html');
  await page.clock.pauseAt(new Date('2026-10-27T12:01:00Z'));
  const moon = page.getByRole('button', { name: 'Moon and weather' });
  const initial = await moon.boundingBox();
  const x = initial.x + initial.width / 2, y = initial.y + initial.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 120, y + 200, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByRole('region', { name: 'Moon and weather details' })).toHaveCount(0);
  let box = await moon.boundingBox();
  expect(box.x).toBeCloseTo(initial.x - 120, 0);
  await page.clock.runFor(4000);
  box = await moon.boundingBox();
  expect(box.x).toBeCloseTo(initial.x - 60, -1);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const details = page.getByRole('region', { name: 'Moon and weather details' });
  await expect(details).toBeVisible();
  const before = await moon.boundingBox();
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  const held = await moon.boundingBox();
  expect(held.x).toBeCloseTo(before.x, 0);
  await page.mouse.move(before.x + before.width / 2 - 30, before.y + before.height / 2 + 40);
  await page.mouse.up();
  await page.clock.runFor(8000);
  const returned = await moon.boundingBox();
  expect(returned.x).toBeCloseTo(initial.x, 0);
  expect(returned.y).toBeCloseTo(initial.y, 0);
  await expect(details).toBeVisible();
});

test('reduced motion leaves the moon in place until the visitor resets it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/artwork-review/floating.html');
  const moon = page.getByRole('button', { name: 'Moon and weather' });
  const initial = await moon.boundingBox();
  const x = initial.x + initial.width / 2, y = initial.y + initial.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 80, y + 100);
  await page.mouse.up();
  const moved = await moon.boundingBox();
  expect(moved.x).toBeCloseTo(initial.x - 80, 0);
  await moon.click();
  await page.getByRole('button', { name: 'Return moon to starting position' }).click();
  const returned = await moon.boundingBox();
  expect(returned.x).toBeCloseTo(initial.x, 0);
  expect(returned.y).toBeCloseTo(initial.y, 0);
});
