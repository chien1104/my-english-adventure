// 遊戲樂園：#/games
import { loadContext } from '../learning.js';
import { GAMES, MIN_WORDS } from '../games/logic.js';
import { escapeHTML } from '../ui/dom.js';

function bestText(id, r) {
  if (!r || r.best === null) return '還沒玩過';
  if (id === 'match') return `最佳：${r.best} 次失誤`;
  if (id === 'speed') return `最高：${r.best} 分`;
  return `最佳：${r.best} 題一次答對`;
}

export async function render({ outlet, db }) {
  const ctx = await loadContext(db);
  const n = ctx.learnedWords.length;
  if (n < MIN_WORDS) {
    outlet.innerHTML = `
      <section class="card" data-testid="games-locked">
        <h1 class="page-title">遊戲樂園</h1>
        <p>遊戲會用你學過的單字出題。學一個單字單元就能開始玩（目前學過 ${n} 個單字）。</p>
        <a class="btn btn--primary" href="#/words">去學單字</a>
      </section>`;
    return;
  }
  const pictured = ctx.learnedWords.filter((w) => w.image).length;
  outlet.innerHTML = `
    <section class="card">
      <h1 class="page-title">遊戲樂園</h1>
      <p class="muted">用你學過的 ${n} 個單字出題。答錯的單字會自動收進錯題百科。</p>
    </section>
    <ul class="game-list" data-testid="game-list">
      ${Object.values(GAMES).map((g) => `
        <li class="card game-card">
          <span class="game-card__icon" aria-hidden="true">${g.icon}</span>
          <div class="game-card__body">
            <h2 class="game-card__name">${escapeHTML(g.name)}</h2>
            <p class="muted">${escapeHTML(g.desc)}</p>
            <p class="game-card__best">${bestText(g.id, ctx.progressById.get(`game:${g.id}`))}</p>
          </div>
          ${g.id === 'match' && pictured < MIN_WORDS
            ? '<p class="muted small">需要 4 個有插圖的單字（在「單字基礎」世界學）</p>'
            : `<a class="btn btn--primary btn--sm" href="#/game?id=${g.id}" data-testid="play-${g.id}">開始</a>`}
        </li>`).join('')}
    </ul>`;
}
