// 題目畫面：選擇題、拼字題、排序題（課程、複習、診斷共用）
import { escapeHTML } from './dom.js';
import { playButtonHTML } from '../audio.js';

function sentenceHTML(sentence) {
  return escapeHTML(sentence).replace('___', '<span class="blank" aria-label="空格">＿＿＿</span>');
}

export function renderQuestion(container, q, { wordsMap = new Map(), passage = null, allowSkip = false, onAnswer, selected = undefined } = {}) {
  const img = q.image ? wordsMap.get(q.image)?.image : null;
  const parts = [];
  parts.push(`<p class="q__prompt">${escapeHTML(q.prompt)}</p>`);
  if (passage) {
    parts.push(`<div class="passage"><span class="passage__label">${escapeHTML(passage.label)}</span><p class="en">${escapeHTML(passage.en).replace(/\n/g, '<br>')}</p></div>`);
  }
  if (q.audio) parts.push(`<div class="q__audio">${playButtonHTML(q.audio, q.audioLabel || '▶ 播放音檔', 'play-btn--big')}<span class="muted">${escapeHTML(q.audioHint || '可以重複播放')}</span></div>`);
  if (q.scene) parts.push(`<img class="q__scene" src="${escapeHTML(q.scene)}" alt="題目照片" width="320" height="200">`);
  if (img) parts.push(`<img class="q__img" src="${escapeHTML(img)}" alt="題目圖片" width="140" height="140">`);
  if (q.text) parts.push(`<div class="passage"><p class="en">${escapeHTML(q.text).replace(/\n/g, '<br>')}</p></div>`);
  if (q.sentence) parts.push(`<p class="q__sentence en">${sentenceHTML(q.sentence)}</p>`);
  if (q.zh) parts.push(`<p class="q__zh">${escapeHTML(q.zh)}</p>`);
  if (q.hint) parts.push(`<p class="q__hint">提示：<span class="en">${escapeHTML(q.hint)}</span></p>`);

  if (q.type === 'choice') {
    const enOptions = q.options.every((o) => /^[\x20-\x7E’]+$/.test(o));
    parts.push(`<div class="q__options" role="group" aria-label="選項">${q.options.map((o, i) => `
      <button type="button" class="opt${enOptions ? ' en' : ''}${selected === o ? ' is-selected' : ''}" data-opt="${i}">${escapeHTML(o)}</button>`).join('')}</div>`);
  } else if (q.type === 'type') {
    parts.push(`<form class="q__type" novalidate>
      <input class="input en" name="answer" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="輸入英文" aria-label="輸入答案">
      <button class="btn btn--primary" type="submit">確認</button>
    </form>`);
  } else if (q.type === 'order') {
    parts.push(`<div class="order">
      <div class="order__built" aria-live="polite" data-role="built"><span class="order__placeholder">依序點下面的字卡</span></div>
      <div class="order__bank" data-role="bank">${q.tokens.map((t, i) => `<button type="button" class="chip en" data-tok="${i}">${escapeHTML(t)}</button>`).join('')}</div>
      <div class="btn-row">
        <button type="button" class="btn btn--ghost" data-act="order-reset">重排</button>
        <button type="button" class="btn btn--primary" data-act="order-submit" disabled>確認</button>
      </div>
    </div>`);
  }
  if (allowSkip) parts.push('<button type="button" class="btn btn--ghost btn--block" data-act="skip">不知道，跳過</button>');

  container.innerHTML = `<div class="q" data-qid="${escapeHTML(q.id)}">${parts.join('')}</div>`;
  let locked = false;
  const send = (answer) => { if (locked) return; locked = true; onAnswer(answer); };

  if (q.type === 'choice') {
    container.querySelector('.q__options').addEventListener('click', (e) => {
      const b = e.target.closest('[data-opt]');
      if (b) send(q.options[Number(b.dataset.opt)]);
    });
  }
  if (q.type === 'type') {
    const form = container.querySelector('.q__type');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = form.answer.value.trim();
      if (!v) { form.answer.focus(); return; }
      send(v);
    });
  }
  if (q.type === 'order') {
    const built = [];
    const builtEl = container.querySelector('[data-role="built"]');
    const bank = container.querySelector('[data-role="bank"]');
    const submit = container.querySelector('[data-act="order-submit"]');
    const paint = () => {
      builtEl.innerHTML = built.length
        ? built.map((i) => `<span class="chip chip--placed en">${escapeHTML(q.tokens[i])}</span>`).join(' ') + `<span class="en">${escapeHTML(q.punct || '')}</span>`
        : '<span class="order__placeholder">依序點下面的字卡</span>';
      bank.querySelectorAll('[data-tok]').forEach((b) => { b.disabled = built.includes(Number(b.dataset.tok)); });
      submit.disabled = built.length !== q.tokens.length;
    };
    bank.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tok]');
      if (!b || locked) return;
      built.push(Number(b.dataset.tok));
      paint();
    });
    container.querySelector('[data-act="order-reset"]').addEventListener('click', () => { if (!locked) { built.length = 0; paint(); } });
    submit.addEventListener('click', () => send(built.map((i) => q.tokens[i])));
  }
  container.querySelector('[data-act="skip"]')?.addEventListener('click', () => send(null));
}

// 作答後鎖住畫面並標出對錯
export function lockQuestion(container, q, answer, correct) {
  container.querySelectorAll('button, input').forEach((el) => { if (!el.closest('.feedback')) el.disabled = true; });
  if (q.type === 'choice') {
    container.querySelectorAll('[data-opt]').forEach((b) => {
      const opt = q.options[Number(b.dataset.opt)];
      if (opt === q.answer) b.classList.add('is-correct');
      else if (opt === answer) b.classList.add('is-wrong');
    });
  }
  if (q.type === 'type') {
    container.querySelector('.q__type input')?.classList.add(correct ? 'is-correct' : 'is-wrong');
  }
}

export function feedbackHTML(result, { followUpText = true } = {}) {
  const { correct, question: q, followUp, correctText, yourText } = result;
  const extra = !correct && followUpText && followUp
    ? `<p class="feedback__next">${followUp === 'similar' ? '🔁 等一下會再出一題類似的，幫你再練一次。' : '🔁 等一下會再練一次這題。'}</p>`
    : '';
  return `
    <div class="feedback ${correct ? 'feedback--good' : 'feedback--bad'}" role="status">
      <p class="feedback__title">${correct ? '✅ 答對了！' : '❌ 再想想看'}</p>
      ${correct ? '' : `<p>你的答案：<span class="en">${escapeHTML(yourText)}</span></p><p>正確答案：<strong class="en">${escapeHTML(correctText)}</strong></p>`}
      <p class="feedback__exp pre">${escapeHTML(q.explanation || '')}</p>
      ${extra}
    </div>`;
}
