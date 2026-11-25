import { test, assert } from './runner.js';
import { buildUnitLesson, nextUnit, unitProgress, seriesProgress, parseUnitId, searchWords, topicSeries, findSeries, seededRng } from '../js/bank.js';
import { expandLesson, isCorrect } from '../js/lesson/engine.js';
import { planToday } from '../js/progress.js';

const W = (id, zh, topic = 'office', rank = 1) => ({ id, en: id, zh, pos: 'n.', posZh: '名詞', ipa: '/x/', audio: `a/${id}.mp3`, topic, list: 'tsl', rank, example: { en: `I like ${id}.`, zh: '我喜歡。' } });
const words = ['memo', 'client', 'fax', 'lobby', 'refund', 'clerk'].map((id, i) => W(id, `中${i}`, i % 2 ? 'office' : 'travel', i + 1));
const wordsMap = new Map(words.map((w) => [w.id, w]));
const series = { id: 'hot', icon: '🔥', name: '多益高頻', desc: '', count: 6, units: [['memo', 'client', 'fax', 'lobby'], ['refund', 'clerk']] };
const rec = (status) => ({ status });

test('單字庫：單元課程有認字、測驗、答案解析，題目答案唯一', () => {
  const l = buildUnitLesson(series, 0, wordsMap);
  assert.equal(l.id, 'unit:hot:0');
  const ex = expandLesson(l);
  assert.equal(ex.steps.filter((s) => s.kind === 'word').length, 4);
  const practice = ex.steps.filter((s) => s.kind === 'practice');
  assert.equal(practice.length, 3, '認字測驗上、下＋活用練習');
  const kinds = new Set();
  for (const st of practice) for (const q of [...st.questions, ...st.similar]) {
    kinds.add(q.kind || 'basic');
    if (q.type === 'choice') {
      assert.equal(q.options.filter((o) => o === q.answer).length, 1, q.id);
      assert.equal(new Set(q.options).size, q.options.length, q.id);
    }
    if (q.kind === 'cloze') assert.ok(q.sentence.includes('___') && !q.sentence.toLowerCase().includes(q.answer.toLowerCase() + ' '), q.id);
    if (q.kind === 'listen' || q.kind === 'spell') assert.ok(q.audio, `${q.id} 要有音檔`);
    assert.ok(isCorrect(q, q.answer));
    assert.ok(wordsMap.has(q.wordId));
  }
  assert.ok(kinds.has('listen') && kinds.has('cloze') && kinds.has('spell'), [...kinds].join(','));
  assert.equal(ex.steps[ex.steps.length - 1].kind, 'review');
});

test('單字庫：沒有音檔的字（單檔版）不出聽力和拼字題', () => {
  const noAudio = new Map([...wordsMap].map(([k, w]) => [k, { ...w, audio: undefined }]));
  const l = expandLesson(buildUnitLesson(series, 0, noAudio));
  for (const st of l.steps.filter((s) => s.kind === 'practice')) {
    for (const q of [...st.questions, ...st.similar]) assert.ok(!q.audio && q.kind !== 'spell' && q.kind !== 'listen', q.id);
  }
});

test('單字庫：同一個單元每次產生的題目順序一樣（暫停後繼續不會亂）', () => {
  const a = JSON.stringify(buildUnitLesson(series, 0, wordsMap));
  const b = JSON.stringify(buildUnitLesson(series, 0, wordsMap));
  assert.equal(a, b);
  const r = seededRng('x'); const v = r();
  assert.ok(v >= 0 && v < 1);
});

test('單字庫：進度與下一個單元', () => {
  const records = new Map([['memo', rec('learning')], ['client', rec('familiar')], ['fax', rec('learning')], ['lobby', rec('learning')], ['refund', rec('new')]]);
  assert.deepEqual(unitProgress(series.units[0], records), { learned: 4, total: 4, done: true });
  assert.equal(seriesProgress(series, records).learned, 4);
  const n = nextUnit(series, records);
  assert.equal(n.index, 1);
  assert.equal(n.id, 'hot:1');
  records.set('refund', rec('learning')); records.set('clerk', rec('learning'));
  assert.equal(nextUnit(series, records), null);
});

test('單字庫：單元 id 解析、情境分類、搜尋', () => {
  assert.deepEqual(parseUnitId('hot:3'), { seriesId: 'hot', index: 3 });
  assert.deepEqual(parseUnitId('topic-office:0'), { seriesId: 'topic-office', index: 0 });
  assert.equal(parseUnitId('bad'), null);
  const t = topicSeries('office', '辦公室', wordsMap, 2);
  assert.equal(t.count, 3);
  assert.deepEqual(t.units, [['client', 'lobby'], ['clerk']]);
  const bank = { unitSize: 20, topics: { office: '辦公室' }, series: [series] };
  assert.equal(findSeries(bank, 'hot', wordsMap), series);
  assert.equal(findSeries(bank, 'topic-office', wordsMap).count, 3);
  assert.equal(findSeries(bank, 'topic-nope', wordsMap), null);
  assert.deepEqual(searchWords(words, 'cl').map((w) => w.id), ['client', 'clerk']);
  assert.deepEqual(searchWords(words, '中3').map((w) => w.id), ['lobby']);
  assert.deepEqual(searchWords(words, ' '), []);
});

test('今日安排：有下一個單字單元就排進去；低電量沒有複習時先背單字', () => {
  const unit = { id: 'hot:0', icon: '🔥', title: '多益高頻・第 1 單元' };
  const p = planToday({ mode: 'normal', minutes: 15, lessons: [], access: new Map(), unit });
  assert.equal(p.items[0].type, 'unit');
  const low = planToday({ mode: 'low', minutes: 5, lessons: [], access: new Map(), unit });
  assert.equal(low.items[0].type, 'unit');
  const lowReview = planToday({ mode: 'low', minutes: 5, lessons: [], access: new Map(), dueCount: 3, unit });
  assert.equal(lowReview.items[0].type, 'review');
});
