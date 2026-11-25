// 單字：#/words — 複習、搜尋、多益單字系列、情境分類、學過的單字
import { loadContext } from '../learning.js';
import { loadSeries } from '../content.js';
import { STATUS_LABEL, statusOf } from '../words.js';
import { seriesProgress, nextUnit, searchWords, topicSeries } from '../bank.js';
import { wordCardHTML, attachAudioButtons } from '../ui/word-card.js';
import { escapeHTML } from '../ui/dom.js';
import { formatTime } from '../storage-status.js';
import { favoriteIds } from '../favorites.js';

const FILTERS = [['learning', '學習中'], ['familiar', '熟悉']];

export function wordRowHTML(w, record) {
  const st = statusOf(record);
  return `
    <li class="word-row">
      <details>
        <summary>
          ${w.image ? `<img src="${escapeHTML(w.image)}" alt="" width="44" height="44">` : ''}
          <span class="word-row__en en">${escapeHTML(w.en)}</span>
          <span class="word-row__zh">${escapeHTML(w.zh)}</span>
          <span class="status status--${st}">${STATUS_LABEL[st]}</span>
        </summary>
        <div class="word-row__detail">${wordCardHTML(w, record)}</div>
      </details>
    </li>`;
}

export function bindWordRows(list) {
  list.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', () => {
    if (d.open && !d.dataset.audioReady) { d.dataset.audioReady = '1'; attachAudioButtons(d); }
  }));
}

function bar(p) {
  const pct = p.total ? Math.round((p.learned / p.total) * 100) : 0;
  return `<span class="mini-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.learned}" aria-label="已學 ${p.learned} / ${p.total}"><span style="width:${pct}%"></span></span>`;
}

export async function render({ outlet, db, query }) {
  const [ctx, bank] = await Promise.all([loadContext(db), loadSeries(db)]);
  const words = [...ctx.wordsMap.values()];
  const counts = { new: 0, learning: 0, familiar: 0 };
  for (const w of words) counts[statusOf(ctx.records.get(w.id))] += 1;
  const learned = counts.learning + counts.familiar;
  let filter = FILTERS.some(([k]) => k === query.filter) ? query.filter : 'learning';
  const series = bank?.series || [];
  const hot = series[0] ? nextUnit(series[0], ctx.records) : null;
  const topics = bank ? Object.entries(bank.topics).map(([id, label]) => topicSeries(id, label, ctx.wordsMap, bank.unitSize)).filter((t) => t.count) : [];

  // 我的生字本：最新收藏的排前面
  const favWords = favoriteIds().map((id) => ctx.wordsMap.get(id)).filter(Boolean).reverse();
  const favHTML = () => `
    <section class="card fav-card" data-testid="fav-card">
      <h2 class="card__title">⭐ 我的生字本 <span class="muted small" data-testid="fav-count">${favWords.length} 個字</span></h2>
      ${favWords.length ? `
        <ul class="word-list" data-testid="fav-list">${favWords.slice(0, 5).map((w) => wordRowHTML(w, ctx.records.get(w.id))).join('')}</ul>
        ${favWords.length > 5 ? `<button type="button" class="btn btn--ghost btn--block" data-act="fav-more">看全部 ${favWords.length} 個</button>` : ''}
        <a class="btn btn--primary btn--block" href="#/review?mode=fav" data-testid="fav-practice">練習生字本</a>`
        : '<p class="muted">在任何單字卡按「☆ 加入生字本」，想加強的字就會收在這裡，可以集中練習。</p>'}
    </section>`;

  outlet.innerHTML = `
    <section class="card">
      <h1 class="page-title">單字</h1>
      <dl class="stats">
        <div class="stat"><dt>學習中</dt><dd data-testid="count-learning">${counts.learning}</dd></div>
        <div class="stat"><dt>熟悉</dt><dd data-testid="count-familiar">${counts.familiar}</dd></div>
        <div class="stat"><dt>全部單字</dt><dd data-testid="count-all">${words.length}</dd></div>
      </dl>
      ${learned > 0 ? `
      <p class="due-line" data-testid="due-line">${ctx.dueCount
        ? `📅 今天有 <strong>${ctx.dueCount}</strong> 個單字到期，該複習了`
        : `✅ 今天沒有到期的單字${ctx.nextDue ? `，下次複習：${formatTime(ctx.nextDue).slice(5)}` : ''}`}</p>
      <div class="btn-row">
        ${ctx.dueCount ? `<a class="btn btn--primary" href="#/review" data-testid="start-review">開始複習（${Math.min(ctx.dueCount, 10)} 個）</a>` : ''}
        <a class="btn btn--ghost" href="#/review?mode=free" data-testid="free-practice">自由練習</a>
      </div>
      <p class="hint">依記憶曲線排程：答對的單字間隔會拉長（1、3、7、14、30 天），答錯的今天再複習。連續按時答對 3 次就算熟悉。</p>`
      : '<p class="muted">從「多益高頻 500」第 1 單元開始，學過的單字會自動排進複習。</p>'}
      ${hot ? `<a class="btn btn--primary btn--block" href="#/unit?id=${hot.id}" data-testid="next-unit">🔥 繼續背：${escapeHTML(hot.series.name)} 第 ${hot.index + 1} 單元</a>` : ''}
    </section>

    ${favHTML()}

    <section class="card">
      <label class="field">
        <span class="field__label">查單字</span>
        <input class="input" type="search" data-role="search" placeholder="輸入英文或中文" autocomplete="off" autocapitalize="off" spellcheck="false" data-testid="word-search">
      </label>
      <ul class="word-list" data-role="results" data-testid="search-results"></ul>
    </section>

    ${series.length ? `
    <h2 class="section-title">多益單字系列 <span class="en muted">TOEIC Word Series</span></h2>
    <ul class="series-list" data-testid="series-list">
      ${series.map((s) => {
        const p = seriesProgress(s, ctx.records);
        return `<li><a class="series-card" href="#/series?id=${s.id}" data-series="${s.id}">
          <span class="series-card__icon" aria-hidden="true">${s.icon}</span>
          <span class="series-card__body"><strong>${escapeHTML(s.name)}</strong>
            <span class="muted small">${escapeHTML(s.desc)}</span>
            ${bar(p)}<span class="small">已學 ${p.learned} / ${p.total} 字・${s.units.length} 個單元</span></span>
        </a></li>`;
      }).join('')}
    </ul>
    <h2 class="section-title">依多益情境 <span class="en muted">By Situation</span></h2>
    <div class="chip-cloud" data-testid="topic-list">
      ${topics.map((t) => `<a class="chip" href="#/series?id=${t.id}">${escapeHTML(t.name.replace('情境', ''))} <span class="muted">${t.count}</span></a>`).join('')}
    </div>
    <p class="hint">單字表來源：${escapeHTML(bank.source)}；中文、例句與發音為本 App 自製。</p>` : ''}

    ${learned > 0 ? `
    <h2 class="section-title">學過的單字</h2>
    <div class="filter-row" role="tablist" aria-label="篩選">
      ${FILTERS.map(([k, label]) => `<button type="button" class="chip${k === filter ? ' is-active' : ''}" role="tab" aria-selected="${k === filter}" data-filter="${k}">${label} ${counts[k]}</button>`).join('')}
    </div>
    <ul class="word-list" data-testid="word-list"></ul>` : ''}`;

  const favList = outlet.querySelector('[data-testid="fav-list"]');
  if (favList) bindWordRows(favList);
  outlet.querySelector('[data-act="fav-more"]')?.addEventListener('click', (e) => {
    favList.innerHTML = favWords.map((w) => wordRowHTML(w, ctx.records.get(w.id))).join('');
    bindWordRows(favList);
    e.currentTarget.remove();
  });

  const list = outlet.querySelector('[data-testid="word-list"]');
  let limit = 30; // 一次顯示 30 個，太長不好滑
  function paint() {
    if (!list) return;
    const shown = words.filter((w) => statusOf(ctx.records.get(w.id)) === filter);
    list.innerHTML = shown.length ? shown.slice(0, limit).map((w) => wordRowHTML(w, ctx.records.get(w.id))).join('')
      + (shown.length > limit ? `<li><button type="button" class="btn btn--ghost btn--block" data-act="more">再顯示 ${Math.min(30, shown.length - limit)} 個（共 ${shown.length} 個）</button></li>` : '')
      : '<li class="muted empty">這個分類還沒有單字。</li>';
    bindWordRows(list);
    list.querySelector('[data-act="more"]')?.addEventListener('click', () => { limit += 30; paint(); });
  }
  paint();

  outlet.querySelector('.filter-row')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    filter = b.dataset.filter;
    limit = 30;
    outlet.querySelectorAll('[data-filter]').forEach((x) => {
      const on = x.dataset.filter === filter;
      x.classList.toggle('is-active', on);
      x.setAttribute('aria-selected', on);
    });
    paint();
  });

  const input = outlet.querySelector('[data-role="search"]');
  const results = outlet.querySelector('[data-role="results"]');
  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const found = searchWords(words, input.value);
      results.innerHTML = !input.value.trim() ? ''
        : found.length ? found.map((w) => wordRowHTML(w, ctx.records.get(w.id))).join('')
          : '<li class="muted empty">找不到這個字。</li>';
      bindWordRows(results);
    }, 200);
  });
}
