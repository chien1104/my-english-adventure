import { test, assert } from './runner.js';
import { computeAccess, planToday, lessonKey } from '../js/progress.js';
import { scoreDiagnosis } from '../js/diagnosis.js';
import { applyAnswer, markLearned, buildReviewQuestions, isDue, DAY } from '../js/words.js';

const LESSONS = [
  { id: 'v1', world: 'word-village', order: 1, type: 'vocab', minutes: 10 },
  { id: 'v2', world: 'word-village', order: 2, type: 'vocab', minutes: 10 },
  { id: 'g1', world: 'grammar-castle', order: 1, type: 'grammar', minutes: 12 },
  { id: 'g2', world: 'grammar-castle', order: 2, type: 'grammar', minutes: 12 },
];
const TH = { vocab: 4, grammar: 4 };
const diag = (v, g) => ({ sections: { vocab: { score: v }, grammar: { score: g } } });

test('沒做診斷：全部課程鎖住', () => {
  const a = computeAccess(LESSONS, new Map(), null, TH);
  assert.ok([...a.values()].every((x) => !x.unlocked));
  assert.equal(a.get('v1').reason, '完成程度診斷後開放');
});

test('做完診斷：每個世界第一課開放，第二課要先完成第一課', () => {
  const a = computeAccess(LESSONS, new Map(), diag(1, 1), TH);
  assert.ok(a.get('v1').unlocked && a.get('g1').unlocked);
  assert.ok(!a.get('v2').unlocked && !a.get('g2').unlocked);
  const done = new Map([[lessonKey('v1'), { timesCompleted: 1, status: 'completed' }]]);
  assert.ok(computeAccess(LESSONS, done, diag(1, 1), TH).get('v2').unlocked);
});

test('診斷該項達標：直接開放該世界全部課程', () => {
  const a = computeAccess(LESSONS, new Map(), diag(5, 2), TH);
  assert.ok(a.get('v2').unlocked, '單字達標開放 v2');
  assert.ok(!a.get('g2').unlocked, '文法未達標不開放 g2');
});

test('進行中的課程顯示目前步驟', () => {
  const p = new Map([[lessonKey('v1'), { status: 'in_progress', stepIndex: 4, timesCompleted: 0 }]]);
  const a = computeAccess(LESSONS, p, diag(0, 0), TH);
  assert.equal(a.get('v1').status, 'in_progress');
  assert.equal(a.get('v1').stepIndex, 4);
});

test('今日安排：低電量只排複習', () => {
  const access = computeAccess(LESSONS, new Map(), diag(0, 0), TH);
  const plan = planToday({ mode: 'low', minutes: 5, lessons: LESSONS, access, dueCount: 8 });
  assert.equal(plan.items.length, 1);
  assert.equal(plan.items[0].type, 'review');
});

test('今日安排：低電量且沒有可複習單字時，排一堂可暫停的課', () => {
  const access = computeAccess(LESSONS, new Map(), diag(0, 0), TH);
  const plan = planToday({ mode: 'low', minutes: 5, lessons: LESSONS, access, dueCount: 0 });
  assert.equal(plan.items[0].type, 'lesson');
  assert.equal(plan.items[0].partial, true);
});

test('今日安排：專注 30 分鐘 = 複習 + 單字課 + 文法課', () => {
  const access = computeAccess(LESSONS, new Map(), diag(0, 0), TH);
  const plan = planToday({ mode: 'focus', minutes: 30, lessons: LESSONS, access, dueCount: 3 });
  assert.deepEqual(plan.items.map((i) => i.type + (i.lesson ? ':' + i.lesson.id : '')), ['review', 'lesson:v1', 'lesson:g1']);
});

test('今日安排：進行中的課優先', () => {
  const p = new Map([[lessonKey('g1'), { status: 'in_progress', stepIndex: 2, timesCompleted: 0 }]]);
  const access = computeAccess(LESSONS, p, diag(0, 0), TH);
  const plan = planToday({ mode: 'normal', minutes: 15, lessons: LESSONS, access, dueCount: 0 });
  assert.equal(plan.items[0].lesson.id, 'g1');
});

test('今日安排：全部完成時給提示', () => {
  const p = new Map(LESSONS.map((l) => [lessonKey(l.id), { timesCompleted: 1, status: 'completed' }]));
  const access = computeAccess(LESSONS, p, diag(0, 0), TH);
  const plan = planToday({ mode: 'normal', minutes: 15, lessons: LESSONS, access, dueCount: 16 });
  assert.ok(plan.note.includes('都完成了'));
});

test('診斷計分：分項、等級、不知道算錯', () => {
  const content = {
    id: 'd', sections: [{ id: 'vocab', title: '單字', threshold: 1 }, { id: 'grammar', title: '文法', threshold: 1 }],
    questions: [
      { id: 'a', section: 'vocab', type: 'choice', answer: 'x' },
      { id: 'b', section: 'grammar', type: 'choice', answer: 'y' },
    ],
    levels: [{ min: 0, max: 1, id: 'low', label: 'L', message: '' }, { min: 2, max: 2, id: 'hi', label: 'H', message: '' }],
  };
  const r = scoreDiagnosis(content, { a: 'x', b: null });
  assert.equal(r.total, 1);
  assert.equal(r.sections.vocab.score, 1);
  assert.equal(r.sections.grammar.score, 0);
  assert.equal(r.level.id, 'low');
});

test('間隔複習：學完隔天到期，按時答對間隔拉長，第 3 盒變熟悉', () => {
  const T0 = new Date(2026, 10, 17, 10).getTime();
  let r = markLearned(undefined, 'apple', T0);
  assert.equal(r.status, 'learning');
  assert.ok(!isDue(r, T0), '學完當天不到期');
  const d1 = T0 + DAY; assert.ok(isDue(r, d1));
  r = applyAnswer(r, 'apple', true, d1); assert.equal(r.box, 1); assert.equal(r.dueAt, d1 + 1 * DAY);
  const d2 = d1 + DAY; r = applyAnswer(r, 'apple', true, d2); assert.equal(r.box, 2); assert.equal(r.dueAt, d2 + 3 * DAY);
  const d5 = d2 + 3 * DAY; r = applyAnswer(r, 'apple', true, d5); assert.equal(r.box, 3);
  assert.equal(r.status, 'familiar');
});

test('間隔複習：提前練習答對不改排程；答錯回第 0 盒、今天再複習', () => {
  const T0 = new Date(2026, 10, 17, 10).getTime();
  let r = applyAnswer(markLearned(undefined, 'egg', T0), 'egg', true, T0 + DAY);
  const due = r.dueAt;
  r = applyAnswer(r, 'egg', true, T0 + DAY + 1000);
  assert.equal(r.dueAt, due, '未到期答對不改變排程');
  r = applyAnswer(r, 'egg', false, T0 + DAY + 2000);
  assert.equal(r.box, 0); assert.equal(r.status, 'learning'); assert.ok(isDue(r, T0 + DAY + 2000));
});

test('間隔複習：休息很久回來不扣分，只是到期等複習', () => {
  const T0 = new Date(2026, 10, 1, 10).getTime();
  let r = { wordId: 'tea', status: 'familiar', box: 4, dueAt: T0, correct: 9, wrong: 0, streak: 4 };
  const later = T0 + 40 * DAY;
  assert.ok(isDue(r, later));
  assert.equal(r.box, 4, '沒有因為休息而降盒');
  r = applyAnswer(r, 'tea', true, later); assert.equal(r.box, 5);
});

test('間隔複習：P2／P3 舊紀錄（沒有 box）可以直接使用', () => {
  const r = applyAnswer({ wordId: 'tea', status: 'familiar', correct: 3, wrong: 0, streak: 3, dueAt: 0 }, 'tea', true, Date.now());
  assert.equal(r.box, 4);
  assert.equal(r.status, 'familiar');
});

test('複習題：只出學過的字，選項不重複且包含答案', () => {
  const words = ['apple', 'banana', 'bread', 'egg'].map((id, i) => ({ id, en: id, zh: '中' + i, ipa: '', posZh: '', image: 'x', example: { en: '', zh: '' } }));
  const rec = new Map([['apple', markLearned(null, 'apple', 1)], ['egg', markLearned(null, 'egg', 2)]]);
  const qs = buildReviewQuestions(words, rec, { rng: () => 0.3 });
  assert.equal(qs.length, 2);
  for (const q of qs) {
    assert.ok(q.options.includes(q.answer));
    assert.equal(new Set(q.options).size, q.options.length);
  }
});

test('重新診斷分數變低：已開始或完成的課不會被鎖回去', () => {
  const p = new Map([[lessonKey('v2'), { status: 'in_progress', stepIndex: 3, timesCompleted: 0 }]]);
  const a = computeAccess(LESSONS, p, diag(0, 0), TH);
  assert.ok(a.get('v2').unlocked);
  assert.equal(a.get('v2').status, 'in_progress');
});

test('今日安排：有待訂正錯題時排入錯題重練', () => {
  const access = computeAccess(LESSONS, new Map(), diag(0, 0), TH);
  const plan = planToday({ mode: 'focus', minutes: 30, lessons: LESSONS, access, dueCount: 3, mistakeCount: 2 });
  assert.deepEqual(plan.items.map((i) => i.type), ['review', 'mistakes', 'lesson']);
  const low = planToday({ mode: 'low', minutes: 5, lessons: LESSONS, access, dueCount: 0, mistakeCount: 2 });
  assert.equal(low.items[0].type, 'mistakes');
});

test('先修課：多益課要完成指定文法課才開放', () => {
  const L = [...LESSONS, { id: 't1', world: 'toeic-camp', order: 1, type: 'toeic', minutes: 12, requires: ['g1', 'g2'], title: '多益' }];
  let a = computeAccess(L, new Map(), diag(5, 5), TH);
  assert.ok(!a.get('t1').unlocked);
  assert.ok(a.get('t1').reason.includes('完成'));
  const done = new Map([[lessonKey('g1'), { timesCompleted: 1 }], [lessonKey('g2'), { timesCompleted: 1 }]]);
  a = computeAccess(L, done, diag(0, 0), TH);
  assert.ok(a.get('t1').unlocked);
});
