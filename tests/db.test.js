import { test, assert } from './runner.js';
import { openDB, deleteDB, MIGRATIONS } from '../js/db.js';

const uniq = () => `mea-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

test('資料庫 v2 建立全部資料表', async () => {
  const name = uniq();
  const db = await openDB({ name });
  const stores = db.storeNames().sort();
  assert.deepEqual(stores, ['achievements', 'attempts', 'expLog', 'lessons', 'meta', 'profile', 'progress', 'reviews', 'sessions', 'vocab']);
  db.close();
  await deleteDB(name);
});

test('寫入後讀回、計數、刪除', async () => {
  const name = uniq();
  const db = await openDB({ name });
  await db.put('profile', { id: 'me', exp: 30, level: 1 });
  const p = await db.get('profile', 'me');
  assert.equal(p.exp, 30);
  assert.equal(await db.count('profile'), 1);
  await db.delete('profile', 'me');
  assert.equal(await db.get('profile', 'me'), undefined);
  db.close();
  await deleteDB(name);
});

test('meta 讀寫', async () => {
  const name = uniq();
  const db = await openDB({ name });
  assert.equal(await db.getMeta('lastBackupAt'), null);
  await db.setMeta('installedAt', 123);
  assert.equal(await db.getMeta('installedAt'), 123);
  db.close();
  await deleteDB(name);
});

test('關閉後重新開啟，資料仍在（模擬重新整理）', async () => {
  const name = uniq();
  let db = await openDB({ name });
  await db.put('progress', { id: 'lesson-1', step: 3 });
  db.close();
  db = await openDB({ name });
  const row = await db.get('progress', 'lesson-1');
  assert.equal(row.step, 3);
  db.close();
  await deleteDB(name);
});

test('從 v1 升級到 v3 時保留舊資料', async () => {
  const name = uniq();
  let db = await openDB({ name, version: 1 });
  await db.put('profile', { id: 'me', exp: 120, level: 2 });
  await db.put('attempts', { itemId: 'q1', correct: true, createdAt: 1 });
  db.close();

  const v3 = { ...MIGRATIONS, 3(idb) { idb.createObjectStore('badges', { keyPath: 'id' }); } };
  db = await openDB({ name, version: 3, migrations: v3 });
  assert.equal(db.version, 3);
  assert.ok(db.storeNames().includes('badges'), '應新增 badges 表');
  assert.equal((await db.get('profile', 'me')).exp, 120, '經驗值不可遺失');
  assert.equal(await db.count('attempts'), 1, '作答紀錄不可遺失');
  db.close();
  await deleteDB(name);
});

test('缺少遷移時取消升級，舊資料不受影響', async () => {
  const name = uniq();
  let db = await openDB({ name, version: 1 });
  await db.put('profile', { id: 'me', exp: 50, level: 1 });
  db.close();
  await assert.rejects(openDB({ name, version: 9 }), '缺遷移應失敗');
  db = await openDB({ name, version: 1 });
  assert.equal((await db.get('profile', 'me')).exp, 50);
  db.close();
  await deleteDB(name);
});

test('P1～P3 的 v1 資料庫升級到 v2：舊資料保留並新增表', async () => {
  const name = uniq();
  let db = await openDB({ name, version: 1 });
  await db.put('reviews', { wordId: 'apple', status: 'learning' });
  await db.put('progress', { id: 'lesson:vocab-1', timesCompleted: 1 });
  db.close();
  db = await openDB({ name });
  assert.equal(db.version, 2);
  assert.ok(db.storeNames().includes('expLog') && db.storeNames().includes('sessions'));
  assert.equal((await db.get('reviews', 'apple')).status, 'learning');
  assert.equal((await db.get('progress', 'lesson:vocab-1')).timesCompleted, 1);
  db.close(); await deleteDB(name);
});

test('replaceAll：單一交易，中途出錯時全部不變', async () => {
  const name = uniq();
  const db = await openDB({ name });
  await db.put('profile', { id: 'me', exp: 5 });
  await db.put('reviews', { wordId: 'egg', status: 'familiar' });
  let failed = false;
  try { await db.replaceAll({ profile: [{ id: 'me', exp: 99 }], reviews: [{ noKey: true }] }); } catch { failed = true; }
  assert.ok(failed, '缺主鍵應失敗');
  assert.equal((await db.get('profile', 'me')).exp, 5, '失敗時舊資料不變');
  assert.equal((await db.get('reviews', 'egg')).status, 'familiar');
  await db.replaceAll({ profile: [{ id: 'me', exp: 99 }], reviews: [] });
  assert.equal((await db.get('profile', 'me')).exp, 99);
  assert.equal(await db.count('reviews'), 0);
  db.close(); await deleteDB(name);
});
