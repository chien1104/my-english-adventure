// 教材載入：從 data/*.json 讀取，寫進 IndexedDB。
// 之後頁面都從 IndexedDB 讀教材，所以載入過一次後不必每次重抓。
// 只會新增或更新教材，絕不動到學習進度（progress / reviews / attempts）。

export const CATALOG_URL = 'data/catalog.json';

async function fetchJSON(url, fetchImpl) {
  const res = await fetchImpl(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`無法讀取 ${url}（${res.status}）`);
  return res.json();
}

export async function syncContent(db, { fetchImpl = globalThis.fetch.bind(globalThis), force = false } = {}) {
  const installed = await db.getMeta('contentVersion');
  let catalog;
  try {
    catalog = await fetchJSON(CATALOG_URL, fetchImpl);
  } catch (err) {
    if (installed) return { updated: false, version: installed, offline: true };
    throw new Error('第一次使用需要連上網路下載教材，請連網後重新整理。');
  }
  if (!force && installed === catalog.contentVersion) {
    return { updated: false, version: installed };
  }

  let vocabLists, lessons, diagnosis;
  try {
    [vocabLists, lessons, diagnosis] = await Promise.all([
      Promise.all(catalog.vocab.map((u) => fetchJSON(u, fetchImpl))),
      Promise.all(catalog.lessons.map((u) => fetchJSON(u, fetchImpl))),
      fetchJSON(catalog.diagnosis, fetchImpl),
    ]);
  } catch (err) {
    if (installed) return { updated: false, version: installed, offline: true };
    throw new Error('教材下載不完整，請確認網路後重新整理。');
  }
  const words = vocabLists.flat().map((w, i) => ({ ...w, seq: i }));

  await db.putMany('vocab', words);
  await db.putMany('lessons', lessons.map((l, i) => ({ ...l, seq: i })));
  await db.setMeta('diagnosisContent', diagnosis);
  // 版本最後才寫，前面任何一步失敗都會在下次重試
  await db.setMeta('contentVersion', catalog.contentVersion);
  return { updated: true, version: catalog.contentVersion, words: words.length, lessons: lessons.length };
}

export async function loadLessons(db) {
  const all = await db.getAll('lessons');
  return all.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || a.order - b.order);
}

export async function loadWordsMap(db) {
  const all = (await db.getAll('vocab')).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  return new Map(all.map((w) => [w.id, w]));
}
