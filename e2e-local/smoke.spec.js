import {test, expect} from '@playwright/test';

test('React dev server renders mobile navigation and client-side routes', async ({page}) => {
  await page.route('**/*sanity.io/**', route => route.fulfill({json: {result: []}}));
  await page.goto('/');
  await expect(page.getByRole('heading', {name: 'Berin Karjala', exact: true})).toBeVisible();
  const nav = page.getByRole('navigation', {name: 'Primary'});
  await expect(nav.getByRole('link')).toHaveCount(3);
  await nav.getByRole('link', {name: 'Berin Karjala'}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(nav.getByRole('link', {name: 'Projects', exact: true})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', {name: 'My Projects', exact: true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});

test('Page Builder route loads through the React dev server', async ({page}) => {
  await page.route('**/*sanity.io/**', route => route.fulfill({json: {result: []}}));
  await page.goto('/projects/page-builder');
  await expect(page.getByRole('heading', {name: 'A space to build your next idea.', exact: true})).toBeVisible();
});

test('Sanity dev server boots its read-only login or workspace shell', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:3333/');
  await expect(page).toHaveTitle(/Sanity Studio/);
  const root = page.locator('#sanity');
  await expect(root).not.toBeEmpty();
  await expect(root.locator('button, a[href], [role="tab"]').first()).toBeVisible();
  await expect(root.getByText(/^(An error occurred|Configuration error|Schema error|Plugin error)/i)).toHaveCount(0);
  expect((await root.innerText()).trim().length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
  // Do not authenticate, edit, publish or delete CMS documents.
});
