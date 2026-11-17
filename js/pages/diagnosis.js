// 程度診斷：#/diagnosis
import { scoreDiagnosis, DIAGNOSIS_KEY } from '../diagnosis.js';
import { renderQuestion } from '../ui/question-view.js';
import { escapeHTML } from '../ui/dom.js';
import { loadContext } from '../learning.js';
import { worldStatus } from './worlds.js';
import { formatTime } from '../storage-status.js';
import { confirmDialog } from '../ui/confirm.js';
import { awardExp } from '../rewards.js';
import { EXP } from '../gamify.js';
import { afterActivity } from '../ui/celebrate.js';

export async function render({ outlet, db, refreshIndicator, settings }) {
  const content = await db.getMeta('diagnosisContent');
  if (!content) {
    outlet.innerHTML = '<section class="card"><h1 class="card__title">診斷題目尚未載入</h1><p>請連上網路後重新整理。</p></section>';
    return;
  }
  const previous = await db.get('progress', DIAGNOSIS_KEY);
  const questions = content.questions;
  const answers = {};
  let index = 0;

  function intro() {
    outlet.innerHTML = `
      <section class="card" data-testid="diagnosis-intro">
        <h1 class="page-title">英文程度診斷</h1>
        <p>共 ${questions.length} 題，約 ${content.minutes} 分鐘，包含單字、文法和閱讀。</p>
        <ul class="plain-list">
          <li>不會的題目請按「不知道」，不要用猜的，結果會更準。</li>
          <li>診斷不會扣分或影響任何紀錄，只是幫你找到起點。</li>
          <li>中途離開需要重新開始。</li>
        </ul>
        ${previous ? `<p class="muted">上次診斷：${formatTime(previous.completedAt)}，${previous.total} / ${previous.max} 分（${escapeHTML(previous.level.label)}）</p>` : ''}
        <div class="btn-row">
          <button type="button" class="btn btn--primary" data-act="start">${previous ? '重新診斷' : '開始診斷'}</button>
          ${previous ? '<button type="button" class="btn btn--ghost" data-act="show-last">查看上次結果</button>' : ''}
        </div>
      </section>`;
    outlet.querySelector('[data-act="start"]').addEventListener('click', async () => {
      if (previous) {
        const ok = await confirmDialog({
          title: '重新診斷？',
          message: '完成後會用新的結果取代上次的診斷結果。已開始或完成的課程、單字與作答紀錄都會保留。',
          confirmText: '開始重新診斷',
        });
        if (!ok) return;
      }
      index = 0;
      ask();
    });
    outlet.querySelector('[data-act="show-last"]')?.addEventListener('click', () => showResult(previous));
  }

  function ask() {
    const q = questions[index];
    const section = content.sections.find((s) => s.id === q.section);
    outlet.innerHTML = `
      <div class="player" data-testid="diagnosis-run">
        <div class="player__head">
          <span class="badge badge--lock">${escapeHTML(section.title)}</span>
          <span class="player__step">第 ${index + 1} / ${questions.length} 題</span>
        </div>
        <div class="progressbar" aria-hidden="true"><span style="width:${Math.round(((index) / questions.length) * 100)}%"></span></div>
        <section class="card player__body" data-role="q"></section>
        <div class="player__foot">
          <button type="button" class="btn btn--ghost" data-act="prev" ${index === 0 ? 'hidden' : ''}>上一題</button>
        </div>
      </div>`;
    renderQuestion(outlet.querySelector('[data-role="q"]'), q, {
      passage: q.passage ? content.passages[q.passage] : null,
      allowSkip: true,
      selected: answers[q.id],
      onAnswer: (a) => {
        answers[q.id] = a;
        index += 1;
        if (index < questions.length) ask(); else finish();
      },
    });
    outlet.querySelector('[data-act="prev"]').addEventListener('click', () => { index -= 1; ask(); });
    window.scrollTo?.(0, 0);
  }

  async function finish() {
    outlet.innerHTML = '<section class="card" data-testid="diagnosis-saving"><p class="boot">計算結果中…</p></section>';
    const result = scoreDiagnosis(content, answers);
    const now = Date.now();
    await db.put('progress', result);
    for (const d of result.details) {
      await db.put('attempts', { kind: 'diagnosis', itemId: d.id, group: d.section, correct: d.correct, answer: d.answer, createdAt: now });
    }
    refreshIndicator?.();
    const earned = await awardExp(db, 'diagnosis:first', EXP.diagnosis, '完成程度診斷');
    await showResult(result);
    afterActivity({ db, settings, earned: [earned] });
  }

  async function showResult(result) {
    const ctx = await loadContext(db);
    const opened = worldStatus(ctx).filter((w) => w.state === 'open');
    const wrong = result.details.filter((d) => !d.correct).map((d) => questions.find((q) => q.id === d.id)).filter(Boolean);
    outlet.innerHTML = `
      <section class="card" data-testid="diagnosis-result">
        <p class="eyebrow">Your starting point</p>
        <h1 class="page-title">${escapeHTML(result.level.label)}</h1>
        <p class="big-score"><strong data-testid="diag-score">${result.total}</strong> / ${result.max}</p>
        <p>${escapeHTML(result.level.message)}</p>
        <div class="section-bars">
          ${Object.entries(result.sections).map(([id, s]) => `
            <div class="section-bar">
              <span>${escapeHTML(s.title)}</span>
              <span class="section-bar__track"><span style="width:${s.max ? Math.round((s.score / s.max) * 100) : 0}%"></span></span>
              <span class="en">${s.score}/${s.max}</span>
            </div>`).join('')}
        </div>
        <p class="muted">已開放：${opened.map((w) => `${w.icon} ${w.name}`).join('、') || '無'}。單字或文法達標的世界，會直接開放全部課程。</p>
        <div class="btn-row">
          <a class="btn btn--primary" href="#/home">看今日安排</a>
          <a class="btn btn--ghost" href="#/worlds">世界地圖</a>
        </div>
      </section>
      ${wrong.length ? `
      <section class="card">
        <h2 class="card__title">答錯或不知道的題目</h2>
        <ul class="review-list">${wrong.map((q) => `
          <li class="is-bad">
            <p class="review-list__q">${escapeHTML(q.sentence || q.prompt)}</p>
            <p>正確答案：<strong>${escapeHTML(q.answer)}</strong></p>
            <p class="feedback__exp">${escapeHTML(q.explanation)}</p>
          </li>`).join('')}</ul>
      </section>` : ''}`;
  }

  intro();
}
