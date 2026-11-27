// 模擬考：#/exam?id=mock-1；多益程度測驗：#/exam?id=level（每次從題庫抽題，可以定期重考看進步）
// 限時作答、交卷後才公布答案；作答中途離開會保存進度（含剩餘時間）。
// 聽力題可以跳過（不計分），也可以選「只考閱讀」。
import { loadContext } from '../learning.js';
import { lessonKey } from '../progress.js';
import { renderQuestion } from '../ui/question-view.js';
import { escapeHTML } from '../ui/dom.js';
import { confirmDialog } from '../ui/confirm.js';
import { playButtonHTML } from '../audio.js';
import { answerText, isCorrect } from '../lesson/engine.js';
import { recordAttempt, logSession, awardLessonComplete, awardExp } from '../rewards.js';
import { LEVEL_ID, LEVEL_KEY, LEVEL_DRAFT, LEVEL_MINUTES, buildLevelTest, restoreLevelTest, progressSummary } from '../level-test.js';
import { toast } from '../ui/toast.js';
import { afterActivity } from '../ui/celebrate.js';
import { formatTime } from '../storage-status.js';
import { estimateScore } from '../score.js';
import { optionNotesHTML } from '../ui/question-view.js';

export const PART_NAMES = { 1: 'Part 1 照片描述', 2: 'Part 2 應答問題', 3: 'Part 3 簡短對話', 4: 'Part 4 簡短獨白', 5: 'Part 5 單句填空', 6: 'Part 6 段落填空', 7: 'Part 7 閱讀理解' };
export const TARGET_RATE = 60;

export const isListening = (q) => q.part >= 1 && q.part <= 4;

// skipped：跳過的聽力題 { 題目id: true }，不計分（不算對也不算錯）
export function scoreExam(questions, answers, skipped = {}) {
  const parts = {};
  let correct = 0;
  let skippedCount = 0;
  const counted = questions.filter((q) => {
    if (skipped[q.id] && answers[q.id] === undefined) { skippedCount += 1; return false; }
    return true;
  });
  questions = counted;
  for (const q of questions) {
    const p = parts[q.part] || (parts[q.part] = { correct: 0, total: 0 });
    p.total += 1;
    if (isCorrect(q, answers[q.id] ?? null)) { p.correct += 1; correct += 1; }
  }
  const listening = [1, 2, 3, 4].reduce((n, k) => n + (parts[k]?.correct || 0), 0);
  const listeningTotal = [1, 2, 3, 4].reduce((n, k) => n + (parts[k]?.total || 0), 0);
  return {
    correct, total: questions.length,
    rate: questions.length ? Math.round((correct / questions.length) * 100) : 0,
    parts, listening, listeningTotal, reading: correct - listening, readingTotal: questions.length - listeningTotal, skipped: skippedCount,
  };
}

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// 歷次程度測驗的預估分數折線圖（只畫聽力＋閱讀都有考的成績）
export function historyChartHTML(history, goal = 550) {
  const pts = (history || []).filter((h) => h.estimate?.total).slice(-10);
  if (pts.length < 2) return '';
  const W = 320; const H = 150; const padL = 34; const padR = 14; const padT = 16; const padB = 24;
  const vals = pts.map((h) => h.estimate.total);
  const lo = Math.max(0, Math.floor((Math.min(...vals, goal) - 60) / 100) * 100);
  const hi = Math.min(990, Math.ceil((Math.max(...vals, goal) + 60) / 100) * 100);
  const x = (i) => padL + (i * (W - padL - padR)) / (pts.length - 1);
  const y = (v) => padT + ((hi - v) * (H - padT - padB)) / (hi - lo);
  const ticks = [lo, Math.round((lo + hi) / 2 / 50) * 50, hi];
  const d = (iso) => { const t = new Date(iso); return `${t.getMonth() + 1}/${t.getDate()}`; };
  const line = pts.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(h.estimate.total).toFixed(1)}`).join(' ');
  const lastI = pts.length - 1;
  return `<figure class="level-chart" data-testid="level-chart">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="歷次預估分數：${pts.map((h) => `${d(h.at)} ${h.estimate.total} 分`).join('、')}">
      ${ticks.map((t) => `<line x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}" class="level-chart__grid"/><text x="${padL - 6}" y="${y(t) + 4}" text-anchor="end" class="level-chart__tick">${t}</text>`).join('')}
      <line x1="${padL}" x2="${W - padR}" y1="${y(goal)}" y2="${y(goal)}" class="level-chart__goal"/>
      <text x="${W - padR}" y="${y(goal) - 5}" text-anchor="end" class="level-chart__goal-label">目標 ${goal}</text>
      <path d="${line}" class="level-chart__line"/>
      ${pts.map((h, i) => `<circle cx="${x(i)}" cy="${y(h.estimate.total)}" r="${i === lastI ? 5 : 4}" class="level-chart__dot${i === lastI ? ' is-last' : ''}"><title>${d(h.at)}：${h.estimate.total} 分</title></circle>`).join('')}
      <text x="${x(lastI)}" y="${y(pts[lastI].estimate.total) - 10}" text-anchor="end" class="level-chart__val">${pts[lastI].estimate.total}</text>
      ${pts.map((h, i) => (i === 0 || i === lastI || pts.length <= 5 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" class="level-chart__tick">${d(h.at)}</text>` : '')).join('')}
    </svg>
  </figure>`;
}

const delta = (n) => (n > 0 ? `<span class="delta delta--up">▲ ${n}</span>` : n < 0 ? `<span class="delta delta--down">▼ ${-n}</span>` : '<span class="delta">持平</span>');

export async function render({ outlet, db, query, settings }) {
  const ctx = await loadContext(db);
  const isLevel = query.id === LEVEL_ID;
  const exam = isLevel
    ? { id: LEVEL_ID, title: '多益程度測驗', world: 'mock', timeLimit: LEVEL_MINUTES * 60 }
    : ctx.lessons.find((l) => l.id === query.id && l.type === 'exam');
  if (!exam) {
    outlet.innerHTML = '<section class="card"><h1 class="card__title">找不到這份模擬考</h1><a class="btn btn--primary" href="#/worlds">回世界地圖</a></section>';
    return;
  }
  const acc = isLevel ? { unlocked: true } : ctx.access.get(exam.id);
  if (!acc?.unlocked) {
    outlet.innerHTML = `<section class="card"><h1 class="card__title">🔒 ${escapeHTML(exam.title)}</h1><p>${escapeHTML(acc?.reason || '尚未開放')}</p>
      <a class="btn btn--primary" href="#/world?id=${exam.world}">回到世界</a></section>`;
    return;
  }
  const draftKey = isLevel ? LEVEL_DRAFT : `exam-draft:${exam.id}`;
  const key = isLevel ? LEVEL_KEY : lessonKey(exam.id);
  const backHref = isLevel ? '#/stats' : `#/world?id=${exam.world}`;
  let timer = null;
  let onVis = null;
  const cleanup = () => { if (timer) clearInterval(timer); if (onVis) document.removeEventListener('visibilitychange', onVis); timer = null; };

  // 這一次要考的題目：程度測驗每次重抽（優先沒做過的題組），只考閱讀時拿掉聽力
  const seen = () => new Set(ctx.attempts.filter((a) => a.kind === 'lesson').map((a) => `${a.lessonId}|${a.itemId}`));
  function pickQuestions(state) {
    let base;
    if (isLevel) base = (state.qids && restoreLevelTest(ctx.lessons, state.qids)) || buildLevelTest(ctx.lessons, seen());
    else base = exam.steps[0].questions;
    return state.mode === 'reading' ? base.filter((q) => !isListening(q)) : base;
  }
  const fullCount = () => (isLevel ? null : exam.steps[0].questions);

  function partSummary(qs) {
    const L = qs.filter(isListening).length;
    return `聽力 ${L} 題（Part 1～4）、閱讀 ${qs.length - L} 題（Part 5～7）`;
  }

  async function intro() {
    cleanup();
    const draft = await db.get('progress', draftKey);
    const prog = isLevel ? await db.get('progress', LEVEL_KEY) : ctx.progressById.get(key);
    const sum = isLevel ? progressSummary(prog?.history) : null;
    const all = fullCount();
    outlet.innerHTML = `
      <section class="card" data-testid="exam-intro">
        <a class="link" href="${backHref}">← ${isLevel ? '學習分析' : '回到世界'}</a>
        <h1 class="page-title">${isLevel ? '📈 ' : ''}${escapeHTML(exam.title)}</h1>
        <ul class="plain-list">
          ${isLevel
            ? `<li>約 30 題（聽力 13 題、閱讀 17 題），限時 ${LEVEL_MINUTES} 分鐘，交卷後估計多益分數。</li>
               <li>題目每次從模擬考題庫重新抽，優先抽沒做過的題組。建議每 2～4 週測一次，看看分數有沒有往上。</li>`
            : `<li>共 ${all.length} 題：${partSummary(all)}。</li>
               <li>限時 ${Math.round(exam.timeLimit / 60)} 分鐘。</li>`}
          <li>離開 App 時計時會暫停，進度會保存。作答時不會顯示對錯，交卷後才公布答案和解析。</li>
          <li>不方便聽的時候：聽力題可以按「跳過」（不計分），或直接選「只考閱讀」。</li>
        </ul>
        ${!isLevel && prog?.timesCompleted ? `<p class="muted">最佳成績：答對 ${prog.bestAccuracy}%・已考 ${prog.timesCompleted} 次</p>` : ''}
        <div class="btn-row">
          ${draft ? `<button type="button" class="btn btn--primary" data-act="resume" data-testid="exam-resume">繼續作答（剩 ${fmt(draft.remaining)}）</button>
                     <button type="button" class="btn btn--ghost" data-act="restart">重新開始</button>`
                  : `<button type="button" class="btn btn--primary" data-act="start" data-testid="exam-start">開始${isLevel ? '測驗' : '考試'}（聽力＋閱讀）</button>
                     <button type="button" class="btn btn--ghost" data-act="start-reading" data-testid="exam-start-reading">只考閱讀（不方便聽）</button>`}
        </div>
      </section>
      ${isLevel ? levelHistoryHTML(prog?.history, sum) : ''}`;
    const fresh = (mode) => {
      const qs = pickQuestions({ mode });
      // 只考閱讀：時間按題數比例縮短（以分鐘為單位）
      const listenN = isLevel ? 13 : exam.steps[0].questions.filter(isListening).length;
      const frac = mode === 'reading' ? qs.length / (qs.length + listenN) : 1;
      const remaining = Math.max(1, Math.round((exam.timeLimit * frac) / 60)) * 60000;
      return { answers: {}, skipped: {}, index: 0, mode, qids: qs.map((q) => q.id), remaining };
    };
    outlet.querySelector('[data-act="start"]')?.addEventListener('click', () => run(fresh('full')));
    outlet.querySelector('[data-act="start-reading"]')?.addEventListener('click', () => run(fresh('reading')));
    outlet.querySelector('[data-act="resume"]')?.addEventListener('click', () => run(draft));
    outlet.querySelector('[data-act="restart"]')?.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: '重新開始？', message: '目前這次作答的答案會清掉，從第 1 題重新計時。過去的成績會保留。', confirmText: '重新開始' });
      if (!ok) return;
      await db.delete('progress', draftKey);
      intro();
    });
  }

  function levelHistoryHTML(history, sum) {
    if (!history?.length) {
      return `<section class="card" data-testid="level-history"><h2 class="card__title">我的進步紀錄</h2>
        <p class="muted">還沒有測驗紀錄。先測一次當作起點，之後每隔幾週再測，這裡會畫出分數的變化。</p></section>`;
    }
    const rows = [...history].reverse().slice(0, 8).map((h) => {
      const t = new Date(h.at);
      return `<li><span>${t.getFullYear()}/${t.getMonth() + 1}/${t.getDate()}${h.mode === 'reading' ? '・只考閱讀' : ''}</span>
        <strong class="en">${h.estimate?.total ?? `閱讀 ${h.estimate?.reading ?? '—'}`}</strong><small class="muted">答對 ${h.correct}/${h.total}</small></li>`;
    }).join('');
    return `<section class="card" data-testid="level-history">
      <h2 class="card__title">我的進步紀錄</h2>
      ${sum ? `<div class="level-sum">
        <div><span class="muted small">最近一次</span><strong class="en">${sum.last.estimate.total}</strong></div>
        <div><span class="muted small">和上次比</span><strong>${sum.sincePrev === null ? '—' : delta(sum.sincePrev)}</strong></div>
        <div><span class="muted small">最高分</span><strong class="en">${sum.best}</strong></div>
      </div>` : ''}
      ${historyChartHTML(history)}
      <ol class="level-list">${rows}</ol>
      <p class="hint">分數是依答對率粗估，題數少誤差約 ±90 分；看長期趨勢比看單次分數準。</p>
    </section>`;
  }

  function run(state) {
    cleanup();
    const questions = pickQuestions(state);
    const s = { answers: { ...state.answers }, skipped: { ...(state.skipped || {}) }, index: Math.min(state.index || 0, questions.length - 1), remaining: state.remaining,
      mode: state.mode || 'full', qids: questions.map((q) => q.id) };
    let last = performance.now();
    let paused = false;
    let finished = false;
    const save = () => db.put('progress', { id: draftKey, ...s, updatedAt: Date.now() });
    save();

    outlet.innerHTML = `
      <div class="player exam" data-testid="exam-run">
        <div class="player__head">
          <span class="exam__time" data-role="time" aria-live="off">${fmt(s.remaining)}</span>
          <span class="player__step" data-role="step"></span>
        </div>
        <div class="progressbar" aria-hidden="true"><span data-role="bar"></span></div>
        <p class="player__title" data-role="part"></p>
        <section class="card player__body" data-role="q"></section>
        <div class="player__foot">
          <button type="button" class="btn btn--ghost" data-act="prev">上一題</button>
          <button type="button" class="btn btn--primary" data-act="next">下一題</button>
        </div>
        <details class="exam__map"><summary>題號總覽・已作答 <span data-role="count"></span></summary>
          <div class="exam__grid" data-role="grid"></div>
          <p class="hint">灰色斜線是跳過的聽力題（不計分）。</p>
        </details>
        <button type="button" class="btn btn--danger btn--block" data-act="submit" data-testid="exam-submit">交卷</button>
      </div>`;
    const qBox = outlet.querySelector('[data-role="q"]');
    const timeEl = outlet.querySelector('[data-role="time"]');

    function paint() {
      const q = questions[s.index];
      outlet.querySelector('[data-role="step"]').textContent = `第 ${s.index + 1} / ${questions.length} 題`;
      outlet.querySelector('[data-role="part"]').textContent = PART_NAMES[q.part] + (s.mode === 'reading' ? '・只考閱讀' : '');
      outlet.querySelector('[data-role="bar"]').style.width = `${Math.round(((s.index + 1) / questions.length) * 100)}%`;
      const answered = questions.filter((x) => s.answers[x.id] !== undefined).length;
      outlet.querySelector('[data-role="count"]').textContent = `${answered} / ${questions.length}`;
      outlet.querySelector('[data-role="grid"]').innerHTML = questions.map((x, i) =>
        `<button type="button" class="exam__cell${s.answers[x.id] !== undefined ? ' is-done' : s.skipped[x.id] ? ' is-skip' : ''}${i === s.index ? ' is-current' : ''}" data-jump="${i}" aria-label="第 ${i + 1} 題${s.skipped[x.id] && s.answers[x.id] === undefined ? '（已跳過）' : ''}">${i + 1}</button>`).join('');
      outlet.querySelector('[data-act="prev"]').hidden = s.index === 0;
      outlet.querySelector('[data-act="next"]').hidden = s.index === questions.length - 1;
      renderQuestion(qBox, q, {
        wordsMap: ctx.wordsMap, selected: s.answers[q.id],
        onAnswer: (a) => { s.answers[q.id] = a; delete s.skipped[q.id]; save(); paint(); },
      });
      if (isListening(q) && s.answers[q.id] === undefined) {
        const skipped = !!s.skipped[q.id];
        qBox.insertAdjacentHTML('beforeend', skipped
          ? '<p class="skip-note" data-testid="skip-note">⏭ 已跳過：這題不計分。想作答的話直接選答案就好。</p>'
          : '<button type="button" class="skip-btn" data-act="skip" data-testid="skip-listening">🎧 現在不方便聽？跳過這題（不計分）</button>');
        qBox.querySelector('[data-act="skip"]')?.addEventListener('click', () => {
          s.skipped[q.id] = true;
          save();
          if (s.index < questions.length - 1) s.index += 1;
          paint();
          toast('已跳過，這題不計分', { duration: 1400 });
          window.scrollTo?.(0, 0);
        });
      }
    }

    outlet.querySelector('[data-act="prev"]').addEventListener('click', () => { s.index -= 1; save(); paint(); window.scrollTo?.(0, 0); });
    outlet.querySelector('[data-act="next"]').addEventListener('click', () => { s.index += 1; save(); paint(); window.scrollTo?.(0, 0); });
    outlet.querySelector('[data-role="grid"]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-jump]');
      if (!b) return;
      s.index = Number(b.dataset.jump); save(); paint();
    });
    outlet.querySelector('[data-act="submit"]').addEventListener('click', async () => {
      const skipped = questions.filter((q) => s.skipped[q.id] && s.answers[q.id] === undefined).length;
      const left = questions.filter((q) => s.answers[q.id] === undefined).length - skipped;
      const msg = [left ? `還有 ${left} 題沒有作答，沒作答的題目會算錯。` : '交卷後就不能再修改答案。'];
      if (skipped) msg.push(`跳過的 ${skipped} 題聽力不計分。`);
      const ok = await confirmDialog({ title: '確定交卷？', message: msg.join(''), confirmText: '交卷' });
      if (ok) submit();
    });

    timer = setInterval(() => {
      const now = performance.now();
      if (!paused && !finished) {
        s.remaining -= now - last;
        timeEl.textContent = fmt(s.remaining);
        timeEl.classList.toggle('is-low', s.remaining < 60000);
        if (s.remaining <= 0) submit(true);
      }
      last = now;
    }, 250);
    onVis = () => {
      paused = document.hidden;
      last = performance.now();
      if (paused) save();
    };
    document.addEventListener('visibilitychange', onVis);

    async function submit(timeUp = false) {
      if (finished) return;
      finished = true;
      cleanup();
      outlet.innerHTML = '<section class="card"><p class="boot">批改中…</p></section>';
      const now = Date.now();
      for (const q of questions) {
        if (s.skipped[q.id] && s.answers[q.id] === undefined) continue; // 跳過的不記錄、不算錯
        const a = s.answers[q.id] ?? null;
        await recordAttempt(db, { kind: 'lesson', lessonId: q.srcLesson || exam.id, itemId: q.srcId || q.id, group: q.group, correct: isCorrect(q, a), answer: a, createdAt: now });
      }
      const result = scoreExam(questions, s.answers, s.skipped);
      const estimate = estimateScore(result);
      let earned;
      let history = null;
      if (isLevel) {
        const old = (await db.get('progress', LEVEL_KEY)) || { id: LEVEL_KEY, history: [] };
        history = [...(old.history || []), { at: now, mode: s.mode, rate: result.rate, correct: result.correct, total: result.total, skipped: result.skipped, estimate, parts: result.parts }];
        await db.put('progress', { ...old, id: LEVEL_KEY, history, updatedAt: now });
        earned = await awardExp(db, `leveltest:${history.length}`, 20, '完成多益程度測驗', now);
      } else {
        const old = (await db.get('progress', key)) || {};
        const times = (old.timesCompleted || 0) + 1;
        await db.put('progress', {
          ...old, id: key, lessonId: exam.id, status: 'completed', stepIndex: 0, practice: {}, completedAt: now, updatedAt: now,
          timesCompleted: times, lastAccuracy: result.rate, bestAccuracy: Math.max(old.bestAccuracy ?? 0, result.rate), title: exam.title, world: exam.world,
          lastEstimate: estimate?.total ? estimate : (old.lastEstimate || null), lastParts: result.parts,
        });
        earned = await awardLessonComplete(db, exam.id, times, exam.title);
      }
      await db.delete('progress', draftKey);
      await logSession(db, { type: isLevel ? 'level' : 'lesson', lessonId: exam.id, accuracy: result.rate });
      showResult(result, s, questions, timeUp, estimate, history);
      afterActivity({ db, settings, earned: [earned] });
    }
    paint();
  }

  function showResult(r, s, questions, timeUp, est, history) {
    const answers = s.answers;
    const pass = r.rate >= TARGET_RATE;
    const goal = 550;
    const sum = history ? progressSummary(history) : null;
    outlet.innerHTML = `
      <section class="card complete" data-testid="exam-result">
        <p class="complete__badge" aria-hidden="true">${pass ? '🏆' : '📝'}</p>
        <h1 class="card__title">${timeUp ? '時間到，已自動交卷' : '交卷完成'}</h1>
        <p class="big-score"><strong data-testid="exam-rate">${r.rate}</strong>%</p>
        <p>答對 ${r.correct} / ${r.total} 題${r.listeningTotal ? `・聽力 ${r.listening}/${r.listeningTotal}` : ''}${r.readingTotal ? `・閱讀 ${r.reading}/${r.readingTotal}` : ''}</p>
        ${r.skipped ? `<p class="muted" data-testid="exam-skipped">⏭ 跳過 ${r.skipped} 題聽力，不計分。</p>` : ''}
        <p class="${pass ? 'status-line status-line--good' : 'muted'}" data-testid="exam-target">${pass
          ? '已達到 550 分目標的參考線（約答對六成）！'
          : `距離 550 分目標的參考線（約答對六成）還差 ${Math.max(1, Math.ceil((TARGET_RATE * r.total) / 100) - r.correct)} 題。`}</p>
      </section>
      ${est ? `
      <section class="card score-card" data-testid="exam-estimate">
        <h2 class="card__title">預估多益分數${est.total === null ? '（只估閱讀）' : ''}</h2>
        ${est.total !== null ? `
        <p class="score-card__total"><strong class="en" data-testid="est-total">${est.total}</strong><span class="muted"> 分左右（±${est.margin}）</span></p>` : ''}
        <div class="score-card__split">
          <div><span class="muted small">聽力</span><strong class="en">${est.listening ?? '—'}</strong>${est.listening === null ? '<span class="muted small">這次沒考</span>' : ''}</div>
          <div><span class="muted small">閱讀</span><strong class="en" data-testid="est-reading">${est.reading ?? '—'}</strong></div>
        </div>
        ${est.total !== null ? `
        <div class="score-meter" role="img" aria-label="預估 ${est.total} 分，目標 ${goal} 分">
          <span class="score-meter__fill" style="width:${Math.round((est.total / 990) * 100)}%"></span>
          <span class="score-meter__goal" style="left:${Math.round((goal / 990) * 100)}%"></span>
          <span class="score-meter__label" style="left:${Math.round((goal / 990) * 100)}%">目標 ${goal}</span>
        </div>
        <p class="${est.total >= goal ? 'status-line status-line--good' : 'muted'}">${est.total >= goal ? '🎯 預估已達 550 分目標，保持下去！' : `距離 550 分目標還差約 ${goal - est.total} 分，先加強下面答對率最低的 Part。`}</p>`
        : '<p class="muted">聽力這次沒有考，所以只估閱讀分數（滿分 495）。有空時考一次完整的，才能估總分。</p>'}
        ${sum && est.total !== null && sum.sincePrev !== null ? `<p class="level-delta" data-testid="level-delta">和上次比 ${delta(sum.sincePrev)}${sum.sinceFirst !== null && sum.count > 2 ? `・和第一次比 ${delta(sum.sinceFirst)}` : ''}</p>` : ''}
        <p class="hint">粗估：依答對率換算，共 ${est.questions} 題${est.questions < 100 ? '，題數少所以誤差較大' : ''}。正式多益會依每次考試難度換算，分數只當參考。</p>
      </section>` : ''}
      ${history ? levelHistoryHTML(history, sum) : ''}
      <section class="card">
        <h2 class="card__title">各題型答對率</h2>
        <ul class="hbars">${Object.keys(PART_NAMES).filter((k) => r.parts[k]).map((k) => {
          const p = r.parts[k]; const pct = Math.round((p.correct / p.total) * 100);
          return `<li class="hbar"><span class="hbar__name">Part ${k}</span><span class="hbar__track"><span class="hbar__fill" style="width:${pct}%"></span></span><span class="hbar__val en">${p.correct}/${p.total}</span><span class="hbar__sub">${PART_NAMES[k].slice(7)}</span></li>`;
        }).join('')}</ul>
      </section>
      <section class="card">
        <h2 class="card__title">答案與解析</h2>
        <p class="muted">答錯的題目已收進錯題百科。</p>
        <ol class="exam-review">${questions.map((q) => {
          const skip = s.skipped[q.id] && answers[q.id] === undefined;
          const a = answers[q.id] ?? null; const ok = isCorrect(q, a);
          return `<li class="${skip ? 'is-skip' : ok ? 'is-good' : 'is-bad'}">
            <p class="review-list__q">${skip ? '⏭' : ok ? '✅' : '❌'} <span class="badge badge--lock">Part ${q.part}</span> ${escapeHTML(q.sentence || q.prompt)}</p>
            ${q.audio ? playButtonHTML(q.audio, '▶ 重聽', 'play-btn--mini') : ''}
            ${skip ? '<p class="muted">已跳過（不計分）</p>' : `<p>你的答案：<span class="en">${escapeHTML(answerText(q, a))}</span></p>`}${ok ? '' : `<p>正確答案：<strong class="en">${escapeHTML(answerText(q))}</strong></p>`}
            <p class="feedback__exp pre">${escapeHTML(q.explanation)}</p>${ok || skip ? '' : optionNotesHTML(q)}
          </li>`;
        }).join('')}</ol>
        <div class="btn-row"><button type="button" class="btn btn--primary" data-act="again">${isLevel ? '回測驗首頁' : '再考一次'}</button><a class="btn btn--ghost" href="#/mistakes">去錯題百科</a></div>
      </section>`;
    outlet.querySelector('[data-act="again"]').addEventListener('click', () => intro());
  }

  await intro();
  return cleanup;
}

export { formatTime };
