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

test('錯題：答錯的考點列入，之後答對變成已訂正', () => {
  let m = buildMistakes([at({ correct: false, answer: 'b', createdAt: 1 })], { index: qi.index, wordsMap });
  assert.equal(m.length, 1);
  assert.equal(m[0].fixed, false);
  assert.equal(m[0].source, '課');
  m = buildMistakes([at({ correct: false, createdAt: 1 }), at({ itemId: 'q1b', correct: true, createdAt: 2 })], { index: qi.index, wordsMap });
  assert.equal(m[0].fixed, true, '相似題答對也算訂正');
});

test('錯題：訂正後又答錯，回到待訂正並累計次數', () => {
  const m = buildMistakes([
    at({ correct: false, createdAt: 1 }), at({ correct: true, createdAt: 2 }), at({ correct: false, createdAt: 3 }),
  ], { index: qi.index, wordsMap });
  assert.equal(m[0].fixed, false);
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

test('錯題重練：優先出同組相似題，已訂正的不出', () => {
  const m = buildMistakes([
    at({ correct: false, createdAt: 1 }),
    { kind: 'review', wordId: 'egg', itemId: 'x', correct: false, createdAt: 2 },
    { kind: 'review', wordId: 'egg', itemId: 'x', correct: true, createdAt: 3 },
  ], { index: qi.index, wordsMap });
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
