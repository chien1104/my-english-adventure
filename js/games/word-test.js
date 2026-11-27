// 單字總測驗（純邏輯）：把所有學過的單字分關測一遍，每關 20 字，題型混合
// 進度存在 progress `wordtest`，可以中途離開；錯的字可以再重測一次。
import { enZhQuestion, zhEnQuestion, listenQuestion, spellQuestion, clozeQuestion } from '../word-questions.js';
import { shuffle } from './logic.js';

export const WT_KEY = 'wordtest';
export const STAGE_SIZE = 20;

// 新的一輪：ids 是要測的字（預設全部學過的字），打散順序
export function newRun(ids, rng = Math.random, now = Date.now(), { retry = false } = {}) {
  return { id: WT_KEY, order: shuffle(ids, rng), pos: 0, results: {}, bestCombo: 0, combo: 0, startedAt: now, retry, stageStars: [] };
}

export const stageCount = (run) => Math.ceil(run.order.length / STAGE_SIZE);
export const stageOf = (pos) => Math.floor(pos / STAGE_SIZE);
export function stageRange(run, stage) {
  const from = stage * STAGE_SIZE;
  return [from, Math.min(run.order.length, from + STAGE_SIZE)];
}

// 每題的題型輪流：看英文選中文 → 聽音選答 → 看中文選英文 → 例句填空 → 拼字（這個字出不了就退回看英文選中文）
export function questionFor(w, pool, rng, i) {
  const id = `wt-${w.id}`;
  const makers = [
    () => enZhQuestion(w, pool, rng, id),
    () => listenQuestion(w, pool, rng, id),
    () => zhEnQuestion(w, pool, rng, id),
    () => clozeQuestion(w, pool, rng, id),
    () => spellQuestion(w, id),
  ];
  return makers[i % makers.length]() || enZhQuestion(w, pool, rng, id);
}

// 作答：記錄結果、連對
export function answer(run, wordId, correct) {
  const r = { ...run, results: { ...run.results, [wordId]: !!correct }, pos: run.pos + 1 };
  r.combo = correct ? run.combo + 1 : 0;
  r.bestCombo = Math.max(run.bestCombo, r.combo);
  return r;
}

// 跳過聽力題：這個字改用不用聽的題目再出一次（不前進）
export const skipToReading = (w, pool, rng) => enZhQuestion(w, pool, rng, `wt-${w.id}`);

export const starsFor = (rate) => (rate >= 90 ? 3 : rate >= 70 ? 2 : 1);

export function stageResult(run, stage) {
  const [from, to] = stageRange(run, stage);
  const ids = run.order.slice(from, to);
  const right = ids.filter((id) => run.results[id]).length;
  const rate = ids.length ? Math.round((right / ids.length) * 100) : 0;
  return { ids, right, total: ids.length, rate, stars: starsFor(rate), wrong: ids.filter((id) => run.results[id] === false) };
}

export function runSummary(run) {
  const ids = run.order.filter((id) => id in run.results);
  const right = ids.filter((id) => run.results[id]).length;
  return {
    done: run.pos >= run.order.length, tested: ids.length, total: run.order.length, right,
    rate: ids.length ? Math.round((right / ids.length) * 100) : 0,
    wrong: run.order.filter((id) => run.results[id] === false),
  };
}

// 結束一輪：更新最佳紀錄（只算完整測完全部學過的字，重測錯字不算）
export function finishRun(record, summary, now = Date.now()) {
  const r = { ...(record || {}) };
  r.history = [...(r.history || []), { at: now, rate: summary.rate, total: summary.total, right: summary.right }].slice(-20);
  if (!r.best || summary.rate > r.best.rate) r.best = { rate: summary.rate, total: summary.total, at: now };
  return r;
}
