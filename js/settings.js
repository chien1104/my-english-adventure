// 個人設定（localStorage）
export const SETTINGS_KEY = 'mea.settings.v1';

export const MODES = {
  low:       { label: '低電量', desc: '輕量複習',     defaultMinutes: 5,  min: 3,  max: 15,  icon: '🔋' },
  normal:    { label: '普通',   desc: '單字與文法',   defaultMinutes: 15, min: 5,  max: 30,  icon: '☕' },
  focus:     { label: '專注',   desc: '完整學習',     defaultMinutes: 30, min: 15, max: 60,  icon: '📖' },
  challenge: { label: '挑戰',   desc: '綜合訓練',     defaultMinutes: 60, min: 30, max: 120, icon: '⚔️' },
};
export const MODE_IDS = Object.keys(MODES);
export const NICKNAME_MAX = 20;
export const PLAYBACK_RATES = [1, 0.8];

export function defaultSettings() {
  const modeMinutes = {};
  for (const id of MODE_IDS) modeMinutes[id] = MODES[id].defaultMinutes;
  return {
    version: 1,
    nickname: '',
    defaultMode: 'normal',
    modeMinutes,
    todayMode: null,        // { date: 'YYYY-MM-DD', mode }
    persistRequest: null,   // { at: timestamp, supported, granted }
    playbackRate: 1,        // 發音播放速度：1 或 0.8
  };
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// 把任何外來資料整理成合法設定，缺的補預設值
export function sanitize(raw) {
  const d = defaultSettings();
  if (!raw || typeof raw !== 'object') return d;
  const out = { ...d };

  if (typeof raw.nickname === 'string') {
    out.nickname = Array.from(raw.nickname.trim()).slice(0, NICKNAME_MAX).join('');
  }
  if (MODE_IDS.includes(raw.defaultMode)) out.defaultMode = raw.defaultMode;

  const mm = raw.modeMinutes && typeof raw.modeMinutes === 'object' ? raw.modeMinutes : {};
  for (const id of MODE_IDS) {
    out.modeMinutes[id] = clampInt(mm[id], MODES[id].min, MODES[id].max, MODES[id].defaultMinutes);
  }

  if (PLAYBACK_RATES.includes(raw.playbackRate)) out.playbackRate = raw.playbackRate;

  const t = raw.todayMode;
  if (t && typeof t.date === 'string' && MODE_IDS.includes(t.mode)) {
    out.todayMode = { date: t.date, mode: t.mode };
  }

  const p = raw.persistRequest;
  if (p && typeof p.at === 'number') {
    out.persistRequest = { at: p.at, supported: !!p.supported, granted: !!p.granted };
  }
  return out;
}

function safeLocalStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

export function createSettings(storage = safeLocalStorage()) {
  let available = !!storage;
  let state = load();

  function load() {
    if (!storage) return defaultSettings();
    try {
      const text = storage.getItem(SETTINGS_KEY);
      return text ? sanitize(JSON.parse(text)) : defaultSettings();
    } catch {
      return defaultSettings(); // 損毀的 JSON：回到預設，不讓 App 壞掉
    }
  }

  function save(next) {
    if (!storage) return { ok: false, error: '此瀏覽器無法使用 localStorage，設定只在本次開啟有效。' };
    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify(next));
      state = next;
      return { ok: true };
    } catch (err) {
      available = false;
      return { ok: false, error: '設定儲存失敗（可能是私密瀏覽或空間已滿）。' };
    }
  }

  return {
    get available() { return available; },
    get() { return structuredClone(state); },
    update(patch) {
      const next = sanitize({ ...state, ...patch, modeMinutes: { ...state.modeMinutes, ...(patch.modeMinutes || {}) } });
      return { ...save(next), settings: structuredClone(next) };
    },
    getTodayMode(now = new Date()) {
      const t = state.todayMode;
      if (t && t.date === todayKey(now)) return { mode: t.mode, chosen: true };
      return { mode: state.defaultMode, chosen: false };
    },
    setTodayMode(mode, now = new Date()) {
      if (!MODE_IDS.includes(mode)) return { ok: false, error: '未知的學習模式' };
      return this.update({ todayMode: { date: todayKey(now), mode } });
    },
    resetModeMinutes() {
      return this.update({ modeMinutes: defaultSettings().modeMinutes });
    },
    reload() { state = load(); return this.get(); },
  };
}
