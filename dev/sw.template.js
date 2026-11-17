// My English Adventure Service Worker
// 讓 App 在沒有網路時也能開啟、上課、播放已下載的音檔。
// 學習資料存在 IndexedDB，不在這裡；更新 App 不會影響學習紀錄。
const VERSION = '__VERSION__';
const SHELL_CACHE = `mea-shell-${VERSION}`;
const AUDIO_CACHE = 'mea-audio-v1';

// 新增或改名檔案時，請重新產生這份清單（README 有說明）
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)));
  // 不自動接手：等使用者按「立即更新」，避免上課到一半被換版本
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('mea-shell-') && k !== SHELL_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'GET_VERSION') event.source?.postMessage({ type: 'VERSION', version: VERSION });
});

async function fromNetworkThenCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok && request.method === 'GET') cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' && req.method !== 'HEAD') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope);
  const path = url.pathname.slice(scope.pathname.length);

  // 測試頁永遠走網路
  if (path.startsWith('tests/')) return;

  // 發音音檔：已下載就直接播放（離線也可以）；第一次播放時自動存起來
  if (path.startsWith('assets/audio/')) {
    event.respondWith((async () => {
      const cache = await caches.open(AUDIO_CACHE);
      const hit = await cache.match(req, { ignoreMethod: true, ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && req.method === 'GET') cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // 教材：有網路時取最新（才能收到新教材，而且版本一致），沒網路用快取
  if (path.startsWith('data/')) {
    event.respondWith(fromNetworkThenCache(req, SHELL_CACHE));
    return;
  }

  // 其他檔案：快取優先，離線也能開
  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const hit = await cache.match(req, { ignoreSearch: true, ignoreMethod: true });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const shell = await cache.match('index.html');
      try { return await fetch(req); } catch { if (shell) return shell; throw new Error('offline'); }
    }
    return fromNetworkThenCache(req, SHELL_CACHE);
  })());
});
