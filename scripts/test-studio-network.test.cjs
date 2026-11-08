const assert = require('node:assert/strict');
const { test } = require('node:test');
const { classifyRequest, diagnosticKey, postFamilyKey, consoleErrorKey, studioFilePath, syntheticResponse } = require('./test-studio-network.cjs');

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

test('known read subscription and telemetry are recognized only to abort them', () => {
  const api = 'https://umy7f73e.api.sanity.io';
  const listen = '/v2026-05-04/data/listen/content-agent-test';
  assert.equal(classifyRequest(`${api}${listen}?query=example`, 'GET'), 'expected-listen');
  assert.equal(classifyRequest('https://api.sanity.io/vX/intake/tracing', 'POST'), 'expected-telemetry');
  assert.equal(classifyRequest(`${api}/v2023-12-18/intake/batch`, 'POST'), 'expected-telemetry');
  assert.throws(() => syntheticResponse('expected-listen', '/data/listen/content-agent-test'));
  assert.throws(() => syntheticResponse('expected-telemetry', '/intake/tracing'));
  for (const [url, method] of [
    [`${api}/v2026-05-04/data/listen/production`, 'GET'],
    [`https://other.api.sanity.io${listen}`, 'GET'],
    [`${api}${listen}/extra`, 'GET'],
    [`${api}${listen}`, 'POST'],
    ['http://api.sanity.io/vX/intake/tracing', 'POST'],
    ['https://api.sanity.io:444/vX/intake/tracing', 'POST'],
    ['https://other.sanity.io/vX/intake/tracing', 'POST'],
    ['https://user@api.sanity.io/vX/intake/tracing', 'POST'],
    ['https://user@umy7f73e.api.sanity.io/v2026-05-04/data/listen/content-agent-test', 'GET'],
    ['https://api.sanity.io/vX/intake/tracing/extra', 'POST'],
    ['https://api.sanity.io/vX/intake/feedback', 'POST'],
    [`${api}/v2023-12-18/intake/batch`, 'PUT'],
    ['https://other.api.sanity.io/v2023-12-18/intake/batch', 'POST'],
    [`${api}/v2026-05-04/data/mutate/content-agent-test`, 'POST'],
    [`${api}/v2026-05-04/descriptors/claim`, 'POST'],
  ]) assert.equal(classifyRequest(url, method), 'violation', `${method} should fail`);
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
  assert.equal(diagnosticKey('https://api.sanity.io/v2026-05-04/projects/private?token=hidden', 'blocked'), 'blocked-sanity-project');
  assert.equal(diagnosticKey('https://umy7f73e.api.sanity.io/v2026-05-04/check/cors?secret=hidden', 'blocked'), 'blocked-sanity-cors-probe');
  assert.equal(diagnosticKey('https://api.sanity.io/vX/intake/tracing?secret=hidden', 'blocked'), 'blocked-sanity-telemetry');
  assert.equal(diagnosticKey('https://secret.invalid/private?token=hidden', 'violation', 'POST'), 'violation-method-post');
});

test('violation and blocked endpoint diagnostics use a bounded set of redacted categories', () => {
  const api = 'https://umy7f73e.api.sanity.io/v2026-05-04';
  for (const [url, kind, method, expected] of [
    [`${api}/data/query/content-agent-test?query=private`, 'violation', 'POST', 'violation-method-post'],
    [`${api}/data/query/content-agent-test`, 'violation', 'OPTIONS', 'violation-method-options'],
    ['https://other.api.sanity.io/v1/users/me?private=1', 'violation', 'GET', 'violation-project'],
    [`${api}/data/query/production?query=secret`, 'violation', 'GET', 'violation-dataset'],
    [`${api}/projects/umy7f73e/datasets/production/acl`, 'violation', 'GET', 'violation-dataset'],
    [`${api}/data/listen/content-agent-test?query=private`, 'violation', 'GET', 'violation-test-listen'],
    [`${api}/data/doc/content-agent-test/secret-id`, 'violation', 'GET', 'violation-test-document'],
    [`${api}/data/other/content-agent-test/secret`, 'violation', 'GET', 'violation-test-data-other'],
    ['https://umy7f73e.apicdn.sanity.io/v1/users/me', 'violation', 'GET', 'violation-target-other'],
    [`${api}/projects/umy7f73e?private=1`, 'blocked', 'GET', 'blocked-sanity-project'],
    [`${api}/projects/umy7f73e/user-applications`, 'blocked', 'GET', 'blocked-sanity-applications'],
    [`${api}/users/me/keyvalue/secret`, 'blocked', 'GET', 'blocked-sanity-user-keyvalue'],
    [`${api}/users/private-id`, 'blocked', 'GET', 'blocked-sanity-users'],
    [`${api}/journey/announcements`, 'blocked', 'GET', 'blocked-sanity-journey'],
    [`${api}/ping`, 'blocked', 'GET', 'blocked-sanity-ping'],
  ]) {
    assert.equal(diagnosticKey(url, kind, method), expected);
  }
});

test('console diagnostics classify fixed error categories without outputting the message', () => {
  assert.equal(consoleErrorKey('blocked by CORS policy secret-token'), 'cors');
  assert.equal(consoleErrorKey('Failed to fetch secret-token'), 'network');
  assert.equal(consoleErrorKey('unexpected private message'), 'other');
});

test('POST diagnostics reveal only fixed host and endpoint families', () => {
  const api = 'https://umy7f73e.api.sanity.io/v2026-05-04';
  for (const [url, expected] of [
    [`${api}/data/query/content-agent-test?query=private`, 'post-project-api-query'],
    [`${api}/data/mutate/content-agent-test?secret=x`, 'post-project-api-mutate'],
    [`${api}/descriptors/claim?secret=x`, 'post-project-api-descriptor'],
    ['https://api.sanity.io/vX/intake/batch?secret=x', 'post-sanity-telemetry'],
    ['https://api.sanity.io/vX/intake/tracing?secret=x', 'post-sanity-tracing'],
    ['https://api.sanity.io/vX/intake/feedback?secret=x', 'post-sanity-feedback'],
    ['https://other.api.sanity.io/v1/private?secret=x', 'post-other-project-other'],
    ['https://secret.invalid/private?secret=x', 'post-other-host-other'],
  ]) assert.equal(postFamilyKey(url), expected);
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
