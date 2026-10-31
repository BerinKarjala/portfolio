const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Minimatch } = require('minimatch');

test('globstar parent preprocessing respects the expansion limit', () => {
  // A small input reproduces GHSA-g3hv-75wg-m249 without exhausting the host.
  const pattern = Array(5).fill('**/../a/b').join('/');
  const matcher = new Minimatch(pattern, { optimizationLevel: 2, braceExpandMax: 4 });
  assert.equal(matcher.set.length, 4);
});

test('ordinary globstar parent patterns still match', () => {
  const matcher = new Minimatch('**/../a/b/**/../c/d', { optimizationLevel: 2 });
  assert.equal(matcher.set.length, 4);
  assert.equal(matcher.match('../a/b/../c/d'), true);
  assert.equal(matcher.match('x/a/b/y/c/d'), true);
  assert.equal(matcher.match('x/a/b/y/c/e'), false);
});
