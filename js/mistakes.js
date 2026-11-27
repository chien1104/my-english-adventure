// 錯題百科（純邏輯）
// 同一個「考點」答錯過就列入：課程題以「課程＋題組」為單位，單字題以「單字」為單位。
// 訂正要「隔天再答對一次」才算過關：答錯 → 答對一次（3 天後再複習）→ 隔至少 20 小時再答對 → 已訂正。
// 再答錯會回到「待訂正」。分類：多益 Part 1～7、文法、單字、其他。

export const MISTAKE_KINDS = new Set(['lesson', 'review', 'mistake', 'game']);
export const RETRAIN_MAX = 10;
export const FIX_NEEDED = 2;               // 答對幾次才算訂正
export const RECHECK_DAYS = 3;             // 第一次答對後，幾天後再出現
export const MIN_GAP = 20 * 3600 * 1000;   // 兩次答對至少隔多久（避免同一次練習連答兩次就過關）
const DAY = 24 * 3600 * 1000;

export const CATEGORIES = {
  part1: 'Part 1', part2: 'Part 2', part3: 'Part 3', part4: 'Part 4',
  part5: 'Part 5', part6: 'Part 6', part7: 'Part 7', grammar: '文法', word: '單字', other: '其他',
};

// 錯題屬於哪一類：模擬考題看 Part，課程看所在世界，單字題是「單字」
export function categoryOf(m, fromIndex) {
  if (!m.key.startsWith('lesson|')) return 'word';
  const q = fromIndex?.question;
  if (q?.part >= 1 && q.part <= 7) return `part${q.part}`;
  const w = fromIndex?.world || '';
  if (/^part[1-7]$/.test(w) || w === 'grammar') return w;
  return 'other';
}

export function attemptKey(a) {
  if (a.lessonId && a.group) return `lesson|${a.lessonId}|${a.group}`;
  if (a.wordId) return `word|${a.wordId}`;
  return null;
}

// 建立題目索引：題號 → 題目與來源課程
export function buildQuestionIndex(lessons) {
  const index = new Map();
  const byGroup = new Map();
  for (const l of lessons) {
    for (const step of l.steps) {
      if (step.kind !== 'practice') continue;
      for (const q of [...step.questions, ...(step.similar || [])]) {
        index.set(q.id, { question: q, lessonId: l.id, lessonTitle: l.title, world: l.world || null });
        const k = `${l.id}|${q.group}`;
        if (!byGroup.has(k)) byGroup.set(k, []);
        byGroup.get(k).push(q);
      }
    }
  }
  return { index, byGroup };
}

// 單字考點的題目：英文 → 中文，選項從其他單字挑（中文不重複）
export function wordQuestion(word, words) {
  const others = words.filter((w) => w.id !== word.id && w.zh !== word.zh).slice(0, 2);
  const options = [word.zh, ...others.map((o) => o.zh)];
  // 以單字 id 決定答案位置，同一題每次一樣
  const shift = [...word.id].reduce((n, c) => n + c.charCodeAt(0), 0) % options.length;
  const rotated = options.slice(shift).concat(options.slice(0, shift));
  return {
    id: `mw-${word.id}`, group: word.id, wordId: word.id, type: 'choice',
    prompt: '這個單字的中文是？', sentence: word.en, sentenceAudio: word.audio,
    options: rotated, answer: word.zh,
    explanation: `${word.en} ${word.ipa}（${word.posZh}）是「${word.zh}」。例句：${word.example.en}（${word.example.zh}）`,
  };
}

export function buildMistakes(attempts, { index, wordsMap, now = Date.now() }) {
  const list = attempts.filter((a) => MISTAKE_KINDS.has(a.kind)).sort((a, b) => a.createdAt - b.createdAt);
  const map = new Map();
  for (const a of list) {
    const key = attemptKey(a);
    if (!key) continue;
    let m = map.get(key);
    if (!m) {
      m = { key, wrongCount: 0, lastWrongAt: null, lastWrongItemId: null, lastWrongAnswer: null, lastCorrectAt: null, lessonId: a.lessonId || null, group: a.group || null, wordId: a.wordId || null, streak: 0, streakAt: null };
      map.set(key, m);
    }
    if (a.correct) {
      m.lastCorrectAt = a.createdAt;
      // 答錯之後的答對才算訂正進度；同一天連答兩次只算一次
      if (m.lastWrongAt !== null && (m.streakAt === null || a.createdAt - m.streakAt >= MIN_GAP)) {
        m.streak += 1;
        m.streakAt = a.createdAt;
      }
    } else {
      m.streak = 0;
      m.streakAt = null;
      m.wrongCount += 1;
      m.lastWrongAt = a.createdAt;
      m.lastWrongItemId = a.itemId;
      m.lastWrongAnswer = a.answer ?? null;
    }
  }
  const out = [];
  for (const m of map.values()) {
    if (!m.wrongCount) continue;
    m.fixed = m.streak >= FIX_NEEDED;
    m.dueAt = m.fixed ? null : m.streak === 0 ? m.lastWrongAt : m.streakAt + RECHECK_DAYS * DAY;
    m.due = !m.fixed && m.dueAt <= now;
    const fromIndex = m.lastWrongItemId && index.get(m.lastWrongItemId);
    m.category = categoryOf(m, fromIndex);
    if (m.key.startsWith('lesson|') && fromIndex) {
      m.question = fromIndex.question;
      m.source = fromIndex.lessonTitle;
    } else if (m.wordId && wordsMap.get(m.wordId)) {
      m.question = wordQuestion(wordsMap.get(m.wordId), [...wordsMap.values()]);
      m.source = '單字';
    } else {
      continue; // 教材已移除的題目不顯示
    }
    out.push(m);
  }
  const rank = (m) => (m.fixed ? 2 : m.due ? 0 : 1);
  out.sort((a, b) => rank(a) - rank(b) || b.lastWrongAt - a.lastWrongAt);
  return out;
}

// 錯題重練：課程題優先出「同組的另一題」（相似題），沒有才出原題
// 只出「今天到期」的；category 可以只練某一類（例如 part5、grammar、word）
export function retrainQuestions(mistakes, { byGroup }, max = RETRAIN_MAX, { category = null } = {}) {
  const pending = mistakes.filter((m) => m.due && (!category || m.category === category)).slice(0, max);
  return pending.map((m) => {
    let q = m.question;
    if (m.lessonId) {
      const group = byGroup.get(`${m.lessonId}|${m.group}`) || [];
      q = group.find((x) => x.id !== m.lastWrongItemId) || m.question;
    }
    return { ...q, id: `mx-${m.key}`, _key: m.key, _lessonId: m.lessonId, group: m.group || q.group };
  });
}
