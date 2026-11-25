// 多益單字庫（純邏輯）：系列、單元、單元課程、搜尋
import { enZhQuestion, zhEnQuestion, practiceQuestion } from './word-questions.js';
// 系列與單元來自 data/series.json；每個單元 20 個字，依多益出現頻率排序。

export const UNIT_MINUTES = 10;
export const unitKey = (unitId) => `unit:${unitId}`;

// 把字串變成固定的亂數種子：同一個單元每次產生的選項順序都一樣（暫停後繼續不會亂掉）
export function seededRng(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const isLearned = (records, id) => { const r = records.get(id); return !!r && r.status !== 'new'; };

// 情境分類：把單字庫裡同一情境的字，依頻率排成一個個單元
export function topicSeries(topic, label, wordsMap, unitSize = 20) {
  const ids = [...wordsMap.values()]
    .filter((w) => w.list && w.topic === topic)
    .sort((a, b) => (a.list === b.list ? a.rank - b.rank : a.list === 'tsl' ? -1 : 1))
    .map((w) => w.id);
  const units = [];
  for (let i = 0; i < ids.length; i += unitSize) units.push(ids.slice(i, i + unitSize));
  return { id: `topic-${topic}`, icon: '🏷️', name: `${label}情境`, desc: `多益「${label}」情境常見的單字，依出現頻率排列。`, count: ids.length, units, topic };
}

export function findSeries(bank, id, wordsMap) {
  if (!bank) return null;
  if (id?.startsWith('topic-')) {
    const topic = id.slice(6);
    return bank.topics?.[topic] ? topicSeries(topic, bank.topics[topic], wordsMap, bank.unitSize) : null;
  }
  return bank.series.find((s) => s.id === id) || null;
}

// 「hot:3」→ 系列 hot 的第 4 單元
export function parseUnitId(unitId) {
  const m = /^([a-z0-9-]+):(\d+)$/.exec(String(unitId || ''));
  return m ? { seriesId: m[1], index: Number(m[2]) } : null;
}

export function unitProgress(ids, records) {
  const learned = ids.filter((id) => isLearned(records, id)).length;
  return { learned, total: ids.length, done: learned === ids.length };
}

export function seriesProgress(series, records) {
  const all = series.units.flat();
  return unitProgress(all, records);
}

// 下一個該學的單元：第一個還有沒學過的字的單元
export function nextUnit(series, records) {
  if (!series) return null;
  const index = series.units.findIndex((ids) => !unitProgress(ids, records).done);
  return index < 0 ? null : { series, index, id: `${series.id}:${index}`, ids: series.units[index] };
}

// 一個單字的兩種基本題目：看英文選中文、看中文選英文
export function wordQuestions(w, pool, rng) {
  return [enZhQuestion(w, pool, rng), zhEnQuestion(w, pool, rng)];
}

// 單元課程：前半認字＋小測驗、後半認字＋小測驗，最後看答案解析。交給課程播放器。
export function buildUnitLesson(series, index, wordsMap) {
  const ids = series.units[index] || [];
  const words = ids.map((id) => wordsMap.get(id)).filter(Boolean);
  const rng = seededRng(`${series.id}:${index}`);
  const pool = words.length >= 3 ? words : [...wordsMap.values()].slice(0, 40);
  const half = Math.ceil(words.length / 2);
  const steps = [];
  [words.slice(0, half), words.slice(half)].forEach((part, p) => {
    if (!part.length) return;
    const qs = part.map((w, i) => wordQuestions(w, pool, rng)[(i + p) % 2]);
    const sim = part.map((w, i) => wordQuestions(w, pool, rng)[(i + p + 1) % 2]);
    steps.push({ kind: 'words', title: p === 0 ? '認識單字（上）' : '認識單字（下）', wordIds: part.map((w) => w.id) });
    steps.push({ kind: 'practice', title: p === 0 ? '小測驗（上）' : '小測驗（下）', intro: '答錯的字，等一下會換個方式再考一次。', questions: shuffle(qs, rng), similar: sim });
  });
  // 活用練習：聽音選答、例句填空、拼字輪流出題
  const extra = words.map((w, i) => practiceQuestion(w, pool, rng, i)).filter(Boolean);
  const extraSim = words.map((w, i) => practiceQuestion(w, pool, rng, i + 1, '-b')).filter(Boolean);
  if (extra.length) {
    steps.push({ kind: 'practice', title: '活用練習', intro: '聽發音選中文、例句填空、聽音拼字，把單字真的用出來。', questions: shuffle(extra, rng), similar: extraSim });
  }
  steps.push({ kind: 'review', title: '答案解析' });
  return {
    id: `unit:${series.id}:${index}`, type: 'vocab', unit: true,
    title: `${series.name}・第 ${index + 1} 單元`, minutes: UNIT_MINUTES, steps,
  };
}

// 搜尋：英文開頭相符優先，再來是中文包含
export function searchWords(words, q, limit = 30) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return [];
  const starts = [], contains = [];
  for (const w of words) {
    const en = w.en.toLowerCase();
    if (en.startsWith(s)) starts.push(w);
    else if (en.includes(s) || (w.zh && w.zh.includes(s))) contains.push(w);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
