// Hash 路由：#/home、#/settings?section=data

export function parseHash(hash) {
  let h = String(hash || '').replace(/^#/, '');
  if (!h.startsWith('/')) h = '/' + h;
  const qIndex = h.indexOf('?');
  const rawPath = qIndex >= 0 ? h.slice(0, qIndex) : h;
  const rawQuery = qIndex >= 0 ? h.slice(qIndex + 1) : '';
  const path = rawPath.replace(/\/+$/, '') || '/';
  const query = Object.fromEntries(new URLSearchParams(rawQuery));
  return { path, query };
}

export function createRouter({ routes, outlet, ctx = {}, onRoute = null, defaultPath = '/home', win = window }) {
  let cleanup = null;
  let token = 0;

  async function handle() {
    const { path, query } = parseHash(win.location.hash);
    if (path === '/') {
      win.location.replace('#' + defaultPath);
      return;
    }
    const route = routes[path] || routes['*'];
    const my = ++token;

    if (cleanup) {
      try { cleanup(); } catch { /* 忽略 */ }
      cleanup = null;
    }
    if (onRoute) onRoute(path, route);

    try {
      const c = await route.render({ ...ctx, outlet, query, path });
      if (my !== token) { if (typeof c === 'function') c(); return; } // 已切到別頁
      cleanup = typeof c === 'function' ? c : null;
      if (route.title && typeof document !== 'undefined') {
        document.title = `${route.title}｜My English Adventure`;
      }
    } catch (err) {
      if (my !== token) return;
      console.error(err);
      outlet.innerHTML = `<section class="card"><h1>頁面載入失敗</h1><p>${String(err && err.message || err)}</p><p><a class="btn" href="#/home">回首頁</a></p></section>`;
    }
  }

  return {
    start() {
      win.addEventListener('hashchange', handle);
      return handle();
    },
    stop() { win.removeEventListener('hashchange', handle); },
    navigate(path) { win.location.hash = path; },
    refresh: handle,
  };
}
