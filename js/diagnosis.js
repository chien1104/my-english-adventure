// 程度診斷計分（純邏輯）
import { isCorrect } from './lesson/engine.js';

export const DIAGNOSIS_KEY = 'diagnosis';

export function scoreDiagnosis(content, answers, now = Date.now()) {
  const sections = {};
  for (const s of content.sections) sections[s.id] = { score: 0, max: 0, title: s.title, threshold: s.threshold };
  let total = 0;
  const details = [];
  for (const q of content.questions) {
    const a = Object.prototype.hasOwnProperty.call(answers, q.id) ? answers[q.id] : null;
    const correct = isCorrect(q, a);
    sections[q.section].max += 1;
    if (correct) { sections[q.section].score += 1; total += 1; }
    details.push({ id: q.id, section: q.section, answer: a, correct });
  }
  const level = content.levels.find((l) => total >= l.min && total <= l.max) || content.levels[0];
  return {
    id: DIAGNOSIS_KEY,
    contentId: content.id,
    total,
    max: content.questions.length,
    sections,
    level: { id: level.id, label: level.label, message: level.message },
    details,
    completedAt: now,
  };
}

export function thresholdsOf(content) {
  const t = {};
  for (const s of content?.sections || []) t[s.id] = s.threshold;
  return t;
}
