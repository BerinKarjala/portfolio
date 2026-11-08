const assert = require('node:assert/strict');
const { test } = require('node:test');
const { classifyRequest, diagnosticKey, consoleErrorKey, studioFilePath, syntheticResponse } = require('./test-studio-network.cjs');

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

test('failure diagnostics classify requests without exposing URLs, queries or headers', () => {
  assert.equal(diagnosticKey('https://studio.invalid/static/app-123.js?secret=hidden', 'asset'), 'asset-js');
  assert.equal(diagnosticKey('https://umy7f73e.api.sanity.io/v2026-05-04/users/me?token=hidden', 'mock'), 'api-users-me');
  assert.equal(diagnosticKey('https://umy7f73e.api.sanity.io/v2026-05-04/data/query/content-agent-test?query=secret', 'test-query'), 'api-test-query');
  assert.equal(diagnosticKey('https://secret.invalid/private?token=hidden', 'blocked'), 'blocked-other');
  assert.equal(diagnosticKey('https://api.sanity.io/v2026-05-04/projects/private?token=hidden', 'blocked'), 'blocked-sanity-projects');
  assert.equal(diagnosticKey('https://umy7f73e.api.sanity.io/v2026-05-04/check/cors?secret=hidden', 'blocked'), 'blocked-sanity-cors-probe');
  assert.equal(diagnosticKey('https://api.sanity.io/vX/intake/tracing?secret=hidden', 'blocked'), 'blocked-sanity-telemetry');
  assert.equal(diagnosticKey('https://secret.invalid/private?token=hidden', 'violation'), 'violation');
});

test('console diagnostics classify fixed error categories without outputting the message', () => {
  assert.equal(consoleErrorKey('blocked by CORS policy secret-token'), 'cors');
  assert.equal(consoleErrorKey('Failed to fetch secret-token'), 'network');
  assert.equal(consoleErrorKey('unexpected private message'), 'other');
});

test('synthetic user passes Studio role gate with read-only content access and no deploy grant', () => {
  const user = syntheticResponse('mock', '/users/me');
  assert.equal(user.id, 'synthetic-user');
  assert.deepEqual(user.roles, [{ name: 'viewer', title: 'Viewer' }]);
  assert.deepEqual(syntheticResponse('mock', '/projects/umy7f73e/grants'), {});
  assert.deepEqual(syntheticResponse('test-acl', '/projects/umy7f73e/datasets/content-agent-test/acl'), [{ filter: '_id in path("**")', permissions: ['read'] }]);
  assert.deepEqual(syntheticResponse('test-query', '/data/query/content-agent-test'), { result: [], ms: 0 });
  assert.throws(() => syntheticResponse('blocked', '/anything'));
});
