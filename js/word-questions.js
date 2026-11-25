// 單字題型（純邏輯）：看英文選中文、看中文選英文、聽音選答、拼字、例句填空
// 單元學習和單字複習共用。沒有音檔的字（例如單檔版的單字庫）不出聽力和拼字題。

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function explainWord(w) {
  const sense = w.toeicSense ? `\n多益常考：${w.toeicSense}` : '';
  return `${w.en} ${w.ipa}（${w.posZh}）是「${w.zh}」。例句：${w.example.en}（${w.example.zh}）${sense}`;
}

// 錯誤選項逐一解析：每個選項是哪個字、什麼意思
function notesFor(options, byText, answer) {
  const notes = {};
  for (const o of options) {
    if (o === answer) continue;
    const w = byText.get(o);
    if (w) notes[o] = `${w.en}（${w.posZh}）是「${w.zh}」`;
  }
  return Object.keys(notes).length ? notes : undefined;
}

function distractors(w, pool, rng, n = 2, same = () => true) {
  const ok = (o) => o.id !== w.id && o.zh !== w.zh && o.en.toLowerCase() !== w.en.toLowerCase();
  const preferred = shuffle(pool.filter((o) => ok(o) && same(o)), rng);
  const rest = shuffle(pool.filter((o) => ok(o) && !same(o)), rng);
  return [...preferred, ...rest].slice(0, n);
}

const byMaps = (words) => {
  const m = new Map();
  for (const x of words) { m.set(x.zh, x); m.set(x.en, x); }
  return m;
};

// 只有一般英文字母的字才出拼字題（Mr.、o'clock、résumé 這類容易卡在符號上）
export const canSpell = (w) => !!w.audio && /^[a-z]+(?:[ -][a-z]+)?$/i.test(w.en) && w.en.length >= 3;

// 例句裡找到這個字（前後不是字母），把它換成空格
export function clozeOf(w) {
  const ex = w.example?.en;
  if (!ex) return null;
  const esc = w.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^A-Za-z])(${esc})(?=[^A-Za-z]|$)`, 'i');
  const m = re.exec(ex);
  if (!m) return null;
  const start = m.index + m[1].length;
  return { sentence: ex.slice(0, start) + '___' + ex.slice(start + m[2].length), found: m[2] };
}

const matchCase = (found, text) => (/^[A-Z]/.test(found) && !/^[A-Z]/.test(text) ? text[0].toUpperCase() + text.slice(1) : text);

export function enZhQuestion(w, pool, rng, id = `u-${w.id}-zh`) {
  const others = distractors(w, pool, rng);
  const options = shuffle([w.zh, ...others.map((o) => o.zh)], rng);
  return { id, group: w.id, wordId: w.id, type: 'choice', prompt: '這個單字的中文是？', sentence: w.en, sentenceAudio: w.audio,
    options, answer: w.zh, explanation: explainWord(w), optionNotes: notesFor(options, byMaps(others), w.zh) };
}

export function zhEnQuestion(w, pool, rng, id = `u-${w.id}-en`) {
  const others = distractors(w, pool, rng);
  const options = shuffle([w.en, ...others.map((o) => o.en)], rng);
  return { id, group: w.id, wordId: w.id, type: 'choice', prompt: `「${w.zh}」的英文是？`,
    options, answer: w.en, explanation: explainWord(w), optionNotes: notesFor(options, byMaps(others), w.en) };
}

export function listenQuestion(w, pool, rng, id = `u-${w.id}-listen`) {
  if (!w.audio) return null;
  const others = distractors(w, pool, rng);
  const options = shuffle([w.zh, ...others.map((o) => o.zh)], rng);
  return { id, group: w.id, wordId: w.id, type: 'choice', kind: 'listen', prompt: '聽發音，選出正確的中文', audio: w.audio, audioLabel: '▶ 播放發音',
    options, answer: w.zh, explanation: explainWord(w), optionNotes: notesFor(options, byMaps(others), w.zh) };
}

export function spellQuestion(w, id = `u-${w.id}-spell`) {
  if (!canSpell(w)) return null;
  const hint = w.en.split('').map((c, i) => (i === 0 || c === ' ' || c === '-' ? c : '_')).join(' ');
  return { id, group: w.id, wordId: w.id, type: 'type', kind: 'spell', prompt: `聽發音，拼出「${w.zh}」的英文`, audio: w.audio, audioLabel: '▶ 播放發音',
    hint: `${hint}（${w.en.replace(/[ -]/g, '').length} 個字母）`, answer: w.en, explanation: explainWord(w) };
}

export function clozeQuestion(w, pool, rng, id = `u-${w.id}-cloze`) {
  const c = clozeOf(w);
  if (!c) return null;
  const others = distractors(w, pool, rng, 2, (o) => o.pos === w.pos);
  const opts = [w.en, ...others.map((o) => o.en)].map((t) => matchCase(c.found, t));
  const answer = opts[0];
  const options = shuffle(opts, rng);
  const notes = {};
  others.forEach((o, i) => { notes[opts[i + 1]] = `${o.en}（${o.posZh}）是「${o.zh}」`; });
  return { id, group: w.id, wordId: w.id, type: 'choice', kind: 'cloze', prompt: '例句填空：選出適合的單字', sentence: c.sentence, zh: w.example.zh,
    options, answer, explanation: explainWord(w), optionNotes: notes };
}

// 活用題：依序輪流出聽音選答、例句填空、拼字（這個字出不了就換下一種）
export function practiceQuestion(w, pool, rng, turn = 0, suffix = '') {
  const makers = [
    () => listenQuestion(w, pool, rng, `u-${w.id}-listen${suffix}`),
    () => clozeQuestion(w, pool, rng, `u-${w.id}-cloze${suffix}`),
    () => spellQuestion(w, `u-${w.id}-spell${suffix}`),
  ];
  for (let k = 0; k < makers.length; k++) {
    const q = makers[(turn + k) % makers.length]();
    if (q) return q;
  }
  return null;
}
