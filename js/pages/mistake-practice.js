import { completeHTML, playComplete } from '../ui/complete.js';
// 錯題重練：#/mistake-practice
import { loadContext } from '../learning.js';
import { retrainQuestions, CATEGORIES, RETRAIN_MAX } from '../mistakes.js';
import { applyAnswer } from '../words.js';
import { createState } from '../lesson/engine.js';
import { mountPlayer } from '../lesson/player.js';
import { recordAttempt, logSession } from '../rewards.js';
import { afterActivity } from '../ui/celebrate.js';

export async function render({ outlet, db, navigate, settings, query = {} }) {
  const ctx = await loadContext(db);
  const cat = CATEGORIES[query.cat] ? query.cat : null;
  const questions = retrainQuestions(ctx.mistakes, ctx.qIndex, RETRAIN_MAX, { category: cat });
  if (!questions.length) {
    outlet.innerHTML = `<section class="card"><h1 class="card__title">今天沒有要複習的錯題</h1>
      <p>${cat ? `「${CATEGORIES[cat]}」` : ''}到期的錯題都練完了。答對過一次的錯題會在 3 天後再出現。</p><a class="btn btn--primary" href="#/mistakes">回錯題百科</a></section>`;
    return;
  }
  const lesson = {
    id: 'mistake-session', type: 'review', title: cat ? `錯題重練・${CATEGORIES[cat]}` : '錯題重練',
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
        const left = after.mistakes.filter((m) => m.due).length;
        const later = after.mistakes.filter((m) => !m.fixed && !m.due).length;
        const counted = questions.filter((q) => first.has(q.id)).length; // 跳過的聽力題不計分
        const right = questions.filter((q) => first.get(q.id)).length;
        const acc = counted ? Math.round((right / counted) * 100) : 0;
        outlet.innerHTML = completeHTML({
          testid: 'retrain-complete', icon: '📕', title: '錯題重練完成！', accuracy: acc, firstCorrect: right, total: counted,
          chips: [{ text: left ? `📌 今天還有 ${left} 題` : '🏆 今天的錯題練完了！', gold: !left }, ...(later ? [{ text: `🗓 ${later} 題過幾天再複習` }] : [])],
          lines: ['答對的錯題會在 3 天後再出現一次，那次也答對才算真正訂正。'],
          actions: '<a class="btn btn--primary" href="#/mistakes">回錯題百科</a>',
        });
        playComplete(outlet, acc);
      },
      onExit() { navigate('#/mistakes'); },
    },
  });
}
