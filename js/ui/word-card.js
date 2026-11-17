// 單字卡：英文、中文、詞性、音標、發音、圖片、例句、難度、複習狀態
import { escapeHTML } from './dom.js';
import { hasAudio, playAudio } from '../audio.js';
import { STATUS_LABEL } from '../words.js';
import { toast } from './toast.js';

export function wordCardHTML(word, record = null) {
  const status = record ? record.status : 'new';
  const stars = '★'.repeat(word.level) + '☆'.repeat(Math.max(0, 3 - word.level));
  return `
    <article class="word-card" data-word="${escapeHTML(word.id)}">
      <img class="word-card__img" src="${escapeHTML(word.image)}" alt="${escapeHTML(word.zh)}的插圖" width="150" height="150">
      <h2 class="word-card__en en">${escapeHTML(word.en)}</h2>
      <p class="word-card__ipa en" aria-label="音標">${escapeHTML(word.ipa)} <span class="muted">美式</span></p>
      <span class="audio-slot" data-audio-slot="${escapeHTML(word.audio)}"></span>
      <p class="word-card__zh"><span class="pos">${escapeHTML(word.pos)}</span> ${escapeHTML(word.zh)}</p>
      <p class="muted">${escapeHTML(word.posZh)}</p>
      <div class="word-card__example">
        <p class="en">${escapeHTML(word.example.en)}</p>
        ${word.exampleAudio ? `<span class="audio-slot" data-audio-slot="${escapeHTML(word.exampleAudio)}" data-audio-label="▶ 例句"></span>` : ''}
        <p class="muted">${escapeHTML(word.example.zh)}</p>
      </div>
      ${word.note ? `<p class="tip">💡 ${escapeHTML(word.note)}</p>` : ''}
      <p class="word-card__meta"><span title="學習難度">難度 ${stars}</span><span class="status status--${status}">${STATUS_LABEL[status]}</span></p>
    </article>`;
}

// 有音檔才放上播放按鈕；沒有音檔就什麼都不顯示
export function attachAudioButtons(root) {
  root.querySelectorAll('[data-audio-slot]').forEach(async (slot) => {
    const src = slot.dataset.audioSlot;
    const ok = await hasAudio(src);
    if (!slot.isConnected) return;
    if (!ok) { slot.remove(); return; }
    const label = slot.dataset.audioLabel || '🔊 播放發音';
    slot.innerHTML = `<button type="button" class="btn btn--ghost audio-btn${slot.dataset.audioLabel ? ' audio-btn--sm' : ''}" data-play="${src}">${label}</button>`;
  });
}
