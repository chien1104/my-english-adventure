// 啟動流程：開資料庫 → 讀設定 → 啟動路由
import { openDB } from './db.js';
import { createSettings } from './settings.js';
import { createRouter } from './router.js';
import { getStorageStatus, describeStatus } from './storage-status.js';
import { toast } from './ui/toast.js';
import * as home from './pages/home.js';
import * as worlds from './pages/worlds.js';
import * as settingsPage from './pages/settings.js';
import * as diagnosisPage from './pages/diagnosis.js';
import * as worldPage from './pages/world.js';
import * as lessonPage from './pages/lesson.js';
import * as wordsPage from './pages/words.js';
import * as reviewPage from './pages/review.js';
import * as mistakesPage from './pages/mistakes.js';
import * as mistakePracticePage from './pages/mistake-practice.js';
import * as gamesPage from './pages/games.js';
import * as gamePage from './pages/game.js';
import { syncContent } from './content.js';
import { loadContext } from './learning.js';
import { backfillExp } from './rewards.js';
import { registerSW, applyUpdate } from './pwa.js';
import { installPlayHandler } from './audio.js';
import * as achievementsPage from './pages/achievements.js';
import * as statsPage from './pages/stats.js';
import * as examPage from './pages/exam.js';

const outlet = document.getElementById('app');
const indicator = document.getElementById('save-indicator');

async function ensureProfile(db) {
  const existing = await db.get('profile', 'me');
  if (!existing) {
    await db.put('profile', { id: 'me', exp: 0, level: 1, createdAt: Date.now() });
  }
  if (!(await db.getMeta('installedAt'))) await db.setMeta('installedAt', Date.now());
}

function showFatal(message) {
  outlet.innerHTML = `
    <section class="card">
      <h1 class="card__title">無法啟動</h1>
      <p>${message}</p>
      <p class="muted">如果正在使用私密瀏覽模式，請改用一般模式開啟。</p>
      <button class="btn btn--primary" type="button" onclick="location.reload()">重新整理</button>
    </section>`;
}

const TAB_OF = { '/world': '/worlds', '/lesson': '/worlds', '/diagnosis': '/home', '/review': '/words', '/mistake-practice': '/mistakes', '/game': '/games', '/achievements': '/home', '/stats': '/home', '/exam': '/worlds' };
function setActiveTab(path) {
  const tab = TAB_OF[path] || path;
  document.querySelectorAll('.tabbar__link').forEach((a) => {
    const active = a.getAttribute('href') === '#' + tab;
    a.classList.toggle('is-active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.querySelector('.icon-link')?.classList.toggle('is-active', path === '/settings');
}

installPlayHandler(() => toast('播放失敗，請確認手機沒有靜音', { type: 'error' }));

async function boot() {
  let db;
  try {
    db = await openDB({
      onBlocked: () => toast('另一個分頁正在使用舊版資料庫，請關閉其他分頁', { type: 'error', duration: 5000 }),
    });
    await ensureProfile(db);
    await syncContent(db);
    await backfillExp(db, await loadContext(db));
  } catch (err) {
    console.error(err);
    showFatal(err && err.message ? err.message : '資料庫開啟失敗');
    return;
  }

  const settings = createSettings();
  if (!settings.available) toast('設定無法保存（localStorage 不可用）', { type: 'error', duration: 5000 });

  async function refreshIndicator() {
    try {
      const status = await getStorageStatus({ db });
      const desc = describeStatus(status, settings.get().persistRequest);
      indicator.textContent = desc.summary;
      indicator.className = `save-indicator tone-${desc.tone}`;
      indicator.hidden = false;
    } catch { /* 狀態列失敗不影響主功能 */ }
  }

  const notFound = {
    title: '找不到頁面',
    render: ({ outlet: o }) => {
      o.innerHTML = `<section class="card"><h1 class="card__title">找不到這個頁面</h1>
        <p class="muted">可能是網址輸入錯誤。</p><a class="btn btn--primary" href="#/home">回首頁</a></section>`;
    },
  };

  const router = createRouter({
    outlet,
    ctx: { db, settings, refreshIndicator, navigate: (h) => { location.hash = h; } },
    routes: {
      '/home': { title: '首頁', render: home.render },
      '/worlds': { title: '世界地圖', render: worlds.render },
      '/settings': { title: '設定', render: settingsPage.render },
      '/diagnosis': { title: '程度診斷', render: diagnosisPage.render },
      '/world': { title: '世界', render: worldPage.render },
      '/lesson': { title: '課程', render: lessonPage.render },
      '/words': { title: '單字圖書館', render: wordsPage.render },
      '/review': { title: '單字複習', render: reviewPage.render },
      '/mistakes': { title: '錯題百科', render: mistakesPage.render },
      '/mistake-practice': { title: '錯題重練', render: mistakePracticePage.render },
      '/games': { title: '遊戲樂園', render: gamesPage.render },
      '/game': { title: '遊戲', render: gamePage.render },
      '/achievements': { title: '成就', render: achievementsPage.render },
      '/stats': { title: '學習分析', render: statsPage.render },
      '/exam': { title: '模擬考', render: examPage.render },
      '*': notFound,
    },
    onRoute: (path) => { setActiveTab(path); window.scrollTo(0, 0); },
  });

  window.__mea = { db, settings, router }; // 方便除錯與自動測試
  const banner = document.getElementById('update-banner');
  registerSW({ onUpdate: () => { banner.hidden = false; } });
  banner.querySelector('[data-act="apply-update"]').addEventListener('click', () => {
    banner.querySelector('button').disabled = true;
    applyUpdate();
  });
  await router.start();
  await refreshIndicator();
  document.documentElement.dataset.ready = 'true';
}

boot();
