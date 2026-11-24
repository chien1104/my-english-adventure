import sys, json, subprocess, time, glob, os
from playwright.sync_api import sync_playwright

ROOT, OUT = sys.argv[1], sys.argv[2]
PORT = 8767
BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

# 讀題庫，用來找正確答案
Q = {}
for f in glob.glob(os.path.join(ROOT, 'data/lessons/*.json')):
    for st in json.load(open(f))['steps']:
        for q in st.get('questions', []) + st.get('similar', []):
            Q[q['id']] = q
DIAG = json.load(open(os.path.join(ROOT, 'data/diagnosis.json')))
for q in DIAG['questions']: Q[q['id']] = q

results, errors = [], []
def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))

def ready(page):
    page.wait_for_selector('html[data-ready="true"]', timeout=10000)

def answer_current(page, correct=True):
    box = page.locator('.q').first
    qid = box.get_attribute('data-qid')
    q = Q.get(qid)
    if q is None and qid.startswith('rv-'):
        # 複習題：從畫面推正確答案（中文題 / 圖片題）
        return None
    if q['type'] == 'choice':
        idx = q['options'].index(q['answer']) if correct else next(i for i, o in enumerate(q['options']) if o != q['answer'])
        page.click(f'[data-opt="{idx}"]')
    elif q['type'] == 'type':
        page.fill('.q__type input', q['answer'].upper() if correct else 'zzz')
        page.click('.q__type button[type=submit]')
    elif q['type'] == 'order':
        order = q['answer'] if correct else list(reversed(q['answer']))
        used = set()
        for tok in order:
            i = next(i for i, t in enumerate(q['tokens']) if t == tok and i not in used)
            used.add(i)
            page.click(f'[data-tok="{i}"]')
        page.click('[data-act="order-submit"]')
    page.wait_for_selector('.feedback')
    return qid

def cont(page):
    page.click('[data-role=feedback] [data-act="continue"]')
    page.wait_for_timeout(80)

def body_kind(page):
    page.wait_for_timeout(30)
    loc = page.locator('[data-testid=player] [data-role="body"]')
    return loc.get_attribute('data-kind') if loc.count() else None

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = browser.new_context(viewport={'width': 375, 'height': 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.on('console', lambda m: m.type == 'error' and '404' not in m.text and 'ERR_FAILED' not in m.text and errors.append(f'console: {m.text}'))
        page.on('dialog', lambda d: (errors.append('unexpected dialog'), d.dismiss()))

        # ---- 1. 全新使用者 ----
        page.goto(BASE); ready(page)
        page.wait_for_selector('[data-testid=diagnosis-cta]', timeout=10000)
        check('首頁顯示「開始程度診斷」', page.is_visible('[data-testid=diagnosis-cta]'))
        check('診斷前沒有今日安排', page.locator('[data-testid=plan-list]').count() == 0)
        page.goto(BASE + '#/worlds'); page.wait_for_selector('[data-testid=world-list]')
        wtext = page.inner_text('[data-testid=world-list]')
        check('診斷前：11 個世界都顯示完成診斷後開放', wtext.count('完成診斷後開放') == 11, wtext)
        check('11 個多益世界都有課程並顯示', page.locator('.world').count() == 11 and '發音基礎' in wtext and 'Part 7 閱讀理解' in wtext)
        page.goto(BASE + '#/lesson?id=vocab-1'); page.wait_for_timeout(300)
        check('診斷前直接開課程網址會被擋下', '完成程度診斷後開放' in page.inner_text('#app'))

        # ---- 2. 程度診斷 ----
        page.goto(BASE + '#/diagnosis'); page.wait_for_selector('[data-testid=diagnosis-intro]')
        page.click('[data-act=start]')
        n = 0
        while page.locator('[data-testid=diagnosis-run]').count():
            qid = page.get_attribute('.q', 'data-qid')
            q = Q[qid]
            if qid in ('d-v1', 'd-v2'):
                page.click(f'[data-opt="{q["options"].index(q["answer"])}"]')
            elif qid == 'd-g1':
                page.click('[data-opt="0"]')  # 故意答錯 is
            else:
                page.click('[data-act=skip]')
            n += 1
            page.wait_for_timeout(30)
            if n == 3:
                page.screenshot(path=f'{OUT}/p2-01-diagnosis-q.png')
            if n > 20: break
        page.wait_for_selector('[data-testid=diagnosis-result]')
        check('診斷 13 題全部作答完畢', n == 13, str(n))
        check('診斷分數正確（答對 2 題）', page.inner_text('[data-testid=diag-score]') == '2')
        rtext = page.inner_text('#app')
        check('診斷等級：從頭重建', '從頭重建' in rtext)
        check('答錯題目顯示中文解釋', '主詞 I 配 am。' in rtext)
        check('診斷後開放單字基礎與文法基礎', '單字基礎' in rtext and '文法基礎' in rtext)
        page.screenshot(path=f'{OUT}/p2-02-diagnosis-result.png', full_page=True)

        # ---- 3. 首頁今日安排 ----
        page.goto(BASE + '#/home'); page.wait_for_selector('[data-testid=plan-list]')
        check('診斷後首頁不再顯示診斷提示', page.locator('[data-testid=diagnosis-cta]').count() == 0)
        plan = page.inner_text('[data-testid=plan-list]')
        check('普通模式今日安排：第一堂單字課', '早餐桌上' in plan, plan)
        page.click('[data-mode=focus]'); page.wait_for_timeout(100)
        plan = page.inner_text('[data-testid=plan-list]')
        check('專注模式安排單字＋文法', '早餐桌上' in plan and 'be 動詞' in plan, plan)
        page.screenshot(path=f'{OUT}/p2-03-home-plan.png', full_page=True)

        # ---- 4. 世界 → 課程 ----
        page.goto(BASE + '#/world?id=words'); page.wait_for_selector('[data-testid=lesson-list]')
        check('第 2 課在第 1 課完成前鎖住', '完成上一課後開放' in page.inner_text('[data-lesson=vocab-2]'))
        page.click('[data-testid=start-vocab-1]'); page.wait_for_selector('[data-testid=player]')
        check('課程第 1 步是概念說明', body_kind(page) == 'concept')
        page.click('[data-act=next]'); page.wait_for_timeout(100)
        check('第 2 步是單字卡', body_kind(page) == 'word')
        page.wait_for_function("!document.querySelector('[data-audio-slot]:empty')")
        check('有音檔：顯示單字發音和例句發音按鈕', page.locator('.audio-btn').count() == 2)
        card = page.inner_text('.word-card')
        check('單字卡顯示英文、音標、中文、詞性、例句、難度、狀態',
              all(k in card for k in ['apple', '/ˈæpəl/', '蘋果', 'n.', 'I eat an apple every day.', '我每天吃一顆蘋果。', '難度', '還沒學']), card)
        img_ok = page.evaluate("document.querySelector('.word-card__img').naturalWidth > 0")
        check('單字 SVG 插畫載入成功', img_ok)
        page.screenshot(path=f'{OUT}/p2-04-wordcard.png', full_page=True)
        page.click('[data-act=back]'); page.wait_for_timeout(80)
        check('可以回到上一步', body_kind(page) == 'concept')
        for _ in range(9): page.click('[data-act=next]'); page.wait_for_timeout(40)
        check('看完 8 張單字卡進入練習', body_kind(page) == 'practice')

        check('作答前「下一步」確實隱藏', not page.is_visible('[data-act=next]'))
        first = answer_current(page, correct=False)
        fb = page.inner_text('.feedback')
        check('答錯顯示正確答案與中文解釋', '正確答案' in fb and Q[first]['explanation'] in fb, fb)
        check('答錯後安排相似題', '類似' in fb)
        page.screenshot(path=f'{OUT}/p2-05-wrong.png', full_page=True)
        cont(page)
        answer_current(page, True); cont(page)
        answer_current(page, True)
        # 暫停離開
        step_before = page.inner_text('.player__step')
        page.click('[data-act=continue]'); page.wait_for_timeout(80)
        qid_before = page.get_attribute('.q', 'data-qid')
        page.click('[data-act=exit]'); page.wait_for_selector('[data-testid=lesson-list]')
        check('暫停後世界頁顯示「繼續」', page.locator('[data-testid=continue-vocab-1]').count() == 1)
        page.reload(); ready(page)
        page.click('[data-testid=continue-vocab-1]'); page.wait_for_selector('.q')
        check('重新整理後繼續：回到同一題', page.get_attribute('.q', 'data-qid') == qid_before, f'{qid_before} vs {page.get_attribute(".q","data-qid")}')

        seen_similar = False
        guard = 0
        while body_kind(page) == 'practice' and guard < 40:
            qid = answer_current(page, True)
            if qid.endswith('-b'): seen_similar = True
            cont(page); guard += 1
        check('相似題實際出現在練習最後', seen_similar)
        check('練習完進入答案解析', body_kind(page) == 'review')
        check('答案解析頁不顯示無效的「上一步」', not page.is_visible('[data-act=back]'))
        rv = page.inner_text('[data-role=body]')
        check('答案解析列出答錯題與補練題', '❌' in rv and '補練' in rv)
        page.screenshot(path=f'{OUT}/p2-06-review.png', full_page=True)
        page.click('[data-act=next]'); page.wait_for_timeout(80)
        check('延伸練習為拼字題', page.locator('.q__type').count() == 1)
        while body_kind(page) == 'practice':
            answer_current(page, True)
            fbt = page.inner_text('.feedback')
            if '再想想' in fbt: errors.append('拼字大寫被判錯')
            cont(page)
        page.wait_for_selector('[data-testid=lesson-complete]')
        check('完成畫面顯示正確率 91%（11 題錯 1 題）', page.inner_text('[data-testid=accuracy]') == '91%', page.inner_text('[data-testid=accuracy]'))
        check('完成後出現「下一課」', page.locator('[data-testid=next-lesson]').count() == 1)
        page.screenshot(path=f'{OUT}/p2-07-complete.png', full_page=True)

        # ---- 5. 單字圖書館與複習 ----
        page.click('.tabbar__link[href="#/words"]'); page.wait_for_selector('[data-testid=word-list]')
        learning = int(page.inner_text('[data-testid=count-learning]'))
        check('完成單字課後 8 個單字進入學習中', learning == 8, str(learning))
        page.click('[data-filter=learning]'); page.wait_for_timeout(80)
        check('篩選學習中顯示 8 個', page.locator('.word-row').count() == 8)
        page.click('.word-row summary >> nth=0'); page.wait_for_timeout(200)
        check('點單字展開完整單字卡', page.is_visible('.word-row details[open] .word-card'))
        page.screenshot(path=f'{OUT}/p2-08-library.png', full_page=True)
        page.click('[data-testid=free-practice]'); page.wait_for_selector('.q')
        # 複習：用頁面上的單字資料找答案
        words = {}
        for f in glob.glob(os.path.join(ROOT, 'data/vocab/*.json')):
            for w in json.load(open(f)): words[w['id']] = w
        count = 0
        while body_kind(page) == 'practice' and count < 20:
            qid = page.get_attribute('.q', 'data-qid'); w = words[qid[3:]]
            opts = page.locator('.opt').all_inner_texts()
            target = w['en'] if w['en'] in opts else w['zh']
            page.click(f'[data-opt="{opts.index(target)}"]'); page.wait_for_selector('.feedback')
            cont(page); count += 1
        check('複習 8 題全部可作答', count == 8, str(count))
        page.click('[data-act=next]'); page.wait_for_selector('[data-testid=review-complete]')
        check('複習完成畫面', '8</strong> / 8' in page.inner_html('[data-testid=review-complete]'))

        # ---- 6. 文法課（含排序題）----
        page.goto(BASE + '#/lesson?id=grammar-1'); page.wait_for_selector('[data-testid=player]')
        kinds = []
        for _ in range(5):
            kinds.append(body_kind(page)); page.click('[data-act=next]'); page.wait_for_timeout(60)
        check('文法課依序：概念、說明、例句、拆解、對錯示範', kinds == ['concept', 'explain', 'examples', 'breakdown', 'contrast'], str(kinds))
        page.screenshot(path=f'{OUT}/p2-09-grammar-practice.png', full_page=True)
        while body_kind(page) == 'practice': answer_current(page, True); cont(page)
        page.click('[data-act=next]'); page.wait_for_timeout(80)
        check('延伸練習有排序題', page.locator('.order').count() == 1)
        # 先排錯再按重排
        page.click('[data-tok="0"]'); page.click('[data-act=order-reset]')
        check('排序題「重排」可清空', page.locator('.chip--placed').count() == 0)
        page.screenshot(path=f'{OUT}/p2-10-order.png', full_page=True)
        while body_kind(page) == 'practice': answer_current(page, True); cont(page)
        page.wait_for_selector('[data-testid=lesson-complete]')
        check('文法課全對 100%', page.inner_text('[data-testid=accuracy]') == '100%')

        # ---- 7. 重新學習 ----
        page.goto(BASE + '#/lesson?id=grammar-2'); page.wait_for_selector('[data-testid=player]')
        page.click('[data-act=next]'); page.click('[data-act=next]'); page.wait_for_timeout(80)
        page.click('[data-act=exit]'); page.wait_for_selector('[data-testid=lesson-list]')
        check('世界頁顯示進行中第 3 步', '第 3 / 8 步' in page.inner_text('[data-lesson=grammar-2]'), page.inner_text('[data-lesson=grammar-2]'))
        page.click('[data-lesson=grammar-2] [data-act=restart]'); page.click('.modal [data-act=ok]')
        page.wait_for_selector('[data-testid=player]')
        check('重新學習從第 1 步開始', page.inner_text('.player__step').startswith('第 1 /'))

        # ---- 8. 低電量模式 ----
        page.goto(BASE + '#/home'); page.wait_for_selector('[data-testid=plan-list]')
        page.click('[data-mode=low]'); page.wait_for_timeout(100)
        items = page.locator('.plan-item').count()
        check('低電量模式只安排 1 個輕量項目', items == 1, str(items))

        # ---- 8b. 作答後沒按繼續就離開（最容易出錯的中斷點）----
        page.goto(BASE + '#/lesson?id=vocab-2'); page.wait_for_selector('[data-testid=player]')
        while body_kind(page) != 'practice': page.click('[data-act=next]'); page.wait_for_timeout(30)
        qid0 = answer_current(page, correct=False)
        page.click('[data-act=exit]'); page.wait_for_selector('[data-testid=lesson-list]')
        page.reload(); ready(page)
        page.click('[data-testid=continue-vocab-2]'); page.wait_for_selector('[data-testid=player]')
        check('作答後直接離開：回來仍顯示上次的作答結果', page.is_visible('.feedback') and '再想想' in page.inner_text('.feedback'))
        check('還原後選項已鎖定', page.is_disabled('[data-opt="0"]'))
        cont(page)
        check('還原後按繼續可進到下一題', page.get_attribute('.q', 'data-qid') != qid0)

        # ---- 8c. 重新診斷需確認 ----
        page.goto(BASE + '#/diagnosis'); page.wait_for_selector('[data-testid=diagnosis-intro]')
        page.click('[data-act=start]'); page.wait_for_selector('.modal')
        check('重新診斷前跳出確認', '取代上次的診斷結果' in page.inner_text('.modal'))
        page.click('.modal [data-act=cancel]')
        check('取消後仍停在說明頁', page.is_visible('[data-testid=diagnosis-intro]'))

        # ---- 8d. 單字依課程順序排列 ----
        page.goto(BASE + '#/words'); page.wait_for_selector('.word-row')
        order = page.locator('.word-row__en').all_inner_texts()[:4]
        check('單字圖書館依課程順序排列', order == ['apple', 'banana', 'bread', 'egg'], str(order))

        # ---- 9. 教材已存進 IndexedDB：教材檔無法下載時仍可上課 ----
        page.route('**/data/**', lambda r: r.abort())
        page.goto(BASE + '#/lesson?id=vocab-2'); page.reload(); ready(page)
        page.wait_for_selector('[data-testid=player]', timeout=5000)
        check('教材檔無法下載時，仍可從 IndexedDB 開課', page.is_visible('[data-testid=player]'))
        page.unroute('**/data/**')

        # ---- 10. 版面與按鈕 ----
        for path in ['#/home', '#/worlds', '#/world?id=words', '#/words', '#/diagnosis', '#/lesson?id=grammar-1', '#/review']:
            page.goto(BASE + path); page.wait_for_timeout(350)
            sw = page.evaluate('document.documentElement.scrollWidth')
            check(f'375px 無水平捲動 {path}', sw <= 375, f'scrollWidth={sw}')
            orphan = page.evaluate("""[...document.querySelectorAll('#app button')].filter(b =>
                !(b.type === 'submit' || b.dataset.play || b.dataset.act || b.dataset.mode || b.dataset.opt !== undefined || b.dataset.tok !== undefined || b.dataset.filter || b.dataset.audio || b.dataset.match || b.dataset.tile || b.dataset.slot)).map(b => b.textContent.trim())""")
            check(f'{path} 沒有無作用按鈕', len(orphan) == 0, str(orphan))
        page.goto(BASE + '#/worlds'); page.wait_for_timeout(300)
        page.screenshot(path=f'{OUT}/p2-11-worlds.png', full_page=True)
        browser.close()
except Exception as ex:
    errors.append('ABORT: ' + str(ex).splitlines()[0])
    try: page.screenshot(path=f'{OUT}/p2-abort.png', full_page=True); print('APP:', page.inner_text('#app')[:500])
    except Exception: pass
finally:
    srv.terminate()

check('全程沒有 JavaScript 錯誤', not errors, '; '.join(errors))
for name, ok, d in results:
    print(('PASS ' if ok else 'FAIL ') + name + (f'  -- {d}' if d and not ok else ''))
print(f"\n合計：{sum(1 for r in results if r[1])}/{len(results)} 通過")
