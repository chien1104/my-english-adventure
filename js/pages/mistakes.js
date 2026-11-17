// 錯題百科：#/mistakes
import { loadContext } from '../learning.js';
import { escapeHTML } from '../ui/dom.js';
import { answerText } from '../lesson/engine.js';
import { formatTime } from '../storage-status.js';
import { playButtonHTML } from '../audio.js';

const FILTERS = [['pending', '待訂正'], ['fixed', '已訂正'], ['all', '全部']];

export async function render({ outlet, db, query }) {
  const ctx = await loadContext(db);
  const all = ctx.mistakes;
  const pending = all.filter((m) => !m.fixed);
  let filter = FILTERS.some(([k]) => k === query.filter) ? query.filter : 'pending';

  if (!all.length) {
    outlet.innerHTML = `
      <section class="card">
        <h1 class="page-title">錯題百科</h1>
        <p>目前沒有錯題。上課、複習或玩遊戲時答錯的題目，會自動收集到這裡，附上中文解析。</p>
        <a class="btn btn--primary" href="#/home">回首頁</a>
      </section>`;
    return;
  }

  outlet.innerHTML = `
    <section class="card">
      <h1 class="page-title">錯題百科</h1>
      <dl class="stats stats--2">
        <div class="stat"><dt>待訂正</dt><dd data-testid="pending-count">${pending.length}</dd></div>
        <div class="stat"><dt>已訂正</dt><dd data-testid="fixed-count">${all.length - pending.length}</dd></div>
      </dl>
      ${pending.length
        ? `<a class="btn btn--primary btn--block" href="#/mistake-practice" data-testid="start-retrain">開始錯題重練（${Math.min(pending.length, 10)} 題）</a>`
        : '<p class="status-line status-line--good">全部都訂正了，太棒了！</p>'}
      <p class="hint">在同一個考點答對（原題或相似題）就算訂正；之後再答錯會回到待訂正。</p>
    </section>
    <div class="filter-row" role="tablist" aria-label="篩選">
      ${FILTERS.map(([k, label]) => {
        const n = k === 'all' ? all.length : k === 'fixed' ? all.length - pending.length : pending.length;
        return `<button type="button" class="chip${k === filter ? ' is-active' : ''}" role="tab" aria-selected="${k === filter}" data-filter="${k}">${label} ${n}</button>`;
      }).join('')}
    </div>
    <ul class="mistake-list" data-testid="mistake-list"></ul>`;

  const list = outlet.querySelector('[data-testid="mistake-list"]');
  function paint() {
    const shown = all.filter((m) => filter === 'all' || (filter === 'fixed' ? m.fixed : !m.fixed));
    list.innerHTML = shown.length ? shown.map((m) => {
      const q = m.question;
      const img = q.image && ctx.wordsMap.get(q.image);
      return `
        <li class="mistake card" data-key="${escapeHTML(m.key)}">
          <p class="mistake__meta"><span class="badge badge--lock">${escapeHTML(m.source)}</span>
            <span class="status status--${m.fixed ? 'completed' : 'learning'}">${m.fixed ? '已訂正' : '待訂正'}</span>
            <span class="muted">錯 ${m.wrongCount} 次・${formatTime(m.lastWrongAt)}</span></p>
          <p class="mistake__q">${img ? `<img src="${escapeHTML(img.image)}" alt="" width="40" height="40">` : ''}${escapeHTML(q.sentence || q.prompt)}</p>
          ${q.zh ? `<p class="muted">${escapeHTML(q.zh)}</p>` : ''}
          ${q.scene ? `<img class="mistake__scene" src="${escapeHTML(q.scene)}" alt="題目照片" width="240" height="150">` : ''}
          ${q.audio ? `<p>${playButtonHTML(q.audio, '▶ 重聽題目', 'play-btn--mini')}</p>` : ''}
          ${q.text ? `<details class="zh-toggle"><summary>看題目文章</summary><p class="en pre">${escapeHTML(q.text)}</p></details>` : ''}
          <p>你的答案：<span class="en">${escapeHTML(answerText(q, m.lastWrongAnswer))}</span></p>
          <p>正確答案：<strong class="en">${escapeHTML(answerText(q))}</strong></p>
          <p class="feedback__exp pre">${escapeHTML(q.explanation || '')}</p>
        </li>`;
    }).join('') : '<li class="muted empty">這個分類沒有題目。</li>';
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
