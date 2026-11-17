# My English Adventure

個人英文學習網頁 App（純 HTML／CSS／Vanilla JS，不使用任何 API 或外部程式庫）。

目前版本：**1.1.0（P1～P5 完成＋八大世界全部開課）**

- P1：基礎架構、首頁、導覽、資料庫
- P2：程度診斷、課程、單字圖書館、單字複習、依精神狀態的今日安排
- P3：遊戲樂園（圖字配對、單字快打、拼字工坊）、錯題百科與錯題重練、題庫擴充為 6 堂課 24 個單字
- P4：間隔複習排程（1、3、7、14、30 天）、經驗值與等級、依精神狀態調整的每日任務、每日挑戰、13 個成就、學習數據分析
- P5：PWA（可加入主畫面）、離線使用、音檔離線播放、JSON 備份與還原、新版本更新提示
- 八大世界共 24 堂課：字母森林（自然發音 3 課）、單字村莊（3 課）、文法城堡（3 課）、生活冒險島（點餐、購物、問路）、聽讀學院（2 課）、商務城市（2 課）、多益訓練營（Part 1～7 各 1 課）、550 分挑戰殿堂（限時迷你模擬考）
- 206 個英文音檔：單字、例句、對話、聽力題、多益聽力，全部離線可播放

介面只顯示已完成的功能；沒有音檔的單字不顯示發音按鈕。

## 本機執行

ES Modules 不能用 `file://` 開啟，請用本機伺服器：

```bash
cd my-english-adventure
python3 -m http.server 8000
# 開啟 http://localhost:8000/
```

自動測試：`http://localhost:8000/tests/`

## 部署到 GitHub Pages

1. 在 GitHub 建立新的 repository（例如 `my-english-adventure`），設為 Public。
2. 把這個資料夾內的全部檔案上傳到 repository 根目錄（`index.html` 必須在最外層）。
3. 進入 Settings → Pages → Build and deployment → Source 選 `Deploy from a branch`，Branch 選 `main`、資料夾選 `/ (root)`，按 Save。
4. 等 1–2 分鐘，網址會是 `https://<帳號>.github.io/my-english-adventure/`。
5. 手機打開 `.../tests/` 確認測試全數通過。

## 單檔版（my-english-adventure.html）

- 一個 HTML 檔就包含全部程式、教材、圖片和音檔，下載後直接用瀏覽器打開即可，不需要網路。
- 學習資料存在「打開它的那個瀏覽器」裡；換裝置請用「設定 → 備份與還原」。
- 單檔版沒有「加入主畫面後自動更新」的功能；想要手機 App 般的體驗，請用完整專案部署到 GitHub Pages。

## 教材

- `data/catalog.json`：教材清單與版本號。修改教材後請更新 `contentVersion`，App 才會重新載入。
- `data/vocab/*.json`：單字；`data/lessons/*.json`：課程；`data/diagnosis.json`：診斷題。
- `assets/img/words/*.svg`：單字插畫。
- `assets/audio/`：發音與聽力音檔（見 `assets/audio/README.md`）。
- `assets/img/scenes/*.svg`：多益 Part 1 照片題的情境圖。
- 打開 `tests/` 會自動檢查教材：答案是否唯一、圖片是否存在、文法課是否包含 8 個部分等。

## 離線與更新

- 用 HTTPS（GitHub Pages）開啟一次後，App 就會存到手機，之後沒有網路也能開啟、上課、玩遊戲。
- 發音音檔：第一次播放時自動存到手機；也可以在「設定 → 離線使用」一次下載全部。
- 發布新版本時，App 會顯示「有新版本可以更新」，按下才會切換，學習資料完整保留。
- 開發者注意：新增或改名程式、教材、圖片檔後，要重新產生 `sw.js` 裡的離線清單並更新版本號（音檔不在清單內，不受影響）。

## 資料保存說明

- 學習資料存在瀏覽器的 IndexedDB，設定存在 localStorage。
- GitHub Pages 只提供靜態網頁，**沒有後端、沒有跨裝置同步、沒有雲端備份**。
- 「設定 → 備份與還原」可以匯出 JSON 備份檔（下載到這台裝置），換手機時用它還原。還原前會顯示摘要並再次確認。

## 資料庫版本規則

`js/db.js` 的 `MIGRATIONS` 每個版本一個函式，只能新增或轉換資料，不得刪除使用者資料。
升級時把 `DB_VERSION` +1 並新增對應遷移。
