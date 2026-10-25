import AxeBuilder from '@axe-core/playwright';
import {expect, test} from '@playwright/test';

const sizes = [[320, 740], [390, 844], [768, 1024], [1440, 900], [1920, 1080], [3840, 2160]];
const fixtureTime = new Date('2026-10-25T16:00:00-04:00');
test.beforeEach(async ({page}) => {
  await page.route('**/*sanity.io/**', route => route.fulfill({json: {result: []}}));
  await page.clock.setFixedTime(fixtureTime);
});
async function settle(page) {
  await expect(page.getByRole('link', {name: 'Open Sudoku Solver'})).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('.landing-card--center img,.landing-desk img')].map(image => image.decode().catch(() => {})));
  });
}
async function deskEdge(page) {
  const dimensions = await page.evaluate(() => ({
    desk: document.querySelector('.landing-desk').getBoundingClientRect().bottom + scrollY,
    end: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    art: document.querySelector('.landing-desk-art').getBoundingClientRect().height,
    image: document.querySelector('.landing-desk-art img').getBoundingClientRect().height,
  }));
  expect(Math.abs(dimensions.end - dimensions.desk)).toBeLessThanOrEqual(2);
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.art / dimensions.image).toBeCloseTo(680 / 724, 3);
}
async function viewportCard(page, name) {
  const dialog = page.getByRole('dialog', {name, exact: true});
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  const viewport = page.viewportSize();
  const box = await dialog.boundingBox();
  expect(box).toMatchObject({x: 0, y: 0, width: viewport.width, height: viewport.height});
  const exit = dialog.getByRole('button', {name: 'Exit full screen'});
  const target = await exit.boundingBox();
  expect(target.width).toBeGreaterThanOrEqual(44);
  expect(target.height).toBeGreaterThanOrEqual(44);
  expect(target.y).toBeGreaterThanOrEqual(0);
  expect(target.y + target.height).toBeLessThanOrEqual(viewport.height);
  return dialog;
}
for (const [width, height] of sizes) {
  test(`carousel layout and all six card presentations at ${width}px`, async ({page}, info) => {
    // Six complete, lossless captures at 4K can take >30s in WebKit. This is an
    // artifact budget for this new case; existing UI/test deadlines are intact.
    test.setTimeout(90000);
    await page.setViewportSize({width, height});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto('/');
    await settle(page);
    await deskEdge(page);
    const card = page.locator('.landing-card--center');
    const center = await card.boundingBox();
    for (const [name, side] of [['Previous project', -1], ['Next project', 1]]) {
      const arrow = page.getByRole('button', {name});
      const box = await arrow.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(Math.abs(box.y + box.height / 2 - center.y - center.height / 2)).toBeLessThanOrEqual(2);
      expect(side < 0 ? box.x + box.width <= center.x : box.x >= center.x + center.width).toBe(true);
      expect(await arrow.evaluate(button => {
        const r = button.getBoundingClientRect();
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === button;
      })).toBe(true);
      await arrow.focus();
      expect(await arrow.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
    }
    expect(await page.locator('.landing-utility-launchers,.landing-rotation,.landing-status-slot').count()).toBe(0);
    const capture = async label => info.attach(`${label}-${width}-reduced`, {body: await page.screenshot({fullPage: (await page.locator('dialog[aria-modal="true"]').count()) === 0}), contentType: 'image/png'});
    await capture('browsing');
    await card.getByRole('heading', {name: 'Sudoku Solver'}).dblclick();
    let dialog = await viewportCard(page, 'Sudoku Solver');
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('link', {name: 'Open Sudoku Solver'})).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', {name: 'Exit full screen'})).toBeFocused();
    const next = page.locator('[aria-label="Next project"]');
    await next.evaluate(button => button.focus());
    await expect(dialog.getByRole('button', {name: 'Exit full screen'})).toBeFocused();
    await capture('expanded-project');
    await dialog.getByRole('button', {name: 'Exit full screen'}).click();
    await expect(card.getByRole('button', {name: 'Expand Sudoku Solver'})).toBeFocused();

    await page.getByRole('button', {name: 'Calendar', exact: true}).click();
    await page.getByRole('button', {name: 'Next month'}).click();
    const month = await page.getByRole('table').getAttribute('aria-label');
    await page.getByRole('table').locator('button[tabindex="0"]').click();
    const selected = await page.getByRole('table').locator('[aria-pressed="true"]').getAttribute('aria-label');
    await capture('calendar');
    const calendarExpand = page.getByRole('button', {name: 'Expand Calendar'});
    await calendarExpand.scrollIntoViewIfNeeded();
    const calendarScroll = await page.evaluate(() => scrollY);
    await calendarExpand.click();
    dialog = await viewportCard(page, 'Calendar');
    await expect(dialog.getByRole('table')).toHaveAttribute('aria-label', month);
    await expect(dialog.getByRole('button', {name: selected})).toHaveAttribute('aria-pressed', 'true');
    await capture('expanded-calendar');
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(calendarScroll);
    await expect(page.getByRole('table')).toHaveAttribute('aria-label', month);
    await page.getByRole('button', {name: 'Close calendar'}).click();
    await expect(page.getByRole('button', {name: 'Calendar', exact: true})).toBeFocused();

    await page.getByRole('button', {name: 'Open text editor with the quill'}).click();
    await page.getByRole('textbox', {name: 'Document title'}).fill('Retained forest draft');
    const sheet = page.getByRole('textbox', {name: 'Writing area'});
    await sheet.fill('A quiet forest draft');
    await sheet.press('End');
    await sheet.press('Shift+ArrowLeft');
    await expect.poll(() => sheet.evaluate(() => window.getSelection().toString())).toBe('t');
    await page.evaluate(() => {window.carouselEditorNode = document.querySelector('[aria-label="Writing area"]');});
    await capture('editor');
    await page.getByRole('button', {name: 'Expand Text Editor'}).click();
    dialog = await viewportCard(page, 'Text Editor');
    expect(await sheet.evaluate(node => node === window.carouselEditorNode)).toBe(true);
    await expect(page.getByRole('textbox', {name: 'Writing area'})).toHaveCount(1);
    await capture('expanded-editor');
    // The retained editor selection must still drive the formatting command.
    await dialog.getByRole('button', {name: 'Bold', exact: true}).click();
    await expect(sheet.locator('strong')).toHaveText('t');
    await sheet.focus();
    await sheet.press('Escape');
    await expect(page.locator('dialog[aria-modal="true"]')).toHaveCount(0);
    await expect(sheet).toHaveText('A quiet forest draft');
    await expect(page.getByRole('textbox', {name: 'Document title'})).toHaveValue('Retained forest draft');
    await expect(page.getByRole('button', {name: 'Undo', exact: true})).toBeEnabled();
    await page.getByRole('button', {name: 'Undo', exact: true}).click();
    await expect(sheet.locator('strong')).toHaveCount(0);
    await page.getByRole('button', {name: 'Close text editor'}).click();
    await expect(page.getByRole('button', {name: 'Open text editor with the quill'})).toBeFocused();
    await deskEdge(page);
  });
}

test('selection latches, arrow hover resumes the chosen direction, and utilities retain the selected identity', async ({page}) => {
  await page.clock.install({time: fixtureTime});
  await page.goto('/'); await settle(page);
  await page.getByRole('button', {name: 'Select Minesweeper'}).click();
  await page.clock.fastForward(36000);
  await expect(page.getByRole('link', {name: 'Open Minesweeper'})).toBeVisible();
  const previous = page.getByRole('button', {name: 'Previous project'});
  await previous.hover(); await previous.click();
  await expect(page.getByRole('link', {name: 'Open Sudoku Solver'})).toBeVisible();
  await page.clock.fastForward(12000);
  await expect(page.getByRole('heading', {name: 'CSS Theme Studio', exact: true})).toBeVisible();
  await page.clock.fastForward(12000);
  await expect(page.getByRole('link', {name: 'Open HTML Page Builder'})).toBeVisible();
  await page.getByRole('button', {name: 'Calendar', exact: true}).click();
  await page.getByRole('link', {name: 'Projects', exact: true}).focus();
  await page.clock.fastForward(36000);
  await page.getByRole('button', {name: 'Close calendar'}).click();
  await page.clock.fastForward(36000);
  await expect(page.getByRole('link', {name: 'Open HTML Page Builder'})).toBeVisible();
});

test('card gestures expand only eligible chrome and reject cancelled, multiple-contact and nested controls', async ({page, browser, browserName}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/'); await settle(page);
  const preview = page.locator('.landing-card--center .landing-preview');
  const send = (target, type, id, x, y) => target.dispatchEvent(type, {pointerId: id, pointerType: 'touch', button: 0, clientX: x, clientY: y});
  await send(preview, 'pointerdown', 1, 30, 150);
  await send(preview, 'pointercancel', 1, 30, 50);
  await expect(page.locator('dialog[aria-modal="true"]')).toHaveCount(0);
  await send(preview, 'pointerdown', 2, 30, 150);
  await send(preview, 'pointerdown', 3, 60, 150);
  await send(preview, 'pointerup', 2, 30, 50);
  await send(preview, 'pointerup', 3, 60, 150);
  await expect(page.locator('dialog[aria-modal="true"]')).toHaveCount(0);
  await send(preview, 'pointerdown', 4, 30, 150);
  await send(preview, 'pointerup', 4, 30, 50);
  await viewportCard(page, 'Sudoku Solver');
  await page.keyboard.press('Escape');
  await send(preview, 'pointerdown', 5, 30, 150);
  await send(preview, 'pointerup', 5, 30, 150);
  await send(preview, 'pointerdown', 6, 30, 150);
  await send(preview, 'pointerup', 6, 30, 150);
  await viewportCard(page, 'Sudoku Solver');
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Calendar', exact: true}).click();
  await page.getByRole('button', {name: 'Next month'}).dblclick();
  await expect(page.locator('dialog[aria-modal="true"]')).toHaveCount(0);
  await page.getByRole('button', {name: 'Close calendar'}).click();
  await page.getByRole('button', {name: 'Open text editor with the quill'}).click();
  await page.getByRole('textbox', {name: 'Writing area'}).fill('Select these words');
  await page.getByRole('textbox', {name: 'Writing area'}).dblclick();
  await expect(page.locator('dialog[aria-modal="true"]')).toHaveCount(0);
  // Firefox lacks Playwright's native touchscreen context. Its pointer paths
  // above still run; Chromium/WebKit also exercise trusted touchscreen input.
  if (browserName !== 'firefox') {
    const touch = await browser.newContext({hasTouch: true, viewport: {width: 390, height: 844}, reducedMotion: 'reduce', baseURL: 'http://127.0.0.1:4173', timezoneId: 'America/New_York'});
    try {
      await touch.route('**/*sanity.io/**', route => route.fulfill({json: {result: []}}));
      const mobile = await touch.newPage();
      await mobile.goto('/'); await settle(mobile);
      const surface = mobile.locator('.landing-card--center .landing-preview');
      await surface.scrollIntoViewIfNeeded();
      const box = await surface.boundingBox();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await mobile.touchscreen.tap(x, y);
      await mobile.waitForTimeout(100);
      await mobile.touchscreen.tap(x, y);
      await viewportCard(mobile, 'Sudoku Solver');
      await mobile.keyboard.press('Escape');
      if (browserName === 'chromium') {
        await surface.scrollIntoViewIfNeeded();
        const rect = await surface.boundingBox();
        const px = rect.x + rect.width / 2, py = rect.y + rect.height - 10;
        const session = await touch.newCDPSession(mobile);
        await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: px, y: py}]});
        for (let step = 1; step <= 5; step++) {
          await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: px, y: py - step * 16}]});
          await mobile.waitForTimeout(30);
        }
        await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
        await viewportCard(mobile, 'Sudoku Solver');
        await session.detach();
      }
    } finally {await touch.close();}
  }
});

test('expanded tools inherit light/dark high contrast and keep Exit reachable in short viewports', async ({page}) => {
  await page.setViewportSize({width: 390, height: 400});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/'); await settle(page);
  await page.getByRole('button', {name: 'Theme Studio', exact: true}).click();
  await page.getByLabel('High Contrast', {exact: true}).setChecked(true);
  for (const appearance of ['light', 'dark']) {
    await page.getByRole('combobox', {name: 'Appearance', exact: true}).selectOption(appearance);
    await page.getByRole('button', {name: 'Open text editor with the quill'}).click();
    await page.getByRole('button', {name: 'Expand Text Editor'}).click();
    await viewportCard(page, 'Text Editor');
    expect((await new AxeBuilder({page}).include('[aria-modal="true"]').analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await page.getByRole('button', {name: 'Close text editor'}).click();
  }
});

test('expanded Studio actions leave the modal before opening the existing tools', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/'); await settle(page);
  await page.getByRole('button', {name: 'Previous project'}).click();
  await page.getByRole('button', {name: 'Expand CSS Theme Studio'}).focus();
  await page.keyboard.press('Enter');
  const dialog = await viewportCard(page, 'CSS Theme Studio');
  await dialog.getByRole('button', {name: 'Open Theme Studio'}).click();
  await expect(page.locator('dialog[aria-modal="true"]')).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Close tools'})).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await page.getByRole('button', {name: 'Close tools'}).click();
  await expect(page.getByRole('heading', {name: 'CSS Theme Studio', exact: true})).toBeVisible();
});

test('short viewports and enlarged text scroll through long content to the desk', async ({page}) => {
  await page.route('**/*sanity.io/**', route => route.fulfill({json: {result: [
    {name: 'Sudoku Solver', link: '/projects/SudokuSolver', description: 'Long readable project content. '.repeat(35)},
    {name: 'Hidden long description', link: 'https://example.com/hidden', description: 'A decorative preview must not extend the page. '.repeat(100)},
  ]}}));
  await page.setViewportSize({width: 390, height: 400});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/'); await settle(page);
  await page.evaluate(() => {document.documentElement.style.fontSize = '200%';});
  const action = page.getByRole('link', {name: 'Open Sudoku Solver'});
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(400);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await deskEdge(page);
});
