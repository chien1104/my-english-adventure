// 學習數據分析：#/stats
import { loadContext } from '../learning.js';
import { EXP_KINDS, dayOf, studyDays } from '../gamify.js';
import { todayKey } from '../settings.js';
import { escapeHTML } from '../ui/dom.js';
import { answerText } from '../lesson/engine.js';
import { analyzeWeakness } from '../weakness.js';
import { latestEstimate } from '../score.js';
import { LEVEL_KEY, progressSummary } from '../level-test.js';
import { levelCardHTML } from './home.js';
import { historyChartHTML } from './exam.js';

// 單字熟悉度：三色已用 dataviz 驗證工具檢查（色盲可分辨），並一律搭配文字標籤
const STATUS_COLORS = { new: '#6F8BD0', learning: '#D9952A', familiar: '#1F8A5E' };
const STATUS_NAMES = { new: '還沒學', learning: '學習中', familiar: '熟悉' };
const DAYS = 14;

function lastDays(n, now = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
}

export function computeStats(ctx, sessions, now = new Date()) {
  const learning = ctx.attempts.filter((a) => EXP_KINDS.has(a.kind));
  const correct = learning.filter((a) => a.correct).length;
  const days = studyDays(ctx.attempts, sessions);
  const range = lastDays(DAYS, now);
  const week = new Set(lastDays(7, now));
  const perDay = new Map(range.map((d) => [d, 0]));
  for (const a of learning) {
    const d = dayOf(a.createdAt);
    if (perDay.has(d)) perDay.set(d, perDay.get(d) + 1);
  }
  const typeOf = new Map(ctx.lessons.map((l) => [l.id, l.type]));
  const cats = [
    ['vocab', '單字課'], ['grammar', '文法課'], ['phonics', '發音課'], ['dialogue', '會話課'], ['reading', '閱讀課'],
    ['toeic-listen', '多益聽力'], ['toeic', '多益閱讀'], ['exam', '模擬考'], ['review', '單字複習'], ['mistake', '錯題重練'], ['game', '遊戲'],
  ].map(([id, name]) => {
    const list = learning.filter((a) => (a.kind === 'lesson' ? typeOf.get(a.lessonId) === id : a.kind === id));
    return { id, name, total: list.length, correct: list.filter((a) => a.correct).length };
  }).filter((c) => c.total > 0);
  const status = { new: 0, learning: 0, familiar: 0 };
  for (const w of ctx.wordsMap.values()) status[ctx.records.get(w.id)?.status || 'new'] += 1;
  const topMistakes = ctx.mistakes.filter((m) => !m.fixed).sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 5);
  return {
    total: learning.length,
    accuracy: learning.length ? Math.round((correct / learning.length) * 100) : null,
    studyDays: days.size,
    weekDays: [...days].filter((d) => week.has(d)).length,
    perDay: range.map((d) => ({ day: d, count: perDay.get(d) })),
    cats, status, topMistakes,
  };
}

export async function render({ outlet, db }) {
  const ctx = await loadContext(db);
  const sessions = await db.getAll('sessions');
  const s = computeStats(ctx, sessions);

  if (!s.total) {
    outlet.innerHTML = `<section class="card"><a class="link" href="#/home">← 首頁</a><h1 class="page-title">學習分析</h1>
      <p>還沒有作答紀錄。上完第一堂課後，這裡會顯示你的學習天數、正確率和進步趨勢。</p>
      <a class="btn btn--primary" href="#/home">回首頁</a></section>`;
    return;
  }

  const max = Math.max(1, ...s.perDay.map((d) => d.count));
  const maxDay = s.perDay.reduce((a, b) => (b.count > a.count ? b : a));
  const today = s.perDay[s.perDay.length - 1];
  const totalWords = s.status.new + s.status.learning + s.status.familiar;
  const weak = analyzeWeakness(ctx.lessons, ctx.attempts);
  const est = latestEstimate([...ctx.progressById.values()]);
  const levelHist = ctx.progressById.get(LEVEL_KEY)?.history || [];
  const levelSum = progressSummary(levelHist);
  const bar = (x, short = false) => `<li class="hbar${x.total ? '' : ' is-empty'}"><span class="hbar__name">${escapeHTML(short ? x.name.replace(/^Part (\d) .*/, 'Part $1') : x.name)}</span>
    <span class="hbar__track"><span class="hbar__fill${x.rate !== null && x.rate < 60 ? ' is-low' : ''}" style="width:${x.rate ?? 0}%"></span></span>
    <span class="hbar__val en">${x.rate === null ? '—' : `${x.rate}%`}</span><span class="hbar__sub">${x.total ? `${x.correct}/${x.total} 題` : '還沒練習'}${short ? `・${escapeHTML(x.name.slice(7))}` : ''}</span></li>`;

  outlet.innerHTML = `
    <section class="card">
      <a class="link" href="#/home">← 首頁</a>
      <h1 class="page-title">學習分析</h1>
      <dl class="kpis">
        <div class="kpi"><dt>累計學習天數</dt><dd data-testid="st-days">${s.studyDays}</dd></div>
        <div class="kpi"><dt>最近 7 天學習</dt><dd>${s.weekDays} 天</dd></div>
        <div class="kpi"><dt>總作答題數</dt><dd data-testid="st-total">${s.total}</dd></div>
        <div class="kpi"><dt>整體正確率</dt><dd data-testid="st-acc">${s.accuracy}%</dd></div>
      </dl>
      <p class="hint">學習天數是累計的，不需要連續；休息幾天不會讓任何數字歸零。</p>
    </section>

    ${est ? `
    <section class="card score-card" data-testid="st-estimate">
      <h2 class="card__title">預估多益分數</h2>
      <p class="score-card__total"><strong class="en">${est.lastEstimate.total}</strong><span class="muted"> 分左右（±${est.lastEstimate.margin}）</span></p>
      <div class="score-card__split">
        <div><span class="muted small">聽力</span><strong class="en">${est.lastEstimate.listening}</strong></div>
        <div><span class="muted small">閱讀</span><strong class="en">${est.lastEstimate.reading}</strong></div>
      </div>
      <p class="hint">依最近一次「${escapeHTML(est.title || '模擬考')}」的答對率粗估，只當參考。多考幾次半長模擬考，估計會更準。</p>
    </section>` : `
    <section class="card" data-testid="st-estimate-empty">
      <h2 class="card__title">預估多益分數</h2>
      <p class="muted">完成一次模擬考（在「模擬考殿堂」）後，這裡會依答對率估計你的多益分數。</p>
      <a class="btn btn--ghost btn--sm" href="#/world?id=mock">去模擬考殿堂</a>
    </section>`}

    <section class="card" data-testid="st-level">
      <h2 class="card__title">程度變化</h2>
      ${levelCardHTML(levelSum)}
      ${historyChartHTML(levelHist) || (levelHist.length ? '<p class="muted small">再測一次就能畫出分數變化。</p>' : '')}
    </section>

    <section class="card" data-testid="st-weakness">
      <h2 class="card__title">弱點分析</h2>
      ${weak.weakest.length ? `
        <p class="muted">答對率最低、最值得先加強的地方：</p>
        <ol class="focus-list">${weak.weakest.map((x) => `
          <li><span><strong>${escapeHTML(x.name)}</strong><small class="muted">答對 ${x.correct}/${x.total} 題（${x.rate}%）</small></span>
            <a class="btn btn--primary btn--sm" href="${x.href}">去加強</a></li>`).join('')}</ol>`
        : `<p class="status-line status-line--good">${weak.parts.some((p) => p.total) ? '目前沒有明顯的弱點（答對率都在 80% 以上，或練習題數還不夠多）。' : '練習多益 Part 或文法課之後，這裡會找出你的弱點。'}</p>`}
      <h3 class="sub-title">多益各 Part 答對率</h3>
      <ul class="hbars" data-testid="weak-parts">${weak.parts.map((x) => bar(x, true)).join('')}</ul>
      ${weak.grammar.length ? `<h3 class="sub-title">文法點答對率</h3><ul class="hbars hbars--long" data-testid="weak-grammar">${weak.grammar.map((x) => bar(x)).join('')}</ul>` : ''}
    </section>

    <section class="card">
      <h2 class="card__title">最近 14 天每日作答題數</h2>
      <p class="readout" data-testid="readout" aria-live="polite"></p>
      <div class="cols" role="list" data-testid="cols">
        ${s.perDay.map((d, i) => `
          <button type="button" class="col" role="listitem" data-col="${i}" aria-label="${d.day.slice(5)}：${d.count} 題">
            <span class="col__bar" style="height:${d.count ? Math.max(4, Math.round((d.count / max) * 100)) : 0}%"></span>
            ${d === maxDay && d.count ? `<span class="col__val">${d.count}</span>` : ''}
          </button>`).join('')}
      </div>
      <div class="cols__axis"><span>${s.perDay[0].day.slice(5).replace('-', '/')}</span><span>今天</span></div>
      <details class="table-view"><summary>以表格檢視</summary>
        <table class="rule-table"><thead><tr><th>日期</th><th>作答題數</th></tr></thead>
        <tbody>${s.perDay.map((d) => `<tr><td>${d.day}</td><td>${d.count}</td></tr>`).join('')}</tbody></table>
      </details>
    </section>

    <section class="card">
      <h2 class="card__title">各類練習正確率</h2>
      <ul class="hbars">
        ${s.cats.map((c) => {
          const pct = Math.round((c.correct / c.total) * 100);
          return `<li class="hbar"><span class="hbar__name">${c.name}</span>
            <span class="hbar__track"><span class="hbar__fill" style="width:${pct}%"></span></span>
            <span class="hbar__val en">${pct}%</span><span class="hbar__sub">${c.correct}/${c.total} 題</span></li>`;
        }).join('')}
      </ul>
    </section>

    <section class="card">
      <h2 class="card__title">單字熟悉度</h2>
      <div class="stack" role="img" aria-label="${Object.entries(s.status).map(([k, v]) => `${STATUS_NAMES[k]} ${v} 個`).join('，')}">
        ${['familiar', 'learning', 'new'].filter((k) => s.status[k]).map((k) => `<span class="stack__seg" style="flex:${s.status[k]};background:${STATUS_COLORS[k]}"></span>`).join('')}
      </div>
      <ul class="legend" data-testid="word-legend">
        ${['familiar', 'learning', 'new'].map((k) => `<li><span class="legend__sw" style="background:${STATUS_COLORS[k]}"></span>${STATUS_NAMES[k]} <strong>${s.status[k]}</strong> 個<span class="muted">（${totalWords ? Math.round((s.status[k] / totalWords) * 100) : 0}%）</span></li>`).join('')}
      </ul>
    </section>

    <section class="card">
      <h2 class="card__title">最常答錯的題目</h2>
      ${s.topMistakes.length ? `<ol class="weak-list">${s.topMistakes.map((m) => `
        <li><span>${escapeHTML(m.question.sentence || m.question.prompt)}<small class="muted">${escapeHTML(m.source)}・正確：${escapeHTML(answerText(m.question))}</small></span><span class="badge badge--lock">錯 ${m.wrongCount} 次</span></li>`).join('')}</ol>
        <a class="btn btn--ghost btn--sm" href="#/mistake-practice">去錯題重練</a>`
        : '<p class="status-line status-line--good">目前沒有待訂正的錯題。</p>'}
    </section>`;

  const readout = outlet.querySelector('[data-testid="readout"]');
  const cols = outlet.querySelectorAll('[data-col]');
  const show = (i) => {
    const d = s.perDay[i];
    readout.textContent = `${d.day.replace(/-/g, '/')}：${d.count} 題`;
    cols.forEach((c) => c.classList.toggle('is-active', Number(c.dataset.col) === i));
  };
  outlet.querySelector('[data-testid="cols"]').addEventListener('click', (e) => {
    const c = e.target.closest('[data-col]');
    if (c) show(Number(c.dataset.col));
  });
  outlet.querySelector('[data-testid="cols"]').addEventListener('pointerover', (e) => {
    const c = e.target.closest('[data-col]');
    if (c) show(Number(c.dataset.col));
  });
  show(s.perDay.indexOf(today));
}
