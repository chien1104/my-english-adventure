// 預估多益分數（純邏輯）：用模擬考的聽力、閱讀答對率粗估。
// 正式多益依每次考試難度換算，這裡用線性換算（每一部分 5～495 分），題數越少誤差越大，只當參考。
export const SECTION_MIN = 5;
export const SECTION_MAX = 495;

const toSection = (correct, total) => {
  const raw = SECTION_MIN + (SECTION_MAX - SECTION_MIN) * (correct / total);
  return Math.min(SECTION_MAX, Math.max(SECTION_MIN, Math.round(raw / 5) * 5));
};

export function estimateScore({ listening, listeningTotal, reading, readingTotal }) {
  if (!listeningTotal || !readingTotal) return null;
  const L = toSection(listening, listeningTotal);
  const R = toSection(reading, readingTotal);
  const n = listeningTotal + readingTotal;
  const margin = n >= 100 ? 40 : n >= 50 ? 60 : 90; // 題數越少，估計範圍越寬
  return { listening: L, reading: R, total: L + R, margin, questions: n };
}

// 最近一次有預估分數的模擬考
export function latestEstimate(progressList) {
  return progressList
    .filter((p) => p.lastEstimate && p.completedAt)
    .sort((a, b) => b.completedAt - a.completedAt)[0] || null;
}
