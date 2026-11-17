// 確認對話框：危險或不可逆操作一律先確認
import { escapeHTML } from './dom.js';

export function confirmDialog({ title, message, confirmText = '確定', cancelText = '取消', danger = false }) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">${escapeHTML(title)}</h2>
        <p>${escapeHTML(message)}</p>
        <div class="modal__actions">
          <button type="button" class="btn btn--ghost" data-act="cancel">${escapeHTML(cancelText)}</button>
          <button type="button" class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-act="ok">${escapeHTML(confirmText)}</button>
        </div>
      </div>`;

    function close(result) {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      resolve(result);
    }
    function onKey(e) { if (e.key === 'Escape') close(false); }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'ok') close(true);
      if (act === 'cancel') close(false);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    overlay.querySelector('[data-act="cancel"]').focus();
  });
}
