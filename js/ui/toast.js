// 提示訊息
export function toast(message, { type = 'info', duration = 2600 } = {}) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.textContent = message;
  // 畫面上最多同時 2 則，太多就先收掉舊的
  while (root.children.length >= 2) root.firstElementChild.remove();
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => el.remove(), 300);
  }, duration);
}
