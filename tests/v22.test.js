// 2.2：聽力題跳過、多益程度測驗
import { test, assert } from './runner.js';
import * as E from '../js/lesson/engine.js';
import { scoreExam } from '../js/pages/exam.js';
import { levelPool, buildLevelTest, restoreLevelTest, progressSummary, LEVEL_PLAN } from '../js/level-test.js';

const lesson = E.expandLesson({ id: 't', steps: [
  { kind: 'practice', questions: [
    { id: 'L1', group: 'g1', type: 'choice', prompt: '聽', audio: 'a.mp3', options: ['x', 'y'], answer: 'x', explanation: '' },
    { id: 'R1', group: 'g2', type: 'choice', prompt: '讀', options: ['x', 'y'], answer: 'x', explanation: '' },
    { id: 'L2', group: 'g3', type: 'choice', prompt: '聽', audio: 'b.mp3', options: ['x', 'y'], answer: 'x', explanation: '' },
  ], similar: [
    { id: 'L1b', group: 'g1', type: 'choice', prompt: '不用聽', options: ['x', 'y'], answer: 'x', explanation: '' },
    { id: 'L2b', group: 'g3', type: 'choice', prompt: '還是要聽', audio: 'c.mp3', options: ['x', 'y'], answer: 'x', explanation: '' },
  ] },
  { kind: 'review' }] });

test('聽力題跳過：有不用聽的同組題就補上，沒有就不計分', () => {
  let s = E.createState(lesson, 1);
  assert.ok(E.canSkip(E.currentQuestion(lesson, s)));
  let r = E.skipQuestion(lesson, s, 2);
  assert.equal(r.replaced.id, 'L1b', '補上不用聽的題目');
  s = r.state;
  assert.equal(E.currentQuestion(lesson, s).id, 'L1b', '補題緊接著出');
  s = E.advance(lesson, E.submitAnswer(lesson, s, 'x').state);
  assert.ok(!E.canSkip(E.currentQuestion(lesson, s)), '閱讀題不能跳過');
  s = E.advance(lesson, E.submitAnswer(lesson, s, 'x').state);
  r = E.skipQuestion(lesson, s, 3);
  assert.equal(r.replaced, null, '補題也要聽，就不補');
  s = r.state;
  assert.equal(E.currentStep(lesson, s).kind, 'review', '最後一題跳過後直接進下一步');
  const st = E.lessonStats(lesson, s);
  assert.equal(st.total, 2, 'L1 用補題算、L2 不計分');
  assert.equal(st.firstCorrect, 2);
  assert.equal(st.skipped, 1);
  assert.equal(st.accuracy, 100);
  assert.ok(E.reviewItems(lesson, s).every((i) => i.question.id !== 'L2'), '解析頁不列跳過的題目');
});

test('模擬考：跳過的聽力題不計分；跳過後又作答就照常計分', () => {
  const qs = [
    { id: 'a', part: 2, type: 'choice', options: ['x', 'y'], answer: 'x' },
    { id: 'b', part: 2, type: 'choice', options: ['x', 'y'], answer: 'x' },
    { id: 'c', part: 5, type: 'choice', options: ['x', 'y'], answer: 'x' },
  ];
  const r = scoreExam(qs, { c: 'x' }, { a: true });
  assert.equal(r.total, 2);
  assert.equal(r.skipped, 1);
  assert.equal(r.listeningTotal, 1, 'b 沒跳過也沒作答：算錯');
  const r2 = scoreExam(qs, { a: 'x', c: 'x' }, { a: true });
  assert.equal(r2.skipped, 0);
  assert.equal(r2.correct, 2);
});

function fakeExams() {
  const mk = (id, n) => ({ id, type: 'exam', steps: [{ kind: 'practice', questions: [
    ...Array.from({ length: n }, (_, i) => ({ id: `${id}-p1-${i}`, part: 1 })),
    ...Array.from({ length: n * 2 }, (_, i) => ({ id: `${id}-p2-${i}`, part: 2 })),
    ...Array.from({ length: n * 3 }, (_, i) => ({ id: `${id}-p3-${i}`, part: 3, audio: `${id}-c${Math.floor(i / 3)}.mp3` })),
    ...Array.from({ length: n * 3 }, (_, i) => ({ id: `${id}-p4-${i}`, part: 4, audio: `${id}-t${Math.floor(i / 3)}.mp3` })),
    ...Array.from({ length: n * 3 }, (_, i) => ({ id: `${id}-p5-${i}`, part: 5 })),
    ...Array.from({ length: 8 }, (_, i) => ({ id: `${id}-p6-${i}`, part: 6, text: `${id}-P${Math.floor(i / 4)}` })),
    ...Array.from({ length: 10 }, (_, i) => ({ id: `${id}-p7-${i}`, part: 7, text: `${id}-T${i < 2 ? 0 : i < 5 ? 1 : 2}` })),
  ] }] });
  return [mk('ma', 3), mk('mb', 3), { id: 'x', type: 'grammar', steps: [] }];
}

test('程度測驗：題組整組抽、題數照比例、優先抽沒做過的', () => {
  const lessons = fakeExams();
  const pool = levelPool(lessons);
  assert.ok(pool.every((s) => s.part !== 3 || s.questions.length === 3), 'Part 3 一組 3 題');
  let seed = 1;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const t = buildLevelTest(lessons, new Set(), rng);
  const count = (p) => t.filter((q) => q.part === p).length;
  assert.equal(count(1), LEVEL_PLAN[1]);
  assert.equal(count(3), 3);
  assert.equal(count(6), 4);
  assert.ok(count(7) >= 5 && count(7) <= LEVEL_PLAN[7] + 2, String(count(7)));
  assert.equal(new Set(t.map((q) => q.id)).size, t.length, '不重複');
  assert.ok(t.every((q) => q.srcLesson && q.srcId && q.id === `${q.srcLesson}|${q.srcId}`));
  // 做過的題組排後面：把第一次抽到的全部標成做過，第二次應該都換新的（題庫夠大的 Part）
  const t2 = buildLevelTest(lessons, new Set(t.map((q) => q.id)), rng);
  const overlap = t2.filter((q) => t.some((x) => x.id === q.id) && q.part !== 6 && q.part !== 7);
  assert.equal(overlap.length, 0, overlap.map((q) => q.id).join(','));
  assert.deepEqual(restoreLevelTest(lessons, t.map((q) => q.id)).map((q) => q.id), t.map((q) => q.id), '繼續作答時題目一樣');
  assert.equal(restoreLevelTest(lessons, ['nope|1']), null);
});

test('程度測驗：和上次、第一次比較（只考閱讀的不算）', () => {
  assert.equal(progressSummary([]), null);
  const h = [
    { at: 1, estimate: { total: 400 } },
    { at: 2, mode: 'reading', estimate: { total: null, reading: 250 } },
    { at: 3, estimate: { total: 450 } },
    { at: 4, estimate: { total: 430 } },
  ];
  const s = progressSummary(h);
  assert.equal(s.last.estimate.total, 430);
  assert.equal(s.sincePrev, -20);
  assert.equal(s.sinceFirst, 30);
  assert.equal(s.best, 450);
  assert.equal(s.count, 3);
  assert.equal(progressSummary([{ at: 1, estimate: { total: 500 } }]).sincePrev, null);
});

import { newRun, answer, stageResult, runSummary, finishRun, questionFor, stageCount, STAGE_SIZE } from '../js/games/word-test.js';

test('單字總測驗：分關、連對、錯字、最佳紀錄', () => {
  const ids = Array.from({ length: 45 }, (_, i) => `w${i}`);
  let run = newRun(ids, () => 0.3, 1);
  assert.equal(run.order.length, 45);
  assert.equal(new Set(run.order).size, 45);
  assert.equal(stageCount(run), 3);
  for (let i = 0; i < STAGE_SIZE; i++) run = answer(run, run.order[i], i % 4 !== 0);
  const st = stageResult(run, 0);
  assert.equal(st.total, 20);
  assert.equal(st.right, 15);
  assert.equal(st.rate, 75);
  assert.equal(st.stars, 2);
  assert.equal(st.wrong.length, 5);
  assert.equal(run.bestCombo, 3);
  const sum = runSummary(run);
  assert.equal(sum.done, false);
  assert.equal(sum.tested, 20);
  const rec = finishRun({ best: { rate: 90, total: 40, at: 0 } }, sum, 5);
  assert.equal(rec.best.rate, 90, '沒超過舊紀錄就不換');
  assert.equal(finishRun(rec, { rate: 95, total: 45, right: 43 }, 9).best.at, 9);
});

test('單字總測驗：題型輪流，沒音檔時不出聽力和拼字', () => {
  const W = (id, en) => ({ id, en, zh: id + '中', pos: 'n.', posZh: '名詞', ipa: '/x/', example: { en: `I like the ${en}.`, zh: '例' } });
  const pool = ['apple', 'table', 'river', 'pencil', 'garden'].map((e) => W(e, e));
  const kinds = [0, 1, 2, 3, 4].map((i) => questionFor(pool[0], pool, Math.random, i));
  assert.ok(kinds.every((q) => !q.audio && q.kind !== 'spell'));
  assert.equal(kinds[3].kind, 'cloze');
  assert.ok(kinds.every((q) => q.id === 'wt-apple'));
});

import { resolveTheme, THEMES } from '../js/theme.js';
import { sanitize as sanitizeSettings } from '../js/settings.js';

test('外觀：白天／深色／跟著手機', () => {
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('auto', true), 'dark');
  assert.equal(resolveTheme('auto', false), 'light');
  assert.deepEqual(Object.keys(THEMES), ['light', 'dark', 'auto']);
  assert.equal(sanitizeSettings({ theme: 'dark' }).theme, 'dark');
  assert.equal(sanitizeSettings({ theme: 'purple' }).theme, 'light', '不認得的值用預設');
});
