import { test, assert } from './runner.js';
import {
  expandLesson, createState, submitAnswer, advance, currentQuestion, currentStep,
  isCorrect, normalizeText, reviewItems, lessonStats, canGoBack, goBack, reconcileState, MAX_RETRY_PER_GROUP,
} from '../js/lesson/engine.js';

const LESSON = expandLesson({
  id: 't', steps: [
    { kind: 'concept', title: 'c', body: ['x'] },
    { kind: 'words', title: 'w', wordIds: ['apple', 'egg'] },
    {
      kind: 'practice', title: 'p',
      questions: [
        { id: 'q1', group: 'g1', type: 'choice', options: ['a', 'b'], answer: 'a' },
        { id: 'q2', group: 'g2', type: 'choice', options: ['a', 'b'], answer: 'b' },
      ],
      similar: [{ id: 'q1b', group: 'g1', type: 'choice', options: ['a', 'b'], answer: 'b' }],
    },
    { kind: 'review', title: 'r' },
  ],
});

function goToPractice(s) { while (currentStep(LESSON, s).kind !== 'practice') s = advance(LESSON, s); return s; }

test('words 步驟展開成每個單字一張卡', () => {
  assert.equal(LESSON.steps.length, 5);
  assert.equal(LESSON.steps[1].kind, 'word');
  assert.equal(LESSON.steps[2].wordId, 'egg');
});

test('全部答對：依序完成並標記完成', () => {
  let s = goToPractice(createState(LESSON));
  for (const ans of ['a', 'b']) {
    s = submitAnswer(LESSON, s, ans).state;
    s = advance(LESSON, s);
  }
  assert.equal(currentStep(LESSON, s).kind, 'review');
  s = advance(LESSON, s);
  assert.equal(s.status, 'completed');
  assert.equal(lessonStats(LESSON, s).accuracy, 100);
});

test('答錯：排入同組相似題，並顯示正確答案', () => {
  let s = goToPractice(createState(LESSON));
  const r = submitAnswer(LESSON, s, 'b');
  assert.equal(r.result.correct, false);
  assert.equal(r.result.followUp, 'similar');
  assert.equal(r.result.correctText, 'a');
  s = advance(LESSON, r.state);
  s = submitAnswer(LESSON, s, 'b').state; s = advance(LESSON, s); // q2
  assert.equal(currentQuestion(LESSON, s).id, 'q1b');
});

test('沒有相似題時重練同一題，且同組最多補練 2 次', () => {
  let s = goToPractice(createState(LESSON));
  s = submitAnswer(LESSON, s, 'b').state; s = advance(LESSON, s); // q1 錯 → q1b
  s = submitAnswer(LESSON, s, 'a').state; s = advance(LESSON, s); // q2 錯 → q2 重練
  assert.equal(s.practice[3].queue.join(','), 'q1,q2,q1b,q2');
  s = submitAnswer(LESSON, s, 'a').state; s = advance(LESSON, s); // q1b 錯 → q1 重練（第 2 次）
  const r = submitAnswer(LESSON, s, 'b'); // q2 對
  s = advance(LESSON, r.state);
  s = submitAnswer(LESSON, s, 'b').state; // q1 再錯，已達上限
  assert.equal(s.practice[3].retries.g1, MAX_RETRY_PER_GROUP);
  assert.equal(s.practice[3].queue.length, 5);
});

test('未作答不能前進，已作答不能重複送出', async () => {
  const s = goToPractice(createState(LESSON));
  let threw = false; try { advance(LESSON, s); } catch { threw = true; }
  assert.ok(threw, '未作答應不能前進');
  const s2 = submitAnswer(LESSON, s, 'a').state;
  threw = false; try { submitAnswer(LESSON, s2, 'a'); } catch { threw = true; }
  assert.ok(threw, '不能重複作答');
});

test('答案解析列出每次作答與補練題', () => {
  let s = goToPractice(createState(LESSON));
  s = submitAnswer(LESSON, s, 'b').state; s = advance(LESSON, s);
  s = submitAnswer(LESSON, s, 'b').state; s = advance(LESSON, s);
  s = submitAnswer(LESSON, s, 'b').state; s = advance(LESSON, s);
  const items = reviewItems(LESSON, s);
  assert.equal(items.length, 3);
  assert.equal(items[0].correct, false);
  assert.equal(items[2].retry, true);
  assert.equal(lessonStats(LESSON, s).accuracy, 50);
});

test('可以回上一步，但練習開始後不能退回', () => {
  let s = createState(LESSON);
  assert.equal(canGoBack(LESSON, s), false);
  s = advance(LESSON, s);
  assert.ok(canGoBack(LESSON, s));
  assert.equal(goBack(LESSON, s).stepIndex, 0);
  s = goToPractice(s);
  assert.ok(canGoBack(LESSON, s), '練習還沒作答時可以回去看單字卡');
  s = submitAnswer(LESSON, s, 'a').state;
  assert.equal(canGoBack(LESSON, s), false);
});

test('暫停後還原：狀態可序列化，教材變動時自動修正', () => {
  let s = goToPractice(createState(LESSON));
  s = submitAnswer(LESSON, s, 'a').state;
  const restored = reconcileState(LESSON, JSON.parse(JSON.stringify(s)));
  assert.equal(restored.stepIndex, s.stepIndex);
  assert.equal(currentQuestion(LESSON, restored).id, 'q1');
  const broken = { ...s, stepIndex: 99, practice: { 3: { queue: ['zzz'], pos: 0, results: [] } } };
  const fixed = reconcileState(LESSON, broken);
  assert.equal(fixed.stepIndex, LESSON.steps.length - 1);
  assert.equal(fixed.practice[3], undefined);
});

test('拼字題：忽略大小寫與前後空白', () => {
  const q = { type: 'type', answer: 'apple' };
  assert.ok(isCorrect(q, '  Apple '));
  assert.ok(!isCorrect(q, 'aple'));
  assert.equal(normalizeText('I  can’t'), "i can't");
});

test('排序題：順序必須完全正確', () => {
  const q = { type: 'order', answer: ['I', 'am', 'a', 'student'] };
  assert.ok(isCorrect(q, ['I', 'am', 'a', 'student']));
  assert.ok(!isCorrect(q, ['am', 'I', 'a', 'student']));
  assert.ok(!isCorrect(q, ['I', 'am', 'a']));
});

test('「不知道」視為答錯', () => {
  assert.equal(isCorrect({ type: 'choice', answer: 'a' }, null), false);
});

test('作答後還沒按繼續就離開：還原時保留作答結果', async () => {
  const { pendingResult } = await import('../js/lesson/engine.js');
  let s = goToPractice(createState(LESSON));
  s = submitAnswer(LESSON, s, 'b').state;
  const restored = reconcileState(LESSON, JSON.parse(JSON.stringify(s)));
  const pr = pendingResult(LESSON, restored);
  assert.ok(pr, '應有待確認的作答');
  assert.equal(pr.correct, false);
  assert.equal(pr.followUp, 'similar');
  const next = advance(LESSON, restored);
  assert.equal(currentQuestion(LESSON, next).id, 'q2');
  assert.equal(pendingResult(LESSON, next), null);
});
