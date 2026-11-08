// Classify requests before supplying synthetic responses; nothing is forwarded.
const ORIGIN = 'https://studio.invalid';
const API_HOST = 'umy7f73e.api.sanity.io';

function classifyRequest(rawUrl, method) {
  let url;
  try { url = new URL(rawUrl); } catch { return 'violation'; }
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
function diagnosticKey(rawUrl, kind) {
  if (kind === 'violation') return 'violation';
  if (kind === 'test-query') return 'api-test-query';
  if (kind === 'test-acl') return 'api-test-acl';
  let url;
  try { url = new URL(rawUrl); } catch { return 'invalid'; }
  if (kind === 'asset') {
    if (url.pathname === '/') return 'asset-index';
    if (/\.m?js$/i.test(url.pathname)) return 'asset-js';
    if (/\.css$/i.test(url.pathname)) return 'asset-css';
    return 'asset-other';
  }
  if (kind === 'mock') {
    const path = url.pathname.replace(/^\/v\d{4}-\d{2}-\d{2}/, '');
    if (path === '/users/me') return 'api-users-me';
    if (path === '/auth/providers') return 'api-auth-providers';
    return 'api-project-grants';
  }
  if (url.hostname.endsWith('.sanity.io')) {
    const path = url.pathname.replace(/^\/v\d{4}-\d{2}-\d{2}/, '');
    if (path === '/check/cors') return 'blocked-sanity-cors-probe';
    if (/^\/vX\/intake\//.test(path)) return 'blocked-sanity-telemetry';
    if (path.startsWith('/projects/')) return 'blocked-sanity-projects';
    if (path.startsWith('/data/')) return 'blocked-sanity-data';
    if (path.startsWith('/auth/')) return 'blocked-sanity-auth';
    return 'blocked-sanity-other';
  }
  return 'blocked-other';
}

function consoleErrorKey(message) {
  if (/cors|cross.origin/i.test(message)) return 'cors';
  if (/failed to fetch|net::err|network|offline/i.test(message)) return 'network';
  return 'other';
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

module.exports = { classifyRequest, diagnosticKey, consoleErrorKey, studioFilePath, syntheticResponse, ORIGIN };
