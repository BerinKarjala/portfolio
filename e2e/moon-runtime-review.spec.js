import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('runtime artwork loads only selected effects and follows sample controls', async ({ page }, testInfo) => {
  const requested = [];
  page.on('request', request => {
    if (request.url().includes('/assets/moon-weather/runtime/')) requested.push(request.url());
  });
  await page.goto('/artwork-review/runtime.html');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  const phone = page.getByRole('figure', { name: 'Phone-size artwork' });
  await expect(phone.getByRole('img', { name: /first quarter.*approximate/i })).toBeVisible();
  await expect.poll(() => requested.some(url => /moon-master-384-.*\.webp/.test(url))).toBe(true);
  expect(requested.some(url => /\/(sun|rain|wind|thunderstorm)-/.test(url))).toBe(false);

  await page.getByLabel('Weather sample').selectOption('2');
  await expect(phone.locator('picture[data-weather-layer="sun"]')).toHaveCount(1);
  await expect(phone.locator('picture[data-weather-layer="partly-cloudy"]')).toHaveCount(1);
  await page.getByLabel('Daytime').uncheck();
  await expect(phone.locator('picture[data-weather-layer="sun"]')).toHaveCount(0);
  await expect(phone.locator('picture[data-weather-layer="partly-cloudy"]')).toHaveCount(1);
  await expect(phone.getByRole('img', { name: /first quarter.*clouds/i })).toBeVisible();
  await page.getByLabel('Daytime').check();
  await expect(phone.locator('picture[data-weather-layer="sun"]')).toHaveCount(1);

  await page.getByLabel('Weather sample').selectOption('sleet');
  await expect(phone.locator('picture[data-weather-layer="sleet"]')).toBeVisible();
  await page.getByLabel('Weather sample').selectOption('95');
  await page.getByLabel('Add recent rain').check();
  await page.getByLabel('Add wind').check();
  await phone.scrollIntoViewIfNeeded();
  const layers = phone.locator('picture');
  await expect(layers).toHaveCount(4);
  expect(await layers.evaluateAll(elements => elements.map(element => element.dataset.weatherLayer))).toEqual(['thunderstorm', 'rain', 'wind', 'lightning']);
  for (const img of await phone.locator('picture img').all()) {
    await expect.poll(() => img.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  }
  await page.getByLabel('Southern Hemisphere').check();
  await expect(phone.locator('[data-moon-orientation]')).toHaveAttribute('transform', 'translate(32 0) scale(-1 1)');
  await page.getByLabel('Preview background').selectOption('light');
  await expect(phone.locator('.moon-review__scene')).toHaveCSS('background-color', 'rgb(245, 242, 232)');
  await testInfo.attach('runtime-artwork', { body: await phone.screenshot(), contentType: 'image/png' });
});

test('runtime artwork uses PNG fallbacks if WebP images fail', async ({ page }) => {
  await page.route('**/moon-master-384-*.webp', route => route.abort());
  await page.route('**/overcast-*-*.webp', route => route.abort());
  await page.goto('/artwork-review/runtime.html');
  const phone = page.getByRole('figure', { name: 'Phone-size artwork' });
  await expect(phone.locator('svg image').first()).toHaveAttribute('href', /moon-master-256-.*\.png$/);
  await page.getByLabel('Weather sample').selectOption('3');
  await phone.scrollIntoViewIfNeeded();
  const overlay = phone.locator('picture[data-weather-layer="overcast"]');
  await expect(overlay.locator('source')).toHaveCount(0);
  await expect.poll(() => overlay.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(await overlay.locator('img').getAttribute('src')).toMatch(/overcast-256-.*\.png$/);
});

test('artwork review fits responsive viewports and exposes accessible controls', async ({ page }, testInfo) => {
  for (const viewport of [
    { width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 },
    { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 3840, height: 2160 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/artwork-review/runtime.html');
    await expect(page.getByRole('heading', { name: 'Moon and weather artwork' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
    if (viewport.width === 320 || viewport.width === 3840) {
      await testInfo.attach(`runtime-review-${viewport.width}`, { body: await page.screenshot({ scale: 'css' }), contentType: 'image/png' });
    }
  }
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
});
