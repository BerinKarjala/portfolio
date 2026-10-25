import {expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root = new URL('../../', import.meta.url);
const lock = JSON.parse(readFileSync(new URL('package-lock.json', root), 'utf8'));
const consumers = Object.keys(lock.packages).filter(name => name.endsWith('/miniflare'));

async function withCache(consumer, cacheControl, verify) {
  // Resolve the public Undici API from the actual consumer, including nested copies.
  const require = createRequire(fileURLToPath(new URL(`${consumer}/package.json`, root)));
  const {MockAgent, interceptors, cacheStores} = require('undici');
  const origin = 'https://cache-regression.test';
  const agent = new MockAgent();
  agent.disableNetConnect();
  let originRequests = 0;
  agent.get(origin).intercept({path: '/profile', method: 'GET'})
    .reply(200, () => `origin-response-${++originRequests}`, {
      headers: {'cache-control': cacheControl},
    }).persist();
  const client = agent.compose(interceptors.cache({
    type: 'shared',
    store: new cacheStores.MemoryCacheStore(),
  }));
  const read = async cookie => {
    const response = await client.request({
      origin, path: '/profile', method: 'GET', headers: {cookie},
    });
    return {status: response.statusCode, body: await response.body.text()};
  };
  try {
    await verify(read, () => originRequests);
  } finally {
    await agent.close();
  }
}

for (const consumer of consumers) {
  test.each([
    'private',
    'private=""',
    'private=","',
    'private=" , "',
    'private="',
    'private, private="x-owner"',
    'private="x-owner", private',
    'private="", private="x-owner"',
  ])(`${consumer}: shared cache keeps %s responses isolated and readable`, async directive => {
    await withCache(consumer, `max-age=60, ${directive}`, async (read, originRequests) => {
      await expect(read('user=alice')).resolves.toEqual({status: 200, body: 'origin-response-1'});
      await expect(read('user=bob')).resolves.toEqual({status: 200, body: 'origin-response-2'});
      expect(originRequests()).toBe(2);
    });
  });

  test(`${consumer}: explicitly public responses still use the shared cache`, async () => {
    await withCache(consumer, 'public, max-age=60', async (read, originRequests) => {
      await expect(read('user=alice')).resolves.toEqual({status: 200, body: 'origin-response-1'});
      await expect(read('user=bob')).resolves.toEqual({status: 200, body: 'origin-response-1'});
      expect(originRequests()).toBe(1);
    });
  });
}

test('the root lockfile excludes Undici versions affected by GHSA-4cwx-7wf7-3272', () => {
  expect(consumers.length).toBeGreaterThan(0);
  const copies = Object.entries(lock.packages).filter(([name]) => name.endsWith('/undici'));
  expect(copies.length).toBeGreaterThan(0);
  for (const [name, {version}] of copies) {
    const [major, minor] = version.split('.').map(Number);
    expect(major !== 7 || minor >= 29, `${name}: ${version}`).toBe(true);
  }
});
