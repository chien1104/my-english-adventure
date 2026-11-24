// 單一世界的課程列表：#/world?id=words
import { loadContext } from '../learning.js';
import { lessonKey, TYPE_LABEL, lessonHref } from '../progress.js';
import { createState, expandLesson } from '../lesson/engine.js';
import { WORLDS, worldStatus } from './worlds.js';
import { escapeHTML } from '../ui/dom.js';
import { confirmDialog } from '../ui/confirm.js';
import { toast } from '../ui/toast.js';

export async function render({ outlet, db, query, navigate }) {
  const ctx = await loadContext(db);
  const w = worldStatus(ctx).find((x) => x.id === query.id);
  if (!w) {
    outlet.innerHTML = '<section class="card"><h1 class="card__title">找不到這個世界</h1><a class="btn btn--primary" href="#/worlds">回世界地圖</a></section>';
    return;
  }
  if (w.state !== 'open') {
    outlet.innerHTML = `<section class="card"><h1 class="card__title">🔒 ${w.name}</h1>
      <p>${w.state === 'needs-diagnosis' ? '完成程度診斷後開放。' : '完成前面的課程後開放。'}</p>
      <a class="btn btn--primary" href="${w.state === 'needs-diagnosis' ? '#/diagnosis' : '#/worlds'}">${w.state === 'needs-diagnosis' ? '去做程度診斷' : '回世界地圖'}</a></section>`;
    return;
  }
  const lessons = ctx.lessons.filter((l) => l.world === w.id);
  const STATUS = { new: '未開始', in_progress: '進行中', completed: '已完成', locked: '未解鎖' };

  outlet.innerHTML = `
    <section class="card world-head">
      <a class="link" href="#/worlds">← 世界地圖</a>
      <p class="world__no">WORLD ${w.no}</p>
      <h1 class="page-title">${w.icon} ${w.name}</h1>
      <p class="muted">${w.topic}・完成 ${w.done} / ${w.lessonCount} 課</p>
    </section>
    <ol class="lesson-list" data-testid="lesson-list">
      ${lessons.map((l, i) => {
        const a = ctx.access.get(l.id);
        const p = ctx.progressById.get(lessonKey(l.id));
        const total = l.type === 'exam' ? 1 : expandLesson(l).steps.length;
        let actions = '';
        if (!a.unlocked) {
          actions = `<p class="muted">🔒 ${escapeHTML(a.reason)}</p>`;
        } else if (a.status === 'in_progress') {
          actions = l.type === 'exam' ? `<a class="btn btn--primary" href="${lessonHref(l)}" data-testid="continue-${l.id}">繼續</a>` : `<a class="btn btn--primary" href="${lessonHref(l)}" data-testid="continue-${l.id}">繼續（第 ${a.stepIndex + 1} / ${total} 步）</a>
                     <button type="button" class="btn btn--ghost" data-act="restart" data-id="${l.id}">重新學習</button>`;
        } else if (a.status === 'completed') {
          actions = `<a class="btn btn--ghost" href="${lessonHref(l)}" data-testid="relearn-${l.id}">重新學習</a>`;
        } else {
          actions = `<a class="btn btn--primary" href="${lessonHref(l)}" data-testid="start-${l.id}">開始學習</a>`;
        }
        return `
          <li class="lesson-item card${a.unlocked ? '' : ' is-locked'}" data-lesson="${l.id}">
            <p class="lesson-item__no">第 ${i + 1} 課・${TYPE_LABEL[l.type] || '課程'}・約 ${l.minutes} 分鐘</p>
            <h2 class="lesson-item__title">${escapeHTML(l.title)} <span class="en muted">${escapeHTML(l.titleEn || '')}</span></h2>
            <p class="muted">${escapeHTML(l.summary || '')}</p>
            <p class="lesson-item__status"><span class="status status--${a.status}">${STATUS[a.status]}</span>
              ${p?.lastAccuracy !== null && p?.lastAccuracy !== undefined && p?.timesCompleted ? `<span class="muted">上次正確率 ${p.lastAccuracy}%</span>` : ''}
              ${a.testedOut && i > 0 ? '<span class="muted">診斷達標，直接開放</span>' : ''}</p>
            <div class="btn-row">${actions}</div>
          </li>`;
      }).join('')}
    </ol>`;

  outlet.querySelectorAll('[data-act="restart"]').forEach((btn) => btn.addEventListener('click', async () => {
    const lesson = lessons.find((l) => l.id === btn.dataset.id);
    const ok = await confirmDialog({
      title: '重新學習這一課？',
      message: '這一課目前的進度會從第 1 步重新開始。已完成次數與作答紀錄都會保留。',
      confirmText: '重新開始',
    });
    if (!ok) return;
    const key = lessonKey(lesson.id);
    const old = ctx.progressById.get(key) || {};
    const fresh = createState(expandLesson(lesson));
    await db.put('progress', {
      id: key, ...fresh, timesCompleted: old.timesCompleted || 0,
      bestAccuracy: old.bestAccuracy ?? null, lastAccuracy: old.lastAccuracy ?? null, title: lesson.title, world: lesson.world,
    });
    toast('已重新開始');
    navigate(`#/lesson?id=${lesson.id}`);
  }));
}
