const assert = require('node:assert/strict');
const { test } = require('node:test');
const studio = require('../package.json');
const testStudio = require('../content-agent-test/package.json');
const lock = require('../package-lock.json');

test('both Studio configurations declare aligned Sanity and Vision versions', () => {
  for (const name of ['sanity', '@sanity/vision']) {
    assert.equal(testStudio.dependencies[name], studio.dependencies[name], `${name} declarations differ`);
    const declared = /^\^6\.(\d+)\.\d+$/.exec(studio.dependencies[name]);
    assert.ok(declared && Number(declared[1]) >= 22, `${name} must include the reviewed 6.22 upgrade`);
    const locked = lock.packages[`node_modules/${name}`].version;
    const [major, minor] = locked.split('.').map(Number);
    assert.equal(major, 6, `${name} major version`);
    assert.ok(minor >= 22, `${name} lockfile must include the reviewed 6.22 upgrade`);
  }
  assert.equal(
    lock.packages['node_modules/sanity'].version,
    lock.packages['node_modules/@sanity/vision'].version,
    'Studio and Vision must resolve to the same release',
  );
});
