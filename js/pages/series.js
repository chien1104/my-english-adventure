// 單字系列：#/series?id=hot（或情境 id=topic-office）— 列出所有單元
import { loadContext } from '../learning.js';
import { loadSeries } from '../content.js';
import { findSeries, seriesProgress, unitProgress, unitKey, nextUnit } from '../bank.js';
import { escapeHTML } from '../ui/dom.js';

export async function render({ outlet, db, query }) {
  const [ctx, bank] = await Promise.all([loadContext(db), loadSeries(db)]);
  const s = findSeries(bank, query.id, ctx.wordsMap);
  if (!s) {
    outlet.innerHTML = '<section class="card"><h1 class="card__title">找不到這個系列</h1><a class="btn btn--primary" href="#/words">回單字</a></section>';
    return;
  }
  const p = seriesProgress(s, ctx.records);
  const next = nextUnit(s, ctx.records);
  outlet.innerHTML = `
    <section class="card world-head">
      <a class="link" href="#/words">← 單字</a>
      <h1 class="page-title">${s.icon} ${escapeHTML(s.name)}</h1>
      <p class="muted">${escapeHTML(s.desc)}</p>
      <p data-testid="series-progress">已學 <strong>${p.learned}</strong> / ${p.total} 字・共 ${s.units.length} 個單元（每單元約 8 分鐘）</p>
      ${next ? `<a class="btn btn--primary btn--block" href="#/unit?id=${next.id}" data-testid="series-next">${p.learned ? '繼續' : '開始'}：第 ${next.index + 1} 單元</a>`
        : '<p class="status-line status-line--good">🎉 這個系列的單字全部學過了！到期時記得複習。</p>'}
    </section>
    <ol class="unit-list" data-testid="unit-list">
      ${s.units.map((ids, i) => {
        const up = unitProgress(ids, ctx.records);
        const saved = ctx.progressById.get(unitKey(`${s.id}:${i}`));
        const state = saved?.status === 'in_progress' ? '進行中' : up.done ? '已學完' : up.learned ? `已學 ${up.learned}/${up.total}` : '';
        const preview = ids.slice(0, 4).map((id) => ctx.wordsMap.get(id)?.en).filter(Boolean).join('、');
        return `<li><a class="unit-card${up.done ? ' is-done' : ''}" href="#/unit?id=${s.id}:${i}" data-unit="${i}">
          <span class="unit-card__no en">${i + 1}</span>
          <span class="unit-card__body"><strong>第 ${i + 1} 單元</strong><span class="muted small en">${escapeHTML(preview)}…</span></span>
          <span class="unit-card__state small">${up.done ? '✔️ ' : ''}${state}</span>
        </a></li>`;
      }).join('')}
    </ol>`;
}
