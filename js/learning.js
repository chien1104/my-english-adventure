// 讀取學習狀態（給各頁面共用）
import { loadLessons, loadWordsMap } from './content.js';
import { computeAccess } from './progress.js';
import { thresholdsOf, DIAGNOSIS_KEY } from './diagnosis.js';
import { buildQuestionIndex, buildMistakes } from './mistakes.js';
import { dueWords, nextDueAt } from './words.js';

export async function loadContext(db) {
  const [lessons, progressAll, diagContent, reviews, wordsMap, attempts] = await Promise.all([
    loadLessons(db),
    db.getAll('progress'),
    db.getMeta('diagnosisContent'),
    db.getAll('reviews'),
    loadWordsMap(db),
    db.getAll('attempts'),
  ]);
  const progressById = new Map(progressAll.map((p) => [p.id, p]));
  const diagnosis = progressById.get(DIAGNOSIS_KEY) || null;
  const access = computeAccess(lessons, progressById, diagnosis, thresholdsOf(diagContent));
  const records = new Map(reviews.map((r) => [r.wordId, r]));
  const learnedCount = reviews.filter((r) => r.status !== 'new').length;
  const qIndex = buildQuestionIndex(lessons);
  const mistakes = buildMistakes(attempts, { index: qIndex.index, wordsMap });
  const learnedWords = [...wordsMap.values()].filter((w) => records.get(w.id) && records.get(w.id).status !== 'new');
  const due = dueWords(learnedWords, records);
  const nextDue = nextDueAt(records);
  return { lessons, progressById, diagnosis, diagContent, access, records, learnedCount, learnedWords, wordsMap, qIndex, mistakes, due, dueCount: due.length, nextDue, attempts };
}
