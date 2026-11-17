// 課程頁：#/lesson?id=vocab-1
import { expandLesson, createState, reconcileState, lessonStats } from '../lesson/engine.js';
import { mountPlayer } from '../lesson/player.js';
import { lessonKey } from '../progress.js';
import { markLearned, applyAnswer } from '../words.js';
import { loadContext } from '../learning.js';
import { escapeHTML } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { WORLDS } from './worlds.js';
import { recordAttempt, logSession, awardLessonComplete } from '../rewards.js';
import { afterActivity } from '../ui/celebrate.js';
import { toast as _t } from '../ui/toast.js';

export async function render({ outlet, db, query, navigate, settings }) {
  const ctx = await loadContext(db);
  const raw = ctx.lessons.find((l) => l.id === query.id);
  if (!raw) {
    outlet.innerHTML = '<section class="card"><h1 class="card__title">找不到這堂課</h1><a class="btn btn--primary" href="#/worlds">回世界地圖</a></section>';
    return;
  }
  if (raw.type === 'exam') { navigate(`#/exam?id=${raw.id}`); return; }
  const world = WORLDS.find((w) => w.id === raw.world);
  const worldHref = `#/world?id=${raw.world}`;
  const acc = ctx.access.get(raw.id);
  if (!acc?.unlocked) {
    outlet.innerHTML = `<section class="card"><h1 class="card__title">🔒 ${escapeHTML(raw.title)}</h1>
      <p>${escapeHTML(acc?.reason || '尚未開放')}</p>
      <a class="btn btn--primary" href="${acc?.reason?.includes('診斷') ? '#/diagnosis' : worldHref}">${acc?.reason?.includes('診斷') ? '去做程度診斷' : '回到世界'}</a></section>`;
    return;
  }

  const lesson = expandLesson(raw);
  const key = lessonKey(lesson.id);
  const saved = ctx.progressById.get(key);
  const resuming = saved && saved.status === 'in_progress';
  let state = resuming ? reconcileState(lesson, saved) : createState(lesson);
  if (resuming && state.stepIndex > 0) toast(`從第 ${state.stepIndex + 1} 步繼續`);

  const meta = {
    timesCompleted: saved?.timesCompleted || 0,
    bestAccuracy: saved?.bestAccuracy ?? null,
    lastAccuracy: saved?.lastAccuracy ?? null,
  };

  async function save(s) {
    await db.put('progress', { id: key, ...s, ...meta, title: lesson.title, world: lesson.world });
  }

  mountPlayer({
    outlet, lesson, state, wordsMap: ctx.wordsMap, records: ctx.records,
    hooks: {
      onSave: save,
      async onAnswer(q, correct, answer) {
        const now = Date.now();
        const r = await recordAttempt(db, {
          kind: 'lesson', lessonId: lesson.id, itemId: q.id, group: q.group, wordId: q.wordId || null,
          correct, answer, createdAt: now,
        });
        if (r?.levelUp) _t(`🎉 升級！Lv ${r.levelUp.level}「${r.levelUp.title}」`, { type: 'success', duration: 4000 });
        if (q.wordId) {
          const rec = applyAnswer(ctx.records.get(q.wordId), q.wordId, correct, now);
          ctx.records.set(q.wordId, rec);
          await db.put('reviews', rec);
        }
      },
      async onComplete(s, stats) {
        meta.timesCompleted += 1;
        meta.lastAccuracy = stats.accuracy;
        meta.bestAccuracy = Math.max(meta.bestAccuracy ?? 0, stats.accuracy);
        await save(s);
        if (lesson.type === 'vocab') {
          const now = Date.now();
          const ids = lesson.steps.filter((st) => st.kind === 'word').map((st) => st.wordId);
          const recs = ids.map((id) => markLearned(ctx.records.get(id), id, now));
          await db.putMany('reviews', recs);
        }
        await logSession(db, { type: 'lesson', lessonId: lesson.id, accuracy: stats.accuracy });
        const earned = await awardLessonComplete(db, lesson.id, meta.timesCompleted, lesson.title);
        renderComplete(stats);
        afterActivity({ db, settings, earned: [earned] });
      },
      onExit() {
        toast('進度已保存，下次會從這裡繼續', { type: 'success' });
        navigate(worldHref);
      },
    },
  });

  function renderComplete(stats) {
    const after = loadContext(db);
    outlet.innerHTML = `
      <section class="card complete" data-testid="lesson-complete">
        <p class="complete__badge" aria-hidden="true">🎉</p>
        <h1 class="card__title">完成「${escapeHTML(lesson.title)}」！</h1>
        <p>第一次作答正確率 <strong data-testid="accuracy">${stats.accuracy}%</strong>（${stats.firstCorrect} / ${stats.total} 題）</p>
        ${lesson.type === 'vocab' ? '<p class="muted">這一課的單字已加入單字圖書館，可以隨時複習。</p>' : ''}
        <p class="muted">已完成 ${meta.timesCompleted} 次。</p>
        <div class="btn-row" data-role="actions">
          <a class="btn btn--ghost" href="${worldHref}">回到${escapeHTML(world?.name || '世界')}</a>
        </div>
      </section>`;
    after.then((c) => {
      const actions = outlet.querySelector('[data-role="actions"]');
      if (!actions) return;
      const next = c.lessons.filter((l) => l.world === lesson.world && l.order > lesson.order)
        .find((l) => c.access.get(l.id)?.unlocked);
      if (next) actions.insertAdjacentHTML('afterbegin', `<a class="btn btn--primary" href="${next.type === 'exam' ? `#/exam?id=${next.id}` : `#/lesson?id=${next.id}`}" data-testid="next-lesson">下一課：${escapeHTML(next.title)}</a>`);
      else actions.insertAdjacentHTML('afterbegin', '<a class="btn btn--primary" href="#/home">回首頁看今日安排</a>');
    });
  }
}
