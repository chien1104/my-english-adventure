// 獎勵提示：經驗值（飄字＋提示）、升級與成就（全螢幕慶祝卡）
import { toast } from './toast.js';
import { escapeHTML } from './dom.js';
import { confetti, haptic } from './fx.js';
import { loadContext } from '../learning.js';
import { settleRewards } from '../rewards.js';

const queue = [];
let showing = false;

// 一次只顯示一張慶祝卡，按「太好了」或點背景關閉後才顯示下一張
function showNext() {
  if (showing || !queue.length) return;
  showing = true;
  const item = queue.shift();
  const wrap = document.createElement('div');
  wrap.className = 'celebrate-overlay';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', item.kicker);
  wrap.dataset.testid = 'celebrate';
  wrap.innerHTML = `
    <div class="celebrate-card">
      ${item.badge}
      <p class="celebrate-card__kicker">${item.kicker}</p>
      <h2 class="celebrate-card__title">${escapeHTML(item.title)}</h2>
      <p class="celebrate-card__text">${escapeHTML(item.text)}</p>
      ${item.extra || ''}
      <button type="button" class="btn btn--primary btn--block" data-act="close-celebrate">太好了！</button>
    </div>`;
  document.body.appendChild(wrap);
  confetti({ count: 140 });
  haptic([20, 40, 20]);
  const btn = wrap.querySelector('button');
  btn.focus({ preventScroll: true });
  const close = () => {
    wrap.remove();
    showing = false;
    setTimeout(showNext, 150);
  };
  btn.addEventListener('click', close);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

export function celebrate(results) {
  const list = results.filter(Boolean);
  const exp = list.reduce((n, r) => n + (r.amount || 0), 0);
  const achievements = list.filter((r) => r.achievement).map((r) => r.achievement);
  const levelUp = list.map((r) => r.levelUp).filter(Boolean).pop();
  if (exp > 0) toast(`✨ +${exp} EXP`, { type: 'success', duration: 2600 });
  if (!levelUp && !achievements.length) return;
  // 同一次獲得的升級和成就合併成一張卡，不連跳好幾張
  const extra = achievements.length ? `<div class="reward-chips">${achievements.map((a) => `<span class="reward-chip">${a.icon || '🏅'} ${escapeHTML(a.name)}</span>`).join('')}</div>` : '';
  if (levelUp) {
    queue.push({
      kicker: 'LEVEL UP', badge: `<div class="lv-badge">${levelUp.level}</div>`,
      title: `升到 Lv ${levelUp.level}！`,
      text: `新稱號「${levelUp.title}」。經驗值只會增加，慢慢來也會一直往上。`, extra,
    });
  } else {
    const a = achievements[0];
    queue.push({
      kicker: achievements.length > 1 ? `ACHIEVEMENTS ×${achievements.length}` : 'ACHIEVEMENT',
      badge: `<div class="celebrate-card__icon">${a.icon || '🏅'}</div>`,
      title: achievements.length > 1 ? `解鎖 ${achievements.length} 個成就！` : `解鎖成就：${a.name}`,
      text: achievements.length > 1 ? '繼續保持，下一個也在不遠處。' : (a.desc || '繼續保持！'),
      extra: achievements.length > 1 ? extra : '',
    });
  }
  setTimeout(showNext, 500);
}

// 活動結束後：結算每日任務、挑戰、成就，再一起提示
export async function afterActivity({ db, settings, earned = [] }) {
  try {
    const ctx = await loadContext(db);
    const { results } = await settleRewards(db, ctx, settings.getTodayMode().mode);
    celebrate([...earned, ...results]);
    return results;
  } catch (err) {
    console.error(err);
    celebrate(earned);
    return [];
  }
}
