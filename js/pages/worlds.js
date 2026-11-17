// 八大學習世界地圖
// 世界是否開放由實際教材決定：有課程內容、且完成程度診斷才開放。
import { loadContext } from '../learning.js';
import { openWorldIds } from '../progress.js';
import { escapeHTML } from '../ui/dom.js';

export const WORLDS = [
  { id: 'alphabet-forest', no: 1, name: '字母森林', en: 'Alphabet Forest', icon: '🌲', topic: '字母、發音、自然拼讀' },
  { id: 'word-village', no: 2, name: '單字村莊', en: 'Word Village', icon: '🏡', topic: '生活單字、詞性、記憶' },
  { id: 'grammar-castle', no: 3, name: '文法城堡', en: 'Grammar Castle', icon: '🏰', topic: '基礎至進階文法' },
  { id: 'life-island', no: 4, name: '生活冒險島', en: 'Adventure Island', icon: '🏝️', topic: '旅遊、購物、餐廳、日常對話' },
  { id: 'listen-academy', no: 5, name: '聽讀學院', en: 'Listening & Reading Academy', icon: '🎧', topic: '聽力與閱讀' },
  { id: 'business-city', no: 6, name: '商務城市', en: 'Business City', icon: '🏙️', topic: '職場及商務英文' },
  { id: 'toeic-camp', no: 7, name: '多益訓練營', en: 'TOEIC Camp', icon: '⛺', topic: '多益七大題型' },
  { id: 'hall-550', no: 8, name: '550分挑戰殿堂', en: 'Hall of 550', icon: '🏆', topic: '模擬考及考試訓練' },
];

export function worldStatus(ctx) {
  const open = openWorldIds(ctx.lessons, ctx.diagnosis, ctx.access);
  const hasContent = new Set(ctx.lessons.map((l) => l.world));
  return WORLDS.map((w) => {
    const lessons = ctx.lessons.filter((l) => l.world === w.id);
    const done = lessons.filter((l) => ctx.access.get(l.id)?.completed).length;
    let state = 'nocontent';
    if (open.has(w.id)) state = 'open';
    else if (hasContent.has(w.id) && !ctx.diagnosis) state = 'needs-diagnosis';
    else if (hasContent.has(w.id)) state = 'locked';
    return { ...w, state, lessonCount: lessons.length, done };
  });
}

export async function render({ outlet, db }) {
  const ctx = await loadContext(db);
  const list = worldStatus(ctx).filter((w) => w.state !== 'nocontent');
  outlet.innerHTML = `
    <section class="card">
      <h1 class="page-title">學習世界</h1>
      <p class="muted">世界依你的能力解鎖，不以天數限制。${ctx.diagnosis ? '' : '先完成程度診斷，就能進入已有課程的世界。'}</p>
      ${ctx.diagnosis ? '' : '<a class="btn btn--primary" href="#/diagnosis">開始程度診斷</a>'}
    </section>
    <ol class="world-list" data-testid="world-list">
      ${list.map((w) => {
        const firstReason = ctx.lessons.filter((l) => l.world === w.id).map((l) => ctx.access.get(l.id)?.reason).find(Boolean);
        const badge = w.state === 'open'
          ? `<span class="badge badge--good">已開放・完成 ${w.done}/${w.lessonCount} 課</span>`
          : `<span class="badge badge--lock">🔒 ${w.state === 'locked' ? escapeHTML(firstReason || '尚未解鎖') : '完成診斷後開放'}</span>`;
        const inner = `
          <span class="world__icon" aria-hidden="true">${w.icon}</span>
          <div class="world__body">
            <p class="world__no">WORLD ${w.no}</p>
            <h2 class="world__name">${w.name}</h2>
            <p class="world__en">${w.en}</p>
            <p class="world__topic">${w.topic}</p>
          </div>
          ${badge}`;
        return w.state === 'open'
          ? `<li><a class="world world--link" href="#/world?id=${w.id}" data-world="${w.id}">${inner}</a></li>`
          : `<li><div class="world is-locked" data-world="${w.id}">${inner}</div></li>`;
      }).join('')}
    </ol>`;
}
