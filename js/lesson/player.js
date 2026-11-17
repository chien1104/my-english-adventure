// 課程播放器：把引擎狀態畫成畫面。每一步都會呼叫 onSave，所以隨時離開都不會遺失進度。
import * as E from './engine.js';
import { escapeHTML } from '../ui/dom.js';
import { renderQuestion, lockQuestion, feedbackHTML } from '../ui/question-view.js';
import { wordCardHTML, attachAudioButtons } from '../ui/word-card.js';
import { playButtonHTML } from '../audio.js';

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
            ${i.correct ? '' : `<p class="feedback__exp pre">${escapeHTML(i.question.explanation)}</p>`}
          </li>`).join('')}</ul>`;
    }
    case 'practice':
      return t + (step.intro ? `<p class="muted">${escapeHTML(step.intro)}</p>` : '') + '<p class="q__count" data-role="qcount"></p><div data-role="question"></div><div data-role="feedback"></div>';
    default:
      return t;
  }
}

export function mountPlayer({ outlet, lesson, state: initial, wordsMap, records, exitLabel = '⏸ 暫停並離開', hooks }) {
  let state = initial;
  let busy = false;

  outlet.innerHTML = `
    <div class="player" data-testid="player">
      <div class="player__head">
        <button type="button" class="btn btn--ghost btn--sm" data-act="exit">${exitLabel}</button>
        <span class="player__step" data-role="step"></span>
      </div>
      <div class="progressbar" aria-hidden="true"><span data-role="bar"></span></div>
      <p class="player__title">${escapeHTML(lesson.title)}</p>
      <section class="card player__body" data-role="body" aria-live="polite"></section>
      <div class="player__foot">
        <button type="button" class="btn btn--ghost" data-act="back">上一步</button>
        <button type="button" class="btn btn--primary" data-act="next">下一步</button>
      </div>
    </div>`;

  const body = outlet.querySelector('[data-role="body"]');
  const stepEl = outlet.querySelector('[data-role="step"]');
  const bar = outlet.querySelector('[data-role="bar"]');
  const backBtn = outlet.querySelector('[data-act="back"]');
  const nextBtn = outlet.querySelector('[data-act="next"]');

  async function save() { await hooks.onSave?.(state); }

  function paint() {
    const step = E.currentStep(lesson, state);
    stepEl.textContent = E.stepLabel(lesson, state);
    bar.style.width = `${Math.round(((state.stepIndex + 1) / lesson.steps.length) * 100)}%`;
    body.innerHTML = stepHTML(step, { lesson, state, wordsMap, records });
    body.dataset.kind = step.kind;
    backBtn.hidden = !E.canGoBack(lesson, state);
    const isLast = state.stepIndex === lesson.steps.length - 1;

    if (step.kind === 'word') attachAudioButtons(body);

    if (step.kind === 'practice') {
      const prog = E.practiceProgress(lesson, state);
      body.querySelector('[data-role="qcount"]').textContent = `第 ${prog.current} / ${prog.total} 題`;
      const q = E.currentQuestion(lesson, state);
      const qBox = body.querySelector('[data-role="question"]');
      nextBtn.hidden = true;
      renderQuestion(qBox, q, { wordsMap, onAnswer: onAnswer.bind(null, q, qBox) });
      const pending = E.pendingResult(lesson, state);
      if (pending) {
        lockQuestion(qBox, q, pending.answer, pending.correct);
        showFeedback(pending);
      }
    } else {
      nextBtn.hidden = false;
      nextBtn.textContent = isLast ? (lesson.type === 'review' ? '完成複習' : '完成課程') : '下一步';
    }
    body.scrollIntoView?.({ block: 'nearest' });
  }

  async function onAnswer(q, qBox, answer) {
    if (busy) return;
    busy = true;
    const { state: next, result } = E.submitAnswer(lesson, state, answer);
    state = next;
    lockQuestion(qBox, q, answer, result.correct);
    await hooks.onAnswer?.(q, result.correct, answer);
    await save();
    busy = false;
    showFeedback(result);
  }

  function showFeedback(result) {
    const fb = body.querySelector('[data-role="feedback"]');
    fb.innerHTML = feedbackHTML(result) + '<button type="button" class="btn btn--primary btn--block" data-act="continue">繼續</button>';
    backBtn.hidden = true;
    const cont = fb.querySelector('[data-act="continue"]');
    cont.addEventListener('click', goNext);
    cont.focus({ preventScroll: true });
    fb.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }

  async function goNext() {
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
    await save();
    hooks.onExit?.(state);
  });

  paint();
  return { getState: () => state };
}
