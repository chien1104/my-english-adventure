// 單字單元：#/unit?id=hot:0 — 先看這 20 個字，再開始學（認字＋小測驗）
// 加上 &play=1 進入學習；進度存在 progress「unit:hot:0」，可以暫停、繼續、重新學習。
import { loadContext } from '../learning.js';
import { loadSeries } from '../content.js';
import { findSeries, parseUnitId, buildUnitLesson, unitProgress, unitKey } from '../bank.js';
import { expandLesson, createState, reconcileState } from '../lesson/engine.js';
import { mountPlayer } from '../lesson/player.js';
import { markLearned, applyAnswer } from '../words.js';
import { recordAttempt, logSession, awardExp } from '../rewards.js';
import { EXP } from '../gamify.js';
import { afterActivity } from '../ui/celebrate.js';
import { confirmDialog } from '../ui/confirm.js';
import { toast } from '../ui/toast.js';
import { escapeHTML } from '../ui/dom.js';
import { wordRowHTML, bindWordRows } from './words.js';

export async function render({ outlet, db, query, navigate, settings }) {
  const [ctx, bank] = await Promise.all([loadContext(db), loadSeries(db)]);
  const parsed = parseUnitId(query.id);
  const series = parsed && findSeries(bank, parsed.seriesId, ctx.wordsMap);
  const ids = series?.units[parsed.index];
  if (!ids) {
    outlet.innerHTML = '<section class="card"><h1 class="card__title">找不到這個單元</h1><a class="btn btn--primary" href="#/words">回單字</a></section>';
    return;
  }
  const unitId = `${series.id}:${parsed.index}`;
  const key = unitKey(unitId);
  const saved = ctx.progressById.get(key);
  const seriesHref = `#/series?id=${series.id}`;
  const lesson = expandLesson(buildUnitLesson(series, parsed.index, ctx.wordsMap));
  const hasNext = parsed.index + 1 < series.units.length;
  const nextHref = `#/unit?id=${series.id}:${parsed.index + 1}`;

  if (query.play !== '1') {
    const up = unitProgress(ids, ctx.records);
    const resuming = saved?.status === 'in_progress';
    outlet.innerHTML = `
      <section class="card world-head">
        <a class="link" href="${seriesHref}">← ${escapeHTML(series.name)}</a>
        <h1 class="page-title">第 ${parsed.index + 1} 單元</h1>
        <p class="muted">${ids.length} 個單字・約 8 分鐘・已學 ${up.learned} / ${up.total}</p>
        <p class="hint">先看單字卡（可以聽發音和例句），再做小測驗。答錯的字會換個方式再考一次，學完會自動排進複習。</p>
        <div class="btn-row">
          ${resuming
            ? `<a class="btn btn--primary" href="#/unit?id=${unitId}&play=1" data-testid="unit-continue">繼續（第 ${saved.stepIndex + 1} / ${lesson.steps.length} 步）</a>
               <button type="button" class="btn btn--ghost" data-act="restart">重新學習</button>`
            : `<a class="btn btn--primary" href="#/unit?id=${unitId}&play=1" data-testid="unit-start">${saved?.timesCompleted ? '再學一次' : '開始學習'}</a>`}
        </div>
      </section>
      <ul class="word-list" data-testid="unit-words">${ids.map((id) => ctx.wordsMap.get(id)).filter(Boolean).map((w) => wordRowHTML(w, ctx.records.get(w.id))).join('')}</ul>
      ${hasNext ? `<a class="btn btn--ghost btn--block" href="${nextHref}">下一單元 →</a>` : ''}`;
    bindWordRows(outlet.querySelector('[data-testid="unit-words"]'));
    outlet.querySelector('[data-act="restart"]')?.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: '重新學習這個單元？', message: '會從第 1 步重新開始。學過的單字和作答紀錄都會保留。', confirmText: '重新開始' });
      if (!ok) return;
      await db.put('progress', { id: key, ...createState(lesson), timesCompleted: saved?.timesCompleted || 0, title: lesson.title });
      navigate(`#/unit?id=${unitId}&play=1`);
    });
    return;
  }

  const resuming = saved && saved.status === 'in_progress';
  const state = resuming ? reconcileState(lesson, saved) : createState(lesson);
  if (resuming && state.stepIndex > 0) toast(`從第 ${state.stepIndex + 1} 步繼續`);
  let timesCompleted = saved?.timesCompleted || 0;
  const save = (s) => db.put('progress', { id: key, ...s, timesCompleted, title: lesson.title });

  mountPlayer({
    outlet, lesson, state, wordsMap: ctx.wordsMap, records: ctx.records,
    hooks: {
      onSave: save,
      async onAnswer(q, correct, answer) {
        const now = Date.now();
        const r = await recordAttempt(db, { kind: 'review', unitId, itemId: q.id, group: q.group, wordId: q.wordId, correct, answer, createdAt: now });
        if (r?.levelUp) toast(`🎉 升級！Lv ${r.levelUp.level}「${r.levelUp.title}」`, { type: 'success', duration: 4000 });
        const rec = applyAnswer(ctx.records.get(q.wordId), q.wordId, correct, now);
        ctx.records.set(q.wordId, rec);
        await db.put('reviews', rec);
      },
      async onComplete(s, stats) {
        timesCompleted += 1;
        await save(s);
        const now = Date.now();
        await db.putMany('reviews', ids.map((id) => markLearned(ctx.records.get(id), id, now)));
        await logSession(db, { type: 'unit', unitId, accuracy: stats.accuracy });
        const first = timesCompleted === 1;
        const earned = await awardExp(db, `unit:${unitId}:${timesCompleted}`, first ? EXP.unitFirst : EXP.unitRepeat,
          `${first ? '學完' : '重新學完'}「${lesson.title}」`, now);
        outlet.innerHTML = `
          <section class="card complete" data-testid="unit-complete">
            <p class="complete__badge" aria-hidden="true">🎉</p>
            <h1 class="card__title">學完${escapeHTML(lesson.title)}！</h1>
            <p>第一次作答正確率 <strong data-testid="accuracy">${stats.accuracy}%</strong>（${stats.firstCorrect} / ${stats.total} 題）</p>
            <p class="muted">這 ${ids.length} 個單字已排進複習，明天會再出現。</p>
            <div class="btn-row">
              ${hasNext ? `<a class="btn btn--primary" href="${nextHref}" data-testid="next-unit">下一單元</a>` : ''}
              <a class="btn btn--ghost" href="${seriesHref}">回${escapeHTML(series.name)}</a>
            </div>
          </section>`;
        afterActivity({ db, settings, earned: [earned] });
      },
      onExit() {
        toast('進度已保存，下次會從這裡繼續', { type: 'success' });
        navigate(`#/unit?id=${unitId}`);
      },
    },
  });
}
