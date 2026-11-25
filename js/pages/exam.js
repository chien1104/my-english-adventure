// 模擬考：#/exam?id=mock-1
// 限時作答、交卷後才公布答案；作答中途離開會保存進度（含剩餘時間）。
import { loadContext } from '../learning.js';
import { lessonKey } from '../progress.js';
import { renderQuestion } from '../ui/question-view.js';
import { escapeHTML } from '../ui/dom.js';
import { confirmDialog } from '../ui/confirm.js';
import { playButtonHTML } from '../audio.js';
import { answerText, isCorrect } from '../lesson/engine.js';
import { recordAttempt, logSession, awardLessonComplete } from '../rewards.js';
import { afterActivity } from '../ui/celebrate.js';
import { formatTime } from '../storage-status.js';
import { estimateScore } from '../score.js';
import { optionNotesHTML } from '../ui/question-view.js';

export const PART_NAMES = { 1: 'Part 1 照片描述', 2: 'Part 2 應答問題', 3: 'Part 3 簡短對話', 4: 'Part 4 簡短獨白', 5: 'Part 5 單句填空', 6: 'Part 6 段落填空', 7: 'Part 7 閱讀理解' };
export const TARGET_RATE = 60;

export function scoreExam(questions, answers) {
  const parts = {};
  let correct = 0;
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
    parts, listening, listeningTotal, reading: correct - listening, readingTotal: questions.length - listeningTotal,
  };
}

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export async function render({ outlet, db, query, settings }) {
  const ctx = await loadContext(db);
  const exam = ctx.lessons.find((l) => l.id === query.id && l.type === 'exam');
  if (!exam) {
    outlet.innerHTML = '<section class="card"><h1 class="card__title">找不到這份模擬考</h1><a class="btn btn--primary" href="#/worlds">回世界地圖</a></section>';
    return;
  }
  const acc = ctx.access.get(exam.id);
  if (!acc?.unlocked) {
    outlet.innerHTML = `<section class="card"><h1 class="card__title">🔒 ${escapeHTML(exam.title)}</h1><p>${escapeHTML(acc?.reason || '尚未開放')}</p>
      <a class="btn btn--primary" href="#/world?id=${exam.world}">回到世界</a></section>`;
    return;
  }
  const questions = exam.steps[0].questions;
  const draftKey = `exam-draft:${exam.id}`;
  const key = lessonKey(exam.id);
  let timer = null;
  let onVis = null;
  const cleanup = () => { if (timer) clearInterval(timer); if (onVis) document.removeEventListener('visibilitychange', onVis); timer = null; };

  function partSummary() {
    const n = {};
    for (const q of questions) n[q.part] = (n[q.part] || 0) + 1;
    const L = [1, 2, 3, 4].reduce((a, k) => a + (n[k] || 0), 0);
    return `聽力 ${L} 題（Part 1～4）、閱讀 ${questions.length - L} 題（Part 5～7）`;
  }

  async function intro() {
    cleanup();
    const draft = await db.get('progress', draftKey);
    const prog = ctx.progressById.get(key);
    outlet.innerHTML = `
      <section class="card" data-testid="exam-intro">
        <a class="link" href="#/world?id=${exam.world}">← 回到世界</a>
        <h1 class="page-title">${escapeHTML(exam.title)}</h1>
        <ul class="plain-list">
          <li>共 ${questions.length} 題：${partSummary()}。</li>
          <li>限時 ${Math.round(exam.timeLimit / 60)} 分鐘。離開 App 時計時會暫停，進度會保存。</li>
          <li>作答時不會顯示對錯，交卷後才公布答案和解析。</li>
          <li>練習用：聽力可以重複播放（正式考試每段只播一次）。</li>
        </ul>
        ${prog?.bestAccuracy !== undefined && prog?.bestAccuracy !== null && prog?.timesCompleted ? `<p class="muted">最佳成績：答對 ${prog.bestAccuracy}%・已考 ${prog.timesCompleted} 次</p>` : ''}
        <div class="btn-row">
          ${draft ? `<button type="button" class="btn btn--primary" data-act="resume" data-testid="exam-resume">繼續作答（剩 ${fmt(draft.remaining)}）</button>
                     <button type="button" class="btn btn--ghost" data-act="restart">重新開始</button>`
                  : '<button type="button" class="btn btn--primary" data-act="start" data-testid="exam-start">開始考試</button>'}
        </div>
      </section>`;
    outlet.querySelector('[data-act="start"]')?.addEventListener('click', () => run({ answers: {}, index: 0, remaining: exam.timeLimit * 1000 }));
    outlet.querySelector('[data-act="resume"]')?.addEventListener('click', () => run(draft));
    outlet.querySelector('[data-act="restart"]')?.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: '重新開始？', message: '目前這次作答的答案會清掉，從第 1 題重新計時。過去的成績會保留。', confirmText: '重新開始' });
      if (!ok) return;
      await db.delete('progress', draftKey);
      run({ answers: {}, index: 0, remaining: exam.timeLimit * 1000 });
    });
  }

  function run(state) {
    cleanup();
    const s = { answers: { ...state.answers }, index: state.index || 0, remaining: state.remaining };
    let last = performance.now();
    let paused = false;
    let finished = false;
    const save = () => db.put('progress', { id: draftKey, ...s, updatedAt: Date.now() });

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
        </details>
        <button type="button" class="btn btn--danger btn--block" data-act="submit" data-testid="exam-submit">交卷</button>
      </div>`;
    const qBox = outlet.querySelector('[data-role="q"]');
    const timeEl = outlet.querySelector('[data-role="time"]');

    function paint() {
      const q = questions[s.index];
      outlet.querySelector('[data-role="step"]').textContent = `第 ${s.index + 1} / ${questions.length} 題`;
      outlet.querySelector('[data-role="part"]').textContent = PART_NAMES[q.part];
      outlet.querySelector('[data-role="bar"]').style.width = `${Math.round(((s.index + 1) / questions.length) * 100)}%`;
      const answered = Object.keys(s.answers).length;
      outlet.querySelector('[data-role="count"]').textContent = `${answered} / ${questions.length}`;
      outlet.querySelector('[data-role="grid"]').innerHTML = questions.map((x, i) =>
        `<button type="button" class="exam__cell${s.answers[x.id] !== undefined ? ' is-done' : ''}${i === s.index ? ' is-current' : ''}" data-jump="${i}" aria-label="第 ${i + 1} 題">${i + 1}</button>`).join('');
      outlet.querySelector('[data-act="prev"]').hidden = s.index === 0;
      outlet.querySelector('[data-act="next"]').hidden = s.index === questions.length - 1;
      renderQuestion(qBox, q, {
        wordsMap: ctx.wordsMap, selected: s.answers[q.id],
        onAnswer: (a) => { s.answers[q.id] = a; save(); paint(); },
      });
    }

    outlet.querySelector('[data-act="prev"]').addEventListener('click', () => { s.index -= 1; save(); paint(); window.scrollTo?.(0, 0); });
    outlet.querySelector('[data-act="next"]').addEventListener('click', () => { s.index += 1; save(); paint(); window.scrollTo?.(0, 0); });
    outlet.querySelector('[data-role="grid"]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-jump]');
      if (!b) return;
      s.index = Number(b.dataset.jump); save(); paint();
    });
    outlet.querySelector('[data-act="submit"]').addEventListener('click', async () => {
      const left = questions.length - Object.keys(s.answers).length;
      const ok = await confirmDialog({
        title: '確定交卷？',
        message: left ? `還有 ${left} 題沒有作答，沒作答的題目會算錯。` : '交卷後就不能再修改答案。',
        confirmText: '交卷',
      });
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
        const a = s.answers[q.id] ?? null;
        await recordAttempt(db, { kind: 'lesson', lessonId: exam.id, itemId: q.id, group: q.group, correct: isCorrect(q, a), answer: a, createdAt: now });
      }
      const result = scoreExam(questions, s.answers);
      const estimate = estimateScore(result);
      const old = (await db.get('progress', key)) || {};
      const times = (old.timesCompleted || 0) + 1;
      await db.put('progress', {
        id: key, lessonId: exam.id, status: 'completed', stepIndex: 0, practice: {}, completedAt: now, updatedAt: now,
        timesCompleted: times, lastAccuracy: result.rate, bestAccuracy: Math.max(old.bestAccuracy ?? 0, result.rate), title: exam.title, world: exam.world,
        lastEstimate: estimate, lastParts: result.parts,
      });
      await db.delete('progress', draftKey);
      await logSession(db, { type: 'lesson', lessonId: exam.id, accuracy: result.rate });
      const earned = await awardLessonComplete(db, exam.id, times, exam.title);
      showResult(result, s.answers, timeUp, estimate);
      afterActivity({ db, settings, earned: [earned] });
    }
    paint();
  }

  function showResult(r, answers, timeUp, est) {
    const pass = r.rate >= TARGET_RATE;
    const goal = 550;
    outlet.innerHTML = `
      <section class="card complete" data-testid="exam-result">
        <p class="complete__badge" aria-hidden="true">${pass ? '🏆' : '📝'}</p>
        <h1 class="card__title">${timeUp ? '時間到，已自動交卷' : '交卷完成'}</h1>
        <p class="big-score"><strong data-testid="exam-rate">${r.rate}</strong>%</p>
        <p>答對 ${r.correct} / ${r.total} 題・聽力 ${r.listening}/${r.listeningTotal}・閱讀 ${r.reading}/${r.readingTotal}</p>
        <p class="${pass ? 'status-line status-line--good' : 'muted'}" data-testid="exam-target">${pass
          ? '已達到 550 分目標的參考線（約答對六成）！'
          : `距離 550 分目標的參考線（約答對六成）還差 ${Math.ceil((TARGET_RATE * r.total) / 100) - r.correct} 題。`}</p>
      </section>
      ${est ? `
      <section class="card score-card" data-testid="exam-estimate">
        <h2 class="card__title">預估多益分數</h2>
        <p class="score-card__total"><strong class="en" data-testid="est-total">${est.total}</strong><span class="muted"> 分左右（±${est.margin}）</span></p>
        <div class="score-card__split">
          <div><span class="muted small">聽力</span><strong class="en">${est.listening}</strong></div>
          <div><span class="muted small">閱讀</span><strong class="en">${est.reading}</strong></div>
        </div>
        <div class="score-meter" role="img" aria-label="預估 ${est.total} 分，目標 ${goal} 分">
          <span class="score-meter__fill" style="width:${Math.round((est.total / 990) * 100)}%"></span>
          <span class="score-meter__goal" style="left:${Math.round((goal / 990) * 100)}%"></span>
          <span class="score-meter__label" style="left:${Math.round((goal / 990) * 100)}%">目標 ${goal}</span>
        </div>
        <p class="${est.total >= goal ? 'status-line status-line--good' : 'muted'}">${est.total >= goal ? '🎯 預估已達 550 分目標，保持下去！' : `距離 550 分目標還差約 ${goal - est.total} 分，先加強下面答對率最低的 Part。`}</p>
        <p class="hint">粗估：依答對率換算，共 ${est.questions} 題${est.questions < 100 ? '，題數少所以誤差較大' : ''}。正式多益會依每次考試難度換算，分數只當參考。</p>
      </section>` : ''}
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
          const a = answers[q.id] ?? null; const ok = isCorrect(q, a);
          return `<li class="${ok ? 'is-good' : 'is-bad'}">
            <p class="review-list__q">${ok ? '✅' : '❌'} <span class="badge badge--lock">Part ${q.part}</span> ${escapeHTML(q.sentence || q.prompt)}</p>
            ${q.audio ? playButtonHTML(q.audio, '▶ 重聽', 'play-btn--mini') : ''}
            <p>你的答案：<span class="en">${escapeHTML(answerText(q, a))}</span></p>${ok ? '' : `<p>正確答案：<strong class="en">${escapeHTML(answerText(q))}</strong></p>`}
            <p class="feedback__exp pre">${escapeHTML(q.explanation)}</p>${ok ? '' : optionNotesHTML(q)}
          </li>`;
        }).join('')}</ol>
        <div class="btn-row"><button type="button" class="btn btn--primary" data-act="again">再考一次</button><a class="btn btn--ghost" href="#/mistakes">去錯題百科</a></div>
      </section>`;
    outlet.querySelector('[data-act="again"]').addEventListener('click', () => intro());
  }

  await intro();
  return cleanup;
}

export { formatTime };
