import { test, assert } from './runner.js';
import { openDB, deleteDB } from '../js/db.js';
import { syncContent, loadWordsMap } from '../js/content.js';

const name = () => `mea-test-sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const okRes = (data) => ({ ok: true, status: 200, json: async () => structuredClone(data) });
function fakeFetch(files, fail = []) {
  return async (url) => {
    if (fail.some((f) => url.includes(f))) throw new Error('offline');
    if (!(url in files)) return { ok: false, status: 404, json: async () => ({}) };
    return okRes(files[url]);
  };
}
const FILES = {
  'data/catalog.json': { contentVersion: 'v1', diagnosis: 'd.json', vocab: ['w.json'], lessons: ['l.json'] },
  'd.json': { id: 'd' },
  'w.json': [{ id: 'zebra' }, { id: 'apple' }],
  'l.json': { id: 'l1', world: 'x', order: 1 },
};

test('教材同步：寫入 IndexedDB，單字保持教材順序', async () => {
  const n = name(); const db = await openDB({ name: n });
  const r = await syncContent(db, { fetchImpl: fakeFetch(FILES) });
  assert.ok(r.updated);
  assert.deepEqual([...(await loadWordsMap(db)).keys()], ['zebra', 'apple']);
  assert.equal(await db.getMeta('contentVersion'), 'v1');
  db.close(); await deleteDB(n);
});

test('教材同步：新版本部分檔案下載失敗時，沿用已安裝的教材', async () => {
  const n = name(); const db = await openDB({ name: n });
  await syncContent(db, { fetchImpl: fakeFetch(FILES) });
  const v2 = { ...FILES, 'data/catalog.json': { ...FILES['data/catalog.json'], contentVersion: 'v2' } };
  const r = await syncContent(db, { fetchImpl: fakeFetch(v2, ['l.json']) });
  assert.equal(r.offline, true);
  assert.equal(await db.getMeta('contentVersion'), 'v1', '版本不可被標記為已更新');
  assert.equal((await db.getAll('lessons')).length, 1);
  db.close(); await deleteDB(n);
});

test('教材同步：第一次就無法下載時，清楚提示需要網路', async () => {
  const n = name(); const db = await openDB({ name: n });
  let msg = '';
  try { await syncContent(db, { fetchImpl: fakeFetch(FILES, ['catalog']) }); } catch (e) { msg = e.message; }
  assert.ok(msg.includes('連上網路'));
  db.close(); await deleteDB(n);
});

test('教材同步：不會動到學習進度', async () => {
  const n = name(); const db = await openDB({ name: n });
  await db.put('progress', { id: 'lesson:l1', stepIndex: 5 });
  await db.put('reviews', { wordId: 'apple', status: 'familiar' });
  const v2 = { ...FILES, 'data/catalog.json': { ...FILES['data/catalog.json'], contentVersion: 'v2' } };
  await syncContent(db, { fetchImpl: fakeFetch(v2) });
  assert.equal((await db.get('progress', 'lesson:l1')).stepIndex, 5);
  assert.equal((await db.get('reviews', 'apple')).status, 'familiar');
  db.close(); await deleteDB(n);
});
