import { test, assert } from './runner.js';
import { getStorageStatus, requestPersist, describeStatus, formatBytes } from '../js/storage-status.js';

const fakeDb = (lastBackupAt = null) => ({ getMeta: async (k) => (k === 'lastBackupAt' ? lastBackupAt : null) });

test('已核准持久保存時顯示「已持久」', async () => {
  const nav = { storage: { persisted: async () => true, persist: async () => true, estimate: async () => ({ usage: 2048, quota: 1e9 }) } };
  const st = await getStorageStatus({ db: fakeDb(), nav });
  const d = describeStatus(st, null);
  assert.equal(d.summary, '本機保存・已持久');
  assert.equal(d.tone, 'good');
});

test('未核准時顯示警告', async () => {
  const nav = { storage: { persisted: async () => false, persist: async () => false } };
  const d = describeStatus(await getStorageStatus({ db: fakeDb(), nav }), null);
  assert.equal(d.summary, '本機保存・未持久');
  assert.equal(d.rows.find((r) => r.key === 'persist').tone, 'warn');
});

test('不支援 storage API 時如實顯示', async () => {
  const st = await getStorageStatus({ db: fakeDb(), nav: {} });
  const d = describeStatus(st, null);
  assert.equal(d.rows.find((r) => r.key === 'persist').value, '此瀏覽器不支援查詢');
  assert.equal(d.rows.find((r) => r.key === 'request').value, '此瀏覽器不支援申請');
  const res = await requestPersist({});
  assert.equal(res.supported, false);
  assert.equal(res.granted, false);
});

test('沒有備份紀錄時顯示「尚未備份」，且不提雲端', async () => {
  const d = describeStatus(await getStorageStatus({ db: fakeDb(null), nav: {} }), null);
  const backup = d.rows.find((r) => r.key === 'backup').value;
  assert.ok(backup.startsWith('尚未備份'));
  const all = d.rows.map((r) => r.value).join(' ') + d.summary;
  assert.ok(!all.includes('雲端'), '狀態文字不可出現雲端字樣');
});

test('申請結果顯示核准／未核准', () => {
  const st = { supported: { persist: true }, persisted: false, usage: null, quota: null, dbOk: true, lastBackupAt: null };
  const d1 = describeStatus(st, { at: Date.now(), supported: true, granted: false });
  assert.ok(d1.rows.find((r) => r.key === 'request').value.endsWith('未核准'));
  const d2 = describeStatus({ ...st, persisted: true }, { at: Date.now(), supported: true, granted: true });
  assert.ok(d2.rows.find((r) => r.key === 'request').value.endsWith('核准'));
});

test('persist() 丟錯時視為未核准', async () => {
  const res = await requestPersist({ storage: { persist: async () => { throw new Error('x'); } } });
  assert.deepEqual([res.supported, res.granted], [true, false]);
});

test('資料庫錯誤時摘要顯示無法使用', async () => {
  const badDb = { getMeta: async () => { throw new Error('closed'); } };
  const d = describeStatus(await getStorageStatus({ db: badDb, nav: {} }), null);
  assert.equal(d.tone, 'bad');
});

test('容量格式化', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
  assert.equal(formatBytes(null), '無法取得');
});
