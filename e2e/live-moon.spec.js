import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*sanity.io/**', route => route.fulfill({ json: { result: [] } }));
});

test('the live moon is separate, responsive and limited to the agreed routes', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  for (const viewport of [
    { width: 320, height: 740 }, { width: 390, height: 844 }, { width: 768, height: 1024 },
    { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 3840, height: 2160 },
  ]) {
    await page.setViewportSize(viewport);
    for (const path of ['/', '/project', '/about']) {
      await page.goto(path);
      const moon = page.getByRole('button', { name: 'Moon and weather' });
      await expect(moon).toHaveCount(1);
      expect(await moon.evaluate(node => Boolean(node.closest('header')))).toBe(false);
      const moonBox = await moon.boundingBox();
      expect(moonBox.width).toBeGreaterThanOrEqual(110);
      expect(moonBox.x + moonBox.width).toBeLessThanOrEqual(viewport.width);
      const nav = page.getByRole('navigation', { name: 'Primary' });
      for (const target of [...await nav.getByRole('link').all(), nav.getByRole('button', { name: 'Theme Studio' })]) {
        const box = await target.boundingBox();
        expect(box.x + box.width <= moonBox.x || box.y >= moonBox.y + moonBox.height).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width + 1);
      if (path === '/' && (viewport.width === 320 || viewport.width === 3840)) {
        await testInfo.attach(`live-moon-${viewport.width}`, { body: await page.screenshot({ scale: 'css' }), contentType: 'image/png' });
      }
    }
  }
  await page.goto('/projects/Minesweeper');
  await expect(page.getByRole('button', { name: 'Moon and weather' })).toHaveCount(0);
});

test('location weather persists while navigating without a second permission request', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: -33.8, longitude: 151.2 });
  let requests = 0;
  await page.route('https://api.open-meteo.com/v1/forecast?**', route => {
    requests++;
    return route.fulfill({ json: { timezone: 'Australia/Sydney', current: { time: Math.floor(Date.now() / 1000), temperature_2m: 15, weather_code: 61, is_day: 1 } } });
  });
  await page.goto('/');
  const moon = page.getByRole('button', { name: 'Moon and weather' });
  await expect(moon.locator('[data-weather-layer]')).toHaveCount(0);
  expect(requests).toBe(0);
  await moon.click();
  await page.getByRole('button', { name: 'Use my location' }).click();
  await expect(page.getByText('15°C · Rain')).toBeVisible();
  await expect(moon.locator('[data-weather-layer="rain"]')).toBeVisible();
  await expect(moon.locator('[data-weather-layer="sun"]')).toBeVisible();
  await expect(moon.locator('[data-moon-orientation]')).toHaveAttribute('transform', 'translate(32 0) scale(-1 1)');
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await moon.click();
  await expect(page.getByText('15°C · Rain')).toBeVisible();
  expect(requests).toBe(1);
});

test('calendar shortcuts work on all three routes and preserve an open editor', async ({ page }) => {
  for (const path of ['/', '/project', '/about']) {
    await page.goto(path);
    const moon = page.getByRole('button', { name: 'Moon and weather' });
    await moon.click({ button: 'right' });
    const dialog = page.getByRole('dialog', { name: 'Calendar' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(moon).toBeFocused();
    expect(new URL(page.url()).pathname).toBe(path);
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'Open text editor with the quill' }).click();
  const title = page.getByRole('textbox', { name: 'Document title' });
  await title.fill('Draft remains');
  const moon = page.getByRole('button', { name: 'Moon and weather' });
  await moon.click();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Close calendar' }).click();
  await expect(title).toHaveValue('Draft remains');
  await expect(moon).toBeFocused();
});
