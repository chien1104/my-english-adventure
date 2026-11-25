// 弱點分析（純邏輯）：依多益 Part 和文法點統計答對率，找出最需要加強的地方
export const PART_LABELS = {
  1: 'Part 1 照片描述', 2: 'Part 2 應答問題', 3: 'Part 3 簡短對話', 4: 'Part 4 簡短獨白',
  5: 'Part 5 句子填空', 6: 'Part 6 段落填空', 7: 'Part 7 閱讀理解',
};
export const MIN_ATTEMPTS = 4; // 作答太少的項目不列入「最需要加強」

export function analyzeWeakness(lessons, attempts) {
  const byId = new Map(lessons.map((l) => [l.id, l]));
  const examPart = new Map();
  for (const l of lessons) {
    if (l.type !== 'exam') continue;
    for (const st of l.steps) for (const q of st.questions || []) examPart.set(`${l.id}|${q.id}`, q.part);
  }
  const parts = new Map(Object.keys(PART_LABELS).map((k) => [Number(k), { key: `part${k}`, name: PART_LABELS[k], href: `#/world?id=part${k}`, correct: 0, total: 0 }]));
  const grammar = new Map();
  for (const a of attempts) {
    if (a.kind !== 'lesson') continue;
    const l = byId.get(a.lessonId);
    if (!l) continue;
    let part = null;
    if (l.type === 'exam') part = examPart.get(`${l.id}|${a.itemId}`) || null;
    else if (/^part[1-7]$/.test(l.world || '')) part = Number(l.world.slice(4));
    if (part && parts.has(part)) {
      const p = parts.get(part);
      p.total += 1;
      if (a.correct) p.correct += 1;
    }
    // 文法點：文法世界的每一課，以及 Part 5 的文法題型課
    if (l.type !== 'exam' && (l.world === 'grammar' || (l.world === 'part5' && l.type === 'toeic'))) {
      const g = grammar.get(l.id) || { key: l.id, name: l.title, href: `#/lesson?id=${l.id}`, correct: 0, total: 0 };
      g.total += 1;
      if (a.correct) g.correct += 1;
      grammar.set(l.id, g);
    }
  }
  const withRate = (x) => ({ ...x, rate: x.total ? Math.round((x.correct / x.total) * 100) : null });
  const partList = [...parts.values()].map(withRate);
  const grammarList = [...grammar.values()].map(withRate).sort((a, b) => a.rate - b.rate);
  const weakest = [...partList, ...grammarList]
    .filter((x) => x.total >= MIN_ATTEMPTS && x.rate < 80)
    .sort((a, b) => a.rate - b.rate || b.total - a.total)
    .slice(0, 3);
  return { parts: partList, grammar: grammarList, weakest };
}
