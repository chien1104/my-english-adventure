import subprocess, sys, time
from playwright.sync_api import sync_playwright
AUTO_CLOSE = "new MutationObserver(()=>{const b=document.querySelector('[data-act=close-celebrate]'); if(b&&!b.dataset.auto){b.dataset.auto=1;setTimeout(()=>b.click(),300);}}).observe(document,{childList:true,subtree:true});"  # 測試時自動關閉慶祝卡（就像使用者按「太好了」）
ROOT=sys.argv[1]; OUT=sys.argv[2]
srv=subprocess.Popen([sys.executable,'-m','http.server','8790','-d',ROOT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
B='http://localhost:8790/'
res=[]
def check(n,c,d=''): res.append((n,bool(c),d)); print(('PASS ' if c else 'FAIL ')+n+('' if c else '  -- '+str(d)))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pg=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True); pg.add_init_script(AUTO_CLOSE)
    pg.add_init_script("window.__played=[];HTMLMediaElement.prototype.play=function(){window.__played.push(this.src);return Promise.resolve();}")
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(B); pg.wait_for_selector('html[data-ready="true"]', timeout=60000)
    pg.evaluate("""(async()=>{const db=window.__mea.db;await db.put('progress',{id:'diagnosis',total:5,max:13,sections:{vocab:{score:1,max:5},grammar:{score:1,max:5}},level:{id:'basic',label:'x',message:''},details:[],completedAt:Date.now()});})()""")
    import time as _t
    t0=_t.time(); pg.goto(B+'#/words'); pg.wait_for_selector('[data-testid=series-list]'); print('words page ms', int((_t.time()-t0)*1000))
    check('單字頁顯示多益系列', pg.locator('[data-series]').count()>=1)
    check('單字頁顯示情境分類', pg.locator('[data-testid=topic-list] .chip').count()>=5, pg.locator('[data-testid=topic-list] .chip').count())
    check('全部單字數 4109', int(pg.inner_text('[data-testid=count-all]'))==4109, pg.inner_text('[data-testid=count-all]'))
    pg.screenshot(path=f'{OUT}/bank-words.png', full_page=True)
    pg.fill('[data-testid=word-search]','conf'); pg.wait_for_timeout(500)
    check('搜尋 conf 找到 conference', 'conference' in pg.inner_text('[data-testid=search-results]'))
    pg.fill('[data-testid=word-search]','退款'); pg.wait_for_timeout(500)
    check('用中文搜尋「退款」找到 refund', 'refund' in pg.inner_text('[data-testid=search-results]'))
    pg.click('[data-testid=search-results] summary'); pg.wait_for_timeout(600)
    check('搜尋結果展開有單字卡', pg.locator('[data-testid=search-results] details[open] .word-card').count()==1)
    pg.click('[data-testid=next-unit]'); pg.wait_for_selector('[data-testid=unit-words]')
    check('單元頁列出 20 個字', pg.locator('[data-testid=unit-words] .word-row').count()==20)
    pg.screenshot(path=f'{OUT}/bank-unit.png', full_page=True)
    pg.click('[data-testid=unit-start]'); pg.wait_for_selector('[data-testid=player]')
    check('第一步是單字卡', pg.locator('.word-card').count()==1 and 'Mr.' in pg.inner_text('.word-card__en'), pg.inner_text('#app')[:100])
    pg.screenshot(path=f'{OUT}/bank-card.png')
    # 走完：前 3 題答錯，其餘答對
    wrong=0; guard=0
    while guard<200 and not pg.locator('[data-testid=unit-complete]').count():
        guard+=1
        if pg.locator('.feedback-sheet [data-act=continue]').count():
            pg.click('.feedback-sheet [data-act=continue]'); pg.wait_for_timeout(120); continue
        if pg.locator('.q [data-opt]').count() and pg.is_enabled('.q [data-opt="0"]'):
            ans=pg.evaluate("""()=>{const q=document.querySelector('.q');return q.dataset.qid}""")
            opts=pg.eval_on_selector_all('.q [data-opt]','els=>els.map(e=>e.textContent.trim())')
            # 答案：從資料庫找單字
            correct=pg.evaluate("""async (qid)=>{const m=/^u-(.+)-(zh|en)$/.exec(qid);const w=await window.__mea.db.get('vocab',m[1]);return m[2]==='zh'?w.zh:w.en}""", ans)
            if wrong<3: i=next(i for i,o in enumerate(opts) if o!=correct); wrong+=1
            else: i=opts.index(correct)
            pg.click(f'.q [data-opt="{i}"]'); pg.wait_for_timeout(250); continue
        if pg.locator('[data-act=next]').count() and pg.is_enabled('[data-act=next]'):
            pg.click('[data-act=next]'); pg.wait_for_timeout(120); continue
        pg.wait_for_timeout(300)
    check('單元可以完整學完', pg.locator('[data-testid=unit-complete]').count()==1, pg.inner_text('#app')[:200])
    check('正確率顯示', '%' in pg.inner_text('[data-testid=accuracy]'))
    pg.screenshot(path=f'{OUT}/bank-done.png')
    n=pg.evaluate("(async()=>{const r=await window.__mea.db.getAll('reviews');return r.filter(x=>x.status!=='new').length})()")
    check('20 個字都排進複習', n>=20, n)
    exp=pg.evaluate("(async()=>{const l=await window.__mea.db.getAll('expLog');return l.filter(x=>x.id.startsWith('unit:')).length})()")
    check('學完單元拿到經驗值', exp==1, exp)
    pg.click('[data-testid=next-unit]'); pg.wait_for_selector('[data-testid=unit-words]')
    check('下一單元按鈕到第 2 單元', '第 2 單元' in pg.inner_text('h1'))
    pg.goto(B+'#/series?id=hot'); pg.wait_for_selector('[data-testid=unit-list]')
    check('系列頁：第 1 單元已學完', '已學完' in pg.inner_text('[data-unit="0"]'))
    check('系列頁：繼續第 2 單元', '第 2 單元' in pg.inner_text('[data-testid=series-next]'))
    pg.screenshot(path=f'{OUT}/bank-series.png', full_page=True)
    pg.goto(B+'#/series?id=topic-travel'); pg.wait_for_selector('[data-testid=unit-list]')
    check('情境系列可以開', pg.locator('[data-unit]').count()>=1)
    t0=_t.time(); pg.goto(B+'#/home'); pg.wait_for_selector('[data-testid=plan-list]'); print('home ms', int((_t.time()-t0)*1000))
    check('今日安排有背單字', pg.locator('[data-testid=plan-unit]').count()==1 and '第 2 單元' in pg.inner_text('[data-testid=plan-list]'), pg.inner_text('[data-testid=plan-list]'))
    pg.goto(B+'#/worlds'); pg.wait_for_selector('[data-testid=world-list]')
    t=pg.inner_text('[data-testid=world-list]')
    check('世界地圖依多益架構分區', all(x in t for x in ['基礎打底','聽力測驗','閱讀測驗','實戰模擬','Part 1 照片描述','Part 7 閱讀理解']), t[:300])
    pg.screenshot(path=f'{OUT}/worlds.png', full_page=True)
    pg.goto(B+'#/games'); pg.wait_for_timeout(800)
    check('遊戲：圖字配對沒有插圖單字時不給開始', pg.locator('[data-testid=play-match]').count()==0 and pg.locator('[data-testid=play-speed]').count()==1)
    pg.goto(B+'#/game?id=spell'); pg.wait_for_selector('[data-testid=game-spell]')
    check('拼字工坊用單字庫的字也能玩', pg.locator('[data-tile]').count()>=2)
    sw=pg.evaluate('document.documentElement.scrollWidth'); check('沒有水平捲動', sw<=390, sw)
    check('沒有 JS 錯誤', not errs, errs)
finally: srv.kill()
print(f"合計：{sum(1 for r in res if r[1])}/{len(res)}")
