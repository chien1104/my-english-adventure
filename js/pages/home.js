// 首頁
import { MODES, MODE_IDS } from '../settings.js';
import { getStorageStatus, describeStatus } from '../storage-status.js';
import { escapeHTML } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { worldStatus } from './worlds.js';
import { loadContext } from '../learning.js';
import { planToday, TYPE_LABEL, TYPE_ICON, lessonHref } from '../progress.js';
import { expandLesson } from '../lesson/engine.js';
import { settleRewards, totalExp } from '../rewards.js';
import { levelInfo, dailyChallenge } from '../gamify.js';
import { celebrate } from '../ui/celebrate.js';
import { todayKey } from '../settings.js';

export async function render({ outlet, db, settings, refreshIndicator }) {
  const s = settings.get();
  const ctx = await loadContext(db);
  const settled = await settleRewards(db, ctx, settings.getTodayMode().mode);
  const lv = levelInfo(await totalExp(db));
  const challenge = ctx.learnedWords.length >= 4 ? dailyChallenge(todayKey(), settled.stats.sessions) : null;
  const status = await getStorageStatus({ db });
  const desc = describeStatus(status, s.persistRequest);
  const worlds = worldStatus(ctx);
  const openCount = worlds.filter((w) => w.state === 'open').length;
  const worldTotal = worlds.filter((w) => w.state !== 'nocontent').length;
  const doneCount = ctx.lessons.filter((l) => ctx.access.get(l.id)?.completed).length;
  const mistakeCount = ctx.mistakes ? ctx.mistakes.filter((m) => !m.fixed).length : 0;

  const name = s.nickname ? escapeHTML(s.nickname) : '冒險者';

  outlet.innerHTML = `
    <section class="card hero">
      <p class="eyebrow">Welcome back</p>
      <h1 class="hero__title">嗨，${name}</h1>
      ${s.nickname ? '' : '<p><a class="link" href="#/settings?section=profile" data-testid="set-nickname-link">設定你的暱稱 →</a></p>'}
      <div class="level" data-testid="level-box">
        <p class="level__row"><span class="level__badge" data-testid="level">Lv ${lv.level}</span><span class="level__title">${lv.title}</span>
          <span class="level__exp en" data-testid="exp">${lv.exp} EXP</span></p>
        <div class="level__bar" role="progressbar" aria-valuemin="0" aria-valuemax="${lv.need}" aria-valuenow="${lv.into}" aria-label="升級進度"><span style="width:${Math.round(lv.progress * 100)}%"></span></div>
        <p class="hint">再 ${lv.nextAt - lv.exp} EXP 升到 Lv ${lv.level + 1}・經驗值只會增加，休息不會扣分</p>
      </div>
      <dl class="stats">
        <div class="stat"><dt>學過的單字</dt><dd data-testid="review-count">${ctx.learnedCount}</dd></div>
        <div class="stat"><dt>完成課程</dt><dd data-testid="done-count">${doneCount}</dd></div>
        <div class="stat"><dt>待訂正錯題</dt><dd><a class="stat-link" href="#/mistakes" data-testid="mistake-count">${mistakeCount}</a></dd></div>
      </dl>
    </section>

    ${ctx.diagnosis ? '' : `
    <section class="card start-card" data-testid="diagnosis-cta">
      <h2 class="card__title">🧭 第一步：程度診斷</h2>
      <p>13 題、約 5 分鐘，幫你找到最適合的起點。完成後就會開放課程。</p>
      <a class="btn btn--primary" href="#/diagnosis">開始程度診斷</a>
    </section>`}

    <section class="card" aria-labelledby="mode-title">
      <h2 id="mode-title" class="card__title">今天的精神狀態</h2>
      <p class="muted">選一個今天適合的模式，不需要每天打卡。</p>
      <div class="mode-grid" role="group" aria-label="今日學習模式" data-testid="mode-grid"></div>
      <p class="mode-note" data-testid="mode-note"></p>
    </section>

    ${ctx.diagnosis ? `
    <section class="card" aria-labelledby="task-title" data-testid="daily-card">
      <h2 id="task-title" class="card__title">今日任務 <span class="muted small">依今天的精神狀態調整</span></h2>
      <ul class="task-list" data-testid="task-list"></ul>
      ${challenge ? `<div class="challenge ${challenge.done ? 'is-done' : ''}" data-testid="challenge">
        <p class="challenge__title">${challenge.done ? '🏆' : '🎯'} 每日挑戰 <span class="muted small">+30 EXP</span></p>
        <p>${challenge.label}</p>
        ${challenge.done ? '<p class="status-line status-line--good">今天的挑戰完成了！</p>' : `<a class="btn btn--ghost btn--sm" href="#/game?id=${challenge.game}">去挑戰</a>`}
      </div>` : ''}
    </section>

    <section class="card" aria-labelledby="plan-title">
      <h2 id="plan-title" class="card__title">今日安排</h2>
      <ul class="plan-list" data-testid="plan-list"></ul>
      <p class="hint" data-testid="plan-note"></p>
    </section>` : ''}

    <section class="card quick-links">
      <a class="quick-link" href="#/achievements" data-testid="link-achievements"><span aria-hidden="true">🏅</span>成就<small data-testid="ach-count">${(await db.count('achievements'))} 個</small></a>
      <a class="quick-link" href="#/stats" data-testid="link-stats"><span aria-hidden="true">📊</span>學習分析</a>
    </section>

    <section class="card" aria-labelledby="save-title">
      <h2 id="save-title" class="card__title">資料保存</h2>
      <p class="status-line status-line--${desc.tone}" data-testid="home-save-summary">${desc.summary}</p>
      <p class="muted">${status.lastBackupAt ? '已有備份檔' : '尚未備份：資料只存在這台裝置的瀏覽器'}</p>
      <a class="btn btn--ghost" href="#/settings?section=data">查看保存狀態</a>
    </section>

    <section class="card" aria-labelledby="world-title">
      <h2 id="world-title" class="card__title">學習世界</h2>
      <p class="muted">目前開放 <strong data-testid="open-worlds">${openCount}</strong> / ${worldTotal} 個世界</p>
      <a class="btn btn--ghost" href="#/worlds">查看世界地圖</a>
    </section>
  `;

  const grid = outlet.querySelector('[data-testid="mode-grid"]');
  const note = outlet.querySelector('[data-testid="mode-note"]');
  const planList = outlet.querySelector('[data-testid="plan-list"]');
  const planNote = outlet.querySelector('[data-testid="plan-note"]');
  const taskList = outlet.querySelector('[data-testid="task-list"]');

  async function paintTasks() {
    if (!taskList) return;
    const { tasks, results } = await settleRewards(db, await loadContext(db), settings.getTodayMode().mode);
    if (results.length) celebrate(results);
    const allDone = tasks.every((t) => t.done);
    taskList.innerHTML = tasks.map((t) => `
      <li class="task${t.done ? ' is-done' : ''}" data-task="${t.id}">
        <span class="task__icon" aria-hidden="true">${t.done ? '✔️' : t.icon}</span>
        <span class="task__body"><span>${t.label}</span>
          <span class="task__bar"><span style="width:${Math.round((t.current / t.target) * 100)}%"></span></span></span>
        <span class="task__count en">${t.current}/${t.target}</span>
      </li>`).join('') + `<li class="task-note muted">${allDone ? '🎉 今日任務全部完成，額外 +20 EXP！' : '每完成一個 +15 EXP，全部完成再 +20 EXP。沒做完也不會扣分。'}</li>`;
  }

  function paintPlan(mode, minutes) {
    if (!planList) return;
    const plan = planToday({ mode, minutes, lessons: ctx.lessons, access: ctx.access, dueCount: ctx.dueCount, mistakeCount });
    planList.innerHTML = plan.items.map((it) => {
      if (it.type === 'review') {
        return `<li class="plan-item"><span class="plan-item__icon" aria-hidden="true">📚</span>
          <span class="plan-item__body"><strong>單字複習</strong><span class="muted">約 ${it.minutes} 分鐘・今天到期 ${it.count} 個單字</span></span>
          <a class="btn btn--primary btn--sm" href="#/review">開始</a></li>`;
      }
      if (it.type === 'mistakes') {
        return `<li class="plan-item"><span class="plan-item__icon" aria-hidden="true">📕</span>
          <span class="plan-item__body"><strong>錯題重練</strong><span class="muted">約 ${it.minutes} 分鐘・${it.count} 題待訂正</span></span>
          <a class="btn btn--primary btn--sm" href="#/mistake-practice">開始</a></li>`;
      }
      const a = ctx.access.get(it.lesson.id);
      const total = it.lesson.type === 'exam' ? 1 : expandLesson(it.lesson).steps.length;
      const label = a.status === 'in_progress' && it.lesson.type !== 'exam' ? `繼續 ${a.stepIndex + 1}/${total}` : '開始';
      return `<li class="plan-item"><span class="plan-item__icon" aria-hidden="true">${TYPE_ICON[it.lesson.type] || '📖'}</span>
        <span class="plan-item__body"><strong>${escapeHTML(it.lesson.title)}</strong>
        <span class="muted">${TYPE_LABEL[it.lesson.type] || '課程'}・約 ${it.minutes} 分鐘${it.partial ? '・可以只做一部分' : ''}</span></span>
        <a class="btn btn--primary btn--sm" href="${lessonHref(it.lesson)}">${label}</a></li>`;
    }).join('') || '<li class="muted">今天沒有安排項目。</li>';
    planNote.textContent = plan.note;
  }

  function paint() {
    const st = settings.get();
    const today = settings.getTodayMode();
    grid.innerHTML = MODE_IDS.map((id) => {
      const m = MODES[id];
      const pressed = id === today.mode;
      return `
        <button type="button" class="mode-btn${pressed ? ' is-active' : ''}" data-mode="${id}" aria-pressed="${pressed}">
          <span class="mode-btn__icon" aria-hidden="true">${m.icon}</span>
          <span class="mode-btn__label">${m.label}</span>
          <span class="mode-btn__meta">${st.modeMinutes[id]} 分鐘・${m.desc}</span>
        </button>`;
    }).join('');
    const m = MODES[today.mode];
    note.textContent = today.chosen
      ? `今天：${m.label}模式，${st.modeMinutes[today.mode]} 分鐘（已保存）`
      : `今天還沒選擇，預設為${m.label}模式`;
    paintPlan(today.mode, st.modeMinutes[today.mode]);
  }
  paint();
  await paintTasks();
  if (settled.results.length) celebrate(settled.results);

  function onClick(e) {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    const res = settings.setTodayMode(btn.dataset.mode);
    if (res.ok) toast(`已選擇${MODES[btn.dataset.mode].label}模式`, { type: 'success' });
    else toast(res.error, { type: 'error' });
    paint();
    paintTasks();
  }
  grid.addEventListener('click', onClick);
  refreshIndicator?.();

  return () => grid.removeEventListener('click', onClick);
}
