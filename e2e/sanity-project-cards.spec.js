import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

const projects = [
  { _id: 'c0a1c1ee-3b33-4b80-b423-12f0ab0c8b6f', name: 'CMS Sudoku', description: 'Sudoku from Sanity', link: '/projects/SudokuSolver', image: '/logo192.png' },
  { _id: 'c3e9c324-e055-4146-9335-55e2d7e28e29', name: 'CMS Minesweeper', description: 'Minesweeper from Sanity', link: '/projects/Minesweeper', image: '/logo512.png' },
  { _id: 'project-html-page-builder', kind: 'pageBuilder', name: 'CMS Page Builder', description: 'Page Builder from Sanity', link: '/projects/page-builder', image: '/page-builder-preview.svg' },
  { _id: 'project-css-theme-studio', kind: 'cssStudio', name: 'CMS Theme Studio', description: 'Theme Studio from Sanity', image: '/favicon.ico' },
];

const records = projects.map(({ image, ...project }) => ({
  ...project,
  thumbnail: { asset: { url: image }, alt: `${project.name} image` },
}));

async function expectStudioLaunch(page) {
  await page.getByRole('button', { name: 'Open Theme Studio' }).click();
  await expect(page.getByRole('button', { name: 'Close tools' })).toBeVisible();
  await page.getByRole('button', { name: 'Close tools' }).click();
}

test('both project surfaces render editable Sanity content and preserve the Studio launcher', async ({ page }) => {
  await page.route('**/*sanity.io/**', route => route.fulfill({
    headers: { 'Access-Control-Allow-Origin': '*' },
    json: { result: records },
  }));
  await page.goto('/project');
  for (const project of projects) {
    await expect(page.getByRole('heading', { name: project.name, exact: true })).toHaveCount(1);
    await expect(page.getByText(project.description, { exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: `${project.name} image` })).toHaveAttribute('src', project.image);
  }
  for (const name of ['Sudoku Solver', 'Minesweeper', 'HTML Page Builder', 'CSS Theme Studio']) {
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
  }
  await expectStudioLaunch(page);

  await page.goto('/');
  const cards = page.locator('[data-carousel-card]');
  await expect(cards).toHaveCount(4);
  for (const project of projects) {
    await expect(cards.locator('h2').filter({ hasText: project.name })).toHaveCount(1);
  }
  for (const name of ['Sudoku Solver', 'Minesweeper', 'HTML Page Builder', 'CSS Theme Studio']) {
    await expect(cards.locator('h2').filter({ hasText: new RegExp(`^${name}$`) })).toHaveCount(0);
  }
  // Each click brings the next CMS card into the accessible center position.
  for (const [index, project] of projects.entries()) {
    const center = page.locator('.landing-card--center');
    await expect(center.getByRole('heading', { name: project.name, exact: true })).toBeVisible();
    await expect(center.getByText(project.description, { exact: true })).toBeVisible();
    await expect(center.getByRole('img', { name: `${project.name} image` })).toHaveAttribute('src', project.image);
    if (project.kind === 'cssStudio') await expectStudioLaunch(page);
    if (index < projects.length - 1) await page.getByRole('button', { name: 'Next project' }).click();
  }
});

test('both project surfaces retain the four bundled cards and warn when Sanity fails', async ({ page }) => {
  await page.route('**/*sanity.io/**', route => route.fulfill({
    status: 403,
    headers: { 'Access-Control-Allow-Origin': '*' },
    json: { message: 'Unavailable' },
  }));
  await page.goto('/project');
  await expect(page.getByText('Could not load the latest project content from Sanity.')).toBeVisible();
  for (const name of ['Sudoku Solver', 'Minesweeper', 'HTML Page Builder', 'CSS Theme Studio']) {
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(1);
  }

  await page.goto('/');
  await expect(page.getByText(/latest project content is unavailable/i)).toBeVisible();
  const cards = page.locator('[data-carousel-card]');
  await expect(cards).toHaveCount(4);
  for (const name of ['Sudoku Solver', 'Minesweeper', 'HTML Page Builder', 'CSS Theme Studio']) {
    await expect(cards.locator('h2').filter({ hasText: new RegExp(`^${name}$`) })).toHaveCount(1);
  }
});
