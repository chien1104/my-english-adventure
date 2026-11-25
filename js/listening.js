// 聽力訓練（純邏輯）：句子來源、聽寫比對
export const ROUND_SIZE = 5;

// 句子來源：課程裡有音檔的英文例句（短句優先，適合聽寫和跟讀）
export function collectSentences(lessons, { maxWords = 14 } = {}) {
  const out = [];
  const seen = new Set();
  for (const l of lessons) {
    for (const st of l.steps || []) {
      if (st.kind !== 'examples') continue;
      for (const it of st.items || []) {
        if (!it.audio || !it.en || seen.has(it.en)) continue;
        const n = words(it.en).length;
        if (n < 3 || n > maxWords) continue;
        seen.add(it.en);
        out.push({ en: it.en, zh: it.zh, audio: it.audio, lessonId: l.id, lessonTitle: l.title, world: l.world });
      }
    }
  }
  return out;
}

export function words(s) {
  return String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\s-]/g, ' ').split(/[\s-]+/).filter(Boolean);
}

// 聽寫比對：找出原句每個字有沒有寫對（最長共同子序列，順序也要對）
export function compareDictation(target, typed) {
  const t = words(target);
  const u = words(typed);
  const dp = Array.from({ length: t.length + 1 }, () => new Array(u.length + 1).fill(0));
  for (let i = t.length - 1; i >= 0; i--) {
    for (let j = u.length - 1; j >= 0; j--) {
      dp[i][j] = t[i] === u[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const hit = new Array(t.length).fill(false);
  let i = 0; let j = 0;
  while (i < t.length && j < u.length) {
    if (t[i] === u[j]) { hit[i] = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  // 原句保留標點與大小寫，逐字標記
  const tokens = String(target).split(/\s+/).filter(Boolean);
  let k = 0;
  const marked = tokens.map((tok) => {
    const n = words(tok).length;
    const ok = n === 0 || hit.slice(k, k + n).every(Boolean);
    k += n;
    return { text: tok, ok };
  });
  const correct = hit.filter(Boolean).length;
  return { marked, correct, total: t.length, rate: t.length ? Math.round((correct / t.length) * 100) : 0, extra: Math.max(0, u.length - correct) };
}

export function pickRound(pool, rng = Math.random, n = ROUND_SIZE) {
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
