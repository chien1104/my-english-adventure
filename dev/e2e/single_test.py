import json, glob, os, sys
from playwright.sync_api import sync_playwright
AUTO_CLOSE = "new MutationObserver(()=>{const b=document.querySelector('[data-act=close-celebrate]'); if(b&&!b.dataset.auto){b.dataset.auto=1;setTimeout(()=>b.click(),300);}}).observe(document,{childList:true,subtree:true});"  # 測試時自動關閉慶祝卡（就像使用者按「太好了」）
HTML = os.path.abspath(sys.argv[1])
URL = 'file://' + HTML
errs, res = [], []
def check(n, c, d=''): res.append((n, bool(c), d))
Q = {}
for f in glob.glob('/home/claude/my-english-adventure/data/lessons/*.json'):
    for st in json.load(open(f))['steps']:
        for q in st.get('questions', []) + st.get('similar', []): Q[q['id']] = q

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 375, 'height': 812}, accept_downloads=True)
    ctx.add_init_script(AUTO_CLOSE)
    ctx.set_offline(True)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.add_init_script("window.__played=[]; HTMLMediaElement.prototype.play=function(){window.__played.push(this.src.slice(0,30)); return Promise.resolve();};")
    pg.goto(URL); pg.wait_for_selector('html[data-ready="true"]', timeout=30000)
    check('單檔版在完全離線、直接開檔案（file://）下可以開啟', pg.is_visible('.hero__title'))
    check('首頁 Lv 1、0 EXP', pg.inner_text('[data-testid=level]') == 'Lv 1' and pg.inner_text('[data-testid=exp]') == '0 EXP')
    pg.goto(URL + '#/worlds'); pg.wait_for_selector('[data-testid=world-list]')
    check('十一個世界都在', pg.locator('.world').count() == 11, pg.locator('.world').count())
    pg.goto(URL + '#/diagnosis'); pg.click('[data-act=start]')
    while pg.locator('[data-testid=diagnosis-run]').count(): pg.click('[data-act=skip]'); pg.wait_for_timeout(10)
    pg.wait_for_selector('[data-testid=diagnosis-result]')
    check('程度診斷可以完成', True)
    pg.goto(URL + '#/lesson?id=vocab-1'); pg.wait_for_selector('[data-testid=player]'); pg.click('[data-act=next]'); pg.wait_for_timeout(600)
    check('單字卡圖片（內嵌）正常', pg.evaluate("document.querySelector('.word-card__img').naturalWidth > 0"))
    check('單字與例句發音按鈕都在', pg.locator('.audio-btn').count() == 2)
    pg.click('.audio-btn >> nth=0'); pg.wait_for_timeout(200)
    check('按下發音會播放內嵌音檔', pg.evaluate("window.__played.some(s => s.startsWith('data:audio/mpeg'))"))
    # 走完整堂課
    while pg.locator('[data-testid=player]').count():
        k = pg.get_attribute('[data-role=body]', 'data-kind')
        if k == 'practice':
            qid = pg.get_attribute('.q', 'data-qid'); q = Q[qid]
            if q['type'] == 'choice':
                opts = pg.locator('.opt').all_inner_texts(); pg.click(f'[data-opt="{opts.index(q["answer"])}"]')
            else:
                pg.fill('.q__type input', q['answer']); pg.click('.q__type button[type=submit]')
            pg.wait_for_selector('.feedback'); pg.click('[data-role=feedback] [data-act=continue]')
        else:
            pg.click('[data-act=next]')
        pg.wait_for_timeout(30)
    check('完整上完一堂課（100%）', pg.inner_text('[data-testid=accuracy]') == '100%')
    pg.goto(URL + '#/lesson?id=phonics-1'); pg.wait_for_selector('[data-testid=player]')
    while pg.get_attribute('[data-role=body]', 'data-kind') != 'practice': pg.click('[data-act=next]'); pg.wait_for_timeout(40)
    pg.click('.q__audio [data-play]'); pg.wait_for_timeout(200)
    check('聽力題可以播放', len(pg.evaluate('window.__played')) >= 2)
    pg.goto(URL + '#/settings?section=offline'); pg.wait_for_timeout(600)
    check('設定頁顯示單檔版離線說明', '單檔版' in pg.inner_text('[data-testid=offline-list]'))
    with pg.expect_download() as dl: pg.click('[data-testid=export-btn]')
    bk = json.load(open(dl.value.path()))
    check('單檔版可以匯出備份', bk['app'] == 'my-english-adventure' and len(bk['data']['attempts']) > 13)
    exp = pg.evaluate("(async () => (await window.__mea.db.getAll('expLog')).reduce((n, e) => n + e.amount, 0))()")
    pg.reload(); pg.wait_for_selector('html[data-ready="true"]')
    pg.goto(URL + '#/home'); pg.wait_for_selector('[data-testid=exp]')
    check('重新開啟後學習資料仍在', pg.inner_text('[data-testid=exp]') == f'{exp} EXP', f'{exp} vs {pg.inner_text("[data-testid=exp]")}')
    b.close()
for n, ok, d in res: print(('PASS ' if ok else 'FAIL ') + n + (f' -- {d}' if d and not ok else ''))
print(f"合計：{sum(1 for r in res if r[1])}/{len(res)}；JS 錯誤：{errs[:5]}")
