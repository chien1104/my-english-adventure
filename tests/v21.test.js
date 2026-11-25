// 2.1 新功能：聽寫比對、預估分數、弱點分析、單字題型
import { test, assert } from './runner.js';
import { compareDictation, collectSentences, words } from '../js/listening.js';
import { estimateScore, latestEstimate } from '../js/score.js';
import { analyzeWeakness } from '../js/weakness.js';
import { clozeOf, canSpell, spellQuestion, listenQuestion, clozeQuestion, practiceQuestion } from '../js/word-questions.js';
import { buildReviewQuestions } from '../js/words.js';
import { isCorrect } from '../js/lesson/engine.js';
import { seededRng } from '../js/bank.js';

test('聽寫：全對 100%、漏字標紅、標點和大小寫不影響', () => {
  const a = compareDictation('Please wait near Gate 12.', 'please wait near gate 12');
  assert.equal(a.rate, 100);
  const b = compareDictation('The meeting will start at three.', 'the meeting start at tree');
  assert.equal(b.correct, 4);
  assert.equal(b.total, 6);
  assert.deepEqual(b.marked.map((m) => m.ok), [true, true, false, true, true, false]);
  assert.deepEqual(words("I'm running late!"), ["i'm", 'running', 'late']);
});

test('聽力訓練句子：只收有音檔、長度適中的課程例句，不重複', () => {
  const lessons = [{ id: 'a', title: 'A', steps: [{ kind: 'examples', items: [
    { en: 'The door is open.', zh: '門開著。', audio: 'x.mp3' },
    { en: 'Hi.', zh: '嗨。', audio: 'y.mp3' },
    { en: 'No audio here at all.', zh: '…' },
    { en: 'The door is open.', zh: '門開著。', audio: 'x.mp3' }] }] }];
  const s = collectSentences(lessons);
  assert.equal(s.length, 1);
  assert.equal(s[0].lessonId, 'a');
});

test('預估分數：線性換算、5 分一級、題數少誤差大', () => {
  const full = estimateScore({ listening: 50, listeningTotal: 50, reading: 50, readingTotal: 50 });
  assert.equal(full.total, 990);
  const zero = estimateScore({ listening: 0, listeningTotal: 50, reading: 0, readingTotal: 50 });
  assert.equal(zero.total, 10);
  const mid = estimateScore({ listening: 30, listeningTotal: 50, reading: 28, readingTotal: 50 });
  assert.equal(mid.listening % 5, 0);
  assert.ok(mid.total > 500 && mid.total < 600, String(mid.total));
  assert.equal(mid.margin, 40);
  assert.equal(estimateScore({ listening: 6, listeningTotal: 12, reading: 4, readingTotal: 9 }).margin, 90);
  assert.equal(estimateScore({ listening: 1, listeningTotal: 0, reading: 1, readingTotal: 3 }), null);
  const latest = latestEstimate([{ completedAt: 1, lastEstimate: { total: 400 } }, { completedAt: 5, lastEstimate: { total: 600 } }, { completedAt: 9 }]);
  assert.equal(latest.lastEstimate.total, 600);
});

test('弱點分析：依 Part 和文法點統計，挑出答對率最低的', () => {
  const lessons = [
    { id: 'p2', world: 'part2', type: 'toeic-listen', title: 'Part 2', steps: [] },
    { id: 'g4', world: 'grammar', type: 'grammar', title: '詞性判斷', steps: [] },
    { id: 'm', world: 'mock', type: 'exam', title: '模擬考', steps: [{ kind: 'practice', questions: [{ id: 'q1', part: 7 }, { id: 'q2', part: 2 }] }] },
  ];
  const at = (lessonId, itemId, correct) => ({ kind: 'lesson', lessonId, itemId, correct });
  const attempts = [
    ...[1, 1, 0, 0, 0].map((c, i) => at('p2', `x${i}`, !!c)),
    ...[1, 1, 1, 1, 1].map((c, i) => at('g4', `y${i}`, !!c)),
    at('m', 'q1', false), at('m', 'q2', true),
    { kind: 'review', correct: false },
  ];
  const w = analyzeWeakness(lessons, attempts);
  const p2 = w.parts.find((p) => p.key === 'part2');
  assert.equal(p2.total, 6);
  assert.equal(p2.correct, 3);
  assert.equal(w.parts.find((p) => p.key === 'part7').total, 1);
  assert.equal(w.grammar[0].rate, 100);
  assert.equal(w.weakest.length, 1, '只有作答夠多、答對率低於 80% 的才列入');
  assert.equal(w.weakest[0].key, 'part2');
});

const W = (id, en, zh, pos, ex, audio = `a/${id}.mp3`) => ({ id, en, zh, pos, posZh: pos === 'n.' ? '名詞' : '動詞', ipa: '/x/', audio, example: { en: ex, zh: '例句' } });
const pool = [
  W('refund', 'refund', '退款', 'n.', 'You can ask for a refund.'),
  W('invoice', 'invoice', '請款單', 'n.', 'Please pay the invoice by Friday.'),
  W('lobby', 'lobby', '大廳', 'n.', 'Wait in the lobby.'),
  W('mr', 'Mr.', '先生', 'n.', 'Mr. Lee is here.'),
  W('postpone', 'postpone', '延期', 'v.', 'They postponed the meeting.'),
];

test('單字題型：例句填空找得到字才出題，選項詞性相同、答案唯一', () => {
  assert.equal(clozeOf(pool[0]).sentence, 'You can ask for a ___.');
  assert.equal(clozeOf(pool[3]).sentence, '___ Lee is here.');
  assert.equal(clozeOf(pool[4]), null, 'postponed 不是 postpone，不出填空題');
  const q = clozeQuestion(pool[1], pool, seededRng('a'));
  assert.equal(q.options.filter((o) => o === q.answer).length, 1);
  assert.ok(isCorrect(q, 'invoice'));
  assert.ok(Object.keys(q.optionNotes).length === 2, '兩個錯誤選項都有解析');
});

test('單字題型：拼字只出一般字母的字；聽音選答一定有音檔', () => {
  assert.ok(canSpell(pool[0]));
  assert.ok(!canSpell(pool[3]), 'Mr. 有符號，不出拼字');
  assert.ok(!canSpell({ ...pool[0], audio: undefined }), '沒有音檔不出拼字');
  const s = spellQuestion(pool[0]);
  assert.equal(s.type, 'type');
  assert.ok(isCorrect(s, 'Refund'));
  assert.ok(s.hint.startsWith('r _ _'));
  assert.equal(listenQuestion({ ...pool[0], audio: undefined }, pool, seededRng('b')), null);
  const p = practiceQuestion({ ...pool[3], audio: undefined }, pool, seededRng('c'), 0);
  assert.equal(p.kind, 'cloze', '沒音檔時改出例句填空');
});

test('單字複習：生字本可以練還沒學過的字；題型會輪流', () => {
  const records = new Map();
  const qs = buildReviewQuestions(pool, records, { count: 10, ids: ['refund', 'invoice', 'lobby', 'postpone'], rng: seededRng('r') });
  assert.equal(qs.length, 4);
  assert.ok(new Set(qs.map((q) => q.kind || 'basic')).size >= 3, qs.map((q) => q.kind).join(','));
  for (const q of qs) assert.ok(q.id.startsWith('rv-'));
  assert.equal(buildReviewQuestions(pool, records, { count: 10 }).length, 0, '一般複習只練學過的字');
});
