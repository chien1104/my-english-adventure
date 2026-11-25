// 我的生字本：收藏想加強的單字（存在 IndexedDB 的 favorites，會跟著備份）
import { toast } from './ui/toast.js';

let ids = new Set();
let dbRef = null;
const listeners = new Set();

export async function loadFavorites(db) {
  dbRef = db;
  try {
    ids = new Set((await db.getAll('favorites')).map((r) => r.wordId));
  } catch {
    ids = new Set();
  }
  return ids;
}

export const isFavorite = (wordId) => ids.has(wordId);
export const favoriteIds = () => [...ids];
export const favoriteCount = () => ids.size;
export const onFavoritesChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export async function setFavorite(wordId, on, now = Date.now()) {
  if (!dbRef) return false;
  if (on) await dbRef.put('favorites', { wordId, addedAt: now });
  else await dbRef.delete('favorites', wordId);
  if (on) ids.add(wordId); else ids.delete(wordId);
  listeners.forEach((fn) => fn(wordId, on));
  return on;
}

export function favButtonHTML(wordId) {
  const on = isFavorite(wordId);
  const safe = String(wordId).replace(/"/g, '&quot;');
  return `<button type="button" class="fav-btn${on ? ' is-on' : ''}" data-fav="${safe}" aria-pressed="${on}">${on ? '★ 已在生字本' : '☆ 加入生字本'}</button>`;
}

function paint(btn, on) {
  btn.classList.toggle('is-on', on);
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? '★ 已在生字本' : '☆ 加入生字本';
}

// 全站綁一次：任何 [data-fav] 按鈕都能收藏／取消
export function installFavoriteHandler() {
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    const id = b.dataset.fav;
    const on = await setFavorite(id, !isFavorite(id));
    document.querySelectorAll('[data-fav]').forEach((x) => { if (x.dataset.fav === id) paint(x, on); });
    if (on) b.classList.add('is-pop');
    setTimeout(() => b.classList.remove('is-pop'), 400);
    toast(on ? '⭐ 已加入生字本' : '已從生字本移除', { type: on ? 'success' : undefined, duration: 1500 });
  });
}
