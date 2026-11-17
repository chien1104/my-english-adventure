// 發音音檔：只播放專案內 assets/audio 的檔案，不使用語音合成。
// 檔案不存在時如實顯示「音檔待加入」，不假裝可以播放。

const cache = new Map();

export async function hasAudio(src, fetchImpl = globalThis.fetch?.bind(globalThis)) {
  if (!src || !fetchImpl) return false;
  if (src.startsWith('data:')) return true; // 單檔版：音檔已內嵌
  if (cache.has(src)) return cache.get(src);
  let ok = false;
  try {
    const res = await fetchImpl(src, { method: 'HEAD', cache: 'no-cache' });
    const type = res.headers?.get?.('content-type') || '';
    ok = res.ok && !type.includes('text/html');
  } catch {
    ok = false;
  }
  cache.set(src, ok);
  return ok;
}

let current = null;
export function playAudio(src) {
  if (current) { current.pause(); current = null; }
  const a = new Audio(src);
  current = a;
  return a.play();
}

export function clearAudioCache() { cache.clear(); }

export function playButtonHTML(src, label = '▶ 播放', extra = '') {
  const safe = String(src).replace(/"/g, '&quot;');
  return `<button type="button" class="play-btn ${extra}" data-play="${safe}" aria-label="${label.replace(/^▶\s*/, '播放')}">${label}</button>`;
}

// 全站只需要綁一次：任何 [data-play] 按鈕都能播放
export function installPlayHandler(onError) {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-play]');
    if (!b) return;
    document.querySelectorAll('.play-btn.is-playing').forEach((x) => x.classList.remove('is-playing'));
    b.classList.add('is-playing');
    playAudio(b.dataset.play)
      .then(() => { if (current) current.onended = () => b.classList.remove('is-playing'); })
      .catch(() => { b.classList.remove('is-playing'); onError?.(); });
  });
}
