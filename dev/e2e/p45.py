import sys, json, subprocess, time, glob, os, shutil, tempfile, re
from playwright.sync_api import sync_playwright

SRC, OUT = sys.argv[1], sys.argv[2]
ROOT = tempfile.mkdtemp()
shutil.copytree(SRC, ROOT, dirs_exist_ok=True)
PORT = 8769
BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

Q, WORDS = {}, {}
for f in glob.glob(os.path.join(ROOT, 'data/lessons/*.json')):
    for st in json.load(open(f))['steps']:
        for q in st.get('questions', []) + st.get('similar', []): Q[q['id']] = q
D = json.load(open(os.path.join(ROOT, 'data/diagnosis.json')))
for q in D['questions']: Q[q['id']] = q
for f in glob.glob(os.path.join(ROOT, 'data/vocab/*.json')):
    for w in json.load(open(f)): WORDS[w['id']] = w
BY_IMG = {w['image']: w for w in WORDS.values() if w.get('image')}

results, errors = [], []
offline = [False]
def check(name, cond, detail=''): results.append((name, bool(cond), detail))
def ready(p): p.wait_for_selector('html[data-ready="true"]', timeout=15000)
def kind(p):
    p.wait_for_timeout(30)
    loc = p.locator('[data-testid=player] [data-role="body"]')
    return loc.get_attribute('data-kind') if loc.count() else None
def cont(p): p.click('[data-role=feedback] [data-act="continue"]'); p.wait_for_timeout(40)
def answer(p):
    qid = p.get_attribute('.q', 'data-qid'); q = Q.get(qid)
    if q is None:  # 複習題
        opts = p.locator('.opt').all_inner_texts()
        if p.locator('.q__sentence').count():
            w = WORDS[p.inner_text('.q__sentence').replace('🔊', '').strip()]; ans = w['zh']
        else:
            ans = BY_IMG[p.get_attribute('.q .q__img', 'src')]['en']
        p.click(f'[data-opt="{opts.index(ans)}"]')
    elif q['type'] == 'choice':
        opts = p.locator('.opt').all_inner_texts(); p.click(f'[data-opt="{opts.index(q["answer"])}"]')
    elif q['type'] == 'type':
        p.fill('.q__type input', q['answer']); p.click('.q__type button[type=submit]')
    else:
        used = set()
        for tok in q['answer']:
            i = next(i for i, t in enumerate(q['tokens']) if t == tok and i not in used); used.add(i); p.click(f'[data-tok="{i}"]')
        p.click('[data-act=order-submit]')
    p.wait_for_selector('.feedback')
def finish_lesson(p, lid):
    p.goto(BASE + f'#/lesson?id={lid}'); p.wait_for_selector('[data-testid=player]')
    while True:
        k = kind(p)
        if k is None: break
        if k == 'practice': answer(p); cont(p)
        else: p.click('[data-act=next]')
    p.wait_for_selector('[data-testid=lesson-complete]')
def home_exp(p):
    p.goto(BASE + '#/home'); p.wait_for_selector('[data-testid=exp]'); p.wait_for_timeout(300)
    return int(p.inner_text('[data-testid=exp]').split()[0])
def exp_sum(p):
    return p.evaluate("(async () => (await window.__mea.db.getAll('expLog')).reduce((n, e) => n + e.amount, 0))()")
def play_game_perfect(p, gid):
    p.goto(BASE + f'#/game?id={gid}'); p.wait_for_selector(f'[data-testid=game-{gid}]')
    if gid == 'match':
        for wid in p.eval_on_selector_all('[data-match=picture]', 'els => els.map(e => e.dataset.id)'):
            p.click(f'[data-match=picture][data-id="{wid}"]'); p.click(f'[data-match=label][data-id="{wid}"]'); p.wait_for_timeout(40)
    elif gid == 'speed':
        for _ in range(12):
            p.wait_for_selector('.opt:not([disabled])')
            opts = p.locator('.opt').all_inner_texts()
            ans = WORDS[p.inner_text('[data-testid=speed-word]')]['zh'] if p.locator('[data-testid=speed-word]').count() else BY_IMG[p.get_attribute('[data-role=q] img', 'src')]['en']
            p.click(f'[data-opt="{opts.index(ans)}"]'); p.wait_for_timeout(300)
        p.click('[data-act=quit]')
    else:
        while p.locator('[data-testid=game-spell]').count():
            w = BY_IMG[p.get_attribute('[data-role=card] .q__img', 'src')]
            tiles = p.eval_on_selector_all('[data-tile]', 'els => els.map(e => [e.dataset.tile, e.textContent])'); used = set()
            for ch in w['en']:
                tid = next(t for t, c in tiles if c == ch and t not in used); used.add(tid); p.click(f'[data-tile="{tid}"]')
            p.click('[data-act=check]'); p.wait_for_selector('.feedback')
            try: p.click('.feedback-sheet [data-act=next]', timeout=1500)
            except Exception: pass  # 拼對會自動下一題
            p.wait_for_timeout(60)
    p.wait_for_selector('[data-testid=game-result]')

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = browser.new_context(viewport={'width': 375, 'height': 812}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.on('console', lambda m: m.type == 'error' and '404' not in m.text and 'ERR_INTERNET_DISCONNECTED' not in m.text and not (offline[0] and 'ERR_FAILED' in m.text) and errors.append(f'console: {m.text}'))
        page.on('dialog', lambda d: (errors.append('dialog'), d.dismiss()))

        # ========== P4 ==========
        page.goto(BASE); ready(page)
        check('新使用者 Lv 1、0 EXP', home_exp(page) == 0 and page.inner_text('[data-testid=level]') == 'Lv 1')

        page.goto(BASE + '#/diagnosis'); page.click('[data-act=start]')
        while page.locator('[data-testid=diagnosis-run]').count():
            page.click('[data-act=skip]'); page.wait_for_timeout(15)
        page.wait_for_selector('[data-testid=diagnosis-result]'); page.wait_for_timeout(800)
        e = home_exp(page)
        check('完成診斷 +20、解鎖「踏出第一步」+30 → 50 EXP', e == 50, str(e))
        check('首頁經驗值與紀錄一致', e == exp_sum(page))
        tasks = page.locator('[data-task]').all_inner_texts()
        check('普通模式每日任務：答對 10 題、完成 1 堂課（還沒學單字所以沒有複習任務）', len(tasks) == 2 and '答對 10 題' in tasks[0], str(tasks))
        page.click('[data-mode=low]'); page.wait_for_timeout(400)
        check('低電量模式任務份量變少（答對 5 題）', '答對 5 題' in page.inner_text('[data-testid=task-list]'))
        page.click('[data-mode=normal]'); page.wait_for_timeout(300)

        page.goto(BASE + '#/worlds'); page.wait_for_selector('[data-testid=world-list]')
        wl = page.inner_text('[data-testid=world-list]')
        check('多益 Part 1 需先完成文法課才開放', 'Part 1 照片描述' in wl and '完成「be 動詞' in wl, wl)

        finish_lesson(page, 'vocab-1'); page.wait_for_timeout(1500)
        e2 = home_exp(page)
        # 11 題全對 22 + 第一次完成 30 + 成就（第一堂課、完美一課）60 + 每日任務（答對 10、完成 1 課）30
        # 學完單字後多出「複習 5 個單字」任務，還沒做，所以沒有「全部完成」獎勵
        check('完成第一堂課後經驗值正確累加（50→192）', e2 == 192, str(e2))
        check('升到 Lv 2「村莊旅人」', page.inner_text('[data-testid=level]') == 'Lv 2' and '村莊旅人' in page.inner_text('[data-testid=level-box]'))
        done_tasks = page.locator('.task.is-done').count(); all_tasks = page.locator('.task').count()
        check('學完單字後出現複習任務；已完成 2 / 3 個任務', all_tasks == 3 and done_tasks == 2, f'{done_tasks}/{all_tasks}')
        page.screenshot(path=f'{OUT}/p4-01-home.png', full_page=True)

        # 間隔複習
        page.goto(BASE + '#/words'); page.wait_for_selector('[data-testid=due-line]')
        check('學完當天沒有到期單字，顯示下次複習日期', '今天沒有到期' in page.inner_text('[data-testid=due-line]'))
        page.evaluate("""(async () => { const db = window.__mea.db; for (const r of await db.getAll('reviews')) { r.dueAt = Date.now() - 86400000; await db.put('reviews', r); } })()""")
        page.goto(BASE + '#/home'); page.wait_for_selector('[data-testid=plan-list]')
        check('單字到期後，今日安排出現「單字複習（今天到期 8 個）」', '今天到期 8 個' in page.inner_text('[data-testid=plan-list]'))
        page.goto(BASE + '#/words'); page.wait_for_selector('[data-testid=start-review]')
        check('單字頁顯示 8 個到期', '8' in page.inner_text('[data-testid=due-line]'))
        page.click('[data-testid=start-review]'); page.wait_for_selector('.q')
        n = 0
        while kind(page) == 'practice': answer(page); cont(page); n += 1
        page.click('[data-act=next]'); page.wait_for_selector('[data-testid=review-complete]')
        boxes = page.evaluate("(async () => (await window.__mea.db.getAll('reviews')).map(r => r.box))()")
        check('到期複習 8 題全對後，每個單字升一盒（間隔拉長）', n == 8 and all(b == 2 for b in boxes), f'{n} {boxes}')
        page.goto(BASE + '#/words'); page.wait_for_selector('[data-testid=due-line]')
        check('複習完今天沒有到期單字', '今天沒有到期' in page.inner_text('[data-testid=due-line]'))

        # 每日挑戰
        page.goto(BASE + '#/home'); page.wait_for_selector('[data-testid=challenge]')
        gid = page.get_attribute('[data-testid=challenge] a', 'href').split('=')[-1]
        before = exp_sum(page)
        play_game_perfect(page, gid); page.wait_for_timeout(1200)
        check('遊戲結果頁顯示今日挑戰完成', '今日挑戰完成' in page.inner_text('[data-testid=game-result]'))
        page.goto(BASE + '#/home'); page.wait_for_selector('[data-testid=challenge]')
        check('首頁每日挑戰標示完成', '完成了' in page.inner_text('[data-testid=challenge]'))
        check('挑戰 +30 EXP 有入帳', exp_sum(page) - before >= 30 + 5)

        # 多益：完成 3 堂文法課後開放
        for lid in ['grammar-1', 'grammar-2', 'grammar-3']: finish_lesson(page, lid)
        page.goto(BASE + '#/world?id=part1'); page.wait_for_selector('[data-testid=lesson-list]')
        check('完成文法課後多益 Part 1 世界開放', page.locator('[data-testid=start-toeic-p1]').count() == 1)
        finish_lesson(page, 'toeic-p1')
        check('多益 Part 1 聽力全對 100%', page.inner_text('[data-testid=accuracy]') == '100%')

        # 成就與分析
        page.goto(BASE + '#/achievements'); page.wait_for_selector('[data-testid=badge-grid]')
        un = int(page.inner_text('[data-testid=ach-unlocked]'))
        db_un = page.evaluate("(async () => (await window.__mea.db.getAll('achievements')).length)()")
        check('成就頁數量與資料一致，且至少解鎖 4 個', un == db_un and un >= 4, f'{un}/{db_un}')
        page.screenshot(path=f'{OUT}/p4-02-achievements.png', full_page=True)
        page.goto(BASE + '#/stats'); page.wait_for_selector('[data-testid=st-total]')
        total = int(page.inner_text('[data-testid=st-total]'))
        db_total = page.evaluate("(async () => (await window.__mea.db.getAll('attempts')).filter(a => ['lesson','review','mistake','game'].includes(a.kind)).length)()")
        check('分析頁總題數與資料一致', total == db_total, f'{total}/{db_total}')
        check('今天的作答數顯示在讀數', '題' in page.inner_text('[data-testid=readout]'))
        page.click('[data-col="0"]')
        check('點其他天可以切換讀數', page.inner_text('[data-testid=readout]').endswith('0 題'))
        check('單字熟悉度圖例有文字數量', '學習中' in page.inner_text('[data-testid=word-legend]'))
        page.click('.table-view summary')
        check('有表格檢視', page.locator('.table-view table').is_visible())
        page.screenshot(path=f'{OUT}/p4-03-stats.png', full_page=True)

        # ========== P5 ==========
        # 備份
        page.goto(BASE + '#/settings?section=backup'); page.wait_for_selector('[data-testid=export-btn]')
        with page.expect_download() as dl:
            page.click('[data-testid=export-btn]')
        path = dl.value.path(); name = dl.value.suggested_filename
        bk = json.load(open(path))
        check('匯出備份檔檔名與格式', re.match(r'my-english-adventure-backup-\d{8}-\d{4}\.json', name) and bk['app'] == 'my-english-adventure', name)
        check('備份包含所有學習資料表', all(k in bk['data'] for k in ['profile', 'progress', 'attempts', 'reviews', 'expLog', 'achievements', 'sessions']))
        check('備份不包含教材（可重新下載）', 'vocab' not in bk['data'] and 'lessons' not in bk['data'])
        page.wait_for_timeout(300)
        check('匯出後保存狀態顯示備份時間', '上次匯出' in page.inner_text('[data-testid=status-list]'))
        exp_before = exp_sum(page)
        shutil.copy(path, os.path.join(tempfile.gettempdir(), 'mea-backup.json'))
        bad = os.path.join(tempfile.gettempdir(), 'bad.json'); open(bad, 'w').write('{"app":"other"}')
        page.set_input_files('[data-testid=restore-input]', bad); page.wait_for_selector('[data-testid=restore-error]')
        check('錯誤的備份檔被拒絕，資料不變', '不是 My English Adventure' in page.inner_text('[data-testid=restore-error]') and exp_sum(page) == exp_before)

        # 在「另一台裝置」還原
        ctx2 = browser.new_context(viewport={'width': 375, 'height': 812}, is_mobile=True, has_touch=True)
        p2 = ctx2.new_page(); p2.on('pageerror', lambda e: errors.append(f'p2 pageerror: {e}'))
        p2.goto(BASE + '#/settings?section=backup'); ready(p2); p2.wait_for_selector('[data-testid=restore-input]', state='attached')
        p2.set_input_files('[data-testid=restore-input]', os.path.join(tempfile.gettempdir(), 'mea-backup.json'))
        p2.wait_for_selector('[data-testid=restore-preview]')
        check('還原前顯示備份內容摘要', '完成課程 5 堂' in p2.inner_text('[data-testid=restore-preview]'), p2.inner_text('[data-testid=restore-preview]'))
        p2.click('[data-act=do-restore]'); p2.wait_for_selector('.modal')
        check('還原前再次確認（危險操作）', '無法復原' in p2.inner_text('.modal'))
        p2.click('.modal [data-act=ok]'); p2.wait_for_timeout(1200)
        p2.wait_for_selector('[data-testid=exp]')
        check('新裝置還原後經驗值完全一致', int(p2.inner_text('[data-testid=exp]').split()[0]) == exp_before)
        check('新裝置還原後完成課程數一致', p2.inner_text('[data-testid=done-count]') == '5')
        ctx2.close()

        # PWA
        man = page.evaluate("fetch('manifest.webmanifest').then(r => r.json())")
        check('manifest 可讀取，名稱與圖示正確', man['short_name'] == '英文冒險' and len(man['icons']) == 3)
        for ic in man['icons']:
            check(f'圖示存在 {ic["src"]}', page.evaluate(f"fetch('{ic['src']}').then(r => r.ok)"))
        page.evaluate("navigator.serviceWorker.ready")
        page.reload(); ready(page)
        page.wait_for_function("!!navigator.serviceWorker.controller", timeout=15000)
        page.goto(BASE + '#/settings?section=offline'); page.wait_for_selector('[data-testid=offline-state]')
        check('設定頁顯示「已可離線使用」', '已可離線使用' in page.inner_text('[data-testid=offline-state]'))
        sw = open(os.path.join(ROOT, 'sw.js')).read()
        listed = set(json.loads(re.search(r'const PRECACHE = (\[.*?\]);', sw, re.S).group(1)))
        actual = set()
        for dp, dn, fn in os.walk(ROOT):
            rel = os.path.relpath(dp, ROOT)
            if rel.startswith(('tests', 'assets/audio', 'dev', '.git')): continue
            for f in fn:
                if f.startswith('.') or f in ('sw.js', 'README.md', 'CLAUDE.md'): continue
                actual.add(os.path.normpath(os.path.join(rel, f)))
        check('離線清單涵蓋所有程式、教材、圖片', actual <= listed, str(actual - listed))

        # 音檔下載
        page.wait_for_selector('[data-testid=dl-audio]', timeout=8000)
        n_audio = int(re.search(r'（(\d+) 個', page.inner_text('[data-testid=dl-audio]')).group(1))
        check('顯示下載課程與學過單字音檔按鈕（200 個以上）', n_audio >= 200, str(n_audio))
        check('另外有下載全部音檔（含單字庫）的按鈕', page.locator('[data-testid=dl-audio-all]').count() == 1)
        page.click('[data-testid=dl-audio]')
        page.wait_for_function(f"() => {{ const e = document.querySelector('[data-testid=audio-cached]'); return e && parseInt(e.textContent) >= {n_audio}; }}", timeout=90000)
        check('課程與學過單字的音檔已存到裝置', int(page.inner_text('[data-testid=audio-cached]').split()[0]) >= n_audio)

        # 離線
        ctx.set_offline(True); offline[0] = True
        page.reload(); ready(page)
        page.goto(BASE + '#/home'); page.wait_for_selector('[data-testid=exp]')
        check('離線：App 可開啟，經驗值正常', int(page.inner_text('[data-testid=exp]').split()[0]) == exp_sum(page))
        page.goto(BASE + '#/lesson?id=vocab-2'); page.wait_for_selector('[data-testid=player]')
        page.click('[data-act=next]'); page.wait_for_timeout(300)
        check('離線：可以上課、圖片正常', page.evaluate("document.querySelector('.word-card__img').naturalWidth > 0"))
        page.goto(BASE + '#/lesson?id=vocab-1'); page.wait_for_selector('[data-testid=player]')
        page.click('[data-act=next]'); page.wait_for_timeout(800)
        check('離線：單字與例句的音檔都能播放', page.locator('.audio-btn').count() == 2)
        page.goto(BASE + '#/lesson?id=toeic-p2'); page.wait_for_selector('[data-testid=player]')
        for _ in range(3): page.click('[data-act=next]'); page.wait_for_timeout(80)
        src = page.get_attribute('[data-play]', 'data-play')
        ok = page.evaluate(f"fetch('{src}').then(r => r.ok)")
        check('離線：多益聽力題音檔可讀取', ok)
        page.goto(BASE + '#/games'); page.wait_for_selector('[data-testid=game-list]')
        check('離線：遊戲可用', page.locator('.game-card').count() == 3)
        page.screenshot(path=f'{OUT}/p5-01-offline.png', full_page=True)
        ctx.set_offline(False); page.wait_for_timeout(500); offline[0] = False

        # 更新流程：發布新版本 → 提示 → 按更新 → 資料保留
        open(os.path.join(ROOT, 'sw.js'), 'w').write(sw.replace("const VERSION = '", "const VERSION = 'next-"))
        exp_keep = exp_sum(page)
        page.goto(BASE + '#/home'); ready(page)
        page.evaluate("navigator.serviceWorker.getRegistration().then(r => r.update())")
        page.wait_for_selector('#update-banner:not([hidden])', timeout=45000)
        check('新版本出現更新提示', '學習資料會完整保留' in page.inner_text('#update-banner'))
        page.screenshot(path=f'{OUT}/p5-02-update.png')
        page.click('[data-act=apply-update]')
        page.wait_for_timeout(2500); ready(page)
        keys = page.evaluate("caches.keys()")
        check('更新後切換到新版本快取、舊快取清除', any(k.startswith('mea-shell-next-') for k in keys) and not any(k == 'mea-shell-2026.11.17-p5' for k in keys), str(keys))
        check('更新後學習資料完整保留', exp_sum(page) == exp_keep)

        for path in ['#/home', '#/achievements', '#/stats', '#/settings']:
            page.goto(BASE + path); page.wait_for_timeout(400)
            sw_ = page.evaluate('document.documentElement.scrollWidth')
            check(f'375px 無水平捲動 {path}', sw_ <= 375, str(sw_))
            orphan = page.evaluate("""[...document.querySelectorAll('#app button')].filter(b => !b.hidden && !b.closest('[hidden]') && !(b.type === 'submit' || b.dataset.play || b.dataset.act || b.dataset.mode || b.dataset.opt !== undefined || b.dataset.filter || b.dataset.col !== undefined)).map(b => b.outerHTML.slice(0, 80))""")
            check(f'{path} 沒有無作用按鈕', not orphan, str(orphan))
        page.goto(BASE + '#/settings'); page.wait_for_timeout(400)
        page.screenshot(path=f'{OUT}/p5-03-settings.png', full_page=True)
        browser.close()
except Exception as ex:
    import traceback; traceback.print_exc(limit=3)
    errors.append('ABORT: ' + str(ex).splitlines()[0])
    try:
        page.screenshot(path=f'{OUT}/p45-abort.png', full_page=True); print('APP:', page.inner_text('#app')[:600])
    except Exception as e2: print('shot fail', e2)
finally:
    srv.terminate(); shutil.rmtree(ROOT, ignore_errors=True)

check('全程沒有 JavaScript 錯誤', not errors, '; '.join(errors[:5]))
for n, ok, d in results: print(('PASS ' if ok else 'FAIL ') + n + (f'  -- {d}' if d and not ok else ''))
print(f"\n合計：{sum(1 for r in results if r[1])}/{len(results)} 通過")
