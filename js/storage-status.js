// 資料保存狀態：持久保存、使用空間、備份狀態
// 重要：本機保存 ≠ 雲端備份。這裡的文字絕不暗示有雲端同步。

export async function getStorageStatus({ db = null, nav = globalThis.navigator } = {}) {
  const s = nav && nav.storage;
  const supported = {
    persist: !!(s && typeof s.persist === 'function'),
    persisted: !!(s && typeof s.persisted === 'function'),
    estimate: !!(s && typeof s.estimate === 'function'),
  };

  let persisted = null;
  if (supported.persisted) {
    try { persisted = await s.persisted(); } catch { persisted = null; }
  }

  let usage = null;
  let quota = null;
  if (supported.estimate) {
    try {
      const est = await s.estimate();
      usage = typeof est.usage === 'number' ? est.usage : null;
      quota = typeof est.quota === 'number' ? est.quota : null;
    } catch { /* 部分瀏覽器會拒絕 */ }
  }

  let lastBackupAt = null;
  let dbOk = false;
  if (db) {
    try {
      lastBackupAt = await db.getMeta('lastBackupAt');
      dbOk = true;
    } catch { dbOk = false; }
  }

  return { supported, persisted, usage, quota, dbOk, lastBackupAt };
}

export async function requestPersist(nav = globalThis.navigator) {
  const s = nav && nav.storage;
  if (!s || typeof s.persist !== 'function') {
    return { at: Date.now(), supported: false, granted: false };
  }
  let granted = false;
  try { granted = await s.persist(); } catch { granted = false; }
  return { at: Date.now(), supported: true, granted: !!granted };
}

export function formatBytes(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return '無法取得';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function formatTime(ts) {
  if (typeof ts !== 'number') return '';
  const d = new Date(ts);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 純函式：把狀態轉成要顯示的文字，方便測試
export function describeStatus(status, lastRequest) {
  const rows = [];

  rows.push({
    key: 'db',
    label: '本機資料庫',
    value: status.dbOk ? '正常運作' : '無法使用',
    tone: status.dbOk ? 'good' : 'bad',
  });

  let persistValue;
  let persistTone;
  if (status.persisted === true) {
    persistValue = '已核准：瀏覽器空間不足時不會自動清除';
    persistTone = 'good';
  } else if (status.persisted === false) {
    persistValue = '未核准：瀏覽器空間不足時可能清除資料';
    persistTone = 'warn';
  } else {
    persistValue = '此瀏覽器不支援查詢';
    persistTone = 'warn';
  }
  rows.push({ key: 'persist', label: '持久保存', value: persistValue, tone: persistTone });

  let reqValue;
  let reqTone = 'neutral';
  if (!lastRequest) {
    reqValue = status.supported.persist ? '尚未申請' : '此瀏覽器不支援申請';
  } else if (!lastRequest.supported) {
    reqValue = `${formatTime(lastRequest.at)}：此瀏覽器不支援申請`;
    reqTone = 'warn';
  } else {
    reqValue = `${formatTime(lastRequest.at)}：${lastRequest.granted ? '核准' : '未核准'}`;
    reqTone = lastRequest.granted ? 'good' : 'warn';
  }
  rows.push({ key: 'request', label: '申請結果', value: reqValue, tone: reqTone });

  const usageText = status.usage === null
    ? '無法取得'
    : `${formatBytes(status.usage)}${status.quota ? `／可用上限約 ${formatBytes(status.quota)}` : ''}`;
  rows.push({ key: 'usage', label: '已使用空間', value: usageText, tone: 'neutral' });

  rows.push({
    key: 'backup',
    label: '備份狀態',
    value: status.lastBackupAt
      ? `上次匯出 JSON 備份：${formatTime(status.lastBackupAt)}`
      : '尚未備份：目前沒有任何備份檔',
    tone: status.lastBackupAt ? 'good' : 'warn',
  });

  // 摘要：給首頁與頂部列用
  let summary;
  let tone;
  if (!status.dbOk) { summary = '資料庫無法使用'; tone = 'bad'; }
  else if (status.persisted === true) { summary = '本機保存・已持久'; tone = 'good'; }
  else { summary = '本機保存・未持久'; tone = 'warn'; }

  return { rows, summary, tone };
}
