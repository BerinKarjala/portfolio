// Classify requests before supplying synthetic responses; nothing is forwarded.
const ORIGIN = 'https://studio.invalid';
const API_HOST = 'umy7f73e.api.sanity.io';

function classifyRequest(rawUrl, method) {
  let url;
  try { url = new URL(rawUrl); } catch { return 'violation'; }
  const noUserInfo = !url.username && !url.password;
  const testOrigin = url.origin === `https://${API_HOST}`;
  if (noUserInfo && method === 'POST' && (
    (url.origin === 'https://api.sanity.io' && url.pathname === '/vX/intake/tracing') ||
    (testOrigin && url.pathname === '/v2023-12-18/intake/batch')
  )) return 'expected-telemetry';
  if (noUserInfo && testOrigin && method === 'GET' &&
      /^\/v\d{4}-\d{2}-\d{2}\/data\/listen\/content-agent-test$/.test(url.pathname)) return 'expected-listen';
  if (method !== 'GET') return 'violation';
  if (url.origin === ORIGIN) return 'asset';
  if (url.hostname.endsWith('.api.sanity.io') || url.hostname.endsWith('.apicdn.sanity.io')) {
    if (url.hostname !== API_HOST) return 'violation';
  }
  if (url.hostname !== API_HOST) return 'blocked';
  if (url.protocol !== 'https:') return 'violation';
  const path = url.pathname.replace(/^\/v\d{4}-\d{2}-\d{2}/, '');
  if (path.startsWith('/data/')) {
    return path === '/data/query/content-agent-test' ? 'test-query' : 'violation';
  }
  if (path.startsWith('/projects/umy7f73e/datasets/')) {
    return path === '/projects/umy7f73e/datasets/content-agent-test/acl' ? 'test-acl' : 'violation';
  }
  if (['/users/me', '/auth/providers', '/projects/umy7f73e/grants'].includes(path)) return 'mock';
  return 'blocked';
}

function studioFilePath(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return null; }
  if (!decoded.startsWith('/') || decoded.includes('\\') || /[\0-\x1f\x7f]/.test(decoded)) return null;
  const segments = decoded.slice(1).split('/');
  if (segments.some((part) => part === '.' || part === '..')) return null;
  return decoded === '/' ? 'index.html' : segments.join('/');
}

// Return fixed labels only: URLs may include query text or credentials.
function diagnosticKey(rawUrl, kind, method = 'GET') {
  if (kind === 'expected-listen') return 'expected-test-listen-aborted';
  if (kind === 'expected-telemetry') return 'expected-telemetry-aborted';
  if (kind === 'test-query') return 'api-test-query';
  if (kind === 'test-acl') return 'api-test-acl';
  let url;
  try { url = new URL(rawUrl); } catch { return 'invalid'; }
  const path = url.pathname.replace(/^\/(?:v\d+(?:-\d{2}-\d{2})?|vX)(?=\/)/, '');
  if (kind === 'violation') {
    if (method !== 'GET') {
      if (method === 'POST') return 'violation-method-post';
      if (method === 'OPTIONS') return 'violation-method-options';
      return 'violation-method-other';
    }
    const projectHost = url.hostname.match(/^([^.]+)\.(?:api|apicdn)\.sanity\.io$/);
    if (projectHost && projectHost[1] !== 'umy7f73e') return 'violation-project';
    const data = path.match(/^\/data\/([^/]+)\/([^/]+)/);
    const dataset = path.match(/^\/projects\/[^/]+\/datasets\/([^/]+)/);
    if ((data && data[2] !== 'content-agent-test') || (dataset && dataset[1] !== 'content-agent-test')) return 'violation-dataset';
    if (data && data[2] === 'content-agent-test') {
      if (data[1] === 'listen') return 'violation-test-listen';
      if (data[1] === 'doc') return 'violation-test-document';
      return 'violation-test-data-other';
    }
    return 'violation-target-other';
  }
  if (kind === 'asset') {
    if (url.pathname === '/') return 'asset-index';
    if (/\.m?js$/i.test(url.pathname)) return 'asset-js';
    if (/\.css$/i.test(url.pathname)) return 'asset-css';
    return 'asset-other';
  }
  if (kind === 'mock') {
    if (path === '/users/me') return 'api-users-me';
    if (path === '/auth/providers') return 'api-auth-providers';
    return 'api-project-grants';
  }
  if (url.hostname.endsWith('.sanity.io')) {
    if (path === '/check/cors') return 'blocked-sanity-cors-probe';
    if (path.startsWith('/intake/')) return 'blocked-sanity-telemetry';
    if (/^\/projects\/[^/]+\/user-applications(?:\/|$)/.test(path)) return 'blocked-sanity-applications';
    if (/^\/projects\/[^/]+$/.test(path)) return 'blocked-sanity-project';
    if (path.startsWith('/projects/')) return 'blocked-sanity-projects';
    if (path.startsWith('/users/me/keyvalue')) return 'blocked-sanity-user-keyvalue';
    if (path.startsWith('/users/')) return 'blocked-sanity-users';
    if (path.startsWith('/data/listen/')) return 'blocked-sanity-listen';
    if (path.startsWith('/data/query/')) return 'blocked-sanity-query';
    if (path.startsWith('/data/doc/')) return 'blocked-sanity-document';
    if (path.startsWith('/data/')) return 'blocked-sanity-data';
    if (path.startsWith('/auth/')) return 'blocked-sanity-auth';
    if (path.startsWith('/journey/')) return 'blocked-sanity-journey';
    if (path === '/ping') return 'blocked-sanity-ping';
    if (path.startsWith('/presence/')) return 'blocked-sanity-presence';
    return 'blocked-sanity-other';
  }
  return 'blocked-other';
}

function consoleErrorKey(message) {
  if (/cors|cross.origin/i.test(message)) return 'cors';
  if (/failed to fetch|net::err|network|offline/i.test(message)) return 'network';
  return 'other';
}

// A blocked POST is described only by fixed host and endpoint family labels.
function postFamilyKey(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { return 'post-invalid'; }
  let host = 'other-host';
  if (url.hostname === API_HOST) host = 'project-api';
  else if (url.hostname === 'umy7f73e.apicdn.sanity.io') host = 'project-cdn';
  else if (/^[^.]+\.(?:api|apicdn)\.sanity\.io$/.test(url.hostname)) host = 'other-project';
  else if (url.hostname === 'sanity.io' || url.hostname.endsWith('.sanity.io')) host = 'sanity';
  const path = url.pathname.replace(/^\/(?:v\d+(?:-\d{2}-\d{2})?|vX)(?=\/)/, '');
  let family = 'other';
  if (path.startsWith('/data/query/')) family = 'query';
  else if (path.startsWith('/data/mutate/')) family = 'mutate';
  else if (path.startsWith('/descriptors/')) family = 'descriptor';
  else if (path === '/intake/tracing') family = 'tracing';
  else if (path === '/intake/feedback') family = 'feedback';
  else if (path.startsWith('/intake/')) family = 'telemetry';
  return `post-${host}-${family}`;
}

// Synthetic identity only: supply no project grants and a read-only fake ACL.
// The offline request policy, not these simulated permissions, blocks writes.
function syntheticResponse(kind, path) {
  if (kind === 'mock' && path === '/users/me') {
    return { id: 'synthetic-user', name: 'Synthetic User', displayName: 'Synthetic User', roles: [{ name: 'viewer', title: 'Viewer' }] };
  }
  if (kind === 'mock' && path === '/auth/providers') return { providers: [] };
  if (kind === 'mock' && path === '/projects/umy7f73e/grants') return {};
  if (kind === 'test-acl' && path === '/projects/umy7f73e/datasets/content-agent-test/acl') return [{ filter: '_id in path("**")', permissions: ['read'] }];
  if (kind === 'test-query' && path === '/data/query/content-agent-test') return { result: [], ms: 0 };
  throw new Error('No synthetic response for this route');
}

module.exports = { classifyRequest, diagnosticKey, postFamilyKey, consoleErrorKey, studioFilePath, syntheticResponse, ORIGIN };
