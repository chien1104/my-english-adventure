// 多益程度測驗（純邏輯）：從模擬考題庫隨機抽一份 30 題左右的短測驗，可以定期重考看進步
// 同一段對話、獨白、文章的題目一起抽；優先抽沒做過的題組，做過的才會重複出現。
export const LEVEL_ID = 'level';
export const LEVEL_KEY = 'leveltest';         // progress：歷次成績
export const LEVEL_DRAFT = 'exam-draft:level'; // progress：作答中的草稿
export const LEVEL_MINUTES = 25;
// 每個 Part 要抽幾題（題組會整組抽，所以實際題數可能多一兩題）
export const LEVEL_PLAN = { 1: 2, 2: 5, 3: 3, 4: 3, 5: 6, 6: 4, 7: 7 };

const setKey = (q) => `${q.part}|${q.part >= 3 && q.part <= 4 ? q.audio : q.part >= 6 ? q.text : q.id}`;

// 題庫：所有模擬考的題目，依題組分好
export function levelPool(lessons) {
  const sets = new Map();
  for (const l of lessons) {
    if (l.type !== 'exam') continue;
    for (const st of l.steps || []) {
      for (const q of st.questions || []) {
        if (!q.part) continue;
        const k = `${l.id}|${setKey(q)}`;
        if (!sets.has(k)) sets.set(k, { key: k, part: q.part, lessonId: l.id, questions: [] });
        sets.get(k).questions.push({ ...q, id: `${l.id}|${q.id}`, srcId: q.id, srcLesson: l.id });
      }
    }
  }
  return [...sets.values()];
}

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// seen：做過的題目（`課程id|題目id`）。沒做過的題組排前面，同樣是沒做過就隨機。
export function buildLevelTest(lessons, seen = new Set(), rng = Math.random, plan = LEVEL_PLAN) {
  const pool = levelPool(lessons);
  const out = [];
  for (const part of Object.keys(plan).map(Number)) {
    const want = plan[part];
    const sets = shuffle(pool.filter((s) => s.part === part), rng)
      .map((s) => ({ s, fresh: s.questions.every((q) => !seen.has(q.id)) }))
      .sort((a, b) => Number(b.fresh) - Number(a.fresh))
      .map((x) => x.s);
    let n = 0;
    for (const s of sets) {
      if (n >= want) break;
      if (n > 0 && n + s.questions.length > want + 2) continue; // 題組太大就換一組，避免題數爆掉
      out.push(...s.questions);
      n += s.questions.length;
    }
  }
  return out;
}

// 用題目 id 還原（繼續作答時題目要和開始時一樣）
export function restoreLevelTest(lessons, ids) {
  const byId = new Map(levelPool(lessons).flatMap((s) => s.questions).map((q) => [q.id, q]));
  const qs = ids.map((id) => byId.get(id)).filter(Boolean);
  return qs.length === ids.length ? qs : null;
}

// 和上一次、第一次比較（只比有完整聽力＋閱讀的成績）
export function progressSummary(history) {
  const full = (history || []).filter((h) => h.estimate?.total);
  if (!full.length) return null;
  const last = full[full.length - 1];
  const prev = full.length > 1 ? full[full.length - 2] : null;
  return {
    last, count: full.length,
    best: Math.max(...full.map((h) => h.estimate.total)),
    sincePrev: prev ? last.estimate.total - prev.estimate.total : null,
    sinceFirst: full.length > 1 ? last.estimate.total - full[0].estimate.total : null,
  };
}
