// 聽力訓練：#/listening — 0.8x／1x 播放速度、聽寫、跟讀（可錄下自己的聲音比對）
import { loadContext } from '../learning.js';
import { collectSentences, compareDictation, pickRound, ROUND_SIZE } from '../listening.js';
import { playAudio, setPlaybackRate, getPlaybackRate } from '../audio.js';
import { logSession } from '../rewards.js';
import { afterActivity } from '../ui/celebrate.js';
import { completeHTML, playComplete } from '../ui/complete.js';
import { escapeHTML } from '../ui/dom.js';
import { burst, glow } from '../ui/fx.js';
import { toast } from '../ui/toast.js';

const MODES = {
  dictation: { icon: '✍️', name: '聽寫', desc: '聽一句，把聽到的英文打出來，逐字對答案。' },
  shadow: { icon: '🗣️', name: '跟讀', desc: '看著句子聽一遍，再跟著唸；可以錄下自己的聲音比對。' },
};

const canRecord = () => !!(globalThis.navigator?.mediaDevices?.getUserMedia && globalThis.MediaRecorder);

export async function render({ outlet, db, query, settings, navigate }) {
  const ctx = await loadContext(db);
  const pool = collectSentences(ctx.lessons);
  const mode = MODES[query.mode] ? query.mode : null;
  let recorder = null;
  let myUrl = null;
  const cleanup = () => {
    try { recorder?.state === 'recording' && recorder.stop(); } catch { /* 已停止 */ }
    recorder?.stream?.getTracks().forEach((t) => t.stop());
    if (myUrl) URL.revokeObjectURL(myUrl);
  };

  const speedHTML = () => `
    <div class="speed" role="group" aria-label="播放速度" data-testid="speed">
      ${[1, 0.8].map((r) => `<button type="button" class="speed__btn${getPlaybackRate() === r ? ' is-on' : ''}" data-rate="${r}" aria-pressed="${getPlaybackRate() === r}">${r === 1 ? '1x 正常' : '0.8x 放慢'}</button>`).join('')}
    </div>`;
  const bindSpeed = (root) => root.querySelector('[data-testid="speed"]')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rate]');
    if (!b) return;
    const r = Number(b.dataset.rate);
    setPlaybackRate(r);
    settings.update({ playbackRate: r });
    root.querySelectorAll('[data-rate]').forEach((x) => { const on = Number(x.dataset.rate) === r; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
    toast(r === 1 ? '播放速度：正常' : '播放速度：放慢到 0.8 倍', { duration: 1400 });
  });

  if (!mode) {
    outlet.innerHTML = `
      <section class="card listen-hero">
        <a class="link" href="#/home">← 首頁</a>
        <h1 class="page-title">🎧 聽力訓練</h1>
        <p class="muted">句子來自課程例句（美式、英式口音都有），共 ${pool.length} 句。一輪 ${ROUND_SIZE} 句。</p>
        <p class="field__label">播放速度（全 App 的發音都會套用）</p>
        ${speedHTML()}
      </section>
      <div class="listen-modes">
        ${Object.entries(MODES).map(([id, m]) => `
          <a class="listen-mode" href="#/listening?mode=${id}" data-testid="mode-${id}">
            <span class="listen-mode__icon" aria-hidden="true">${m.icon}</span>
            <strong>${m.name}</strong><span class="muted small">${m.desc}</span>
          </a>`).join('')}
      </div>`;
    bindSpeed(outlet);
    return cleanup;
  }

  if (!pool.length) {
    outlet.innerHTML = '<section class="card"><h1 class="card__title">還沒有可以練習的句子</h1><a class="btn btn--primary" href="#/home">回首頁</a></section>';
    return cleanup;
  }

  const round = pickRound(pool);
  let index = 0;
  const scores = [];
  let skipped = 0;
  // 跳過這一句：不計分，從題庫補一句還沒出現過的；題庫用完就直接下一句
  function skip() {
    const used = new Set(round.map((x) => x.en));
    const extra = pool.find((x) => !used.has(x.en));
    skipped += 1;
    if (extra) {
      round[index] = extra;
      toast('已跳過，換一句新的（不計分）', { duration: 1400 });
      paint();
    } else {
      toast('已跳過，這句不計分', { duration: 1400 });
      next();
    }
  }

  function head() {
    return `<div class="listen-head">
      <a class="link" href="#/listening">← 聽力訓練</a>
      <span class="muted">${MODES[mode].icon} ${MODES[mode].name}・第 ${index + 1} / ${round.length} 句</span>
    </div>
    <div class="progressbar" aria-hidden="true"><span style="width:${Math.round(((index + 1) / round.length) * 100)}%"></span></div>`;
  }

  function paint() {
    cleanup();
    recorder = null; myUrl = null;
    const s = round[index];
    if (mode === 'dictation') {
      outlet.innerHTML = `
        <section class="card listen-card" data-testid="listen-card">
          ${head()}
          ${speedHTML()}
          <button type="button" class="listen-play" data-act="play" data-testid="listen-play"><span aria-hidden="true">▶</span> 播放句子</button>
          <p class="muted small">可以重複播放。聽不清楚就切到 0.8x。</p>
          <form class="listen-form" data-role="form" novalidate>
            <textarea class="input en" name="typed" rows="3" placeholder="把聽到的英文打出來" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="聽寫內容" data-testid="dictation-input"></textarea>
            <button class="btn btn--primary btn--block" type="submit">對答案</button>
          </form>
          <button type="button" class="skip-btn" data-act="skip" data-testid="listen-skip">⏭ 這句聽不出來／不方便聽，換一句（不計分）</button>
          <div data-role="result"></div>
        </section>`;
      const form = outlet.querySelector('[data-role="form"]');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const typed = form.typed.value.trim();
        if (!typed) { form.typed.focus(); toast('先把聽到的英文打出來，再對答案', { duration: 1800 }); return; }
        const r = compareDictation(s.en, typed);
        scores.push(r.rate);
        form.querySelectorAll('textarea, button').forEach((x) => { x.disabled = true; });
        outlet.querySelector('[data-act="skip"]')?.remove();
        const res = outlet.querySelector('[data-role="result"]');
        res.innerHTML = `
          <div class="dict-result ${r.rate === 100 ? 'is-perfect' : ''}" data-testid="dictation-result">
            <p class="dict-result__score"><strong class="en">${r.rate}%</strong> 聽對 ${r.correct} / ${r.total} 個字</p>
            <p class="dict-result__line en">${r.marked.map((m) => `<span class="${m.ok ? 'w-ok' : 'w-miss'}">${escapeHTML(m.text)}</span>`).join(' ')}</p>
            <p class="muted">${escapeHTML(s.zh)}</p>
            ${r.rate < 100 ? '<p class="hint">紅色底線的字是沒聽到或拼錯的，再播一次注意聽這幾個字。</p>' : ''}
            <button type="button" class="btn btn--primary btn--block" data-act="next" data-testid="listen-next">${index + 1 < round.length ? '下一句' : '完成'}</button>
          </div>`;
        if (r.rate >= 80) { burst(res.querySelector('.dict-result__score')); glow(r.rate === 100 ? 'gold' : 'good'); }
        res.querySelector('[data-act="next"]').addEventListener('click', next);
      });
    } else {
      outlet.innerHTML = `
        <section class="card listen-card" data-testid="listen-card">
          ${head()}
          ${speedHTML()}
          <p class="shadow-text en" data-testid="shadow-text">${escapeHTML(s.en)}</p>
          <p class="muted">${escapeHTML(s.zh)}</p>
          <button type="button" class="listen-play" data-act="play" data-testid="listen-play"><span aria-hidden="true">▶</span> 聽原音</button>
          <ol class="shadow-steps"><li>先聽一次，注意連音和重音。</li><li>跟著唸，盡量跟上速度和語調。</li>${canRecord() ? '<li>錄下自己的聲音，和原音比一比。</li>' : ''}</ol>
          ${canRecord() ? `
          <div class="rec" data-role="rec">
            <button type="button" class="btn btn--ghost" data-act="rec" data-testid="rec-btn">🎙️ 錄我的聲音</button>
            <button type="button" class="btn btn--ghost" data-act="mine" hidden>▶ 聽我的錄音</button>
          </div>
          <p class="hint">錄音只存在這個畫面，不會上傳，也不會保存。</p>` : ''}
          <button type="button" class="btn btn--primary btn--block" data-act="next" data-testid="listen-next">${index + 1 < round.length ? '唸好了，下一句' : '完成'}</button>
          <button type="button" class="skip-btn" data-act="skip" data-testid="listen-skip">⏭ 跳過這句，換一句（不計分）</button>
        </section>`;
      outlet.querySelector('[data-act="next"]').addEventListener('click', () => { scores.push(100); next(); });
      const recBtn = outlet.querySelector('[data-act="rec"]');
      const mineBtn = outlet.querySelector('[data-act="mine"]');
      recBtn?.addEventListener('click', async () => {
        if (recorder?.state === 'recording') { recorder.stop(); return; }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const chunks = [];
          recorder = new MediaRecorder(stream);
          recorder.stream = stream;
          recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
          recorder.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
            if (myUrl) URL.revokeObjectURL(myUrl);
            myUrl = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
            recBtn.textContent = '🎙️ 重新錄';
            recBtn.classList.remove('is-rec');
            mineBtn.hidden = false;
          };
          recorder.start();
          recBtn.textContent = '⏹ 停止錄音';
          recBtn.classList.add('is-rec');
        } catch {
          toast('沒有麥克風權限，可以直接跟著唸就好', { type: 'error' });
        }
      });
      mineBtn?.addEventListener('click', () => { if (myUrl) new Audio(myUrl).play(); });
    }
    bindSpeed(outlet);
    outlet.querySelector('[data-act="skip"]')?.addEventListener('click', skip);
    outlet.querySelector('[data-act="play"]').addEventListener('click', (e) => {
      const b = e.currentTarget;
      b.classList.add('is-playing');
      playAudio(s.audio).then(() => { setTimeout(() => b.classList.remove('is-playing'), 1200); })
        .catch(() => { b.classList.remove('is-playing'); toast('播放失敗，請確認手機沒有靜音', { type: 'error' }); });
    });
  }

  async function next() {
    if (index + 1 < round.length) { index += 1; paint(); window.scrollTo?.(0, 0); return; }
    cleanup();
    const acc = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const earned = await logSession(db, { type: 'listening', mode, count: round.length, accuracy: acc });
    outlet.innerHTML = completeHTML({
      testid: 'listen-complete', icon: '🎧', title: `完成一輪${MODES[mode].name}！`,
      accuracy: acc, firstCorrect: scores.filter((x) => x === 100).length, total: scores.length,
      chips: [{ text: `✨ +${earned?.amount || 0} EXP`, gold: true }, { text: `🔊 ${getPlaybackRate() === 1 ? '正常速度' : '0.8 倍速'}` },
        ...(skipped ? [{ text: `⏭ 跳過 ${skipped} 句（不計分）` }] : [])],
      lines: [mode === 'dictation' ? '聽寫是最扎實的聽力練習：聽不到的字，通常就是發音和想像的不一樣。' : '跟讀能同時練聽力和口說，每天幾句就很有效。'],
      actions: `<a class="btn btn--primary" href="#/listening?mode=${mode}" data-act="again">再練一輪</a><a class="btn btn--ghost" href="#/listening">換個模式</a>`,
    });
    playComplete(outlet, acc);
    outlet.querySelector('[data-act="again"]').addEventListener('click', (e) => { e.preventDefault(); render({ outlet, db, query, settings, navigate }); });
    afterActivity({ db, settings, earned: [earned] });
  }

  paint();
  return cleanup;
}
