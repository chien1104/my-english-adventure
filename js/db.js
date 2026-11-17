// IndexedDB 封裝與版本遷移
// 原則：升級只新增或轉換資料，絕不刪除使用者的學習紀錄。

export const DB_NAME = 'my-english-adventure';
export const DB_VERSION = 2;

// 每個版本一個遷移函式，依序執行（舊版本 +1 → 目前版本）
export const MIGRATIONS = {
  1(db) {
    db.createObjectStore('profile', { keyPath: 'id' });
    db.createObjectStore('progress', { keyPath: 'id' });

    const vocab = db.createObjectStore('vocab', { keyPath: 'id' });
    vocab.createIndex('level', 'level');

    db.createObjectStore('lessons', { keyPath: 'id' });

    const attempts = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true });
    attempts.createIndex('itemId', 'itemId');
    attempts.createIndex('createdAt', 'createdAt');

    const reviews = db.createObjectStore('reviews', { keyPath: 'wordId' });
    reviews.createIndex('dueAt', 'dueAt');

    db.createObjectStore('meta', { keyPath: 'key' });
  },
  // v2（P4）：經驗值紀錄、成就、學習活動紀錄。只新增，不動舊資料。
  2(db) {
    db.createObjectStore('expLog', { keyPath: 'id' });
    db.createObjectStore('achievements', { keyPath: 'id' });
    const sessions = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
    sessions.createIndex('day', 'day');
  },
};

// 使用者的學習資料（備份／還原的範圍）。教材可重新下載，不在備份內。
export const USER_STORES = ['profile', 'progress', 'attempts', 'reviews', 'expLog', 'achievements', 'sessions'];

export function openDB({
  name = DB_NAME,
  version = DB_VERSION,
  migrations = MIGRATIONS,
  onBlocked = null,
} = {}) {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis) || !globalThis.indexedDB) {
      reject(new Error('此瀏覽器不支援 IndexedDB，無法保存學習紀錄。'));
      return;
    }
    let req;
    try {
      req = indexedDB.open(name, version);
    } catch (err) {
      reject(err);
      return;
    }

    req.onupgradeneeded = (ev) => {
      const db = req.result;
      const tx = req.transaction;
      for (let v = ev.oldVersion + 1; v <= version; v++) {
        const migrate = migrations[v];
        if (typeof migrate !== 'function') {
          tx.abort();
          reject(new Error(`缺少第 ${v} 版資料庫遷移，已取消升級以保護資料。`));
          return;
        }
        migrate(db, tx);
      }
    };
    req.onsuccess = () => {
      const idb = req.result;
      // 其他分頁要升級資料庫時，主動關閉連線避免卡住
      idb.onversionchange = () => idb.close();
      resolve(new Database(idb));
    };
    req.onerror = () => reject(req.error || new Error('無法開啟資料庫'));
    req.onblocked = () => {
      if (typeof onBlocked === 'function') onBlocked();
    };
  });
}

export function deleteDB(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

export class Database {
  constructor(idb) {
    this.idb = idb;
    this.name = idb.name;
    this.version = idb.version;
  }

  // 交易完成（oncomplete）才回傳，確保資料已寫入
  _run(storeName, mode, fn) {
    return new Promise((resolve, reject) => {
      let tx;
      try {
        tx = this.idb.transaction(storeName, mode);
      } catch (err) {
        reject(err);
        return;
      }
      let result;
      const req = fn(tx.objectStore(storeName));
      req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || req.error);
      tx.onabort = () => reject(tx.error || new Error('資料庫交易已中止'));
    });
  }

  get(store, key) { return this._run(store, 'readonly', (s) => s.get(key)); }
  getAll(store) { return this._run(store, 'readonly', (s) => s.getAll()); }
  count(store) { return this._run(store, 'readonly', (s) => s.count()); }
  put(store, value) { return this._run(store, 'readwrite', (s) => s.put(value)); }
  delete(store, key) { return this._run(store, 'readwrite', (s) => s.delete(key)); }

  // 一次寫入多筆（同一個交易，全部成功或全部失敗）
  putMany(store, values) {
    return new Promise((resolve, reject) => {
      let tx;
      try { tx = this.idb.transaction(store, 'readwrite'); } catch (err) { reject(err); return; }
      const s = tx.objectStore(store);
      for (const v of values) s.put(v);
      tx.oncomplete = () => resolve(values.length);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('資料庫交易已中止'));
    });
  }

  async getMeta(key) {
    const row = await this.get('meta', key);
    return row ? row.value : null;
  }
  setMeta(key, value) { return this.put('meta', { key, value }); }

  // 一次取代多個表的內容（單一交易：全部成功或全部不變）
  replaceAll(dataByStore) {
    const stores = Object.keys(dataByStore);
    return new Promise((resolve, reject) => {
      let tx;
      try { tx = this.idb.transaction(stores, 'readwrite'); } catch (err) { reject(err); return; }
      try {
        for (const name of stores) {
          const s = tx.objectStore(name);
          s.clear();
          for (const row of dataByStore[name]) s.put(row);
        }
      } catch (err) {
        try { tx.abort(); } catch { /* 已中止 */ }
        reject(err);
        return;
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('還原已取消，資料未變更'));
    });
  }

  storeNames() { return Array.from(this.idb.objectStoreNames); }
  close() { this.idb.close(); }
}
