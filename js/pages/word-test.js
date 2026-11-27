// 單字總測驗：#/word-test（重測錯字：#/word-test?retry=1）
// 所有學過的單字分關測一遍（每關 20 字），題型混合；可以中途離開，下次接著測。
import { loadContext } from '../learning.js';
import { MIN_WORDS } from '../games/logic.js';
import {
  WT_KEY, STAGE_SIZE, newRun, stageCount, stageOf, stageRange, questionFor, answer, skipToReading,
  stageResult, runSummary, finishRun,
} from '../games/word-test.js';
import { renderQuestion, lockQuestion } from '../ui/question-view.js';
import { isCorrect, answerText } from '../lesson/engine.js';
import { applyAnswer } from '../words.js';
import { recordAttempt, logSession } from '../rewards.js';
import { afterActivity } from '../ui/celebrate.js';
import { confirmDialog } from '../ui/confirm.js';
import { burst, glow, banner, haptic, confetti } from '../ui/fx.js';
import { escapeHTML } from '../ui/dom.js';
import { toast } from '../ui/toast.js';

const RECORD_KEY = 'game:wordtest';

export async function render({ outlet, db, settings, query }) {
  const ctx = await loadContext(db);
  const learned = ctx.learnedWords;
  const byId = ctx.wordsMap;
  const pool = learned;
  let timer = null;
  const cleanup = () => { if (timer) clearTimeout(timer); timer = null; };

  if (learned.length < MIN_WORDS) {
    outlet.innerHTML = `<section class="card" data-testid="wt-locked"><h1 class="page-title">單字總測驗</h1>
      <p>學過至少 ${MIN_WORDS} 個單字後就能開始（目前學過 ${learned.length} 個）。</p>
      <a class="btn btn--primary" href="#/words">去學單字</a></section>`;
    return cleanup;
  }

  // 進度裡的字如果之後被刪掉（教材更新），略過
  const valid = (run) => run && Array.isArray(run.order) && run.order.every((id) => byId.has(id));

  async function intro() {
    cleanup();
    const run = await db.get('progress', WT_KEY);
    const rec = await db.get('progress', RECORD_KEY);
    const has = valid(run) && run.pos < run.order.length;
    const last = rec?.lastWrong?.filter((id) => byId.has(id)) || [];
    const stages = Math.ceil(learned.length / STAGE_SIZE);
    outlet.innerHTML = `
      <section class="card wt-hero" data-testid="wt-intro">
        <a class="link" href="#/games">← 遊戲樂園</a>
        <h1 class="page-title">🏁 單字總測驗</h1>
        <p>把你學過的 <strong>${learned.length}</strong> 個單字全部測一遍：每關 ${STAGE_SIZE} 字，共 ${stages} 關。</p>
        <ul class="plain-list">
          <li>題型輪流：看英文選中文、聽音選答、看中文選英文、例句填空、聽音拼字。</li>
          <li>答錯的字會自動排進單字複習。測完可以只重測錯的字。</li>
          <li>隨時可以離開，下次從同一題接著測。</li>
        </ul>
        ${rec?.best ? `<p class="muted">最佳紀錄：答對 ${rec.best.rate}%（${rec.best.total} 字）</p>` : ''}
        <div class="btn-row">
          ${has
            ? `<button type="button" class="btn btn--primary" data-act="resume" data-testid="wt-resume">繼續第 ${stageOf(run.pos) + 1} 關（已測 ${run.pos} / ${run.order.length} 字）</button>
               <button type="button" class="btn btn--ghost" data-act="restart">重新開始</button>`
            : `<button type="button" class="btn btn--primary" data-act="start" data-testid="wt-start">開始測驗</button>`}
          ${!has && last.length ? `<button type="button" class="btn btn--ghost" data-act="retry" data-testid="wt-retry">只重測上次錯的 ${last.length} 字</button>` : ''}
        </div>
      </section>`;
    outlet.querySelector('[data-act="start"]')?.addEventListener('click', () => begin(newRun(learned.map((w) => w.id))));
    outlet.querySelector('[data-act="resume"]')?.addEventListener('click', () => play(run));
    outlet.querySelector('[data-act="retry"]')?.addEventListener('click', () => begin(newRun(last, Math.random, Date.now(), { retry: true })));
    outlet.querySelector('[data-act="restart"]')?.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: '重新開始？', message: '這一輪的作答進度會清掉，從第 1 關重新測。單字的複習紀錄和最佳紀錄會保留。', confirmText: '重新開始' });
      if (ok) begin(newRun(learned.map((w) => w.id)));
    });
  }

  async function begin(run) {
    await db.put('progress', run);
    play(run);
  }

  function play(run) {
    cleanup();
    if (run.pos >= run.order.length) { finish(run); return; }
    const stage = stageOf(run.pos);
    const [from, to] = stageRange(run, stage);
    const w = byId.get(run.order[run.pos]);
    let q = questionFor(w, pool, Math.random, run.pos);
    let answered = false;

    outlet.innerHTML = `
      <div class="player wt-play" data-testid="wt-play">
        <div class="player__head">
          <a class="player__close" href="#/games" aria-label="離開（進度會保存）">✕</a>
          <div class="player__meter">
            <div class="progressbar" role="progressbar" aria-valuemin="0" aria-valuemax="${to - from}" aria-valuenow="${run.pos - from}"><span style="width:${Math.round(((run.pos - from) / (to - from)) * 100)}%"></span></div>
            <div class="player__meta">
              <span class="player__title">第 ${stage + 1} / ${stageCount(run)} 關${run.retry ? '・重測錯字' : ''}</span>
              ${run.combo >= 2 ? `<span class="combo">🔥 ${run.combo} 連對</span>` : ''}
              <span class="player__step" data-testid="wt-count">${run.pos - from + 1} / ${to - from}</span>
            </div>
          </div>
        </div>
        <section class="card player__body" data-role="q"></section>
        <div data-role="fb"></div>
      </div>`;
    const box = outlet.querySelector('[data-role="q"]');

    function show() {
      renderQuestion(box, q, { wordsMap: byId, onAnswer: onAnswer });
      if (q.audio) {
        box.insertAdjacentHTML('beforeend', '<button type="button" class="skip-btn" data-act="skip" data-testid="skip-listening">🎧 現在不方便聽？換成不用聽的題目</button>');
        box.querySelector('[data-act="skip"]').addEventListener('click', () => {
          q = skipToReading(w, pool, Math.random);
          toast('已換成不用聽的題目', { duration: 1200 });
          show();
        });
      }
    }

    async function onAnswer(a) {
      if (answered) return;
      answered = true;
      const ok = isCorrect(q, a);
      lockQuestion(box, q, a, ok);
      box.querySelector('[data-act="skip"]')?.remove();
      const now = Date.now();
      run = answer(run, w.id, ok);
      await db.put('progress', run);
      await recordAttempt(db, { kind: 'game', game: 'wordtest', itemId: `game-wordtest-${w.id}`, wordId: w.id, correct: ok, answer: a, createdAt: now });
      const r = applyAnswer(ctx.records.get(w.id), w.id, ok, now);
      ctx.records.set(w.id, r);
      await db.put('reviews', r);
      const fb = outlet.querySelector('[data-role="fb"]');
      if (ok) {
        burst(box.querySelector('.opt.is-correct') || box);
        if (run.combo >= 5) glow('gold');
        if (run.combo > 0 && run.combo % 5 === 0) banner(`🔥 ${run.combo} 連對！`, '繼續保持');
        fb.innerHTML = '<p class="wt-fb wt-fb--good" role="status">✅ 答對了！</p>';
        timer = setTimeout(next, 650);
      } else {
        haptic([30, 40, 30]);
        fb.innerHTML = `<div class="wt-fb wt-fb--bad" role="status">
          <p><strong>❌ 正確答案：<span class="en">${escapeHTML(answerText(q))}</span></strong></p>
          <p class="muted">${escapeHTML(w.en)}（${escapeHTML(w.posZh || '')}）＝ ${escapeHTML(w.zh)}・已排進複習</p>
          <button type="button" class="btn btn--primary btn--block" data-act="next" data-testid="wt-next">下一題</button></div>`;
        fb.querySelector('[data-act="next"]').addEventListener('click', next);
      }
    }

    function next() {
      cleanup();
      if (stageOf(run.pos) !== stage || run.pos >= run.order.length) stageDone(run, stage);
      else play(run);
    }

    show();
  }

  async function stageDone(run, stage) {
    const r = stageResult(run, stage);
    run = { ...run, stageStars: [...(run.stageStars || [])] };
    run.stageStars[stage] = r.stars;
    await db.put('progress', run);
    const earned = await logSession(db, { type: 'game', gameId: 'wordtest', score: r.right });
    const last = run.pos >= run.order.length;
    outlet.innerHTML = `
      <section class="card complete" data-testid="wt-stage">
        <p class="complete__badge" aria-hidden="true">${r.stars === 3 ? '🌟' : r.stars === 2 ? '⭐' : '💪'}</p>
        <h1 class="card__title">第 ${stage + 1} 關完成！</h1>
        <div class="stars" aria-label="${r.stars} 顆星">${[1, 2, 3].map((i) => `<span class="star${i <= r.stars ? ' is-on' : ''}">★</span>`).join('')}</div>
        <p class="big-score"><strong data-testid="wt-stage-rate">${r.rate}</strong>%</p>
        <p>答對 ${r.right} / ${r.total} 字${run.bestCombo >= 3 ? `・最高 ${run.bestCombo} 連對` : ''}</p>
        ${r.wrong.length ? `<details class="wt-wrong"><summary>這關錯的 ${r.wrong.length} 個字</summary><ul class="chip-cloud">${r.wrong.map((id) => { const x = byId.get(id); return `<li class="chip"><span class="en">${escapeHTML(x.en)}</span> ${escapeHTML(x.zh)}</li>`; }).join('')}</ul></details>` : '<p class="status-line status-line--good">全對！</p>'}
        <p class="muted">全部進度：${run.pos} / ${run.order.length} 字</p>
        <div class="btn-row">
          <button type="button" class="btn btn--primary" data-act="go" data-testid="wt-go">${last ? '看總成績' : `下一關（第 ${stage + 2} 關）`}</button>
          ${last ? '' : '<a class="btn btn--ghost" href="#/games">先休息，下次接著測</a>'}
        </div>
      </section>`;
    if (r.stars === 3) setTimeout(() => confetti(), 200);
    outlet.querySelector('[data-act="go"]').addEventListener('click', () => (last ? finish(run) : play(run)));
    afterActivity({ db, settings, earned: [earned] });
  }

  async function finish(run) {
    cleanup();
    const s = runSummary(run);
    const old = (await db.get('progress', RECORD_KEY)) || { id: RECORD_KEY };
    const now = Date.now();
    const rec = run.retry ? { ...old } : finishRun(old, s, now);
    rec.id = RECORD_KEY;
    rec.lastWrong = s.wrong;
    rec.lastAt = now;
    await db.put('progress', rec);
    await db.delete('progress', WT_KEY);
    const isBest = !run.retry && rec.best?.at === now && (old.history?.length || 0) > 0;
    if (s.rate >= 90) setTimeout(() => confetti(), 250);
    outlet.innerHTML = `
      <section class="card complete" data-testid="wt-final">
        <p class="complete__badge" aria-hidden="true">${s.rate >= 90 ? '🏆' : '🏁'}</p>
        <h1 class="card__title">${run.retry ? '錯字重測完成！' : '單字總測驗完成！'}</h1>
        <p class="big-score"><strong data-testid="wt-final-rate">${s.rate}</strong>%</p>
        <p>答對 ${s.right} / ${s.total} 個單字${isBest ? '・🏆 新紀錄' : ''}</p>
        ${rec.best && !run.retry ? `<p class="muted">最佳紀錄：${rec.best.rate}%</p>` : ''}
        ${s.wrong.length ? `<p>還不熟的字有 <strong>${s.wrong.length}</strong> 個，已經排進單字複習。</p>` : '<p class="status-line status-line--good">全部答對，太厲害了！</p>'}
        <div class="btn-row">
          ${s.wrong.length ? `<button type="button" class="btn btn--primary" data-act="retry" data-testid="wt-retry-now">重測錯的 ${s.wrong.length} 字</button>` : ''}
          <a class="btn btn--ghost" href="#/games">回遊戲樂園</a>
        </div>
      </section>`;
    outlet.querySelector('[data-act="retry"]')?.addEventListener('click', () => begin(newRun(s.wrong, Math.random, Date.now(), { retry: true })));
  }

  if (query.retry) {
    const rec = await db.get('progress', RECORD_KEY);
    const ids = rec?.lastWrong?.filter((id) => byId.has(id)) || [];
    if (ids.length) { await begin(newRun(ids, Math.random, Date.now(), { retry: true })); return cleanup; }
  }
  await intro();
  return cleanup;
}
