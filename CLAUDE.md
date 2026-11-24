# My English Adventure — 給 Claude Code 的交接說明

個人英文學習網頁 App：協助英文程度薄弱的使用者從基礎重建，挑戰 TOEIC 550。
使用者是芊芊，全程用**繁體中文**溝通，喜歡簡短直接的回報。

## 不可違反的規則（使用者的規格）

- 純 HTML5／CSS3／Vanilla JavaScript。**不可**使用任何 AI API、需要 API Key 的服務、雲端資料庫、需要連網才能載入的第三方程式庫。
- 所有教材以繁體中文解釋；英文內容必須正確（拼字、文法、翻譯、音標、答案唯一）。
- **介面上不可以出現沒有功能的按鈕或裝飾性功能**（例如沒有音檔就不顯示播放按鈕）。
- 不可在未經確認的情況下清除學習資料；更新程式要保留舊資料。
- 休息幾天不扣經驗值、不重置等級；不做「連續打卡」。
- 每個階段完成後先測試，確認正常再進下一步；不要一次產生大量未經測試的程式碼。
- 視覺：奶茶色、米白、暖棕，手機優先。

## 架構

- `index.html` + `js/app.js`（ES Modules，hash 路由 `#/home`）。必須用 localhost 或 HTTPS 開啟。
- 資料：IndexedDB（`js/db.js`，目前 v2，`MIGRATIONS` 只能新增不能刪資料）＋ localStorage（`js/settings.js` 個人設定）。
- 教材：`data/catalog.json` 列出所有教材，App 啟動時寫入 IndexedDB。**改教材後要更新 `contentVersion`**。
- 課程引擎：`js/lesson/engine.js`（純邏輯）＋ `js/lesson/player.js`（畫面）。答錯會排入同組相似題。
- 遊戲化：`js/gamify.js`（規則）、`js/rewards.js`（發經驗值，以 key 保證只發一次）。
- 間隔複習：`js/words.js`（Leitner 分盒 1／3／7／14／30 天）。
- PWA：`sw.js` 由 `dev/gen_sw.py` 產生（離線檔案清單）。**新增或改名任何程式、教材、圖片檔後都要重跑**。
- 單檔版：`dev/build_single.py` 把所有東西（含音檔）包成一個 HTML。

## 常用指令

```bash
python3 -m http.server 8000          # 本機執行，開 http://localhost:8000/
# 瀏覽器開 http://localhost:8000/tests/  → 單元測試＋教材品質檢查（應全部通過）

python3 dev/gen_sw.py . <版本號>     # 重新產生 sw.js 離線清單
python3 dev/build_content.py .       # 由程式產生 P4 之後新增的課程 JSON 與 dev/audio_manifest.json
python3 dev/build_single.py . out/my-english-adventure.html   # 產生單檔版（需要 npx esbuild）
```

端對端測試在 `dev/e2e/`（Playwright＋Chrome）：`run.py`(P1)、`p2.py`、`p3.py`、`p45.py`、`audit.py`（版面＋按鈕稽核，320～1024px）、`single_test.py`。
用法：`python3 dev/e2e/p2.py <專案路徑> <截圖資料夾>`。腳本裡 Chrome 路徑寫死為 `/usr/bin/google-chrome`，換環境要調整。

## 音檔

- 219 個 MP3 已在 `assets/audio/`，由開源 Kokoro TTS（kokoro-onnx，模型從 GitHub releases 下載）離線產生。
- `dev/gen_audio.py` 會產生並驗證：句子用 sherpa-onnx Whisper base.en 比對，單字比對音素與課本音標。腳本裡模型路徑寫死為 `/home/claude/tts`，換環境要調整。
- 題目文字裡的英文（例如「repairs 是什麼意思？」）旁邊有 🔊：`dev/add_prompt_audio.py` 幫每題加 `promptSay`，音檔放 `assets/audio/prompts/`（有單字音檔就沿用）；人名不加。`build_content.py` 最後會自動呼叫它。
- 稱謂 Ms./Mr. 在 TTS 時會換成 Miz/Mister（畫面仍顯示縮寫）。

## 目前狀態（v1.4）

- P1～P5 全部完成；八大世界共 24 堂課＋限時迷你模擬考。
- 所有測試通過；版面與按鈕稽核 0 個問題。
- 尚可擴充：更多課程與模擬考題、真人錄音替換（同檔名覆蓋即可）。
