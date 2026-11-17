import { test, assert } from './runner.js';
import { parseHash, createRouter } from '../js/router.js';

test('解析路徑與查詢參數', () => {
  assert.deepEqual(parseHash('#/settings?section=data'), { path: '/settings', query: { section: 'data' } });
  assert.deepEqual(parseHash(''), { path: '/', query: {} });
  assert.deepEqual(parseHash('#/worlds/'), { path: '/worlds', query: {} });
  assert.deepEqual(parseHash('#home'), { path: '/home', query: {} });
});

function fakeWindow(hash = '') {
  const listeners = [];
  const win = {
    location: {
      hash,
      replace(h) { this.hash = h; listeners.forEach((fn) => fn()); },
    },
    addEventListener: (_, fn) => listeners.push(fn),
    removeEventListener: () => {},
    go(h) { this.location.hash = h; return Promise.all(listeners.map((fn) => fn())); },
  };
  return win;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

test('空網址導向首頁、切換頁面、未知頁面顯示 404', async () => {
  const outlet = document.createElement('div');
  const win = fakeWindow('');
  const visited = [];
  const router = createRouter({
    outlet, win,
    routes: {
      '/home': { render: ({ outlet: o }) => { o.textContent = 'HOME'; } },
      '/worlds': { render: ({ outlet: o }) => { o.textContent = 'WORLDS'; } },
      '*': { render: ({ outlet: o }) => { o.textContent = '404'; } },
    },
    onRoute: (p) => visited.push(p),
  });
  await router.start();
  await tick();
  assert.equal(outlet.textContent, 'HOME');
  await win.go('#/worlds');
  assert.equal(outlet.textContent, 'WORLDS');
  await win.go('#/nope');
  assert.equal(outlet.textContent, '404');
  assert.deepEqual(visited, ['/home', '/worlds', '/nope']);
});

test('離開頁面時執行清理函式', async () => {
  const outlet = document.createElement('div');
  const win = fakeWindow('#/a');
  let cleaned = 0;
  const router = createRouter({
    outlet, win,
    routes: {
      '/a': { render: () => () => { cleaned++; } },
      '/b': { render: () => {} },
      '*': { render: () => {} },
    },
  });
  await router.start();
  await win.go('#/b');
  assert.equal(cleaned, 1);
});

test('頁面錯誤時顯示錯誤訊息而不是白畫面', async () => {
  const outlet = document.createElement('div');
  const win = fakeWindow('#/bad');
  const orig = console.error; console.error = () => {};
  const router = createRouter({
    outlet, win,
    routes: { '/bad': { render: () => { throw new Error('壞掉了'); } }, '*': { render: () => {} } },
  });
  await router.start();
  console.error = orig;
  assert.ok(outlet.textContent.includes('頁面載入失敗'));
});
