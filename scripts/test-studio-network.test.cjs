const assert = require('node:assert/strict');
const { test } = require('node:test');
const { classifyRequest, studioFilePath } = require('./test-studio-network.cjs');

test('only built app GETs and explicit test-project API GETs can be fulfilled', () => {
  assert.equal(classifyRequest('https://studio.invalid/', 'GET'), 'asset');
  assert.equal(classifyRequest('https://studio.invalid/static/app.js', 'GET'), 'asset');
  assert.equal(classifyRequest('https://umy7f73e.api.sanity.io/v2026-05-04/users/me', 'GET'), 'mock');
  assert.equal(classifyRequest('https://umy7f73e.api.sanity.io/v2026-05-04/data/query/content-agent-test?query=*', 'GET'), 'test-query');
  assert.equal(classifyRequest('https://umy7f73e.api.sanity.io/v2021-06-07/projects/umy7f73e/datasets/content-agent-test/acl', 'GET'), 'test-acl');
  assert.equal(classifyRequest('https://umy7f73e.api.sanity.io/v2021-06-07/projects/umy7f73e/datasets/production/acl', 'GET'), 'violation');
  assert.equal(classifyRequest('https://umy7f73e.apicdn.sanity.io/v2026-05-04/data/query/production', 'GET'), 'violation');
  assert.equal(classifyRequest('https://umy7f73e.api.sanity.io/v2026-05-04/data/query/production?query=*', 'GET'), 'violation');
  assert.equal(classifyRequest('https://other.api.sanity.io/v2026-05-04/users/me', 'GET'), 'violation');
  assert.equal(classifyRequest('https://umy7f73e.api.sanity.io/v2026-05-04/data/mutate/content-agent-test', 'POST'), 'violation');
  assert.equal(classifyRequest('https://studio.invalid/static/app.js', 'POST'), 'violation');
  assert.equal(classifyRequest('https://other.invalid/', 'POST'), 'violation');
  assert.equal(classifyRequest('https://other.invalid/', 'GET'), 'blocked');
});

test('static file resolution rejects traversal and does not use an SPA fallback for assets', () => {
  assert.equal(studioFilePath('/'), 'index.html');
  assert.equal(studioFilePath('/static/app.js'), 'static/app.js');
  assert.equal(studioFilePath('/%2e%2e/private'), null);
  assert.equal(studioFilePath('/static%2f..%2fprivate'), null);
  assert.equal(studioFilePath('/static%5c..%5cprivate'), null);
  assert.equal(studioFilePath('/%00'), null);
});
