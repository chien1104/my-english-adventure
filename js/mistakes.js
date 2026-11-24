// 錯題百科（純邏輯）
// 同一個「考點」答錯過就列入：課程題以「課程＋題組」為單位，單字題以「單字」為單位。
// 之後在同一考點答對（不論原題或相似題），就算「已訂正」；再答錯會回到「待訂正」。

export const MISTAKE_KINDS = new Set(['lesson', 'review', 'mistake', 'game']);
export const RETRAIN_MAX = 10;

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
        index.set(q.id, { question: q, lessonId: l.id, lessonTitle: l.title });
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

export function buildMistakes(attempts, { index, wordsMap }) {
  const list = attempts.filter((a) => MISTAKE_KINDS.has(a.kind)).sort((a, b) => a.createdAt - b.createdAt);
  const map = new Map();
  for (const a of list) {
    const key = attemptKey(a);
    if (!key) continue;
    let m = map.get(key);
    if (!m) {
      m = { key, wrongCount: 0, lastWrongAt: null, lastWrongItemId: null, lastWrongAnswer: null, lastCorrectAt: null, lessonId: a.lessonId || null, group: a.group || null, wordId: a.wordId || null };
      map.set(key, m);
    }
    if (a.correct) m.lastCorrectAt = a.createdAt;
    else {
      m.wrongCount += 1;
      m.lastWrongAt = a.createdAt;
      m.lastWrongItemId = a.itemId;
      m.lastWrongAnswer = a.answer ?? null;
    }
  }
  const out = [];
  for (const m of map.values()) {
    if (!m.wrongCount) continue;
    m.fixed = m.lastCorrectAt !== null && m.lastCorrectAt > m.lastWrongAt;
    const fromIndex = m.lastWrongItemId && index.get(m.lastWrongItemId);
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
  out.sort((a, b) => (a.fixed === b.fixed ? b.lastWrongAt - a.lastWrongAt : a.fixed ? 1 : -1));
  return out;
}

// 錯題重練：課程題優先出「同組的另一題」（相似題），沒有才出原題
export function retrainQuestions(mistakes, { byGroup }, max = RETRAIN_MAX) {
  const pending = mistakes.filter((m) => !m.fixed).slice(0, max);
  return pending.map((m) => {
    let q = m.question;
    if (m.lessonId) {
      const group = byGroup.get(`${m.lessonId}|${m.group}`) || [];
      q = group.find((x) => x.id !== m.lastWrongItemId) || m.question;
    }
    return { ...q, id: `mx-${m.key}`, _key: m.key, _lessonId: m.lessonId, group: m.group || q.group };
  });
}
