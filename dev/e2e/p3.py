import sys, json, subprocess, time, glob, os, shutil, tempfile
from playwright.sync_api import sync_playwright

SRC, OUT = sys.argv[1], sys.argv[2]
# 用暫存複本，放一個假的 apple.mp3 來驗證「有音檔才顯示按鈕」
ROOT = tempfile.mkdtemp()
shutil.copytree(SRC, ROOT, dirs_exist_ok=True)
os.remove(os.path.join(ROOT, 'assets/audio/words/banana.mp3'))
os.remove(os.path.join(ROOT, 'assets/audio/sentences/banana.mp3'))

PORT = 8768
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
BY_IMG = {w['image']: w for w in WORDS.values()}

results, errors = [], []
def check(name, cond, detail=''): results.append((name, bool(cond), detail))
def ready(p): p.wait_for_selector('html[data-ready="true"]', timeout=10000)
def kind(p):
    p.wait_for_timeout(30)
    loc = p.locator('[data-testid=player] [data-role="body"]')
    return loc.get_attribute('data-kind') if loc.count() else None
def cont(p): p.click('[data-role=feedback] [data-act="continue"]'); p.wait_for_timeout(60)

def answer(p, correct=True):
    qid = p.get_attribute('.q', 'data-qid')
    q = Q.get(qid)
    if q is None:  # 錯題重練的題目：用畫面上的資訊找答案
        q = dict(type='choice')
        opts = p.locator('.opt').all_inner_texts()
        sent = p.locator('.q__sentence').inner_text() if p.locator('.q__sentence').count() else None
        if qid.startswith('mx-lesson|'):
            _, lid, grp = qid.split('|')
            cands = [x for x in Q.values() if x.get('group') == grp and set(x.get('options', [])) == set(opts)]
            q = cands[0]
        else:
            w = WORDS[qid.split('|')[1]]
            q = {'type': 'choice', 'options': opts, 'answer': w['zh']}
    if q['type'] == 'choice':
        opts = p.locator('.opt').all_inner_texts()
        idx = opts.index(q['answer']) if correct else next(i for i, o in enumerate(opts) if o != q['answer'])
        p.click(f'[data-opt="{idx}"]')
    elif q['type'] == 'type':
        p.fill('.q__type input', q['answer'] if correct else 'zzz'); p.click('.q__type button[type=submit]')
    else:
        used = set(); order = q['answer'] if correct else list(reversed(q['answer']))
        for tok in order:
            i = next(i for i, t in enumerate(q['tokens']) if t == tok and i not in used); used.add(i)
            p.click(f'[data-tok="{i}"]')
        p.click('[data-act=order-submit]')
    p.wait_for_selector('.feedback')
    return qid

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = browser.new_context(viewport={'width': 375, 'height': 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.on('console', lambda m: m.type == 'error' and '404' not in m.text and errors.append(f'console: {m.text}'))
        page.on('dialog', lambda d: (errors.append('dialog'), d.dismiss()))

        page.goto(BASE); ready(page)
        check('底部導覽 5 個分頁：首頁、世界、單字、遊戲、錯題', page.locator('.tabbar__link').all_inner_texts() == ['首頁', '世界', '單字', '遊戲', '錯題'])
        page.click('.icon-link'); page.wait_for_selector('[data-testid=nickname-form]')
        check('頂部齒輪可進入設定', page.url.endswith('#/settings'))

        page.click('.tabbar__link[href="#/games"]'); page.wait_for_selector('[data-testid=games-locked]')
        check('還沒學單字時，遊戲樂園只顯示說明，不擺出不能玩的遊戲', page.locator('[data-testid=game-list]').count() == 0)
        page.click('.tabbar__link[href="#/mistakes"]'); page.wait_for_timeout(300)
        check('沒有錯題時顯示說明', '目前沒有錯題' in page.inner_text('#app'))

        # 診斷：單字全對（直接開放單字村莊全部課程），其他不知道
        page.goto(BASE + '#/diagnosis'); page.click('[data-act=start]')
        while page.locator('[data-testid=diagnosis-run]').count():
            qid = page.get_attribute('.q', 'data-qid'); q = Q[qid]
            if q['section'] == 'vocab': page.click(f'[data-opt="{q["options"].index(q["answer"])}"]')
            else: page.click('[data-act=skip]')
            page.wait_for_timeout(20)
        page.wait_for_selector('[data-testid=diagnosis-result]')
        page.goto(BASE + '#/world?id=word-village'); page.wait_for_selector('[data-testid=lesson-list]')
        check('單字診斷達標：單字村莊 3 課全部開放', page.locator('[data-testid^=start-vocab]').count() == 3)

        # 有音檔才顯示按鈕
        page.click('[data-testid=start-vocab-1]'); page.wait_for_selector('[data-testid=player]')
        page.click('[data-act=next]'); page.wait_for_function("!document.querySelector('[data-audio-slot]:empty') || document.querySelector('.audio-btn')")
        page.wait_for_timeout(300)
        check('apple 有音檔：顯示「播放發音」', page.locator('.audio-btn').count() == 2 and '播放發音' in page.inner_text('.word-card'))
        page.click('[data-act=next]'); page.wait_for_timeout(400)
        check('banana 沒音檔：完全不顯示按鈕', page.locator('.audio-btn').count() == 0)

        # 上完 vocab-1：故意答錯 2 題（其中 1 題補練時也答錯）
        while kind(page) != 'practice': page.click('[data-act=next]'); page.wait_for_timeout(20)
        wrong_plan = {'v1-bread-a': 1, 'v1-milk-a': 1, 'v1-bread-b': 2}
        while kind(page) in ('practice', 'review'):
            if kind(page) == 'review': page.click('[data-act=next]'); continue
            qid = page.get_attribute('.q', 'data-qid')
            ok = not wrong_plan.get(qid, 0)
            if not ok: wrong_plan[qid] -= 1
            answer(page, ok); cont(page)
        page.wait_for_selector('[data-testid=lesson-complete]')

        # 錯題百科
        page.click('.tabbar__link[href="#/mistakes"]'); page.wait_for_selector('[data-testid=mistake-list]')
        pend = int(page.inner_text('[data-testid=pending-count]')); fixed = int(page.inner_text('[data-testid=fixed-count]'))
        check('錯題百科：bread 補練 2 次都錯→待訂正；milk 補練答對→已訂正', pend == 1 and fixed == 1, f'{pend}/{fixed}')
        mtext = page.inner_text('[data-testid=mistake-list]')
        check('錯題顯示來源課程、你的答案、正確答案、中文解析', all(k in mtext for k in ['早餐桌上', '你的答案', '正確答案', '錯 3 次']), mtext)
        page.click('[data-filter=fixed]'); page.wait_for_timeout(80)
        check('篩選已訂正', page.locator('.mistake').count() == 1)
        page.screenshot(path=f'{OUT}/p3-01-mistakes.png', full_page=True)

        page.goto(BASE + '#/home'); page.wait_for_selector('[data-testid=plan-list]')
        check('首頁顯示待訂正 1 題', page.inner_text('[data-testid=mistake-count]') == '1')
        check('今日安排出現錯題重練', '錯題重練' in page.inner_text('[data-testid=plan-list]'))

        page.goto(BASE + '#/mistakes'); page.wait_for_selector('[data-testid=start-retrain]')
        page.click('[data-testid=start-retrain]'); page.wait_for_selector('.q')
        rq = page.get_attribute('.q', 'data-qid')
        check('錯題重練出題', rq.startswith('mx-lesson|vocab-1|bread'), rq)
        answer(page, True); cont(page)
        page.click('[data-act=next]'); page.wait_for_selector('[data-testid=retrain-complete]')
        check('重練答對後全部訂正', '全部錯題都訂正了' in page.inner_text('[data-testid=retrain-complete]'))

        # ---- 遊戲 ----
        page.click('.tabbar__link[href="#/games"]'); page.wait_for_selector('[data-testid=game-list]')
        check('遊戲樂園 3 款遊戲', page.locator('.game-card').count() == 3)

        # 圖字配對：先配錯一次，再全部配對
        page.click('[data-testid=play-match]'); page.wait_for_selector('[data-testid=game-match]')
        pics = page.eval_on_selector_all('[data-match=picture]', 'els => els.map(e => e.dataset.id)')
        check('配對 5 組', len(pics) == 5)
        page.click(f'[data-match=picture][data-id="{pics[0]}"]'); page.click(f'[data-match=label][data-id="{pics[1]}"]')
        page.wait_for_timeout(700)
        check('配錯顯示失誤 1', '失誤 1' in page.inner_text('[data-role=info]'))
        page.screenshot(path=f'{OUT}/p3-02-match.png', full_page=True)
        for wid in pics:
            page.click(f'[data-match=label][data-id="{wid}"]'); page.click(f'[data-match=picture][data-id="{wid}"]'); page.wait_for_timeout(50)
        page.wait_for_selector('[data-testid=game-result]')
        check('配對結束：1 次失誤，並列出要加強的單字', page.inner_text('[data-testid=game-score]') == '1' and '要再加強' in page.inner_text('[data-testid=game-result]'))

        # 單字快打：答 5 題後暫停→繼續→結束
        page.goto(BASE + '#/game?id=speed'); page.wait_for_selector('[data-testid=game-speed]')
        for i in range(5):
            page.wait_for_selector('.opt:not([disabled])')
            opts = page.locator('.opt').all_inner_texts()
            if page.locator('[data-testid=speed-word]').count():
                w = WORDS[page.inner_text('[data-testid=speed-word]')]; ans = w['zh']
            else:
                src = page.get_attribute('[data-role=q] img', 'src'); ans = BY_IMG[src]['en']
            idx = opts.index(ans) if i != 2 else next(j for j, o in enumerate(opts) if o != ans)
            page.click(f'[data-opt="{idx}"]'); page.wait_for_timeout(950 if i == 2 else 300)
        check('快打計分 4 分', page.inner_text('[data-role=score]') == '4')
        page.evaluate("Object.defineProperty(document, 'hidden', {value: true, configurable: true}); document.dispatchEvent(new Event('visibilitychange'))")
        t1 = page.inner_text('[data-role=time]'); page.wait_for_timeout(1500); t2 = page.inner_text('[data-role=time]')
        check('離開畫面自動暫停，時間不流失', page.is_visible('[data-role=pause]') and t1 == t2, f'{t1}->{t2}')
        page.evaluate("Object.defineProperty(document, 'hidden', {value: false, configurable: true})")
        page.click('[data-act=resume]')
        page.screenshot(path=f'{OUT}/p3-03-speed.png', full_page=True)
        page.click('[data-act=quit]'); page.wait_for_selector('[data-testid=game-result]')
        check('快打結果 4 分', page.inner_text('[data-testid=game-score]') == '4')

        # 拼字工坊：第 1 題故意拼錯（會再出現一次），其他拼對
        page.goto(BASE + '#/game?id=spell'); page.wait_for_selector('[data-testid=game-spell]')
        rounds = 0; first_wrong_done = False
        while page.locator('[data-testid=game-spell]').count() and rounds < 12:
            src = page.get_attribute('[data-role=card] .q__img', 'src'); w = BY_IMG[src]
            tiles = page.eval_on_selector_all('[data-tile]', 'els => els.map(e => [e.dataset.tile, e.textContent])')
            target = w['en'] if first_wrong_done else w['en'][::-1] if w['en'] != w['en'][::-1] else w['en'][1:] + w['en'][0]
            used = set()
            for ch in target:
                tid = next(t for t, c in tiles if c == ch and t not in used); used.add(tid)
                page.click(f'[data-tile="{tid}"]')
            if rounds == 0:
                page.click('[data-slot="0"]')
                check('拼字：點已放的字母可以拿回來', page.locator('.slot--filled').count() == len(target) - 1)
                page.click('[data-act=clear]')
                used = set()
                for ch in target:
                    tid = next(t for t, c in tiles if c == ch and t not in used); used.add(tid)
                    page.click(f'[data-tile="{tid}"]')
                page.screenshot(path=f'{OUT}/p3-04-spell.png', full_page=True)
            page.click('[data-act=check]'); page.wait_for_selector('.feedback')
            if not first_wrong_done:
                check('拼錯顯示正確拼法並會再出現', '正確拼法' in page.inner_text('.feedback') and '再出現' in page.inner_text('.feedback'))
                first_wrong_done = True
            try: page.click('.feedback-sheet [data-act=next]', timeout=1500)
            except Exception: pass  # 拼對會自動下一題
            page.wait_for_timeout(150); rounds += 1
        page.wait_for_selector('[data-testid=game-result]')
        check('拼字共 6 題（5 題＋1 題補練），一次答對 4 題', rounds == 6 and page.inner_text('[data-testid=game-score]') == '4', f'{rounds} {page.inner_text("[data-testid=game-score]")}')

        page.goto(BASE + '#/games'); page.wait_for_selector('[data-testid=game-list]')
        g = page.inner_text('[data-testid=game-list]')
        check('遊戲樂園顯示各遊戲最佳紀錄', '最佳：1 次失誤' in g and '最高：4 分' in g and '最佳：4 題' in g, g)
        page.screenshot(path=f'{OUT}/p3-05-games.png', full_page=True)

        page.goto(BASE + '#/mistakes'); page.wait_for_selector('[data-testid=mistake-list]')
        page.click('[data-filter=all]'); page.wait_for_timeout(80)
        word_items = page.locator('.mistake .badge', has_text='單字').count()
        check('遊戲答錯的單字也收進錯題百科（之後答對會自動標為已訂正）', word_items >= 2, str(word_items))

        # 顏色課單字卡截圖
        page.goto(BASE + '#/lesson?id=vocab-3'); page.wait_for_selector('[data-testid=player]')
        page.click('[data-act=next]'); page.wait_for_timeout(300)
        check('顏色課單字卡正常', 'red' in page.inner_text('.word-card') and page.evaluate("document.querySelector('.word-card__img').naturalWidth > 0"))
        page.screenshot(path=f'{OUT}/p3-06-color.png', full_page=True)

        for path in ['#/games', '#/game?id=match', '#/game?id=speed', '#/game?id=spell', '#/mistakes', '#/mistake-practice', '#/home', '#/settings']:
            page.goto(BASE + path); page.wait_for_timeout(350)
            sw = page.evaluate('document.documentElement.scrollWidth')
            check(f'375px 無水平捲動 {path}', sw <= 375, f'{sw}')
            orphan = page.evaluate("""[...document.querySelectorAll('#app button')].filter(b => !b.hidden && !(b.type === 'submit' || b.dataset.act || b.dataset.mode || b.dataset.opt !== undefined || b.dataset.tok !== undefined || b.dataset.filter || b.dataset.audio || b.dataset.match || b.dataset.tile || b.dataset.slot)).map(b => b.outerHTML.slice(0, 80))""")
            check(f'{path} 沒有無作用按鈕', not orphan, str(orphan))
            fake = page.evaluate("""[...document.querySelectorAll('#app button:disabled, #app [aria-disabled=true]')].filter(b => !b.closest('.q, .match, .spell__tiles, .order, [data-testid=game-speed], .spell__slots, .btn-row')).map(b => b.textContent.trim())""")
            check(f'{path} 沒有擺著不能用的按鈕', not fake, str(fake))
        browser.close()
except Exception as ex:
    errors.append('ABORT: ' + str(ex).splitlines()[0])
    try: page.screenshot(path=f'{OUT}/p3-abort.png', full_page=True); print('APP:', page.inner_text('#app')[:600])
    except Exception: pass
finally:
    srv.terminate()
    shutil.rmtree(ROOT, ignore_errors=True)

check('全程沒有 JavaScript 錯誤', not errors, '; '.join(errors[:5]))
for n, ok, d in results: print(('PASS ' if ok else 'FAIL ') + n + (f'  -- {d}' if d and not ok else ''))
print(f"\n合計：{sum(1 for r in results if r[1])}/{len(results)} 通過")
