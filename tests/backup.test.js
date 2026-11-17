import { test, assert } from './runner.js';
import { openDB, deleteDB } from '../js/db.js';
import { createSettings } from '../js/settings.js';
import { buildBackup, validateBackup, restoreBackup } from '../js/backup.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const uniq = () => `mea-test-bk-${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function seeded() {
  const db = await openDB({ name: uniq() });
  await db.put('profile', { id: 'me', exp: 50, level: 1 });
  await db.put('progress', { id: 'lesson:vocab-1', timesCompleted: 2, status: 'completed' });
  await db.put('reviews', { wordId: 'apple', status: 'familiar', box: 3 });
  await db.put('attempts', { kind: 'lesson', correct: true, createdAt: 1 });
  await db.put('expLog', { id: 'att:1', amount: 50, reason: 'x', createdAt: 1, day: '2026-11-17' });
  await db.setMeta('contentVersion', 'v');
  return db;
}

test('備份 → 還原到另一台：資料完全一致', async () => {
  const a = await seeded();
  const sa = createSettings(mem()); sa.update({ nickname: '芊芊', defaultMode: 'focus' });
  const json = JSON.parse(JSON.stringify(await buildBackup(a, sa)));
  const v = validateBackup(json);
  assert.ok(v.ok, v.error);
  assert.deepEqual(v.summary.lessons, 1); assert.equal(v.summary.words, 1); assert.equal(v.summary.exp, 50);
  const b = await openDB({ name: uniq() });
  await b.put('reviews', { wordId: 'egg', status: 'learning' }); // 目標裝置的舊資料會被取代
  const sb = createSettings(mem());
  await restoreBackup(b, sb, v.backup);
  assert.equal((await b.get('reviews', 'apple')).box, 3);
  assert.equal(await b.get('reviews', 'egg'), undefined);
  assert.equal((await b.get('progress', 'lesson:vocab-1')).timesCompleted, 2);
  assert.equal(sb.get().nickname, '芊芊');
  assert.equal(await b.count('attempts'), 1);
  a.close(); b.close(); await deleteDB(a.name); await deleteDB(b.name);
});

test('拒絕無效備份檔，並說明原因', () => {
  assert.ok(!validateBackup(null).ok);
  assert.ok(validateBackup({ app: 'other' }).error.includes('不是'));
  assert.ok(validateBackup({ app: 'my-english-adventure', format: 1, dbVersion: 99, data: {} }).error.includes('較新版本'));
  assert.ok(validateBackup({ app: 'my-english-adventure', format: 1, data: { reviews: 'x' } }).error.includes('格式錯誤'));
  assert.ok(validateBackup({ app: 'my-english-adventure', format: 1, data: { reviews: [{ status: 'new' }] } }).error.includes('不完整'));
});

test('缺少的資料表視為空的；設定會經過檢查', () => {
  const v = validateBackup({ app: 'my-english-adventure', format: 1, data: { profile: [{ id: 'me' }] }, settings: { modeMinutes: { low: 999 } } });
  assert.ok(v.ok);
  assert.equal(v.backup.data.sessions.length, 0);
  assert.equal(v.backup.settings.modeMinutes.low, 15);
});
