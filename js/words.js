// 單字學習狀態與間隔複習（純邏輯）
// 使用分盒（Leitner）排程：盒子越高，下次複習間隔越長。
// status：new（還沒學）→ learning（學習中）→ familiar（熟悉，盒子 ≥ 3）
// 休息幾天不會扣分：到期的單字只是等你回來複習，不會降級。

export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
export const MAX_BOX = INTERVAL_DAYS.length - 1;
export const FAMILIAR_BOX = 3;
export const DAY = 24 * 60 * 60 * 1000;
export const STATUS_LABEL = { new: '還沒學', learning: '學習中', familiar: '熟悉' };

export function endOfDay(now) {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function emptyRecord(wordId) {
  return { wordId, status: 'new', box: 0, correct: 0, wrong: 0, streak: 0, lastSeenAt: null, dueAt: null };
}

function normalize(record, wordId) {
  const r = record ? { ...record } : emptyRecord(wordId);
  if (typeof r.box !== 'number') r.box = r.status === 'familiar' ? FAMILIAR_BOX : 0; // P2／P3 舊資料
  return r;
}

function statusFromBox(box) { return box >= FAMILIAR_BOX ? 'familiar' : 'learning'; }

// 今天（到今天結束前）到期就算該複習
export function isDue(record, now = Date.now()) {
  return !!record && record.status !== 'new' && record.dueAt !== null && record.dueAt !== undefined && record.dueAt <= endOfDay(now);
}

export function markLearned(record, wordId, now = Date.now()) {
  const r = normalize(record, wordId);
  if (r.status === 'new') {
    r.status = 'learning';
    r.box = 0;
    r.dueAt = now + DAY; // 學完隔天複習
  }
  r.lastSeenAt = now;
  return r;
}

export function applyAnswer(record, wordId, correct, now = Date.now()) {
  const r = normalize(record, wordId);
  const wasNew = r.status === 'new';
  if (correct) {
    r.correct += 1;
    r.streak += 1;
    if (wasNew || isDue(r, now)) {
      r.box = wasNew ? 1 : Math.min(r.box + 1, MAX_BOX);
      r.dueAt = now + INTERVAL_DAYS[r.box] * DAY;
    }
    // 還沒到期就提前練習：記錄答對，但不改變排程
  } else {
    r.wrong += 1;
    r.streak = 0;
    r.box = 0;
    r.dueAt = now; // 答錯：今天就要再複習
  }
  r.status = statusFromBox(r.box);
  r.lastSeenAt = now;
  return r;
}

export function dueWords(words, records, now = Date.now()) {
  return words
    .filter((w) => isDue(records.get(w.id), now))
    .sort((a, b) => records.get(a.id).dueAt - records.get(b.id).dueAt);
}

export function nextDueAt(records, now = Date.now()) {
  let next = null;
  for (const r of records.values()) {
    if (r.status === 'new' || r.dueAt === null || r.dueAt === undefined || isDue(r, now)) continue;
    if (next === null || r.dueAt < next) next = r.dueAt;
  }
  return next;
}

export function statusOf(record) {
  return record ? record.status : 'new';
}

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 從已學過的單字出複習題；選項從全部單字中挑（中文不重複，確保答案唯一）
export function buildReviewQuestions(words, records, { count = 8, rng = Math.random, onlyDue = false, now = Date.now() } = {}) {
  const learned = words.filter((w) => {
    const r = records.get(w.id);
    return r && r.status !== 'new' && (!onlyDue || isDue(r, now));
  });
  const rank = (w) => {
    const r = records.get(w.id);
    return [r.status === 'learning' ? 0 : 1, r.lastSeenAt || 0];
  };
  learned.sort((a, b) => {
    const [x1, y1] = rank(a);
    const [x2, y2] = rank(b);
    return x1 - x2 || y1 - y2;
  });
  const picked = learned.slice(0, count);

  return picked.map((w, i) => {
    const others = shuffle(words.filter((o) => o.id !== w.id && o.zh !== w.zh && o.en !== w.en), rng).slice(0, 2);
    const useImage = w.image && i % 2 === 1;
    if (useImage) {
      return {
        id: `rv-${w.id}`, group: w.id, wordId: w.id, type: 'choice',
        prompt: '這是什麼？', image: w.id,
        options: shuffle([w.en, ...others.map((o) => o.en)], rng), answer: w.en,
        explanation: `${w.en} ${w.ipa} 是「${w.zh}」。例句：${w.example.en}（${w.example.zh}）`,
      };
    }
    return {
      id: `rv-${w.id}`, group: w.id, wordId: w.id, type: 'choice',
      prompt: '這個單字的中文是？', sentence: w.en, sentenceAudio: w.audio,
      options: shuffle([w.zh, ...others.map((o) => o.zh)], rng), answer: w.zh,
      explanation: `${w.en} ${w.ipa}（${w.posZh}）是「${w.zh}」。例句：${w.example.en}（${w.example.zh}）`,
    };
  });
}

// 把複習題包成一堂小課，交給同一個課程播放器
export function buildReviewLesson(questions) {
  return {
    id: 'review-session',
    type: 'review',
    title: '單字複習',
    steps: [
      { kind: 'practice', title: '單字複習', intro: '答錯的單字會在最後再出現一次。', questions, similar: [] },
      { kind: 'review', title: '答案解析' },
    ],
  };
}
