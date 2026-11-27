// 白天／深色模式：設定值 light | dark | auto（跟著手機）
export const THEMES = { light: '☀️ 白天', dark: '🌙 深色', auto: '📱 跟著手機' };
const mq = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)');

export const resolveTheme = (pref, systemDark = !!mq()?.matches) => (pref === 'dark' || (pref === 'auto' && systemDark) ? 'dark' : 'light');

let current = 'light';
let listening = false;
export function applyTheme(pref) {
  current = pref in THEMES ? pref : 'light';
  const t = resolveTheme(current);
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#1B1410' : '#F7F1E8');
  const btn = document.querySelector('[data-act="theme-toggle"]');
  if (btn) {
    btn.setAttribute('aria-label', t === 'dark' ? '切換成白天模式' : '切換成深色模式');
    btn.textContent = t === 'dark' ? '☀️' : '🌙';
  }
  if (!listening && mq()?.addEventListener) {
    listening = true;
    mq().addEventListener('change', () => { if (current === 'auto') applyTheme('auto'); });
  }
  return t;
}
