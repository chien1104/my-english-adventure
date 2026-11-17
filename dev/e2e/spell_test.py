import subprocess, sys, time, json, glob
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8774','-d','my-english-adventure'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
W={}
for f in glob.glob('my-english-adventure/data/vocab/*.json'):
    for w in json.load(open(f)): W[w['image']]=w
res=[]
def check(n,c,d=''): res.append((n,bool(c),d))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']); pg=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    B='http://localhost:8774/'
    pg.goto(B); pg.wait_for_selector('html[data-ready="true"]')
    pg.evaluate("""(async()=>{const db=window.__mea.db;for(const w of await db.getAll('vocab')) await db.put('reviews',{wordId:w.id,status:'learning',box:1,correct:1,wrong:0,streak:1,lastSeenAt:Date.now(),dueAt:Date.now()+9e8});})()""")
    pg.goto(B+'#/game?id=spell'); pg.wait_for_selector('[data-testid=game-spell]')
    def spell(right):
        w=W[pg.get_attribute('[data-role=card] .q__img','src')]
        tiles=pg.eval_on_selector_all('[data-tile]','els=>els.map(e=>[e.dataset.tile,e.textContent])'); used=set()
        word=w['en'] if right else w['en'][::-1] if w['en']!=w['en'][::-1] else w['en'][1:]+w['en'][0]
        for ch in word:
            t=next(t for t,c in tiles if c==ch and t not in used); used.add(t); pg.click(f'[data-tile="{t}"]')
        pg.click('[data-act=check]'); pg.wait_for_selector('.feedback-sheet .feedback'); return w
    w=spell(True); pg.wait_for_timeout(250)
    bb=pg.locator('.feedback-sheet').bounding_box(); check('拼對：結果固定在底部', bb and 844-(bb['y']+bb['height'])<110, str(bb))
    pg.screenshot(path='shots/spell-right.png')
    pg.wait_for_timeout(1400); check('拼對：約 1 秒自動下一題', pg.inner_text('[data-role=info]').startswith('第 2'))
    w=spell(False); pg.wait_for_timeout(250)
    bb=pg.locator('.feedback-sheet [data-act=next]').bounding_box(); check('拼錯：「下一題」在畫面內', bb and bb['y']+bb['height']<=844, str(bb))
    check('拼錯：顯示你拼的和正確拼法', '你拼的' in pg.inner_text('.feedback-sheet') and w['en'] in pg.inner_text('.feedback-sheet'))
    pg.screenshot(path='shots/spell-wrong.png')
    pg.wait_for_timeout(1600); check('拼錯：不會自動跳題', pg.inner_text('[data-role=info]').startswith('第 2'))
    pg.click('.feedback-sheet [data-act=next]'); pg.wait_for_timeout(200)
    check('按下一題後回饋卡收起', pg.locator('.feedback-sheet').count()==0 and pg.inner_text('[data-role=info]').startswith('第 3'))
    check('沒有 JS 錯誤', not errs, str(errs))
    b.close()
finally: srv.terminate()
for n,ok,d in res: print(('PASS ' if ok else 'FAIL ')+n+(f' -- {d}' if d and not ok else ''))
