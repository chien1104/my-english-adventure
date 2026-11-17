// JSON 備份與還原
// 備份檔只會下載到這台裝置；要保存在雲端，需要使用者自己上傳到雲端硬碟或傳給自己。
import { USER_STORES, DB_VERSION } from './db.js';
import { sanitize } from './settings.js';

export const BACKUP_APP = 'my-english-adventure';
export const BACKUP_FORMAT = 1;
const KEY_OF = { profile: 'id', progress: 'id', attempts: 'id', reviews: 'wordId', expLog: 'id', achievements: 'id', sessions: 'id' };

export async function buildBackup(db, settings, now = Date.now()) {
  const data = {};
  for (const s of USER_STORES) data[s] = await db.getAll(s);
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: now,
    dbVersion: DB_VERSION,
    contentVersion: await db.getMeta('contentVersion'),
    settings: settings.get(),
    data,
  };
}

export function backupFileName(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `my-english-adventure-backup-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.json`;
}

export function summarize(backup) {
  const d = backup.data;
  return {
    exportedAt: backup.exportedAt,
    lessons: d.progress.filter((p) => String(p.id).startsWith('lesson:') && p.timesCompleted > 0).length,
    words: d.reviews.filter((r) => r.status !== 'new').length,
    attempts: d.attempts.length,
    exp: d.expLog.reduce((n, e) => n + (Number(e.amount) || 0), 0),
    achievements: d.achievements.length,
  };
}

// 檢查備份檔；任何不對就拒絕，不會動到現有資料
export function validateBackup(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, error: '檔案內容不是有效的備份格式。' };
  if (obj.app !== BACKUP_APP) return { ok: false, error: '這不是 My English Adventure 的備份檔。' };
  if (obj.format !== BACKUP_FORMAT) return { ok: false, error: `不支援的備份格式（${obj.format}）。` };
  if (typeof obj.dbVersion === 'number' && obj.dbVersion > DB_VERSION) {
    return { ok: false, error: '這個備份來自較新版本的 App，請先更新 App 再還原。' };
  }
  if (!obj.data || typeof obj.data !== 'object') return { ok: false, error: '備份檔缺少學習資料。' };
  const data = {};
  for (const s of USER_STORES) {
    const rows = obj.data[s] === undefined ? [] : obj.data[s];
    if (!Array.isArray(rows)) return { ok: false, error: `備份檔的「${s}」資料格式錯誤。` };
    for (const r of rows) {
      if (!r || typeof r !== 'object' || r[KEY_OF[s]] === undefined || r[KEY_OF[s]] === null) {
        return { ok: false, error: `備份檔的「${s}」有不完整的資料，已停止還原。` };
      }
    }
    data[s] = rows;
  }
  const backup = { ...obj, data, settings: sanitize(obj.settings) };
  return { ok: true, backup, summary: summarize(backup) };
}

export async function restoreBackup(db, settings, backup, now = Date.now()) {
  await db.replaceAll(backup.data); // 單一交易：失敗時資料完全不變
  const keepPersist = settings.get().persistRequest; // 持久保存是這台裝置的狀態，不從備份帶入
  settings.update({ ...backup.settings, persistRequest: keepPersist });
  await db.setMeta('lastRestoreAt', now);
}
