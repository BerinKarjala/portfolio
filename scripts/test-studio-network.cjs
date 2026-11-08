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

module.exports = { classifyRequest, studioFilePath, ORIGIN };
