// 共用的完成畫面：星星、正確率跑分、獎勵標籤、彩帶
import { escapeHTML } from './dom.js';
import { countUp, confetti, banner, reducedMotion } from './fx.js';

const STAR = `<svg class="star" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="star-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F7DFA6"/><stop offset=".55" stop-color="#E2B865"/><stop offset="1" stop-color="#B9822F"/></linearGradient></defs><path fill="url(#star-g)" stroke="#A8732A" stroke-width="2" stroke-linejoin="round" d="M32 5l8.3 17 18.7 2.7-13.5 13.2 3.2 18.6L32 47.7 15.3 56.5l3.2-18.6L5 24.7 23.7 22z"/></svg>`;

// 一次完成至少一顆星；70% 兩顆、90% 三顆
export function starsFor(accuracy) {
  return accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
}

export function praise(accuracy) {
  if (accuracy === 100) return '完美！一題都沒錯';
  if (accuracy >= 90) return '太厲害了，幾乎全對';
  if (accuracy >= 70) return '很棒，穩穩進步中';
  if (accuracy >= 50) return '完成了！錯的地方已經幫你記下來';
  return '辛苦了！每一次練習都在累積';
}

// chips：[{ text, gold }]；actions：按鈕列的 HTML
export function completeHTML({ testid = 'lesson-complete', icon = '🎉', title, accuracy, firstCorrect, total, lines = [], chips = [], actions = '' }) {
  const n = starsFor(accuracy);
  return `
    <section class="card complete" data-testid="${testid}" data-stars="${n}">
      <div class="stars" role="img" aria-label="${n} 顆星">${[1, 2, 3].map((i) => STAR.replace('class="star"', `class="star" data-star="${i}"`)).join('')}</div>
      <p class="complete__badge" aria-hidden="true">${icon}</p>
      <h1 class="card__title">${escapeHTML(title)}</h1>
      <p class="complete__line">${escapeHTML(praise(accuracy))}</p>
      <p class="complete__score en"><span data-role="score">${accuracy}</span><small>%</small></p>
      <p class="complete__line">第一次作答正確率 <strong data-testid="accuracy">${accuracy}%</strong>（${firstCorrect} / ${total} 題）</p>
      ${chips.length ? `<div class="reward-chips">${chips.map((c, i) => `<span class="reward-chip${c.gold ? ' reward-chip--gold' : ''}" style="animation-delay:${0.6 + i * 0.12}s">${escapeHTML(c.text)}</span>`).join('')}</div>` : ''}
      ${lines.map((l) => `<p class="muted">${escapeHTML(l)}</p>`).join('')}
      <div class="btn-row" data-role="actions">${actions}</div>
    </section>`;
}

// 畫面出現後播放：星星一顆一顆亮、分數跑動、彩帶
export function playComplete(root, accuracy) {
  const card = root.querySelector('.complete');
  if (!card) return;
  const n = Number(card.dataset.stars) || 1;
  const stars = [...card.querySelectorAll('.star')];
  if (reducedMotion()) {
    stars.slice(0, n).forEach((s) => s.classList.add('is-on'));
    return;
  }
  stars.slice(0, n).forEach((s, i) => setTimeout(() => s.classList.add('is-on'), 250 + i * 260));
  countUp(card.querySelector('[data-role="score"]'), accuracy, { duration: 1000 });
  if (accuracy >= 70) setTimeout(() => confetti({ count: accuracy === 100 ? 160 : 110 }), 350);
  if (accuracy === 100) setTimeout(() => banner('🌟 PERFECT', '全部答對'), 900);
}
