// 成就：#/achievements
import { ACHIEVEMENTS, levelInfo, EXP } from '../gamify.js';
import { totalExp } from '../rewards.js';
import { escapeHTML } from '../ui/dom.js';
import { formatTime } from '../storage-status.js';

export async function render({ outlet, db }) {
  const unlocked = new Map((await db.getAll('achievements')).map((a) => [a.id, a]));
  const lv = levelInfo(await totalExp(db));
  const log = (await db.getAll('expLog')).sort((a, b) => b.createdAt - a.createdAt);
  // 同一天、同一種原因的答題合併顯示，避免清單太長
  const recent = [];
  for (const e of log) {
    const last = recent[recent.length - 1];
    if (last && last.reason === e.reason && last.day === e.day) { last.amount += e.amount; last.times += 1; }
    else recent.push({ ...e, times: 1 });
    if (recent.length >= 12) break;
  }

  outlet.innerHTML = `
    <section class="card">
      <a class="link" href="#/home">← 首頁</a>
      <h1 class="page-title">成就</h1>
      <p class="muted">已解鎖 <strong data-testid="ach-unlocked">${unlocked.size}</strong> / ${ACHIEVEMENTS.length} 個，每個成就 +${EXP.achievement} EXP。</p>
      <p><span class="level__badge">Lv ${lv.level}</span> <strong>${lv.title}</strong>・<span class="en">${lv.exp} EXP</span></p>
    </section>
    <ul class="badge-grid" data-testid="badge-grid">
      ${ACHIEVEMENTS.map((a) => {
        const u = unlocked.get(a.id);
        return `
          <li class="ach${u ? ' is-unlocked' : ''}" data-ach="${a.id}">
            <span class="ach__icon" aria-hidden="true">${u ? a.icon : '🔒'}</span>
            <span class="ach__name">${escapeHTML(a.name)}</span>
            <span class="ach__desc">${escapeHTML(a.desc)}</span>
            ${u ? `<span class="ach__date">${formatTime(u.unlockedAt).slice(0, 10)}</span>` : ''}
          </li>`;
      }).join('')}
    </ul>
    <section class="card">
      <h2 class="card__title">最近獲得的經驗值</h2>
      ${recent.length ? `<ul class="exp-log">${recent.map((e) => `
        <li><span>${escapeHTML(e.reason)}${e.times > 1 ? ` ×${e.times}` : ''}</span><span class="muted">${e.day.slice(5)}</span><strong class="en">+${e.amount}</strong></li>`).join('')}</ul>`
        : '<p class="muted">還沒有紀錄。答對題目、完成課程和每日任務都會獲得經驗值。</p>'}
    </section>`;
}
