// My English Adventure Service Worker
// 讓 App 在沒有網路時也能開啟、上課、播放已下載的音檔。
// 學習資料存在 IndexedDB，不在這裡；更新 App 不會影響學習紀錄。
const VERSION = '2026.11.24-v1.4';
const SHELL_CACHE = `mea-shell-${VERSION}`;
const AUDIO_CACHE = 'mea-audio-v1';

// 新增或改名檔案時，請重新產生這份清單（README 有說明）
const PRECACHE = [
  "./",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/favicon.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/img/scenes/desk.svg",
  "assets/img/scenes/meeting-room.svg",
  "assets/img/scenes/park.svg",
  "assets/img/scenes/shelf.svg",
  "assets/img/words/apple.svg",
  "assets/img/words/banana.svg",
  "assets/img/words/bed.svg",
  "assets/img/words/black.svg",
  "assets/img/words/blue.svg",
  "assets/img/words/book.svg",
  "assets/img/words/bread.svg",
  "assets/img/words/brown.svg",
  "assets/img/words/chair.svg",
  "assets/img/words/clock.svg",
  "assets/img/words/coffee.svg",
  "assets/img/words/computer.svg",
  "assets/img/words/desk.svg",
  "assets/img/words/door.svg",
  "assets/img/words/egg.svg",
  "assets/img/words/email.svg",
  "assets/img/words/green.svg",
  "assets/img/words/key.svg",
  "assets/img/words/manager.svg",
  "assets/img/words/meeting.svg",
  "assets/img/words/milk.svg",
  "assets/img/words/phone.svg",
  "assets/img/words/pink.svg",
  "assets/img/words/printer.svg",
  "assets/img/words/red.svg",
  "assets/img/words/report.svg",
  "assets/img/words/schedule.svg",
  "assets/img/words/tea.svg",
  "assets/img/words/water.svg",
  "assets/img/words/white.svg",
  "assets/img/words/window.svg",
  "assets/img/words/yellow.svg",
  "css/base.css",
  "css/components.css",
  "css/tokens.css",
  "data/catalog.json",
  "data/diagnosis.json",
  "data/lessons/biz-1.json",
  "data/lessons/biz-2.json",
  "data/lessons/grammar-1.json",
  "data/lessons/grammar-2.json",
  "data/lessons/grammar-3.json",
  "data/lessons/life-1.json",
  "data/lessons/life-2.json",
  "data/lessons/life-3.json",
  "data/lessons/mock-1.json",
  "data/lessons/phonics-1.json",
  "data/lessons/phonics-2.json",
  "data/lessons/phonics-3.json",
  "data/lessons/read-1.json",
  "data/lessons/read-2.json",
  "data/lessons/toeic-p1.json",
  "data/lessons/toeic-p2.json",
  "data/lessons/toeic-p3.json",
  "data/lessons/toeic-p4.json",
  "data/lessons/toeic-p5-1.json",
  "data/lessons/toeic-p6.json",
  "data/lessons/toeic-p7.json",
  "data/lessons/vocab-1.json",
  "data/lessons/vocab-2.json",
  "data/lessons/vocab-3.json",
  "data/vocab/breakfast.json",
  "data/vocab/colors.json",
  "data/vocab/home.json",
  "data/vocab/office.json",
  "index.html",
  "js/app.js",
  "js/audio.js",
  "js/backup.js",
  "js/content.js",
  "js/db.js",
  "js/diagnosis.js",
  "js/games/logic.js",
  "js/gamify.js",
  "js/learning.js",
  "js/lesson/engine.js",
  "js/lesson/player.js",
  "js/mistakes.js",
  "js/pages/achievements.js",
  "js/pages/diagnosis.js",
  "js/pages/exam.js",
  "js/pages/game.js",
  "js/pages/games.js",
  "js/pages/home.js",
  "js/pages/lesson.js",
  "js/pages/mistake-practice.js",
  "js/pages/mistakes.js",
  "js/pages/review.js",
  "js/pages/settings.js",
  "js/pages/stats.js",
  "js/pages/words.js",
  "js/pages/world.js",
  "js/pages/worlds.js",
  "js/progress.js",
  "js/pwa.js",
  "js/rewards.js",
  "js/router.js",
  "js/settings.js",
  "js/storage-status.js",
  "js/ui/celebrate.js",
  "js/ui/confirm.js",
  "js/ui/dom.js",
  "js/ui/question-view.js",
  "js/ui/toast.js",
  "js/ui/word-card.js",
  "js/words.js",
  "manifest.webmanifest"
];

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
