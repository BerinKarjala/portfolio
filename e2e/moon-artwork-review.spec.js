import { expect, test } from '@playwright/test';

// Measure the rendered result, rather than the presence of a particular SVG filter.
async function phasePixels(scene, boundary) {
  return scene.evaluate(async (element, edge) => {
    const original = element.querySelector('svg');
    const svg = original.cloneNode(true);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', '128');
    svg.setAttribute('height', '128');
    const source = svg.querySelector('image').getAttribute('href');
    const response = await fetch(new URL(source, document.baseURI));
    if (!response.ok) throw new Error('Moon texture is unavailable');
    const blob = await response.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    for (const image of svg.querySelectorAll('image')) image.setAttribute('href', dataUrl);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.fillStyle = '#03361c';
      context.fillRect(0, 0, 128, 128);
      context.drawImage(image, 0, 0, 128, 128);
      const pixels = context.getImageData(0, 0, 128, 128).data;
      const color = (x, y) => { const i = (y * 128 + x) * 4; return [pixels[i], pixels[i + 1], pixels[i + 2]]; };
      const brightness = (x, y) => { const [r, g, b] = color(x, y); return .2126 * r + .7152 * g + .0722 * b; };
      const columns = [];
      for (let x = edge - 7; x <= edge + 7; x++) {
        let sum = 0;
        for (let y = 60; y <= 68; y++) sum += brightness(x, y);
        columns.push(sum / 9);
      }
      const largestStep = Math.max(...columns.slice(1).map((value, index) => Math.abs(value - columns[index])));
      let greenExcess = 0;
      for (let y = 45; y <= 83; y++) for (let x = 38; x <= 54; x++) {
        const [r, g, b] = color(x, y);
        greenExcess += g - (r + b) / 2;
      }
      return { largestStep, shadowGreenExcess: greenExcess / (39 * 17) };
    } finally { URL.revokeObjectURL(url); }
  }, boundary);
}

test('moon phases have a softened terminator and neutral shaded texture', async ({ page }, testInfo) => {
  await page.goto('/artwork-review/');
  const quarter = page.getByRole('img', { name: 'First quarter', exact: true });
  const waxing = page.getByRole('img', { name: 'Waxing gibbous', exact: true });
  const waning = page.getByRole('img', { name: 'Waning gibbous', exact: true });
  await expect(quarter).toBeVisible();
  await expect(waxing).toBeVisible();
  await expect(waning).toBeVisible();
  const metrics = await Promise.all([
    phasePixels(quarter, 64), phasePixels(waxing, 30), phasePixels(waning, 98),
  ]);
  await testInfo.attach('moon-phases', { body: await page.locator('#phase-gallery').screenshot(), contentType: 'image/png' });
  for (const metric of metrics) expect(metric.largestStep).toBeLessThan(48);
  expect(metrics[0].shadowGreenExcess).toBeLessThan(12);
});
