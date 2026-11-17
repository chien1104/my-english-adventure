// 單一遊戲：#/game?id=match|speed|spell
import { loadContext } from '../learning.js';
import {
  GAMES, MIN_WORDS, SPEED_SECONDS, SPELL_ROUNDS,
  createMatch, matchTap, speedQuestion, spellTiles, spellCheck, pickWords, updateBest,
} from '../games/logic.js';
import { applyAnswer } from '../words.js';
import { escapeHTML } from '../ui/dom.js';
import { recordAttempt, logSession } from '../rewards.js';
import { afterActivity } from '../ui/celebrate.js';
import { dailyChallenge } from '../gamify.js';
import { todayKey } from '../settings.js';

export async function render({ outlet, db, query, settings }) {
  const game = GAMES[query.id];
  const ctx = await loadContext(db);
  if (!game) {
    outlet.innerHTML = '<section class="card"><h1 class="card__title">找不到這個遊戲</h1><a class="btn btn--primary" href="#/games">回遊戲樂園</a></section>';
    return;
  }
  if (ctx.learnedWords.length < MIN_WORDS) {
    outlet.innerHTML = '<section class="card"><h1 class="card__title">還不能玩</h1><p>完成一堂單字課後就能開始玩。</p><a class="btn btn--primary" href="#/games">回遊戲樂園</a></section>';
    return;
  }
  const words = ctx.learnedWords;
  const byId = new Map(words.map((w) => [w.id, w]));
  const cleanups = [];

  async function record(wordId, correct, answer) {
    const now = Date.now();
    await recordAttempt(db, { kind: 'game', game: game.id, itemId: `game-${game.id}-${wordId}`, wordId, correct, answer, createdAt: now });
    const rec = applyAnswer(ctx.records.get(wordId), wordId, correct, now);
    ctx.records.set(wordId, rec);
    await db.put('reviews', rec);
  }

  async function finish(score, detailHTML) {
    const key = `game:${game.id}`;
    const old = await db.get('progress', key);
    const { record: rec, isBest } = updateBest(old, game.id, score);
    await db.put('progress', rec);
    const earned = await logSession(db, { type: 'game', gameId: game.id, score });
    afterActivity({ db, settings, earned: [earned] });
    const ch = dailyChallenge(todayKey(), await db.getAll('sessions'));
    const unit = game.id === 'match' ? '次失誤' : game.id === 'speed' ? '分' : `／${SPELL_ROUNDS} 題一次答對`;
    outlet.innerHTML = `
      <section class="card complete" data-testid="game-result">
        <p class="complete__badge" aria-hidden="true">${isBest ? '🏆' : game.icon}</p>
        <h1 class="card__title">${escapeHTML(game.name)} 結束！</h1>
        <p class="big-score"><strong data-testid="game-score">${score}</strong> ${unit}</p>
        <p class="muted">${isBest ? '新的最佳紀錄！' : `最佳紀錄：${rec.best} ${game.id === 'match' ? '次失誤' : game.id === 'speed' ? '分' : '題'}`}・已玩 ${rec.plays} 次</p>
        ${ch.game === game.id ? `<p class="challenge-line ${ch.done ? 'is-done' : ''}" data-testid="challenge-line">${ch.done ? '🏆 今日挑戰完成！' : `今日挑戰：${escapeHTML(ch.label)}（還沒達成）`}</p>` : ''}
        ${detailHTML || ''}
        <div class="btn-row">
          <button type="button" class="btn btn--primary" data-act="again">再玩一次</button>
          <a class="btn btn--ghost" href="#/games">回遊戲樂園</a>
        </div>
      </section>`;
    outlet.querySelector('[data-act="again"]').addEventListener('click', () => start());
  }

  function missedHTML(ids) {
    const uniq = [...new Set(ids)].map((id) => byId.get(id)).filter(Boolean);
    if (!uniq.length) return '<p class="status-line status-line--good">全部答對！</p>';
    return `<div class="missed"><p class="muted">要再加強的單字（已收進錯題百科）：</p>
      <ul>${uniq.map((w) => `<li><img src="${escapeHTML(w.image)}" alt="" width="32" height="32"><span class="en">${escapeHTML(w.en)}</span> ${escapeHTML(w.zh)}</li>`).join('')}</ul></div>`;
  }

  // ---------------- 圖字配對 ----------------
  function playMatch() {
    let s = createMatch(words);
    const missed = [];
    let busy = false;
    outlet.innerHTML = `
      <div class="player" data-testid="game-match">
        <div class="player__head"><a class="btn btn--ghost btn--sm" href="#/games">離開</a><span class="player__step" data-role="info"></span></div>
        <section class="card">
          <h1 class="step__title">${game.icon} ${game.name}</h1>
          <p class="muted">先點一張圖，再點對應的英文（順序反過來也可以）。</p>
          <div class="match">
            <div class="match__col" data-side="picture"></div>
            <div class="match__col" data-side="label"></div>
          </div>
        </section>
      </div>`;
    const info = outlet.querySelector('[data-role="info"]');
    const pic = outlet.querySelector('[data-side="picture"]');
    const lab = outlet.querySelector('[data-side="label"]');
    pic.innerHTML = s.pictures.map((id) => `<button type="button" class="match__item match__item--pic" data-match="picture" data-id="${id}" aria-label="圖片"><img src="${escapeHTML(byId.get(id).image)}" alt="" width="56" height="56"></button>`).join('');
    lab.innerHTML = s.labels.map((id) => `<button type="button" class="match__item en" data-match="label" data-id="${id}">${escapeHTML(byId.get(id).en)}</button>`).join('');
    const paint = () => {
      info.textContent = `配對 ${s.matched.length} / ${s.total}・失誤 ${s.mistakes}`;
      outlet.querySelectorAll('[data-match]').forEach((b) => {
        const done = s.matched.includes(b.dataset.id);
        b.classList.toggle('is-done', done);
        b.disabled = done;
        b.classList.toggle('is-selected', !!s.selected && s.selected.side === b.dataset.match && s.selected.id === b.dataset.id);
      });
    };
    paint();
    outlet.querySelector('.match').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-match]');
      if (!b || busy) return;
      const r = matchTap(s, b.dataset.match, b.dataset.id);
      s = r.state;
      if (r.event === 'miss') {
        busy = true;
        missed.push(r.wordId);
        const els = r.pair.map((p) => outlet.querySelector(`[data-match="${p.side}"][data-id="${p.id}"]`));
        els.forEach((el) => el.classList.add('is-wrong'));
        await record(r.wordId, false, b.dataset.id);
        setTimeout(() => { els.forEach((el) => el.classList.remove('is-wrong')); busy = false; paint(); }, 600);
        paint();
        return;
      }
      if (r.event === 'match' || r.event === 'done') await record(r.wordId, true, r.wordId);
      paint();
      if (r.event === 'done') setTimeout(() => finish(s.mistakes, missedHTML(missed)), 400);
    });
  }

  // ---------------- 單字快打 ----------------
  function playSpeed() {
    let score = 0;
    let combo = 0;
    let remaining = SPEED_SECONDS * 1000;
    let last = performance.now();
    let paused = false;
    let over = false;
    let q = null;
    let locked = false;
    const missed = [];

    outlet.innerHTML = `
      <div class="player" data-testid="game-speed">
        <div class="player__head">
          <button type="button" class="btn btn--ghost btn--sm" data-act="quit">結束</button>
          <span class="player__step"><span data-role="time">${SPEED_SECONDS}</span> 秒・<span data-role="score">0</span> 分</span>
        </div>
        <div class="progressbar" aria-hidden="true"><span data-role="bar" style="width:100%"></span></div>
        <section class="card speed" data-role="card">
          <p class="speed__combo" data-role="combo"></p>
          <div data-role="q"></div>
        </section>
        <div class="pause-overlay" data-role="pause" hidden>
          <div class="card"><h2 class="card__title">已暫停</h2><p>離開畫面時會自動暫停，時間不會流失。</p>
          <button type="button" class="btn btn--primary" data-act="resume">繼續</button></div>
        </div>
      </div>`;
    const qBox = outlet.querySelector('[data-role="q"]');
    const timeEl = outlet.querySelector('[data-role="time"]');
    const scoreEl = outlet.querySelector('[data-role="score"]');
    const bar = outlet.querySelector('[data-role="bar"]');
    const comboEl = outlet.querySelector('[data-role="combo"]');
    const pauseEl = outlet.querySelector('[data-role="pause"]');

    function next() {
      q = speedQuestion(words, Math.random, q?.wordId);
      locked = false;
      qBox.innerHTML = `
        ${q.kind === 'picture'
          ? `<img class="q__img" src="${escapeHTML(q.image)}" alt="題目圖片" width="120" height="120"><p class="q__prompt center">這是什麼？</p>`
          : `<p class="q__sentence en" data-testid="speed-word">${escapeHTML(q.prompt)}</p><p class="q__prompt center">中文是？</p>`}
        <div class="q__options">${q.options.map((o, i) => `<button type="button" class="opt${q.kind === 'picture' ? ' en' : ''}" data-opt="${i}">${escapeHTML(o)}</button>`).join('')}</div>`;
    }

    qBox.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-opt]');
      if (!b || locked || paused || over) return;
      locked = true;
      const choice = q.options[Number(b.dataset.opt)];
      const correct = choice === q.answer;
      qBox.querySelectorAll('[data-opt]').forEach((x) => {
        const o = q.options[Number(x.dataset.opt)];
        if (o === q.answer) x.classList.add('is-correct');
        else if (x === b) x.classList.add('is-wrong');
        x.disabled = true;
      });
      if (correct) { score += 1; combo += 1; } else { combo = 0; missed.push(q.wordId); }
      scoreEl.textContent = score;
      comboEl.textContent = combo >= 3 ? `🔥 連續答對 ${combo} 題` : '';
      record(q.wordId, correct, choice);
      setTimeout(() => { if (!over) next(); }, correct ? 250 : 900);
    });

    function tick() {
      const now = performance.now();
      if (!paused && !over) {
        remaining -= now - last;
        if (remaining <= 0) { remaining = 0; end(); }
        timeEl.textContent = Math.ceil(remaining / 1000);
        bar.style.width = `${(remaining / (SPEED_SECONDS * 1000)) * 100}%`;
      }
      last = now;
    }
    const timer = setInterval(tick, 100);
    function setPaused(v) {
      paused = v;
      pauseEl.hidden = !v;
      last = performance.now();
    }
    const onVis = () => { if (document.hidden && !over) setPaused(true); };
    document.addEventListener('visibilitychange', onVis);
    function stopAll() { clearInterval(timer); document.removeEventListener('visibilitychange', onVis); }
    cleanups.push(stopAll);
    function end() {
      if (over) return;
      over = true;
      stopAll();
      finish(score, missedHTML(missed));
    }
    outlet.querySelector('[data-act="resume"]').addEventListener('click', () => setPaused(false));
    outlet.querySelector('[data-act="quit"]').addEventListener('click', end);
    next();
  }

  // ---------------- 拼字工坊 ----------------
  function playSpell() {
    const queue = pickWords(words, SPELL_ROUNDS);
    const retried = new Set();
    const missed = [];
    let firstTry = 0;
    let idx = 0;

    outlet.innerHTML = `
      <div class="player" data-testid="game-spell">
        <div class="player__head"><a class="btn btn--ghost btn--sm" href="#/games">離開</a><span class="player__step" data-role="info"></span></div>
        <section class="card" data-role="card"></section>
      </div>`;
    const card = outlet.querySelector('[data-role="card"]');
    const info = outlet.querySelector('[data-role="info"]');

    function round() {
      const w = queue[idx];
      const tiles = spellTiles(w.en);
      const picked = [];
      info.textContent = `第 ${idx + 1} / ${queue.length} 題`;
      card.innerHTML = `
        <h1 class="step__title">${game.icon} ${game.name}</h1>
        <img class="q__img" src="${escapeHTML(w.image)}" alt="題目圖片" width="120" height="120">
        <p class="q__prompt center">「${escapeHTML(w.zh)}」的英文是？</p>
        <div class="spell__slots en" data-role="slots"></div>
        <div class="spell__tiles" data-role="tiles">${tiles.map((t) => `<button type="button" class="tile en" data-tile="${t.id}">${t.ch}</button>`).join('')}</div>
        <div class="btn-row">
          <button type="button" class="btn btn--ghost" data-act="clear">清除</button>
          <button type="button" class="btn btn--primary" data-act="check" disabled>確認</button>
        </div>
        <div data-role="fb"></div>`;
      const slots = card.querySelector('[data-role="slots"]');
      const checkBtn = card.querySelector('[data-act="check"]');
      let done = false;
      const paint = () => {
        slots.innerHTML = Array.from({ length: w.en.length }, (_, i) => {
          const id = picked[i];
          return id === undefined
            ? '<span class="slot"></span>'
            : `<button type="button" class="slot slot--filled" data-slot="${i}" aria-label="移除這個字母">${tiles.find((t) => t.id === id).ch}</button>`;
        }).join('');
        card.querySelectorAll('[data-tile]').forEach((b) => { b.disabled = done || picked.includes(Number(b.dataset.tile)); });
        checkBtn.disabled = done || picked.length !== w.en.length;
        card.querySelector('[data-act="clear"]').disabled = done || picked.length === 0;
      };
      paint();
      card.querySelector('[data-role="tiles"]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-tile]');
        if (!b || done || picked.length >= w.en.length) return;
        picked.push(Number(b.dataset.tile));
        paint();
      });
      slots.addEventListener('click', (e) => {
        const b = e.target.closest('[data-slot]');
        if (!b || done) return;
        picked.splice(Number(b.dataset.slot), 1);
        paint();
      });
      card.querySelector('[data-act="clear"]').addEventListener('click', () => { if (!done) { picked.length = 0; paint(); } });
      checkBtn.addEventListener('click', async () => {
        if (done) return;
        done = true;
        const { text, correct } = spellCheck(w.en, tiles, picked);
        paint();
        if (correct && !retried.has(w.id)) firstTry += 1;
        if (!correct) {
          missed.push(w.id);
          if (!retried.has(w.id)) { retried.add(w.id); queue.push(w); }
        }
        await record(w.id, correct, text);
        card.querySelector('[data-role="fb"]').innerHTML = `
          <div class="feedback ${correct ? 'feedback--good' : 'feedback--bad'}">
            <p class="feedback__title">${correct ? '✅ 拼對了！' : '❌ 差一點'}</p>
            ${correct ? '' : `<p>正確拼法：<strong class="en">${escapeHTML(w.en)}</strong>（${escapeHTML(w.ipa)}）</p><p class="feedback__next">🔁 這個字等一下會再出現一次。</p>`}
          </div>
          <button type="button" class="btn btn--primary btn--block" data-act="next">${idx + 1 < queue.length ? '下一題' : '看結果'}</button>`;
        card.querySelector('[data-act="next"]').addEventListener('click', () => {
          idx += 1;
          if (idx < queue.length) round(); else finish(firstTry, missedHTML(missed));
        });
      });
    }
    round();
  }

  function start() {
    while (cleanups.length) cleanups.pop()();
    if (game.id === 'match') playMatch();
    else if (game.id === 'speed') playSpeed();
    else playSpell();
    window.scrollTo?.(0, 0);
  }
  start();
  return () => { while (cleanups.length) cleanups.pop()(); };
}
