import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
const viewports = [[320, 740], [390, 844], [768, 1024], [1440, 900], [1920, 1080], [3840, 2160]];
test.beforeEach(async ({ page }) => {
  await page.route('**/*sanity.io/**', route => route.fulfill({ json: { result: [] } }));
});
for (const [width, height] of viewports) {
  test(`calendar remains usable inside the scene at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const launcher = page.getByRole('button', { name: 'Open calendar' });
    await launcher.click();
    const calendar = page.getByRole('region', { name: 'Calendar utility' });
    await expect(calendar.getByRole('heading', { name: 'Calendar', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const targets = await calendar.locator('tbody button').evaluateAll(buttons => buttons.map(button => {
      const { width, height } = button.getBoundingClientRect();
      return { width, height };
    }));
    for (const target of targets) {
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByRole('button', { name: 'Next project' })).toBeDisabled();
    await expect(page.getByRole('button', { name: /add event/i })).toHaveCount(0);
    expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
    await testInfo.attach(`calendar-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    await page.getByRole('button', { name: 'Close calendar' }).click();
    await expect(launcher).toBeFocused();
    await expect(page.getByRole('link', { name: 'Open Sudoku Solver' })).toBeVisible();
  });
}
test('Studio opening stops idle rotation even when focus leaves the tools', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Open Sudoku Solver' })).toBeVisible();
  await page.clock.fastForward(8000);
  await expect(page.getByRole('link', { name: 'Open Minesweeper' })).toBeVisible();
  await page.getByRole('button', { name: 'Theme Studio', exact: true }).click();
  await page.getByRole('link', { name: 'Projects', exact: true }).focus();
  await page.clock.fastForward(60000);
  await expect(page.getByRole('link', { name: 'Open Minesweeper' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next project' })).toBeDisabled();
  await page.getByRole('button', { name: 'Close tools' }).click();
  await page.clock.fastForward(8000);
  await expect(page.getByRole('link', { name: 'Open HTML Page Builder' })).toBeVisible();
});

test('weather waits for explicit location permission, infers units and opens the calendar from its object', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 40.7128, longitude: -74.006 });
  let requests = 0;
  await page.route('https://api.open-meteo.com/v1/forecast?**', route => {
    requests++;
    return route.fulfill({ json: { timezone: 'America/New_York', current: { time: Math.floor(Date.now() / 1000), temperature_2m: 15, weather_code: 61, is_day: 1 } } });
  });
  await page.goto('/');
  await expect(page.getByText('Weather needs your permission.')).toBeVisible();
  expect(requests).toBe(0);
  await page.getByRole('button', { name: 'Use my location' }).click();
  await expect(page.getByText('59°F · Rain')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Celsius' }).click();
  await expect(page.getByText('15°C · Rain')).toBeVisible();
  await page.getByRole('button', { name: 'Theme Studio', exact: true }).click({ button: 'right' });
  await expect(page.getByRole('region', { name: 'Calendar utility' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Theme Studio tools' })).toHaveCount(0);
});

test('dragging the weather object does not open tools and can be reset', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const object = page.getByRole('button', { name: 'Theme Studio', exact: true });
  const box = await object.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 150, 2000, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByRole('region', { name: 'Theme Studio tools' })).toHaveCount(0);
  const reset = page.getByRole('button', { name: 'Reset weather position' });
  await expect(reset).toBeVisible();
  const moved = await page.getByRole('group', { name: 'Weather and time' }).boundingBox();
  expect(moved.y).toBeGreaterThanOrEqual(0);
  expect(moved.y + moved.height).toBeLessThanOrEqual(901);
  await reset.click();
  await expect(reset).toHaveCount(0);
});

test('landing cards and calendar keep readable colors in Studio light/dark high-contrast themes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Theme Studio', exact: true }).click();
  await page.getByLabel('High Contrast', { exact: true }).setChecked(true);
  for (const appearance of ['light', 'dark']) {
    await page.getByRole('combobox', { name: 'Appearance', exact: true }).selectOption(appearance);
    expect((await new AxeBuilder({ page }).include('main').include('header').analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Open calendar', exact: true }).click();
    expect((await new AxeBuilder({ page }).include('main').include('header').analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Close calendar' }).click();
    await page.getByRole('button', { name: 'Open text editor', exact: true }).click();
    expect((await new AxeBuilder({ page }).include('main').include('header').analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Close text editor' }).click();
  }
});

test('the Studio carousel entry has a consistent accessible heading level', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Previous project' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'CSS Theme Studio' })).toBeVisible();
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
});

for (const [width, height] of viewports) {
  test(`text editor stays accessible at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const launcher = page.getByRole('button', { name: 'Open text editor', exact: true });
    await launcher.click();
    const editor = page.getByRole('region', { name: 'Text editor utility' });
    await expect(editor.getByRole('heading', { name: 'Text Editor', exact: true })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Next project' })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const targets = await editor.locator('button:visible, select, input').evaluateAll(nodes => nodes.map(node => {
      const { width, height } = node.getBoundingClientRect(); return { width, height };
    }));
    for (const target of targets) { expect(target.width).toBeGreaterThanOrEqual(44); expect(target.height).toBeGreaterThanOrEqual(44); }
    expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
    await testInfo.attach(`editor-${width}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    await page.getByRole('button', { name: 'Close text editor' }).click();
    await expect(launcher).toBeFocused();
    await expect(page.getByRole('link', { name: 'Open Sudoku Solver' })).toBeVisible();
  });
}
async function selectWriting(page, start, end) {
  await page.getByRole('textbox', { name: 'Writing area' }).evaluate((root, [start, end]) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    const point = offset => { for (const node of nodes) { if (offset <= node.length) return [node, offset]; offset -= node.length; } return [root, root.childNodes.length]; };
    root.focus(); const range = document.createRange(); range.setStart(...point(start)); range.setEnd(...point(end));
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  }, [start, end]);
}
test('editor formats, undoes, saves across reload and downloads plain text', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open text editor', exact: true }).click();
  await page.getByRole('textbox', { name: 'Document title' }).fill('Forest notes');
  const sheet = page.getByRole('textbox', { name: 'Writing area' });
  await sheet.pressSequentially('A quiet forest');
  await selectWriting(page, 2, 7);
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  await expect(sheet.locator('strong')).toHaveText('quiet');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(sheet.locator('strong')).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(sheet.locator('strong')).toHaveText('quiet');
  await selectWriting(page, 2, 7);
  await sheet.press('Control+i'); await sheet.press('Control+u');
  await expect(sheet.locator('em')).toHaveText('quiet');
  await expect(sheet.locator('u')).toHaveText('quiet');
  await page.getByRole('combobox', { name: 'Paragraph style' }).selectOption('heading1');
  await expect(sheet.locator('.writing-line--heading1')).toHaveText('A quiet forest');
  await page.getByRole('button', { name: 'Bulleted list', exact: true }).click();
  await expect(sheet.locator('ul li')).toHaveText('A quiet forest');
  await expect(page.getByRole('combobox', { name: 'Paragraph style' })).toHaveValue('bullet');
  await page.getByRole('button', { name: 'Open calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Open text editor', exact: true }).click();
  await expect(sheet.locator('strong')).toHaveText('quiet');
  await sheet.press('Control+s');
  await expect(page.getByText('Saved in this browser.', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Open text editor', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Document title' })).toHaveValue('Forest notes');
  await expect(sheet.locator('ul li strong')).toHaveText('quiet');
  await expect(page.getByRole('combobox', { name: 'Paragraph style' })).toHaveValue('bullet');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('Forest notes.txt');
  const stream = await file.createReadStream(); const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  expect(Buffer.concat(chunks).toString('utf8')).toBe('- A quiet forest');
});

test('editor accepts plain pasted text, retains an unsaved draft and reports save failure', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open text editor', exact: true }).click();
  const sheet = page.getByRole('textbox', { name: 'Writing area' });
  await sheet.evaluate(root => {
    root.focus(); const data = new DataTransfer();
    data.setData('text/plain', '<img src=x onerror=alert(1)>\nSecond line');
    data.setData('text/html', '<img src=x onerror=alert(1)>');
    root.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect(sheet.locator('img')).toHaveCount(0);
  await expect(sheet).toContainText('<img src=x onerror=alert(1)>');
  await page.getByRole('button', { name: 'Close text editor' }).click();
  await page.getByRole('button', { name: 'Open text editor', exact: true }).click();
  await expect(sheet).toContainText('Second line');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not save in this browser.');
  await expect(sheet).toContainText('Second line');
  expect(await page.evaluate(() => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; })).toBe(true);
});

test('the writing set moves as one object without opening the editor and supports keyboard reset', async ({ page }) => {
  await page.goto('/');
  const object = page.getByRole('button', { name: 'Open text editor with the quill' });
  await object.scrollIntoViewIfNeeded();
  const box = await object.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(-1000, 3000, { steps: 8 }); await page.mouse.up();
  await expect(page.getByRole('textbox', { name: 'Writing area' })).toHaveCount(0);
  const moved = await object.boundingBox(), desk = await page.locator('.landing-desk').boundingBox();
  expect(moved.x).toBeGreaterThanOrEqual(desk.x + desk.width * .2 - 1);
  expect(moved.y + moved.height).toBeLessThanOrEqual(desk.y + desk.height * .85 + 1);
  await page.getByRole('button', { name: 'Reset writing set position' }).click();
  await expect(page.getByRole('button', { name: 'Reset writing set position' })).toHaveCount(0);
  await object.focus(); await object.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Reset writing set position' })).toBeVisible();
  await object.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Writing area' })).toBeVisible();
  await page.getByRole('button', { name: 'Close text editor' }).click();
  await expect(object).toBeFocused();
});

test('paragraph formatting preserves the caret and multiline typing through viewport changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open text editor', exact: true }).click();
  const sheet = page.getByRole('textbox', { name: 'Writing area' });
  await sheet.pressSequentially('First');
  await page.getByRole('combobox', { name: 'Paragraph style' }).selectOption('number');
  await expect(sheet).toBeFocused();
  await page.keyboard.press('End'); await page.keyboard.press('Enter'); await page.keyboard.type('Second');
  await expect(sheet.locator('ol li')).toHaveText(['First', 'Second']);
  await page.keyboard.press('Control+z');
  await expect(sheet.locator('ol li')).toHaveText(['First', '']);
  await page.keyboard.press('Control+Shift+z');
  await expect(sheet.locator('ol li')).toHaveText(['First', 'Second']);
  // Approximate a smaller visual viewport when an on-screen keyboard is open.
  await page.setViewportSize({ width: 390, height: 400 });
  await sheet.press('End'); await page.keyboard.type(' line');
  await expect(sheet.locator('ol li').last()).toHaveText('Second line');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved in this browser.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close text editor' }).click();
  await expect(page.getByRole('button', { name: 'Open text editor', exact: true })).toBeFocused();
});

test('an editor session holds the same project while idle and restores it on close', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Open Sudoku Solver' })).toBeVisible();
  await page.clock.fastForward(8000);
  await expect(page.getByRole('link', { name: 'Open Minesweeper' })).toBeVisible();
  await page.getByRole('button', { name: 'Open text editor', exact: true }).click();
  await page.getByRole('link', { name: 'Projects', exact: true }).focus();
  await page.clock.fastForward(60000);
  await expect(page.getByRole('heading', { name: 'Text Editor', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close text editor' }).click();
  await expect(page.getByRole('link', { name: 'Open Minesweeper' })).toBeVisible();
});

test('finishing project loading during a utility press does not move its launcher', async ({ page }) => {
  let finish;
  await page.route('**/*sanity.io/**', route => new Promise(resolve => { finish = async () => { await route.fulfill({ json: { result: [] } }); resolve(); }; }));
  await page.goto('/');
  await expect(page.getByText('Loading latest project content…', { exact: true })).toBeVisible();
  const launcher = page.getByRole('button', { name: 'Open text editor', exact: true });
  await launcher.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => typeof finish).toBe('function');
  const box = await launcher.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await finish();
  await expect(page.getByText('Loading latest project content…', { exact: true })).toHaveCount(0);
  // A stable footer allows the real pointerup to complete on the same button.
  await expect.poll(async () => (await launcher.boundingBox()).y).toBe(box.y);
  await page.mouse.up();
  await expect(page.getByRole('textbox', { name: 'Writing area' })).toBeVisible();
});
