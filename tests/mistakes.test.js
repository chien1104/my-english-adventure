import { test, assert } from './runner.js';
import { buildQuestionIndex, buildMistakes, retrainQuestions, wordQuestion, attemptKey } from '../js/mistakes.js';

const LESSONS = [{
  id: 'L', title: '課', steps: [{
    kind: 'practice',
    questions: [{ id: 'q1', group: 'g1', type: 'choice', options: ['a', 'b'], answer: 'a' }],
    similar: [{ id: 'q1b', group: 'g1', type: 'choice', options: ['a', 'b'], answer: 'b' }],
  }],
}];
const W = (id, zh) => ({ id, en: id, zh, ipa: '/x/', posZh: '名詞', example: { en: 'x', zh: 'y' } });
const wordsMap = new Map([['apple', W('apple', '蘋果')], ['egg', W('egg', '蛋')], ['tea', W('tea', '茶')]]);
const qi = buildQuestionIndex(LESSONS);
const at = (o) => ({ kind: 'lesson', lessonId: 'L', group: 'g1', itemId: 'q1', createdAt: 0, ...o });

const DAY = 864e5;
test('錯題：答錯的考點列入；隔天再答對第二次才算訂正', () => {
  let m = buildMistakes([at({ correct: false, answer: 'b', createdAt: 1 })], { index: qi.index, wordsMap, now: 2 });
  assert.equal(m.length, 1);
  assert.equal(m[0].fixed, false);
  assert.equal(m[0].due, true, '剛答錯：今天就要複習');
  assert.equal(m[0].source, '課');
  m = buildMistakes([at({ correct: false, createdAt: 1 }), at({ itemId: 'q1b', correct: true, createdAt: 2 })], { index: qi.index, wordsMap, now: 3 });
  assert.equal(m[0].fixed, false, '答對一次還不算');
  assert.equal(m[0].streak, 1);
  assert.equal(m[0].due, false, '3 天後才再出現');
  assert.equal(m[0].dueAt, 2 + 3 * DAY);
  m = buildMistakes([at({ correct: false, createdAt: 1 }), at({ correct: true, createdAt: 2 }), at({ correct: true, createdAt: 3 })], { index: qi.index, wordsMap, now: 4 });
  assert.equal(m[0].streak, 1, '同一天連答兩次只算一次');
  m = buildMistakes([at({ correct: false, createdAt: 1 }), at({ correct: true, createdAt: 2 }), at({ itemId: 'q1b', correct: true, createdAt: 2 + 3 * DAY })], { index: qi.index, wordsMap, now: 4 * DAY });
  assert.equal(m[0].fixed, true, '相似題第二次答對：訂正');
});

test('錯題：分類（Part、文法、單字）', () => {
  const L2 = [
    { id: 'G', title: '文法', world: 'grammar', steps: [{ kind: 'practice', questions: [{ id: 'g1', group: 'x', type: 'choice', options: ['a', 'b'], answer: 'a' }], similar: [] }] },
    { id: 'M', title: '模擬', world: 'mock', type: 'exam', steps: [{ kind: 'practice', questions: [{ id: 'm1', group: 'm1', part: 7, type: 'choice', options: ['a', 'b'], answer: 'a' }], similar: [] }] },
  ];
  const q2 = buildQuestionIndex(L2);
  const m = buildMistakes([
    { kind: 'lesson', lessonId: 'G', group: 'x', itemId: 'g1', correct: false, createdAt: 1 },
    { kind: 'lesson', lessonId: 'M', group: 'm1', itemId: 'm1', correct: false, createdAt: 2 },
    { kind: 'review', wordId: 'egg', itemId: 'rv-egg', correct: false, createdAt: 3 },
  ], { index: q2.index, wordsMap, now: 9 });
  assert.deepEqual(m.map((x) => x.category).sort(), ['grammar', 'part7', 'word']);
  assert.equal(retrainQuestions(m, q2, 10, { category: 'part7' }).length, 1);
});

test('錯題：訂正後又答錯，回到待訂正並累計次數', () => {
  const m = buildMistakes([
    at({ correct: false, createdAt: 1 }), at({ correct: true, createdAt: 2 }), at({ correct: true, createdAt: 2 + DAY }), at({ correct: false, createdAt: 3 * DAY }),
  ], { index: qi.index, wordsMap, now: 4 * DAY });
  assert.equal(m[0].fixed, false);
  assert.equal(m[0].streak, 0);
  assert.equal(m[0].due, true);
  assert.equal(m[0].wrongCount, 2);
});

test('錯題：從沒答錯的考點不列入；診斷題不列入', () => {
  const m = buildMistakes([
    at({ correct: true, createdAt: 1 }),
    { kind: 'diagnosis', itemId: 'd-v1', group: 'vocab', correct: false, createdAt: 2 },
  ], { index: qi.index, wordsMap });
  assert.equal(m.length, 0);
});

test('錯題：單字複習／遊戲答錯以單字為單位', () => {
  const m = buildMistakes([
    { kind: 'review', itemId: 'rv-apple', wordId: 'apple', group: 'apple', correct: false, createdAt: 1 },
    { kind: 'game', itemId: 'g', wordId: 'apple', correct: false, createdAt: 2 },
  ], { index: qi.index, wordsMap });
  assert.equal(m.length, 1);
  assert.equal(m[0].wrongCount, 2);
  assert.equal(m[0].question.answer, '蘋果');
  assert.ok(m[0].question.options.includes('蘋果'));
});

test('錯題重練：優先出同組相似題，還沒到期的不出', () => {
  const m = buildMistakes([
    at({ correct: false, createdAt: 1 }),
    { kind: 'review', wordId: 'egg', itemId: 'x', correct: false, createdAt: 2 },
    { kind: 'review', wordId: 'egg', itemId: 'x', correct: true, createdAt: 3 },
  ], { index: qi.index, wordsMap, now: 4 });
  const qs = retrainQuestions(m, qi);
  assert.equal(qs.length, 1);
  assert.equal(qs[0].answer, 'b', '應出相似題 q1b');
  assert.equal(attemptKey({ lessonId: qs[0]._lessonId, group: qs[0].group }), 'lesson|L|g1');
});

test('單字題選項不重複，答案位置固定', () => {
  const q1 = wordQuestion(wordsMap.get('tea'), [...wordsMap.values()]);
  const q2 = wordQuestion(wordsMap.get('tea'), [...wordsMap.values()]);
  assert.equal(new Set(q1.options).size, 3);
  assert.deepEqual(q1.options, q2.options);
});
