// 單字圖書館：#/words
import { loadContext } from '../learning.js';
import { STATUS_LABEL, statusOf } from '../words.js';
import { wordCardHTML, attachAudioButtons } from '../ui/word-card.js';
import { escapeHTML } from '../ui/dom.js';
import { formatTime } from '../storage-status.js';

const FILTERS = [['all', '全部'], ['learning', '學習中'], ['familiar', '熟悉'], ['new', '還沒學']];

export async function render({ outlet, db, query }) {
  const ctx = await loadContext(db);
  const words = [...ctx.wordsMap.values()];
  const counts = { all: words.length, new: 0, learning: 0, familiar: 0 };
  for (const w of words) counts[statusOf(ctx.records.get(w.id))] += 1;
  const learned = counts.learning + counts.familiar;
  let filter = FILTERS.some(([k]) => k === query.filter) ? query.filter : 'all';

  outlet.innerHTML = `
    <section class="card">
      <h1 class="page-title">單字圖書館</h1>
      <dl class="stats">
        <div class="stat"><dt>學習中</dt><dd data-testid="count-learning">${counts.learning}</dd></div>
        <div class="stat"><dt>熟悉</dt><dd data-testid="count-familiar">${counts.familiar}</dd></div>
        <div class="stat"><dt>還沒學</dt><dd>${counts.new}</dd></div>
      </dl>
      ${learned > 0 ? `
      <p class="due-line" data-testid="due-line">${ctx.dueCount
        ? `📅 今天有 <strong>${ctx.dueCount}</strong> 個單字到期，該複習了`
        : `✅ 今天沒有到期的單字${ctx.nextDue ? `，下次複習：${formatTime(ctx.nextDue).slice(5)}` : ''}`}</p>
      <div class="btn-row">
        ${ctx.dueCount ? `<a class="btn btn--primary" href="#/review" data-testid="start-review">開始複習（${Math.min(ctx.dueCount, 10)} 個）</a>` : ''}
        <a class="btn btn--ghost" href="#/review?mode=free" data-testid="free-practice">自由練習</a>
      </div>
      <p class="hint">依記憶曲線排程：答對的單字間隔會拉長（1、3、7、14、30 天），答錯的今天再複習。連續按時答對 3 次就算熟悉。自由練習答對不會改變排程，答錯的單字會排到今天再複習。</p>`
      : '<p class="muted">完成單字村莊的課程後，就可以在這裡複習。</p>'}
    </section>
    <div class="filter-row" role="tablist" aria-label="篩選">
      ${FILTERS.map(([k, label]) => `<button type="button" class="chip${k === filter ? ' is-active' : ''}" role="tab" aria-selected="${k === filter}" data-filter="${k}">${label} ${counts[k]}</button>`).join('')}
    </div>
    <ul class="word-list" data-testid="word-list"></ul>`;

  const list = outlet.querySelector('[data-testid="word-list"]');
  function paint() {
    const shown = words.filter((w) => filter === 'all' || statusOf(ctx.records.get(w.id)) === filter);
    list.innerHTML = shown.length ? shown.map((w) => {
      const st = statusOf(ctx.records.get(w.id));
      return `
        <li class="word-row">
          <details>
            <summary>
              <img src="${escapeHTML(w.image)}" alt="" width="44" height="44">
              <span class="word-row__en en">${escapeHTML(w.en)}</span>
              <span class="word-row__zh">${escapeHTML(w.zh)}</span>
              <span class="status status--${st}">${STATUS_LABEL[st]}</span>
            </summary>
            <div class="word-row__detail">${wordCardHTML(w, ctx.records.get(w.id))}</div>
          </details>
        </li>`;
    }).join('') : '<li class="muted empty">這個分類還沒有單字。</li>';
    list.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', () => {
      if (d.open && !d.dataset.audioReady) { d.dataset.audioReady = '1'; attachAudioButtons(d); }
    }));
  }
  paint();

  outlet.querySelector('.filter-row').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    filter = b.dataset.filter;
    outlet.querySelectorAll('[data-filter]').forEach((x) => {
      const on = x.dataset.filter === filter;
      x.classList.toggle('is-active', on);
      x.setAttribute('aria-selected', on);
    });
    paint();
  });
}
