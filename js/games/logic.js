// 遊戲共用邏輯（純函式，可測試）
// 遊戲只使用「學過的單字」，讓遊戲成為複習，而不是猜新字。

export const MIN_WORDS = 4;
export const GAMES = {
  match: { id: 'match', name: '圖字配對', icon: '🧩', desc: '把圖片和英文單字配成一對。', unit: '次失誤' },
  speed: { id: 'speed', name: '單字快打', icon: '⚡', desc: '60 秒內答對越多越好。', unit: '分' },
  spell: { id: 'spell', name: '拼字工坊', icon: '🔤', desc: '用字母方塊拼出單字。', unit: '題一次答對' },
};
export const SPEED_SECONDS = 60;
export const MATCH_PAIRS = 5;
export const SPELL_ROUNDS = 5;

export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickWords(words, n, rng = Math.random) {
  return shuffle(words, rng).slice(0, Math.min(n, words.length));
}

// ---------- 圖字配對 ----------
export function createMatch(words, rng = Math.random) {
  const chosen = pickWords(words, MATCH_PAIRS, rng);
  return {
    pictures: shuffle(chosen.map((w) => w.id), rng),
    labels: shuffle(chosen.map((w) => w.id), rng),
    matched: [],
    selected: null, // { side, id }
    mistakes: 0,
    total: chosen.length,
  };
}

// 回傳 { state, event }：event 為 'select' | 'match' | 'miss' | 'done'
export function matchTap(state, side, id) {
  const s = { ...state, matched: [...state.matched] };
  if (s.matched.includes(id)) return { state: s, event: 'ignore' };
  if (!s.selected || s.selected.side === side) {
    s.selected = { side, id };
    return { state: s, event: 'select' };
  }
  const other = s.selected;
  s.selected = null;
  if (other.id === id) {
    s.matched.push(id);
    return { state: s, event: s.matched.length === s.total ? 'done' : 'match', wordId: id };
  }
  s.mistakes += 1;
  const pictureId = side === 'picture' ? id : other.id;
  return { state: s, event: 'miss', wordId: pictureId, pair: [other, { side, id }] };
}

// ---------- 單字快打 ----------
export function speedQuestion(words, rng = Math.random, avoidId = null) {
  const pool = words.length > 1 ? words.filter((w) => w.id !== avoidId) : words;
  const w = pool[Math.floor(rng() * pool.length)];
  const others = shuffle(words.filter((o) => o.id !== w.id && o.zh !== w.zh && o.en !== w.en), rng).slice(0, 2);
  const usePicture = !!w.image && rng() < 0.5;
  if (usePicture) {
    return { wordId: w.id, kind: 'picture', image: w.image, options: shuffle([w.en, ...others.map((o) => o.en)], rng), answer: w.en };
  }
  return { wordId: w.id, kind: 'en', prompt: w.en, audio: w.audio, options: shuffle([w.zh, ...others.map((o) => o.zh)], rng), answer: w.zh };
}

// ---------- 拼字工坊 ----------
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
export function spellTiles(word, rng = Math.random, extra = 2) {
  const letters = word.toLowerCase().split('');
  const pool = ALPHABET.split('').filter((c) => !letters.includes(c));
  const extras = shuffle(pool, rng).slice(0, extra);
  return shuffle([...letters, ...extras].map((ch, i) => ({ id: i, ch })), rng);
}

export function spellCheck(word, tiles, pickedIds) {
  const text = pickedIds.map((id) => tiles.find((t) => t.id === id).ch).join('');
  return { text, correct: text === word.toLowerCase() };
}

// ---------- 最佳紀錄 ----------
export function updateBest(record, gameId, score, now = Date.now()) {
  const r = record ? { ...record } : { id: `game:${gameId}`, best: null, plays: 0, lastAt: null, lastScore: null };
  r.plays += 1;
  r.lastAt = now;
  r.lastScore = score;
  const better = gameId === 'match' ? (r.best === null || score < r.best) : (r.best === null || score > r.best);
  if (better) r.best = score;
  return { record: r, isBest: better };
}
