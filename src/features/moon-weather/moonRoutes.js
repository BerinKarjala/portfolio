export function supportsMoon(pathname) {
  const path = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  return path === '/' || path === '/project' || path === '/about';
}
