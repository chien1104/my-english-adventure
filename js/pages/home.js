// 首頁
import { MODES, MODE_IDS } from '../settings.js';
import { getStorageStatus, describeStatus } from '../storage-status.js';
import { escapeHTML } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { worldStatus } from './worlds.js';
import { loadSeries } from '../content.js';
import { nextUnit, unitKey } from '../bank.js';
import { loadContext } from '../learning.js';
import { planToday, TYPE_LABEL, TYPE_ICON, lessonHref } from '../progress.js';
import { expandLesson } from '../lesson/engine.js';
import { settleRewards, totalExp } from '../rewards.js';
import { levelInfo, dailyChallenge } from '../gamify.js';
import { celebrate } from '../ui/celebrate.js';
import { todayKey } from '../settings.js';
import { favoriteCount } from '../favorites.js';
import { latestEstimate } from '../score.js';
import { LEVEL_KEY, progressSummary } from '../level-test.js';

// 多益程度測驗入口：有紀錄就顯示上次分數和進步
export function levelCardHTML(sum) {
  const d = sum?.sincePrev;
  return `<a class="level-cta" href="#/exam?id=level" data-testid="level-cta">
    <span class="level-cta__icon" aria-hidden="true">📈</span>
    <span class="level-cta__text"><strong>多益程度測驗</strong>
      <small>${sum ? `上次預估 ${sum.last.estimate.total} 分${d ? `（${d > 0 ? '▲' : '▼'} ${Math.abs(d)}）` : ''}・再測一次看進步` : '25 分鐘測出目前程度，之後重測看有沒有進步'}</small></span>
    <span class="level-cta__go" aria-hidden="true">›</span>
  </a>`;
}

export async function render({ outlet, db, settings, refreshIndicator }) {
  const s = settings.get();
  const ctx = await loadContext(db);
  const settled = await settleRewards(db, ctx, settings.getTodayMode().mode);
  const lv = levelInfo(await totalExp(db));
  // 每日挑戰：圖字配對需要 4 個有插圖的單字，不夠就不顯示（不放玩不了的挑戰）
  const pictured = ctx.learnedWords.filter((w) => w.image).length;
  const rawChallenge = ctx.learnedWords.length >= 4 ? dailyChallenge(todayKey(), settled.stats.sessions) : null;
  const challenge = rawChallenge && !(rawChallenge.game === 'match' && pictured < 4) ? rawChallenge : null;
  const status = await getStorageStatus({ db });
  const desc = describeStatus(status, s.persistRequest);
  const est = latestEstimate([...ctx.progressById.values()]);
  const levelSum = progressSummary(ctx.progressById.get(LEVEL_KEY)?.history);
  const worlds = worldStatus(ctx);
  const openCount = worlds.filter((w) => w.state === 'open').length;
  const worldTotal = worlds.filter((w) => w.state !== 'nocontent').length;
  const doneCount = ctx.lessons.filter((l) => ctx.access.get(l.id)?.completed).length;
  const mistakeCount = ctx.mistakes ? ctx.mistakes.filter((m) => m.due).length : 0; // 今天到期要複習的錯題

  const name = s.nickname ? escapeHTML(s.nickname) : '冒險者';
  // 今天要背的單字：依序從多益高頻開始，背完一個系列再換下一個
  const bank = await loadSeries(db);
  const nu = (bank?.series || []).map((x) => nextUnit(x, ctx.records)).find(Boolean);
  const todayUnit = nu ? { id: nu.id, icon: nu.series.icon, title: `${nu.series.name}・第 ${nu.index + 1} 單元` } : null;

  const RING_C = 2 * Math.PI * 36;
  const greet = (() => { const h = new Date().getHours(); return h < 11 ? '早安' : h < 18 ? '午安' : '晚安'; })();
  outlet.innerHTML = `
    <section class="card hero">
      <div class="hero__top">
        <div>
          <p class="eyebrow">${greet} · Welcome back</p>
          <h1 class="hero__title">嗨，${name}</h1>
          ${s.nickname ? '' : '<p><a class="link" href="#/settings?section=profile" data-testid="set-nickname-link">設定你的暱稱 →</a></p>'}
        </div>
        <div class="level-ring" aria-hidden="true">
          <svg viewBox="0 0 84 84"><defs><linearGradient id="ring-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F7DFA6"/><stop offset="1" stop-color="#C8963F"/></linearGradient></defs>
            <circle class="ring-track" cx="42" cy="42" r="36"/>
            <circle class="ring-fill" cx="42" cy="42" r="36" stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${RING_C.toFixed(1)}" data-offset="${(RING_C * (1 - lv.progress)).toFixed(1)}"/></svg>
          <span class="level-ring__num"><small>LEVEL</small><b>${lv.level}</b></span>
        </div>
      </div>
      <div class="level" data-testid="level-box">
        <p class="level__row"><span class="level__badge" data-testid="level">Lv ${lv.level}</span><span class="level__title">${lv.title}</span>
          <span class="level__exp en" data-testid="exp">${lv.exp} EXP</span></p>
        <div class="level__bar" role="progressbar" aria-valuemin="0" aria-valuemax="${lv.need}" aria-valuenow="${lv.into}" aria-label="升級進度"><span style="width:${Math.round(lv.progress * 100)}%"></span></div>
        <p class="hint">再 ${lv.nextAt - lv.exp} EXP 升到 Lv ${lv.level + 1}・經驗值只會增加，休息不會扣分</p>
      </div>
      <dl class="stats">
        <div class="stat"><dt>學過的單字</dt><dd data-testid="review-count">${ctx.learnedCount}</dd></div>
        <div class="stat"><dt>完成課程</dt><dd data-testid="done-count">${doneCount}</dd></div>
        <div class="stat"><dt>今天的錯題</dt><dd><a class="stat-link" href="#/mistakes" data-testid="mistake-count">${mistakeCount}</a></dd></div>
      </dl>
    </section>

    ${ctx.diagnosis ? '' : `
    <section class="card start-card" data-testid="diagnosis-cta">
      <h2 class="card__title">🧭 第一步：程度診斷</h2>
      <p>13 題、約 5 分鐘，幫你找到最適合的起點。完成後就會開放課程。</p>
      <a class="btn btn--primary btn--hero" href="#/diagnosis">開始程度診斷</a>
    </section>`}

    <section class="card" aria-labelledby="mode-title">
      <div class="today-head"><h2 id="mode-title" class="card__title">今天想怎麼學？</h2><span class="muted small">不用每天打卡</span></div>
      <div class="mode-grid" role="group" aria-label="今日學習模式" data-testid="mode-grid"></div>
      <p class="mode-note" data-testid="mode-note"></p>
      ${ctx.diagnosis ? `
      <a class="btn btn--primary btn--block btn--hero plan-start" href="#/home" data-role="plan-start" hidden>▶ 開始今天的學習</a>
      <h3 id="plan-title" class="section-title">今日安排</h3>
      <ul class="plan-list" data-testid="plan-list"></ul>
      <p class="hint" data-testid="plan-note"></p>` : ''}
    </section>

    ${ctx.diagnosis ? `
    <section class="card" aria-labelledby="task-title" data-testid="daily-card">
      <h2 id="task-title" class="card__title">今日任務 <span class="muted small">依今天的模式調整</span></h2>
      <ul class="task-list" data-testid="task-list"></ul>
      ${challenge ? `<div class="challenge ${challenge.done ? 'is-done' : ''}" data-testid="challenge">
        <p class="challenge__title">${challenge.done ? '🏆' : '🎯'} 每日挑戰 <span class="muted small">+30 EXP</span></p>
        <p>${challenge.label}</p>
        ${challenge.done ? '<p class="status-line status-line--good">今天的挑戰完成了！</p>' : `<a class="btn btn--primary btn--sm" href="#/game?id=${challenge.game}">去挑戰</a>`}
      </div>` : ''}
    </section>` : ''}

    ${levelCardHTML(levelSum)}

    <nav class="tile-grid" aria-label="快速入口">
      <a class="tile-link" href="#/worlds"><span class="tile-link__icon ti-1" aria-hidden="true">🗺️</span><strong>學習世界</strong><small>已開放 <b data-testid="open-worlds">${openCount}</b> / ${worldTotal} 個世界</small></a>
      <a class="tile-link" href="#/achievements" data-testid="link-achievements"><span class="tile-link__icon ti-2" aria-hidden="true">🏅</span><strong>成就</strong><small data-testid="ach-count">${(await db.count('achievements'))} 個</small></a>
      <a class="tile-link" href="#/stats" data-testid="link-stats"><span class="tile-link__icon ti-3" aria-hidden="true">📊</span><strong>學習分析</strong><small>${est ? `預估 <b>${est.lastEstimate.total}</b> 分・看弱點` : '弱點分析・預估分數'}</small></a>
      <a class="tile-link" href="#/listening" data-testid="link-listening"><span class="tile-link__icon ti-5" aria-hidden="true">🎧</span><strong>聽力訓練</strong><small>聽寫・跟讀・0.8x</small></a>
      <a class="tile-link" href="${favoriteCount() ? '#/review?mode=fav' : '#/words'}" data-testid="link-fav"><span class="tile-link__icon ti-6" aria-hidden="true">⭐</span><strong>我的生字本</strong><small>${favoriteCount() ? `${favoriteCount()} 個字・去練習` : '在單字卡按 ☆ 收藏'}</small></a>
      <a class="tile-link" href="#/settings?section=data"><span class="tile-link__icon ti-4" aria-hidden="true">🔒</span><strong>資料保存</strong><small class="tone-${desc.tone}" data-testid="home-save-summary">${desc.summary}</small><small>${status.lastBackupAt ? '已有備份檔' : '尚未備份'}</small></a>
    </nav>
  `;

  // 等級圓環從 0 轉到目前進度
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const ring = outlet.querySelector('.ring-fill');
    if (ring) ring.style.strokeDashoffset = ring.dataset.offset;
  }));

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
    const plan = planToday({ mode, minutes, lessons: ctx.lessons, access: ctx.access, dueCount: ctx.dueCount, mistakeCount, unit: todayUnit });
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
      if (it.type === 'unit') {
        const saved = ctx.progressById.get(unitKey(it.unit.id));
        return `<li class="plan-item"><span class="plan-item__icon" aria-hidden="true">${it.unit.icon}</span>
          <span class="plan-item__body"><strong>${escapeHTML(it.unit.title)}</strong><span class="muted">背單字・約 ${it.minutes} 分鐘${it.partial ? '・可以只做一部分' : ''}</span></span>
          <a class="btn btn--primary btn--sm" href="#/unit?id=${it.unit.id}${saved?.status === 'in_progress' ? '&play=1' : ''}" data-testid="plan-unit">${saved?.status === 'in_progress' ? '繼續' : '開始'}</a></li>`;
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
    // 大按鈕直接開始第一項安排
    const startBtn = outlet.querySelector('[data-role="plan-start"]');
    const first = planList.querySelector('.plan-item a.btn');
    if (startBtn) {
      startBtn.hidden = !first;
      if (first) {
        startBtn.href = first.getAttribute('href');
        const label = planList.querySelector('.plan-item strong')?.textContent || '';
        startBtn.textContent = `▶ 開始：${label}`;
      }
    }
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
          <span class="mode-btn__meta">${st.modeMinutes[id]} 分鐘</span>
        </button>`;
    }).join('');
    const m = MODES[today.mode];
    note.textContent = today.chosen
      ? `今天：${m.label}模式，${st.modeMinutes[today.mode]} 分鐘（已保存）`
      : `今天還沒選擇，預設為${m.label}模式`;
    paintPlan(today.mode, st.modeMinutes[today.mode]);
  }
  paint();
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
  await paintTasks();
  if (settled.results.length) celebrate(settled.results);

  refreshIndicator?.();

  return () => grid.removeEventListener('click', onClick);
}
