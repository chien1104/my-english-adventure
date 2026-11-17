// 錯題重練：#/mistake-practice
import { loadContext } from '../learning.js';
import { retrainQuestions } from '../mistakes.js';
import { applyAnswer } from '../words.js';
import { createState } from '../lesson/engine.js';
import { mountPlayer } from '../lesson/player.js';
import { recordAttempt, logSession } from '../rewards.js';
import { afterActivity } from '../ui/celebrate.js';

export async function render({ outlet, db, navigate, settings }) {
  const ctx = await loadContext(db);
  const questions = retrainQuestions(ctx.mistakes, ctx.qIndex);
  if (!questions.length) {
    outlet.innerHTML = `<section class="card"><h1 class="card__title">沒有待訂正的錯題</h1>
      <p>目前所有錯題都訂正了。</p><a class="btn btn--primary" href="#/mistakes">回錯題百科</a></section>`;
    return;
  }
  const lesson = {
    id: 'mistake-session', type: 'review', title: '錯題重練',
    steps: [
      { kind: 'practice', title: '錯題重練', intro: '這些是你之前答錯的考點，有些會換成相似題。', questions, similar: [] },
      { kind: 'review', title: '答案解析' },
    ],
  };
  const first = new Map();

  mountPlayer({
    outlet, lesson, state: createState(lesson), wordsMap: ctx.wordsMap, records: ctx.records,
    exitLabel: '結束重練',
    hooks: {
      async onAnswer(q, correct, answer) {
        const now = Date.now();
        await recordAttempt(db, {
          kind: 'mistake', lessonId: q._lessonId || null, group: q.group, wordId: q.wordId || null,
          itemId: q.id, correct, answer, createdAt: now,
        });
        if (q.wordId) {
          const rec = applyAnswer(ctx.records.get(q.wordId), q.wordId, correct, now);
          ctx.records.set(q.wordId, rec);
          await db.put('reviews', rec);
        }
        if (!first.has(q.id)) first.set(q.id, correct);
      },
      async onComplete() {
        const earned = await logSession(db, { type: 'mistake', count: questions.length });
        await afterActivity({ db, settings, earned: [earned] });
        const after = await loadContext(db);
        const left = after.mistakes.filter((m) => !m.fixed).length;
        const right = [...first.values()].filter(Boolean).length;
        outlet.innerHTML = `
          <section class="card complete" data-testid="retrain-complete">
            <p class="complete__badge" aria-hidden="true">📕</p>
            <h1 class="card__title">錯題重練完成！</h1>
            <p>這次第一次就答對 <strong>${right}</strong> / ${questions.length} 題。</p>
            <p class="muted">${left ? `還有 ${left} 題待訂正。` : '全部錯題都訂正了！'}</p>
            <div class="btn-row"><a class="btn btn--primary" href="#/mistakes">回錯題百科</a></div>
          </section>`;
      },
      onExit() { navigate('#/mistakes'); },
    },
  });
}
