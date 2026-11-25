// 課程播放器：把引擎狀態畫成畫面。每一步都會呼叫 onSave，所以隨時離開都不會遺失進度。
import * as E from './engine.js';
import { escapeHTML } from '../ui/dom.js';
import { renderQuestion, lockQuestion, feedbackHTML, optionNotesHTML } from '../ui/question-view.js';
import { wordCardHTML, attachAudioButtons } from '../ui/word-card.js';
import { playButtonHTML } from '../audio.js';
import { burst, glow, banner, haptic } from '../ui/fx.js';

function highlight(en, word) {
  const safe = escapeHTML(en);
  if (!word) return safe;
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  return safe.replace(re, (m) => `<mark>${m}</mark>`);
}

function stepHTML(step, ctx) {
  const t = `<h2 class="step__title">${escapeHTML(step.title)}</h2>`;
  switch (step.kind) {
    case 'concept':
      return t + step.body.map((p) => `<p>${escapeHTML(p)}</p>`).join('');
    case 'explain':
      return t + (step.body || []).map((p) => `<p>${escapeHTML(p)}</p>`).join('') + (step.table ? `
        <div class="table-wrap"><table class="rule-table">
          <thead><tr>${step.table.head.map((h) => `<th>${escapeHTML(h)}</th>`).join('')}</tr></thead>
          <tbody>${step.table.rows.map((r) => `<tr>${r.map((c, i) => `<td${i > 0 ? ' class="en"' : ''}>${escapeHTML(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>` : '') + (step.tip ? `<p class="tip">💡 ${escapeHTML(step.tip)}</p>` : '');
    case 'examples':
      return t + `<ul class="examples">${step.items.map((x) => `
        <li><p class="en ex__en">${highlight(x.en, x.highlight)}${x.audio ? ' ' + playButtonHTML(x.audio, '▶', 'play-btn--mini') : ''}</p><p class="muted">${escapeHTML(x.zh)}</p></li>`).join('')}</ul>`;
    case 'dialogue':
      return t + (step.scene ? `<p class="muted">${escapeHTML(step.scene)}</p>` : '') +
        (step.audio ? `<div class="q__audio">${playButtonHTML(step.audio, '▶ 播放整段對話', 'play-btn--big')}</div>` : '') +
        `<ul class="dialogue">${step.lines.map((l) => `
          <li class="line line--${l.side || 'left'}">
            <span class="line__who">${escapeHTML(l.speaker)}</span>
            <div class="line__bubble"><p class="en">${escapeHTML(l.en)}${l.audio ? ' ' + playButtonHTML(l.audio, '▶', 'play-btn--mini') : ''}</p><p class="muted">${escapeHTML(l.zh)}</p></div>
          </li>`).join('')}</ul>`;
    case 'passage':
      return t + (step.audio ? `<div class="q__audio">${playButtonHTML(step.audio, '▶ 播放朗讀', 'play-btn--big')}</div>` : '') +
        `<div class="passage passage--read"><p class="en">${escapeHTML(step.en).replace(/\n/g, '<br>')}</p></div>
        <details class="zh-toggle"><summary>顯示中文翻譯</summary><p>${escapeHTML(step.zh).replace(/\n/g, '<br>')}</p></details>
        ${(step.notes || []).length ? `<ul class="vocab-notes">${step.notes.map((n) => `<li><span class="en">${escapeHTML(n.en)}</span> ${escapeHTML(n.zh)}</li>`).join('')}</ul>` : ''}`;
    case 'breakdown':
      return t + step.items.map((x) => `
        <div class="breakdown">
          <div class="breakdown__parts">${x.parts.map((p) => `<span class="part"><span class="part__text en">${escapeHTML(p.text)}</span><span class="part__label">${escapeHTML(p.label)}</span></span>`).join('')}</div>
          <p class="muted">${escapeHTML(x.zh)}</p>
        </div>`).join('');
    case 'contrast':
      return t + `<ul class="contrast">${step.items.map((x) => `
        <li>
          <p class="contrast__wrong en"><span aria-label="錯誤">✗</span> <s>${escapeHTML(x.wrong)}</s></p>
          <p class="contrast__right en"><span aria-label="正確">✓</span> ${escapeHTML(x.right)}</p>
          <p class="muted">${escapeHTML(x.why)}</p>
        </li>`).join('')}</ul>`;
    case 'word': {
      const w = ctx.wordsMap.get(step.wordId);
      return `<p class="step__eyebrow">${escapeHTML(step.title)}</p>` + (w ? wordCardHTML(w, ctx.records?.get(w.id)) : '<p>找不到這個單字的資料。</p>');
    }
    case 'review': {
      const items = E.reviewItems(ctx.lesson, ctx.state);
      if (!items.length) return t + '<p class="muted">這一段沒有作答紀錄。</p>';
      const right = items.filter((i) => i.correct).length;
      return t + `<p class="muted">共 ${items.length} 次作答，答對 ${right} 次。答錯的題目看一下解析：</p>
        <ul class="review-list">${items.map((i) => `
          <li class="${i.correct ? 'is-good' : 'is-bad'}">
            <p class="review-list__q">${i.correct ? '✅' : '❌'} ${i.retry ? '<span class="badge badge--lock">補練</span> ' : ''}${i.question.image && ctx.wordsMap.get(i.question.image) ? `<img class="review-list__img" src="${escapeHTML(ctx.wordsMap.get(i.question.image).image)}" alt="" width="36" height="36">` : ''}${escapeHTML(i.question.sentence || i.question.prompt)}</p>
            ${i.question.zh ? `<p class="muted">${escapeHTML(i.question.zh)}</p>` : ''}
            ${i.correct ? '' : `<p>你的答案：<span class="en">${escapeHTML(i.yourText)}</span></p><p>正確答案：<strong class="en">${escapeHTML(i.correctText)}</strong></p>`}
            ${i.question.audio ? playButtonHTML(i.question.audio, '▶ 重聽', 'play-btn--mini') : ''}
            ${i.correct ? '' : `<p class="feedback__exp pre">${escapeHTML(i.question.explanation)}</p>${optionNotesHTML(i.question)}`}
          </li>`).join('')}</ul>`;
    }
    case 'practice':
      return t + (step.intro ? `<p class="muted">${escapeHTML(step.intro)}</p>` : '') + '<p class="q__count" data-role="qcount"></p><div data-role="question"></div>';
    default:
      return t;
  }
}

export function mountPlayer({ outlet, lesson, state: initial, wordsMap, records, exitLabel = '⏸ 暫停並離開', hooks }) {
  let state = initial;
  let busy = false;
  let autoTimer = null;
  const AUTO_NEXT_MS = 1100; // 答對後自動前往下一題的時間

  let combo = 0; // 連續第一次就答對的題數
  outlet.innerHTML = `
    <div class="player" data-testid="player">
      <div class="player__head">
        <button type="button" class="player__close" data-act="exit" aria-label="${escapeHTML(exitLabel.replace(/^⏸\s*/, ''))}" title="${escapeHTML(exitLabel.replace(/^⏸\s*/, ''))}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
        <div class="player__meter">
          <div class="progressbar" aria-hidden="true"><span data-role="bar"></span></div>
          <div class="player__meta">
            <span class="player__title">${escapeHTML(lesson.title)}</span>
            <span class="combo" data-role="combo" hidden></span>
            <span class="player__step" data-role="step"></span>
          </div>
        </div>
      </div>
      <section class="card player__body" data-role="body" aria-live="polite"></section>
      <div class="player__foot">
        <button type="button" class="btn btn--ghost" data-act="back">上一步</button>
        <button type="button" class="btn btn--primary" data-act="next">下一步</button>
      </div>
      <div data-role="feedback"></div>
    </div>`;
  const comboEl = outlet.querySelector('[data-role="combo"]');
  function paintCombo(bump) {
    comboEl.hidden = combo < 2;
    comboEl.textContent = `🔥 連對 ${combo}`;
    if (bump && combo >= 2) { comboEl.classList.remove('is-bump'); void comboEl.offsetWidth; comboEl.classList.add('is-bump'); }
  }

  const body = outlet.querySelector('[data-role="body"]');
  const stepEl = outlet.querySelector('[data-role="step"]');
  const bar = outlet.querySelector('[data-role="bar"]');
  const backBtn = outlet.querySelector('[data-act="back"]');
  const nextBtn = outlet.querySelector('[data-act="next"]');

  async function save() { await hooks.onSave?.(state); }

  // 限時作答（Part 7）：每題建議秒數倒數，超時不會被打斷，只提醒速度
  let paceTimer = null;
  let paceStart = 0;
  const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  function stopPace() {
    if (!paceTimer) return null;
    clearInterval(paceTimer);
    paceTimer = null;
    return Math.max(1, Math.round((performance.now() - paceStart) / 1000));
  }
  function startPace() {
    stopPace();
    const el = body.querySelector('[data-role="pace"]');
    if (!lesson.pace || !el) return;
    paceStart = performance.now();
    const tick = () => {
      if (!el.isConnected) { stopPace(); return; }
      const left = lesson.pace - (performance.now() - paceStart) / 1000;
      el.textContent = left >= 0 ? `⏱ ${mmss(Math.ceil(left))}` : `⏱ 超時 ${mmss(-left)}`;
      el.classList.toggle('is-low', left >= 0 && left < 15);
      el.classList.toggle('is-over', left < 0);
    };
    tick();
    paceTimer = setInterval(tick, 250);
  }

  function paint() {
    const step = E.currentStep(lesson, state);
    stepEl.textContent = E.stepLabel(lesson, state);
    bar.style.width = `${Math.round(((state.stepIndex + 1) / lesson.steps.length) * 100)}%`;
    stopPace();
    const sheet = outlet.querySelector('[data-role="feedback"]');
    sheet.innerHTML = '';
    sheet.classList.remove('feedback-sheet');
    body.innerHTML = stepHTML(step, { lesson, state, wordsMap, records });
    body.dataset.kind = step.kind;
    body.classList.remove('is-swap'); void body.offsetWidth; body.classList.add('is-swap');
    backBtn.hidden = !E.canGoBack(lesson, state);
    const isLast = state.stepIndex === lesson.steps.length - 1;

    if (step.kind === 'word') attachAudioButtons(body);

    if (step.kind === 'practice') {
      const prog = E.practiceProgress(lesson, state);
      body.querySelector('[data-role="qcount"]').innerHTML = `第 ${prog.current} / ${prog.total} 題${lesson.pace ? ' <span class="pace" data-role="pace" aria-live="off"></span>' : ''}`;
      const q = E.currentQuestion(lesson, state);
      const qBox = body.querySelector('[data-role="question"]');
      nextBtn.hidden = true;
      renderQuestion(qBox, q, { wordsMap, onAnswer: onAnswer.bind(null, q, qBox) });
      const pending = E.pendingResult(lesson, state);
      if (pending) {
        lockQuestion(qBox, q, pending.answer, pending.correct);
        showFeedback(pending);
      } else startPace();
    } else {
      nextBtn.hidden = false;
      nextBtn.textContent = isLast ? (lesson.type === 'review' ? '完成複習' : '完成課程') : '下一步';
    }
    body.scrollIntoView?.({ block: 'nearest' });
  }

  async function onAnswer(q, qBox, answer) {
    if (busy) return;
    busy = true;
    const used = stopPace();
    const { state: next, result } = E.submitAnswer(lesson, state, answer);
    state = next;
    lockQuestion(qBox, q, answer, result.correct);
    celebrateAnswer(qBox, result);
    await hooks.onAnswer?.(q, result.correct, answer);
    await save();
    busy = false;
    showFeedback(result, { auto: result.correct, used });
  }

  // 答題特效：答對有粒子和邊緣發光，連對有計數與橫幅；答錯只震一下，不打擊信心
  function celebrateAnswer(qBox, result) {
    const firstTry = !result.isRetry && !result.retry;
    if (result.correct) {
      combo = firstTry ? combo + 1 : combo;
      const target = qBox.querySelector('.opt.is-correct') || qBox.querySelector('.q__type, .order__built') || qBox;
      burst(target);
      glow(combo >= 5 ? 'gold' : 'good');
      haptic(10);
      if (combo === 3) banner('🔥 連對 3 題', '手感來了！');
      else if (combo === 5) banner('⚡ 連對 5 題', '超強狀態');
      else if (combo > 5 && combo % 5 === 0) banner(`🌟 連對 ${combo} 題`, '無人能擋');
    } else {
      combo = 0;
      haptic([8, 40, 8]);
    }
    paintCombo(result.correct);
  }

  // 解析固定浮在畫面底部，不用往下滑；答對會自動前往下一題，答錯等使用者看完解析按「繼續」
  function showFeedback(result, { auto = false, used = null } = {}) {
    // 放在卡片外面：卡片有動畫，放在裡面會讓 fixed 定位跟著卡片跑
    const fb = outlet.querySelector('[data-role="feedback"]');
    fb.classList.add('feedback-sheet');
    const paceNote = used && lesson.pace
      ? `<p class="pace-note${used > lesson.pace ? ' is-over' : ''}">⏱ 這題用了 ${used} 秒${used > lesson.pace ? `，超過建議的 ${lesson.pace} 秒，下一題試著先看題目再找答案` : `，在建議的 ${lesson.pace} 秒內 👍`}</p>`
      : '';
    fb.innerHTML = paceNote + feedbackHTML(result) +
      (auto ? `<div class="auto-next" aria-hidden="true"><span style="animation-duration:${AUTO_NEXT_MS}ms"></span></div>` : '') +
      '<button type="button" class="btn btn--primary btn--block" data-act="continue">繼續</button>';
    backBtn.hidden = true;
    const cont = fb.querySelector('[data-act="continue"]');
    cont.addEventListener('click', goNext);
    cont.focus({ preventScroll: true });
    clearTimeout(autoTimer);
    if (auto) autoTimer = setTimeout(() => { if (fb.isConnected && fb.classList.contains('feedback-sheet')) goNext(); }, AUTO_NEXT_MS);
  }

  async function goNext() {
    clearTimeout(autoTimer);
    if (busy) return;
    busy = true;
    try {
      state = E.advance(lesson, state);
      await save();
      if (state.status === 'completed') {
        await hooks.onComplete?.(state, E.lessonStats(lesson, state));
        return;
      }
      paint();
      window.scrollTo?.(0, 0);
    } finally {
      busy = false;
    }
  }

  nextBtn.addEventListener('click', goNext);
  backBtn.addEventListener('click', async () => {
    state = E.goBack(lesson, state);
    await save();
    paint();
  });
  outlet.querySelector('[data-act="exit"]').addEventListener('click', async () => {
    clearTimeout(autoTimer);
    await save();
    hooks.onExit?.(state);
  });

  paint();
  return { getState: () => state };
}
