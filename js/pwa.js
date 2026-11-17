// PWA：註冊 Service Worker、偵測新版本、離線狀態、下載音檔
export const AUDIO_CACHE = 'mea-audio-v1';
let pendingReg = null;
let reloading = false;

export const SINGLE_FILE = !!globalThis.__MEA_SINGLE__;

export function swSupported() {
  if (SINGLE_FILE) return false;
  return 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
}

export function registerSW({ onUpdate } = {}) {
  if (!swSupported()) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const notify = () => { pendingReg = reg; onUpdate?.(reg); };
    if (reg.waiting && navigator.serviceWorker.controller) notify();
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) notify();
      });
    });
    // 每次回到 App 時檢查一次有沒有新版本
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch((err) => console.warn('Service Worker 註冊失敗', err));

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) return;
    location.reload();
  });
}

// 使用者按「立即更新」才切換版本
export function applyUpdate() {
  const waiting = pendingReg?.waiting;
  if (!waiting) { location.reload(); return; }
  reloading = true;
  waiting.postMessage('SKIP_WAITING');
}

export async function offlineStatus() {
  if (!swSupported()) return { supported: false, ready: false, files: 0, audio: 0 };
  const keys = await caches.keys();
  const shellKey = keys.filter((k) => k.startsWith('mea-shell-')).sort().pop();
  const files = shellKey ? (await (await caches.open(shellKey)).keys()).length : 0;
  const audio = keys.includes(AUDIO_CACHE) ? (await (await caches.open(AUDIO_CACHE)).keys()).length : 0;
  return { supported: true, ready: !!navigator.serviceWorker.controller && files > 0, files, audio, version: shellKey?.replace('mea-shell-', '') };
}

// 下載音檔到裝置，之後離線也能播放
export async function downloadAudio(srcs, onProgress) {
  const cache = await caches.open(AUDIO_CACHE);
  let done = 0;
  let failed = 0;
  for (const src of srcs) {
    try {
      if (!(await cache.match(src))) {
        const res = await fetch(src);
        if (!res.ok) throw new Error(String(res.status));
        await cache.put(src, res);
      }
    } catch { failed += 1; }
    done += 1;
    onProgress?.(done, srcs.length);
  }
  return { done, failed };
}
