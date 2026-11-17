import { test, assert } from './runner.js';
import { createMatch, matchTap, speedQuestion, spellTiles, spellCheck, updateBest, MATCH_PAIRS } from '../js/games/logic.js';

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const W = ['apple', 'banana', 'bread', 'egg', 'milk', 'tea'].map((id, i) => ({ id, en: id, zh: '中' + i, image: `${id}.svg` }));

test('配對：每局 5 對，圖與字是同一組單字', () => {
  const m = createMatch(W, seq([0.1, 0.7, 0.3]));
  assert.equal(m.total, MATCH_PAIRS);
  assert.deepEqual([...m.pictures].sort(), [...m.labels].sort());
});

test('配對：配對成功、配錯算失誤、全部配完結束', () => {
  let s = createMatch(W.slice(0, 2), () => 0.5);
  let r = matchTap(s, 'picture', 'apple'); assert.equal(r.event, 'select');
  r = matchTap(r.state, 'label', 'banana'); assert.equal(r.event, 'miss'); assert.equal(r.state.mistakes, 1);
  assert.equal(r.wordId, 'apple', '失誤記在圖片那個單字');
  r = matchTap(r.state, 'label', 'apple'); r = matchTap(r.state, 'picture', 'apple');
  assert.equal(r.event, 'match');
  r = matchTap(r.state, 'picture', 'apple'); assert.equal(r.event, 'ignore', '已配對的不能再點');
  r = matchTap(r.state, 'picture', 'banana'); r = matchTap(r.state, 'label', 'banana');
  assert.equal(r.event, 'done');
});

test('配對：同一邊連點兩次只是換選擇', () => {
  let r = matchTap(createMatch(W, () => 0.2), 'picture', 'apple');
  r = matchTap(r.state, 'picture', 'egg');
  assert.equal(r.event, 'select');
  assert.equal(r.state.selected.id, 'egg');
});

test('快打：選項 3 個、不重複、包含答案，且不會連續出同一個字', () => {
  for (let i = 0; i < 30; i++) {
    const q = speedQuestion(W, Math.random, 'apple');
    assert.equal(q.options.length, 3);
    assert.equal(new Set(q.options).size, 3);
    assert.ok(q.options.includes(q.answer));
    assert.ok(q.wordId !== 'apple');
  }
});

test('拼字：方塊包含單字所有字母再加 2 個干擾字母', () => {
  const tiles = spellTiles('apple', Math.random);
  assert.equal(tiles.length, 7);
  const letters = tiles.map((t) => t.ch);
  for (const ch of 'apple') assert.ok(letters.includes(ch));
  const order = 'apple'.split('').map((ch) => { const t = tiles.find((x) => x.ch === ch && !x._used); t._used = true; return t.id; });
  assert.ok(spellCheck({ toLowerCase: () => 'apple' }, tiles, order).correct);
});

test('最佳紀錄：配對越少失誤越好，其他越高分越好', () => {
  let r = updateBest(null, 'match', 3).record;
  assert.equal(updateBest(r, 'match', 1).isBest, true);
  assert.equal(updateBest(r, 'match', 5).isBest, false);
  r = updateBest(null, 'speed', 10).record;
  assert.equal(updateBest(r, 'speed', 12).isBest, true);
  assert.equal(r.plays, 1);
});
