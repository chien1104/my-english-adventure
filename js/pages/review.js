import { completeHTML, playComplete } from '../ui/complete.js';
// 單字複習：#/review
import { loadContext } from '../learning.js';
import { buildReviewQuestions, buildReviewLesson, applyAnswer } from '../words.js';
import { createState } from '../lesson/engine.js';
import { mountPlayer } from '../lesson/player.js';
import { recordAttempt, logSession } from '../rewards.js';
import { afterActivity } from '../ui/celebrate.js';
import { favoriteIds } from '../favorites.js';

export async function render({ outlet, db, navigate, query = {}, settings }) {
  const ctx = await loadContext(db);
  const words = [...ctx.wordsMap.values()];
  const fav = query.mode === 'fav';
  const free = query.mode === 'free' || fav; // 生字本練習和自由練習一樣：答對不改變排程
  const questions = fav
    ? buildReviewQuestions(words, ctx.records, { count: 10, ids: favoriteIds() })
    : buildReviewQuestions(words, ctx.records, { count: free ? 8 : 10, onlyDue: !free });
  if (fav && !questions.length) {
    outlet.innerHTML = `<section class="card"><h1 class="card__title">生字本還是空的</h1>
      <p>在單字卡按「☆ 加入生字本」，想加強的字就會收在這裡。</p>
      <a class="btn btn--primary" href="#/words">去單字頁</a></section>`;
    return;
  }
  if (!questions.length && !free && ctx.learnedCount) {
    outlet.innerHTML = `<section class="card"><h1 class="card__title">今天沒有到期的單字</h1>
      <p>照記憶曲線，今天不用複習。想多練習的話可以用自由練習。</p>
      <div class="btn-row"><a class="btn btn--primary" href="#/review?mode=free">自由練習</a><a class="btn btn--ghost" href="#/words">回單字圖書館</a></div></section>`;
    return;
  }
  if (!questions.length) {
    outlet.innerHTML = `<section class="card"><h1 class="card__title">還沒有可以複習的單字</h1>
      <p>先在「單字」頁學一個單元，或完成一堂單字課，學過的單字就會出現在這裡。</p>
      <a class="btn btn--primary" href="#/words">去學單字</a></section>`;
    return;
  }
  const lesson = buildReviewLesson(questions);
  lesson.title = fav ? '生字本練習' : free ? '自由練習' : '到期單字複習';
  const results = new Map();

  mountPlayer({
    outlet, lesson, state: createState(lesson), wordsMap: ctx.wordsMap, records: ctx.records,
    exitLabel: '結束複習',
    hooks: {
      async onAnswer(q, correct, answer) {
        const now = Date.now();
        const rec = applyAnswer(ctx.records.get(q.wordId), q.wordId, correct, now);
        ctx.records.set(q.wordId, rec);
        await db.put('reviews', rec);
        await recordAttempt(db, { kind: 'review', itemId: q.id, group: q.group, wordId: q.wordId, correct, answer, createdAt: now });
        if (!results.has(q.wordId)) results.set(q.wordId, correct);
      },
      async onComplete() {
        const earned = await logSession(db, { type: 'review', free, count: questions.length });
        afterActivity({ db, settings, earned: [earned] });
        const right = [...results.values()].filter(Boolean).length;
        const familiar = questions.filter((q) => ctx.records.get(q.wordId)?.status === 'familiar').length;
        const counted = results.size; // 跳過的聽力題不計分
        const skipped = questions.length - counted;
        const acc = counted ? Math.round((right / counted) * 100) : 0;
        outlet.innerHTML = completeHTML({
          testid: 'review-complete', icon: '📚', title: '複習完成！', accuracy: acc, firstCorrect: right, total: counted,
          chips: [{ text: `💪 ${familiar} 個已達「熟悉」`, gold: familiar > 0 }, ...(skipped ? [{ text: `⏭ 跳過 ${skipped} 題聽力（不計分）` }] : [])],
          lines: [`第一次就答對 ${right} / ${counted} 個單字。${free ? '自由練習答對不改變排程，答錯的已排到今天複習。' : '答對的單字下次複習間隔會拉長。'}`],
          actions: `<a class="btn btn--primary" href="#/words">回單字</a>
            ${free ? '<button type="button" class="btn btn--ghost" data-act="again">再練一次</button>' : ''}`,
        });
        playComplete(outlet, acc);
        outlet.querySelector('[data-act="again"]')?.addEventListener('click', () => render({ outlet, db, navigate, query, settings }));
      },
      onExit() { navigate('#/words'); },
    },
  });
}
