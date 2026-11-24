// 教材品質自動檢查：答案唯一、選項合法、圖片存在、引用正確
import { test, assert } from './runner.js';
import { expandLesson } from '../js/lesson/engine.js';

const base = '../';
const getJSON = async (p) => { const r = await fetch(base + p); if (!r.ok) throw new Error(`讀不到 ${p}`); return r.json(); };
const exists = async (p) => (await fetch(base + p, { method: 'HEAD' })).ok;

let cache;
async function loadAll() {
  if (cache) return cache;
  const catalog = await getJSON('data/catalog.json');
  const words = (await Promise.all(catalog.vocab.map(getJSON))).flat();
  const lessons = await Promise.all(catalog.lessons.map(getJSON));
  const diagnosis = await getJSON(catalog.diagnosis);
  const series = catalog.series ? await getJSON(catalog.series) : null;
  cache = { catalog, words, lessons, diagnosis, series };
  return cache;
}

const REQUIRED_WORD_FIELDS = ['id', 'en', 'zh', 'pos', 'posZh', 'ipa', 'level', 'audio', 'example'];

function checkQuestion(q, ctx, wordIds) {
  assert.ok(q.id && q.type && q.explanation, `${ctx}: 缺少 id/type/explanation`);
  if (q.type === 'choice') {
    assert.ok(Array.isArray(q.options) && q.options.length >= 2, `${q.id}: 選項不足`);
    assert.equal(new Set(q.options).size, q.options.length, `${q.id}: 選項重複`);
    assert.equal(q.options.filter((o) => o === q.answer).length, 1, `${q.id}: 答案必須剛好出現一次`);
  }
  if (q.type === 'order') {
    assert.deepEqual([...q.tokens].sort(), [...q.answer].sort(), `${q.id}: 字卡與答案不符`);
    assert.ok(q.tokens.join(' ') !== q.answer.join(' '), `${q.id}: 字卡不可以已經排好`);
  }
  if (q.type === 'type') assert.ok(typeof q.answer === 'string' && q.answer.length, `${q.id}: 缺答案`);
  if (q.image) assert.ok(wordIds.has(q.image), `${q.id}: 圖片單字 ${q.image} 不存在`);
  if (q.wordId) assert.ok(wordIds.has(q.wordId), `${q.id}: 單字 ${q.wordId} 不存在`);
  if (q.sentence && q.type === 'choice' && q.sentence.includes('___')) {
    assert.equal(q.sentence.split('___').length, 2, `${q.id}: 只能有一個空格`);
  }
}

test('教材：單字欄位完整、id 不重複、例句有中英文', async () => {
  const { words } = await loadAll();
  const ids = new Set();
  for (const w of words) {
    for (const f of REQUIRED_WORD_FIELDS) assert.ok(w[f] !== undefined && w[f] !== '', `${w.id}: 缺少 ${f}`);
    assert.ok(!ids.has(w.id), `單字重複：${w.id}`); ids.add(w.id);
    assert.ok(/^\/.+\/$/.test(w.ipa), `${w.id}: 音標格式應為 /.../`);
    assert.ok(w.example.en && w.example.zh, `${w.id}: 例句不完整`);
    const ex = w.example.en.toLowerCase();
    const en = w.en.toLowerCase();
    // 單字庫的例句可以用變化形（bakes、postponed）：至少要包含字的前段
    assert.ok(ex.includes(en) || (w.list && ex.includes(en.slice(0, Math.max(3, en.length - 3)))), `${w.id}: 例句要包含這個單字`);
    if (!w.list) assert.ok(w.image, `${w.id}: 入門單字要有插圖`);
    assert.equal(w.audio, `assets/audio/words/${w.id}.mp3`, `${w.id}: 音檔路徑規則不符`);
  }
});

test('教材：每個單字的 SVG 插畫都存在', async () => {
  const { words } = await loadAll();
  for (const w of words) if (w.image) assert.ok(await exists(w.image), `缺少圖片 ${w.image}`);
});

test('教材：課程題目答案唯一、引用的單字存在、題號不重複', async () => {
  const { words, lessons } = await loadAll();
  const wordIds = new Set(words.map((w) => w.id));
  const qids = new Set();
  for (const raw of lessons) {
    const l = expandLesson(raw);
    for (const step of l.steps) {
      if (step.kind === 'word') assert.ok(wordIds.has(step.wordId), `${l.id}: 單字 ${step.wordId} 不存在`);
      if (step.kind !== 'practice') continue;
      const groups = new Set(step.questions.map((q) => q.group));
      for (const q of [...step.questions, ...(step.similar || [])]) {
        checkQuestion(q, l.id, wordIds);
        assert.ok(!qids.has(q.id), `題號重複：${q.id}`); qids.add(q.id);
      }
      for (const s of step.similar || []) assert.ok(groups.has(s.group), `${s.id}: 相似題找不到同組主題目`);
    }
  }
});

test('教材：文法課包含 8 個必要部分', async () => {
  const { lessons } = await loadAll();
  for (const l of lessons.filter((x) => x.type === 'grammar' || x.id === 'toeic-p5-1')) {
    const kinds = l.steps.map((s) => s.kind);
    assert.deepEqual(kinds, ['concept', 'explain', 'examples', 'breakdown', 'contrast', 'practice', 'review', 'practice'], `${l.id} 結構不完整`);
  }
});

test('教材：診斷題答案唯一，等級區間涵蓋所有分數', async () => {
  const { diagnosis, words } = await loadAll();
  const wordIds = new Set(words.map((w) => w.id));
  for (const q of diagnosis.questions) {
    checkQuestion(q, 'diagnosis', wordIds);
    assert.ok(diagnosis.sections.some((s) => s.id === q.section), `${q.id}: 分項不存在`);
    if (q.passage) assert.ok(diagnosis.passages[q.passage], `${q.id}: 文章不存在`);
  }
  for (let n = 0; n <= diagnosis.questions.length; n++) {
    assert.equal(diagnosis.levels.filter((l) => n >= l.min && n <= l.max).length, 1, `分數 ${n} 沒有對應唯一等級`);
  }
});

test('教材：先修課程都存在', async () => {
  const { lessons } = await loadAll();
  const ids = new Set(lessons.map((l) => l.id));
  for (const l of lessons) for (const r of l.requires || []) assert.ok(ids.has(r), `${l.id} 的先修課 ${r} 不存在`);
});

function collectAudio(obj, out = new Set()) {
  if (Array.isArray(obj)) { obj.forEach((x) => collectAudio(x, out)); return out; }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if ((k === 'audio' || k === 'exampleAudio') && typeof v === 'string') out.add(v);
      else collectAudio(v, out);
    }
  }
  return out;
}

test('教材：所有課程與單字引用的音檔、照片都存在', async () => {
  const { words, lessons } = await loadAll();
  const audio = collectAudio([words, lessons]);
  assert.ok(audio.size > 150, `音檔數量太少：${audio.size}`);
  const missing = [];
  const list = [...audio];
  for (let i = 0; i < list.length; i += 50) { // 音檔很多：一次檢查 50 個
    const ok = await Promise.all(list.slice(i, i + 50).map(exists));
    ok.forEach((v, j) => { if (!v) missing.push(list[i + j]); });
  }
  assert.equal(missing.length, 0, `缺少音檔：${missing.slice(0, 5).join(', ')}`);
  for (const l of lessons) for (const st of l.steps) for (const q of [...(st.questions || []), ...(st.similar || [])]) {
    if (q.scene) assert.ok(await exists(q.scene), `${q.id} 缺少照片 ${q.scene}`);
  }
});

test('教材：題目說要「聽」就一定有音檔；多益聽力模擬練習每題都有音檔', async () => {
  const { lessons } = await loadAll();
  for (const l of lessons) l.steps.forEach((st) => {
    for (const q of [...(st.questions || []), ...(st.similar || [])]) {
      if (q.prompt.includes('聽')) assert.ok(q.audio, `${q.id} 提示要聽卻沒有音檔`);
      if (l.type === 'toeic-listen' && st.title === '模擬練習') assert.ok(q.audio, `${q.id} 多益聽力題沒有音檔`);
      if (q.part && q.part <= 4) assert.ok(q.audio, `${q.id} 模擬考聽力題沒有音檔`);
      if (q.promptSay) assert.ok(q.prompt.includes(q.promptSay.text) && q.promptSay.audio, `${q.id} 題目發音的英文對不上題目`);
    }
  });
});

test('教材：模擬考七大題型各 3 題，且有限時', async () => {
  const { lessons } = await loadAll();
  const exam = lessons.find((l) => l.type === 'exam');
  assert.ok(exam && exam.timeLimit > 0);
  const qs = exam.steps[0].questions;
  for (let p = 1; p <= 7; p++) assert.equal(qs.filter((q) => q.part === p).length, 3, `Part ${p} 題數不對`);
});

test('教材：對話與短文步驟都有音檔和中文', async () => {
  const { lessons } = await loadAll();
  for (const l of lessons) for (const st of l.steps) {
    if (st.kind === 'dialogue') { assert.ok(st.audio); for (const line of st.lines) assert.ok(line.audio && line.zh, `${l.id} 對話缺音檔或中文`); }
    if (st.kind === 'passage') assert.ok(st.audio && st.zh, `${l.id} 短文缺音檔或中文`);
  }
});

test('教材：多益單字系列的每個單元都是存在的單字，系列內不重複', async () => {
  const { words, series } = await loadAll();
  assert.ok(series && series.series.length >= 1, '缺少單字系列');
  const ids = new Set(words.map((w) => w.id));
  const topics = new Set(Object.keys(series.topics));
  for (const s of series.series) {
    const all = s.units.flat();
    assert.equal(all.length, s.count, `${s.id}: 字數不符`);
    assert.equal(new Set(all).size, all.length, `${s.id}: 單字重複`);
    for (const u of s.units) assert.ok(u.length > 0 && u.length <= series.unitSize, `${s.id}: 單元大小不對`);
    for (const id of all) assert.ok(ids.has(id), `${s.id}: 單字 ${id} 不存在`);
  }
  for (const w of words.filter((x) => x.list)) {
    assert.ok(topics.has(w.topic), `${w.id}: 情境 ${w.topic} 不存在`);
    assert.ok(w.exampleAudio && w.rank > 0, `${w.id}: 缺例句音檔或排名`);
  }
});
