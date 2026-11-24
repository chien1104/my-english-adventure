// 八大學習世界地圖
// 世界是否開放由實際教材決定：有課程內容、且完成程度診斷才開放。
import { loadContext } from '../learning.js';
import { openWorldIds } from '../progress.js';
import { escapeHTML } from '../ui/dom.js';

// 依多益考試架構：基礎 → 聽力 Part 1～4 → 閱讀 Part 5～7 → 模擬考
export const SECTIONS = [
  { id: 'base', name: '基礎打底', en: 'Foundation' },
  { id: 'listening', name: '聽力測驗', en: 'Listening・Part 1–4' },
  { id: 'reading', name: '閱讀測驗', en: 'Reading・Part 5–7' },
  { id: 'exam', name: '實戰模擬', en: 'Mock Test' },
];
export const WORLDS = [
  { id: 'words', no: 1, section: 'base', name: '單字基礎', en: 'First Words', icon: '🌱', topic: '生活與辦公室入門單字' },
  { id: 'grammar', no: 2, section: 'base', name: '文法基礎', en: 'Grammar Basics', icon: '🏗️', topic: 'be 動詞、冠詞、名詞複數' },
  { id: 'phonics', no: 3, section: 'base', name: '發音基礎', en: 'Sounds', icon: '🔤', topic: '母音、子音組合、自然拼讀' },
  { id: 'part1', no: 4, section: 'listening', name: 'Part 1 照片描述', en: 'Photographs', icon: '📷', topic: '看照片，選出正確的描述' },
  { id: 'part2', no: 5, section: 'listening', name: 'Part 2 應答問題', en: 'Question-Response', icon: '💬', topic: '聽一句問話，選出最適合的回答' },
  { id: 'part3', no: 6, section: 'listening', name: 'Part 3 簡短對話', en: 'Conversations', icon: '🗣️', topic: '生活與職場對話' },
  { id: 'part4', no: 7, section: 'listening', name: 'Part 4 簡短獨白', en: 'Talks', icon: '📢', topic: '廣播、留言、公告' },
  { id: 'part5', no: 8, section: 'reading', name: 'Part 5 句子填空', en: 'Incomplete Sentences', icon: '✏️', topic: '文法與單字填空' },
  { id: 'part6', no: 9, section: 'reading', name: 'Part 6 段落填空', en: 'Text Completion', icon: '📄', topic: 'Email、信件、公告填空' },
  { id: 'part7', no: 10, section: 'reading', name: 'Part 7 閱讀理解', en: 'Reading Comprehension', icon: '📰', topic: '短文、公告、廣告閱讀' },
  { id: 'mock', no: 11, section: 'exam', name: '模擬考殿堂', en: 'Mock Test Hall', icon: '🏆', topic: '限時模擬考，檢查 550 分實力' },
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
      <p class="muted">依多益考試架構安排：先打好基礎，再練聽力 Part 1～4、閱讀 Part 5～7，最後挑戰模擬考。世界依你的能力解鎖，不以天數限制。${ctx.diagnosis ? '' : '先完成程度診斷，就能進入已有課程的世界。'}</p>
      ${ctx.diagnosis ? '' : '<a class="btn btn--primary" href="#/diagnosis">開始程度診斷</a>'}
    </section>
    <div data-testid="world-list">
    ${SECTIONS.map((sec) => {
      const inSec = list.filter((w) => w.section === sec.id);
      if (!inSec.length) return '';
      return `<h2 class="section-title">${sec.name} <span class="en muted">${sec.en}</span></h2>
      <ol class="world-list">${inSec.map((w) => {
        const firstReason = ctx.lessons.filter((l) => l.world === w.id).map((l) => ctx.access.get(l.id)?.reason).find(Boolean);
        const badge = w.state === 'open'
          ? `<span class="badge badge--good">已開放・完成 ${w.done}/${w.lessonCount} 課</span>`
          : `<span class="badge badge--lock">🔒 ${w.state === 'locked' ? escapeHTML(firstReason || '尚未解鎖') : '完成診斷後開放'}</span>`;
        const inner = `
          <span class="world__icon" aria-hidden="true">${w.icon}</span>
          <div class="world__body">
            <p class="world__no">WORLD ${w.no}</p>
            <h3 class="world__name">${w.name}</h3>
            <p class="world__en">${w.en}</p>
            <p class="world__topic">${w.topic}</p>
          </div>
          ${badge}`;
        return w.state === 'open'
          ? `<li><a class="world world--link" href="#/world?id=${w.id}" data-world="${w.id}">${inner}</a></li>`
          : `<li><div class="world is-locked" data-world="${w.id}">${inner}</div></li>`;
      }).join('')}</ol>`;
    }).join('')}
    </div>`;
}
