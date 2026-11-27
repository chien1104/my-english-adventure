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
- 資料：IndexedDB（`js/db.js`，目前 v3，`MIGRATIONS` 只能新增不能刪資料）＋ localStorage（`js/settings.js` 個人設定）。
- 教材：`data/catalog.json` 列出所有教材，App 啟動時寫入 IndexedDB。`contentVersion` 由 `dev/build_bank.py` 依所有教材檔內容自動產生，**改教材後重跑 build_bank.py**。
- 世界地圖依多益架構：`js/pages/worlds.js` 的 `WORLDS`／`SECTIONS`；課程分配在 `dev/assign_worlds.py`（改 world、order、requires 與 catalog 順序）。
- 多益單字庫：`dev/bank_src/{tsl,ngsl}-NN.txt`（每檔 100 字，順序對應 `lists.json` 的頻率排名）→ `dev/build_bank.py` 產生 `data/vocab/bank-*.json`、`data/series.json`、音檔清單。邏輯在 `js/bank.js`，畫面 `js/pages/words.js`（單字首頁）、`series.js`（單元列表）、`unit.js`（單元學習，進度存 progress `unit:<系列>:<序號>`）。單字表授權 CC BY-SA 4.0（NGSL／TSL），README 有標註。
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
python3 dev/build_content.py .       # 由程式產生 P4 之後新增的課程 JSON 與 dev/audio_manifest.json（最後會自動跑 add_prompt_audio、assign_worlds、build_bank）
python3 dev/build_bank.py . --strict # 單字庫（--strict：每一段都必須寫滿）
python3 dev/gen_audio.py . [words/|sentences/]   # 產生並驗證音檔；可開兩個程序分別跑 words/ 與 sentences/，速度約三倍
python3 dev/audio_report.py .        # 列出驗證沒通過、需要人工聽的音檔
python3 dev/build_single.py . out/my-english-adventure.html   # 產生單檔版（需要 npx esbuild）
```

端對端測試在 `dev/e2e/`（Playwright＋Chrome）：`run.py`(P1)、`p2.py`、`p3.py`、`p45.py`、`audit.py`（版面＋按鈕稽核，320～1024px）、`single_test.py`。
用法：`python3 dev/e2e/p2.py <專案路徑> <截圖資料夾>`。腳本裡 Chrome 路徑寫死為 `/usr/bin/google-chrome`，換環境要調整。

## 音檔

- 約 8,900 個 MP3 在 `assets/audio/`，由開源 Kokoro TTS（kokoro-onnx，模型從 GitHub releases 下載；有 `kokoro-v1.0.onnx` 就用它，比 int8 版快 2.6 倍）離線產生。單字庫音檔 32 kbps。
- `dev/gen_audio.py` 會產生並驗證：句子用 sherpa-onnx Whisper base.en 比對，單字比對音素與課本音標。腳本裡模型路徑寫死為 `/home/claude/tts`，換環境要調整。
- 題目文字裡的英文（例如「repairs 是什麼意思？」）旁邊有 🔊：`dev/add_prompt_audio.py` 幫每題加 `promptSay`，音檔放 `assets/audio/prompts/`（有單字音檔就沿用）；人名不加。`build_content.py` 最後會自動呼叫它。
- 稱謂 Ms./Mr. 在 TTS 時會換成 Miz/Mister（畫面仍顯示縮寫）。

## 目前狀態（v2.2）

- 2.2：聽力題可跳過（`engine.skipQuestion`：不計分，同組有不用聽的相似題就補上；模擬考跳過的題 `scoreExam(..., skipped)` 不計分，也可選「只考閱讀」，此時只估閱讀分數）。
- 2.2：多益程度測驗 `#/exam?id=level`（`js/level-test.js`）：從所有模擬考題庫依題組抽約 30 題、優先抽沒做過的，限時 25 分鐘；歷次成績存在 progress `leveltest`，首頁、學習分析、模擬考殿堂有入口和折線圖。

- P1～P5 全部完成；依多益架構的 11 個世界共 56 堂課（文法 11 堂、Part 1～7 各約 5 堂）＋迷你模擬考＋兩回半長模擬考（100 題、60 分鐘）。
- 2.1 課程在 `dev/content_v21*.py`（由 build_content.py 執行）；英式口音聲音 B＝bf_emma、BM＝bm_george，gen_audio 對 b 開頭的聲音用 en-gb。
- 單字進階欄位在 `dev/bank_src/extra-hot.txt`（build_bank.py 合併）；錯誤選項解析由 `dev/add_option_notes.py` 產生（只處理同字族的詞性題）。
- 資料庫 v3：新增 favorites（生字本，含在備份內）。設定新增 playbackRate（0.8／1）。
- 新頁面 `#/listening`（聽寫、跟讀）；`js/word-questions.js`（單字題型）、`score.js`（預估分數）、`weakness.js`（弱點分析）、`favorites.js`、`listening.js`。
- 多益單字庫 4107 字（5 個系列、206 個單元、12 種情境）；單元有活用練習（聽音選答、例句填空、拼字）。單檔版的單字庫不含音檔（太大）。
- 端對端測試裡的 http.server 若因逾時沒關，會佔住連接埠讓下一次測試連到舊檔案：跑測試前先 `pkill -f "http.server 87"`。
- 所有測試通過；版面與按鈕稽核 0 個問題。
- 尚可擴充：更多課程與模擬考題、真人錄音替換（同檔名覆蓋即可）。
