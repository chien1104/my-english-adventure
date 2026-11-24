// 設定頁：個人資料、學習模式、資料保存
import { MODES, MODE_IDS, NICKNAME_MAX } from '../settings.js';
import { getStorageStatus, describeStatus, requestPersist, formatTime } from '../storage-status.js';
import { DB_VERSION } from '../db.js';
import { escapeHTML } from '../ui/dom.js';
import { toast } from '../ui/toast.js';
import { confirmDialog } from '../ui/confirm.js';
import { buildBackup, backupFileName, validateBackup, restoreBackup } from '../backup.js';
import { offlineStatus, downloadAudio, swSupported, SINGLE_FILE } from '../pwa.js';
import { hasAudio, clearAudioCache } from '../audio.js';

export const APP_VERSION = '1.0.0';

export async function render({ outlet, db, settings, query, refreshIndicator }) {
  const s = settings.get();
  const contentVersion = (await db.getMeta('contentVersion')) || '尚未載入';

  outlet.innerHTML = `
    <section class="card" id="profile" aria-labelledby="profile-title">
      <h1 id="profile-title" class="card__title">個人資料</h1>
      <form class="form" data-testid="nickname-form" novalidate>
        <label class="field">
          <span class="field__label">暱稱（最多 ${NICKNAME_MAX} 字）</span>
          <input class="input" name="nickname" maxlength="${NICKNAME_MAX}" autocomplete="nickname"
                 value="${escapeHTML(s.nickname)}" placeholder="例如：芊芊" data-testid="nickname-input">
        </label>
        <button class="btn btn--primary" type="submit">儲存暱稱</button>
      </form>
    </section>

    <section class="card" id="modes" aria-labelledby="modes-title">
      <h2 id="modes-title" class="card__title">學習模式</h2>
      <form class="form" data-testid="modes-form" novalidate>
        <fieldset class="field">
          <legend class="field__label">預設模式（沒選擇今日模式時使用）</legend>
          <div class="radio-row">
            ${MODE_IDS.map((id) => `
              <label class="radio">
                <input type="radio" name="defaultMode" value="${id}" ${s.defaultMode === id ? 'checked' : ''}>
                <span>${MODES[id].icon} ${MODES[id].label}</span>
              </label>`).join('')}
          </div>
        </fieldset>
        <div class="minutes-grid">
          ${MODE_IDS.map((id) => `
            <label class="field">
              <span class="field__label">${MODES[id].label}（${MODES[id].min}–${MODES[id].max} 分）</span>
              <input class="input" type="number" inputmode="numeric" name="min-${id}"
                     min="${MODES[id].min}" max="${MODES[id].max}" step="1" value="${s.modeMinutes[id]}">
            </label>`).join('')}
        </div>
        <div class="btn-row">
          <button class="btn btn--primary" type="submit">儲存模式設定</button>
          <button class="btn btn--ghost" type="button" data-act="reset-minutes">時間恢復預設</button>
        </div>
      </form>
    </section>

    <section class="card" id="data" aria-labelledby="data-title">
      <h2 id="data-title" class="card__title">資料保存狀態</h2>
      <div class="notice">
        你的學習資料只存在<strong>這台裝置的這個瀏覽器</strong>。本 App 部署在 GitHub Pages（靜態網頁），
        <strong>沒有雲端同步，也沒有雲端備份</strong>。換手機、換瀏覽器或清除瀏覽器資料都會看不到紀錄。
      </div>
      <dl class="status-list" data-testid="status-list"></dl>
      <div class="btn-row">
        <button class="btn btn--primary" type="button" data-act="persist" data-testid="persist-btn">申請持久保存</button>
        <button class="btn btn--ghost" type="button" data-act="recheck">重新檢查</button>
      </div>
    </section>

    <section class="card" id="backup" aria-labelledby="backup-title">
      <h2 id="backup-title" class="card__title">備份與還原</h2>
      <p class="muted">匯出的 JSON 檔會<strong>下載到這台裝置</strong>，不會自動上傳雲端。建議存到雲端硬碟或傳給自己，換手機時就能還原。</p>
      <div class="btn-row">
        <button type="button" class="btn btn--primary" data-act="export" data-testid="export-btn">匯出備份檔</button>
        <label class="btn btn--ghost file-btn">選擇備份檔還原
          <input type="file" accept="application/json,.json" data-testid="restore-input" hidden>
        </label>
      </div>
      <div data-role="restore-preview"></div>
    </section>

    <section class="card" id="offline" aria-labelledby="offline-title">
      <h2 id="offline-title" class="card__title">離線使用</h2>
      <dl class="status-list" data-testid="offline-list"><div class="status-row"><dt>狀態</dt><dd>檢查中…</dd></div></dl>
      <div data-role="audio-dl"></div>
    </section>

    <section class="card" aria-labelledby="about-title">
      <h2 id="about-title" class="card__title">關於</h2>
      <dl class="status-list">
        <div class="status-row"><dt>App 版本</dt><dd>${APP_VERSION}</dd></div>
        <div class="status-row"><dt>資料庫版本</dt><dd>v${DB_VERSION}</dd></div>
        <div class="status-row"><dt>教材版本</dt><dd>${escapeHTML(contentVersion)}</dd></div>
      </dl>
    </section>
  `;

  const statusList = outlet.querySelector('[data-testid="status-list"]');
  const persistBtn = outlet.querySelector('[data-testid="persist-btn"]');

  async function paintStatus() {
    const status = await getStorageStatus({ db });
    const desc = describeStatus(status, settings.get().persistRequest);
    statusList.innerHTML = desc.rows.map((r) => `
      <div class="status-row" data-key="${r.key}">
        <dt>${r.label}</dt>
        <dd class="tone-${r.tone}">${escapeHTML(r.value)}</dd>
      </div>`).join('');
    persistBtn.hidden = !status.supported.persist || status.persisted === true;
    persistBtn.disabled = false;
    refreshIndicator?.();
  }
  await paintStatus();

  const nickForm = outlet.querySelector('[data-testid="nickname-form"]');
  nickForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const res = settings.update({ nickname: nickForm.nickname.value });
    if (res.ok) {
      nickForm.nickname.value = res.settings.nickname;
      toast('暱稱已保存到這台裝置', { type: 'success' });
    } else toast(res.error, { type: 'error' });
  });

  const modesForm = outlet.querySelector('[data-testid="modes-form"]');
  function fillMinutes(st) {
    for (const id of MODE_IDS) modesForm[`min-${id}`].value = st.modeMinutes[id];
  }
  modesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const modeMinutes = {};
    const clamped = [];
    for (const id of MODE_IDS) {
      const raw = modesForm[`min-${id}`].value;
      modeMinutes[id] = raw;
    }
    const res = settings.update({ defaultMode: modesForm.defaultMode.value, modeMinutes });
    if (!res.ok) { toast(res.error, { type: 'error' }); return; }
    for (const id of MODE_IDS) {
      if (String(res.settings.modeMinutes[id]) !== String(modeMinutes[id]).trim()) clamped.push(MODES[id].label);
    }
    fillMinutes(res.settings);
    toast(clamped.length ? `已保存（${clamped.join('、')}超出範圍，已自動調整）` : '模式設定已保存', { type: 'success' });
  });

  modesForm.querySelector('[data-act="reset-minutes"]').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: '恢復預設時間？',
      message: '四種模式的時間會改回 5／15／30／60 分鐘。學習紀錄不受影響。',
      confirmText: '恢復預設',
    });
    if (!ok) return;
    const res = settings.resetModeMinutes();
    if (res.ok) { fillMinutes(res.settings); toast('已恢復預設時間', { type: 'success' }); }
    else toast(res.error, { type: 'error' });
  });

  persistBtn.addEventListener('click', async () => {
    persistBtn.disabled = true;
    const result = await requestPersist();
    settings.update({ persistRequest: result });
    if (!result.supported) toast('此瀏覽器不支援持久保存申請', { type: 'error' });
    else if (result.granted) toast('瀏覽器已核准持久保存', { type: 'success' });
    else toast('瀏覽器未核准。可加入主畫面或多使用幾次後再申請', { type: 'info', duration: 4000 });
    await paintStatus();
  });

  outlet.querySelector('[data-act="recheck"]').addEventListener('click', async () => {
    await paintStatus();
    toast('已重新檢查保存狀態');
  });

  // ---------- 備份 ----------
  outlet.querySelector('[data-act="export"]').addEventListener('click', async () => {
    const backup = await buildBackup(db, settings);
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    await db.setMeta('lastBackupAt', backup.exportedAt);
    toast('備份檔已下載到這台裝置。記得存到雲端硬碟或傳給自己。', { type: 'success', duration: 4500 });
    await paintStatus();
  });

  const preview = outlet.querySelector('[data-role="restore-preview"]');
  const input = outlet.querySelector('[data-testid="restore-input"]');
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    let parsed = null;
    try { parsed = JSON.parse(await file.text()); } catch { parsed = null; }
    const v = validateBackup(parsed);
    if (!v.ok) {
      preview.innerHTML = `<p class="notice notice--bad" data-testid="restore-error">❌ ${escapeHTML(v.error)}目前的學習資料沒有任何變動。</p>`;
      return;
    }
    const sm = v.summary;
    preview.innerHTML = `
      <div class="restore-card" data-testid="restore-preview">
        <p><strong>${escapeHTML(file.name)}</strong></p>
        <ul class="plain-list">
          <li>備份時間：${formatTime(sm.exportedAt)}</li>
          <li>完成課程 ${sm.lessons} 堂・學過單字 ${sm.words} 個・作答 ${sm.attempts} 題</li>
          <li>經驗值 ${sm.exp} EXP・成就 ${sm.achievements} 個</li>
        </ul>
        <div class="btn-row">
          <button type="button" class="btn btn--danger" data-act="do-restore">用這個備份還原</button>
          <button type="button" class="btn btn--ghost" data-act="cancel-restore">取消</button>
        </div>
      </div>`;
    preview.querySelector('[data-act="cancel-restore"]').addEventListener('click', () => { preview.innerHTML = ''; });
    preview.querySelector('[data-act="do-restore"]').addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: '確定要還原嗎？',
        message: '這台裝置上目前的學習紀錄（進度、單字、錯題、經驗值、成就）會被備份檔的內容取代，無法復原。建議先匯出一份目前的備份。',
        confirmText: '確定還原',
        danger: true,
      });
      if (!ok) return;
      try {
        await restoreBackup(db, settings, v.backup);
        toast('還原完成！', { type: 'success' });
        setTimeout(() => location.replace('#/home'), 400);
      } catch (err) {
        console.error(err);
        preview.innerHTML = '<p class="notice notice--bad">❌ 還原失敗，目前的學習資料沒有任何變動。</p>';
      }
    });
  });

  // ---------- 離線 ----------
  const offList = outlet.querySelector('[data-testid="offline-list"]');
  const audioBox = outlet.querySelector('[data-role="audio-dl"]');
  async function paintOffline() {
    if (SINGLE_FILE) {
      offList.innerHTML = '<div class="status-row"><dt>狀態</dt><dd class="tone-good" data-testid="offline-state">✅ 單檔版：所有教材、圖片、音檔都在這個檔案裡，不需要網路</dd></div>';
      audioBox.innerHTML = '';
      return;
    }
    const st = await offlineStatus();
    if (!st.supported) {
      offList.innerHTML = '<div class="status-row"><dt>狀態</dt><dd class="tone-warn">需要用 HTTPS 網址（例如 GitHub Pages）開啟才能離線使用</dd></div>';
      return;
    }
    offList.innerHTML = `
      <div class="status-row"><dt>狀態</dt><dd class="${st.ready ? 'tone-good' : 'tone-warn'}" data-testid="offline-state">${st.ready ? '✅ 已可離線使用' : '準備中：重新整理一次後即可離線使用'}</dd></div>
      <div class="status-row"><dt>已存在裝置的檔案</dt><dd>${st.files} 個${st.version ? `（版本 ${escapeHTML(st.version)}）` : ''}</dd></div>
      ${st.audio ? `<div class="status-row"><dt>已下載的發音音檔</dt><dd data-testid="audio-cached">${st.audio} 個</dd></div>` : ''}`;
    // 收集所有教材用到的音檔（單字、例句、對話、聽力題）；有音檔才顯示下載按鈕
    const all = new Set();
    const walk = (o) => {
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
        if ((k === 'audio' || k === 'exampleAudio') && typeof v === 'string' && !v.startsWith('data:')) all.add(v); else walk(v);
      }
    };
    const vocab = await db.getAll('vocab');
    const reviews = new Map((await db.getAll('reviews')).map((r) => [r.wordId, r]));
    walk(await db.getAll('lessons'));
    walk(vocab.filter((w) => !w.list || (reviews.get(w.id) && reviews.get(w.id).status !== 'new')));
    const basic = [...all];
    walk(vocab);
    const srcs = [...all];
    if (!srcs.length || !(await hasAudio(srcs[0]))) { audioBox.innerHTML = ''; return; }
    const missing = Math.max(0, srcs.length - st.audio);
    const mb = (n) => Math.max(1, Math.round(n * 0.009)); // 平均每個音檔約 9 KB
    audioBox.innerHTML = missing
      ? `<div class="btn-row">
          <button type="button" class="btn btn--ghost" data-act="dl-audio" data-set="basic" data-testid="dl-audio">下載課程與學過的單字（${basic.length} 個，約 ${mb(basic.length)} MB）</button>
          <button type="button" class="btn btn--ghost" data-act="dl-audio" data-set="all" data-testid="dl-audio-all">下載全部音檔（${srcs.length} 個，約 ${mb(srcs.length)} MB）</button>
        </div><p class="hint" data-role="dl-progress">下載後就能離線播放。全部音檔包含整個多益單字庫，建議連 Wi-Fi 再下載。沒下載的音檔也會在第一次播放時自動存起來。</p>`
      : '<p class="status-line status-line--good" data-testid="dl-done">✅ 全部音檔都已下載，可以離線播放</p>';
    if (!missing) return;
    audioBox.querySelectorAll('[data-act="dl-audio"]').forEach((btn) => btn.addEventListener('click', async () => {
      audioBox.querySelectorAll('[data-act="dl-audio"]').forEach((b) => { b.disabled = true; });
      const prog = audioBox.querySelector('[data-role="dl-progress"]');
      const r = await downloadAudio(btn.dataset.set === 'all' ? srcs : basic, (d, n) => { prog.textContent = `下載中 ${d} / ${n}`; });
      prog.textContent = r.failed ? `完成，${r.failed} 個下載失敗，可以稍後再試一次。` : `完成！${r.done} 個音檔已存到這台裝置。`;
      clearAudioCache();
      await paintOffline();
    }));
  }
  paintOffline();

  if (query.section) {
    const target = outlet.querySelector(`#${CSS.escape(query.section)}`);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
}
