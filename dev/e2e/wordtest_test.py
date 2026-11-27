# 2.3 端對端：單字總測驗（分關、跳過聽力、接著測、重測錯字）。用法：在專案根目錄執行 python3 dev/e2e/wordtest_test.py
import subprocess,sys,time
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8812','-d','.'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
B='http://localhost:8812/'; ok=[0,0]
def check(n,c,x=''):
    ok[0 if c else 1]+=1; print(('PASS ' if c else 'FAIL ')+n, '' if c else x)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome'); pg=b.new_page(viewport={'width':390,'height':844})
  pg.add_init_script("HTMLMediaElement.prototype.play=function(){return Promise.resolve();};new MutationObserver(()=>{const b=document.querySelector('[data-act=close-celebrate]'); if(b) setTimeout(()=>b.click(),100);}).observe(document,{childList:true,subtree:true});")
  errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
  pg.goto(B); pg.wait_for_selector('html[data-ready="true"]',timeout=60000)
  # 學過 25 個字
  pg.evaluate("(async()=>{const db=window.__mea.db;const ws=(await db.getAll('vocab')).filter(w=>w.audio).slice(0,25);for(const w of ws) await db.put('reviews',{wordId:w.id,status:'learning',box:1,correctCount:1,wrongCount:0,lastSeenAt:Date.now(),dueAt:Date.now()+86400000});})()")
  pg.goto(B+'#/games'); pg.wait_for_selector('[data-testid=wordtest-cta]')
  pg.click('[data-testid=wordtest-cta]'); pg.wait_for_selector('[data-testid=wt-intro]')
  pg.click('[data-testid=wt-start]')
  def word_of():
      return pg.evaluate("(async()=>{const r=await window.__mea.db.get('progress','wordtest');return await window.__mea.db.get('vocab', r.order[r.pos])})()")
  def answer(right):
      w=word_of()
      if pg.locator('.q__type input').count():
          pg.fill('.q__type input', w['en'] if right else 'zzz'); pg.click('.q__type button[type=submit]')
      else:
          opts=[o.strip() for o in pg.locator('.opt').all_inner_texts()]
          low=[o.lower() for o in opts]
          tgt=low.index(w['en'].lower()) if w['en'].lower() in low else opts.index(w['zh'])
          i=tgt if right else (tgt+1)%len(opts)
          pg.click(f'.q [data-opt="{i}"]')
      if right: pg.wait_for_timeout(900)
      else: pg.click('[data-testid=wt-next]')
  pg.wait_for_selector('[data-testid=wt-play]')
  # 跳過聽力
  for k in range(3):
      if pg.locator('[data-testid=skip-listening]').count():
          pg.click('[data-testid=skip-listening]'); pg.wait_for_timeout(200)
          check('換成不用聽的題目', pg.locator('[data-testid=skip-listening]').count()==0); break
      answer(True)
  for k in range(30):
      if pg.locator('[data-testid=wt-stage]').count(): break
      answer(k%5!=0)
  check('第 1 關結束', pg.locator('[data-testid=wt-stage]').count()==1)
  # 離開再回來：接著測
  pg.goto(B+'#/home'); pg.wait_for_timeout(300); pg.goto(B+'#/word-test'); pg.wait_for_selector('[data-testid=wt-intro]')
  check('可以接著測', pg.locator('[data-testid=wt-resume]').count()==1)
  pg.click('[data-testid=wt-resume]'); pg.wait_for_selector('[data-testid=wt-play]')
  check('第 2 關從第 1 題', '1 / 5' in pg.inner_text('[data-testid=wt-count]'), pg.inner_text('[data-testid=wt-count]'))
  for k in range(10):
      if pg.locator('[data-testid=wt-stage]').count(): break
      answer(k!=1)
  pg.click('[data-testid=wt-go]'); pg.wait_for_selector('[data-testid=wt-final]')
  check('總成績', pg.locator('[data-testid=wt-final-rate]').count()==1)
  wrong=pg.evaluate("(async()=>(await window.__mea.db.get('progress','game:wordtest')).lastWrong.length)()")
  check('錯字有記錄', wrong>=2, wrong)
  pg.click('[data-testid=wt-retry-now]'); pg.wait_for_selector('[data-testid=wt-play]')
  check('重測錯字題數', f'1 / {wrong}' in pg.inner_text('[data-testid=wt-count]'))
  rv=pg.evaluate("(async()=>(await window.__mea.db.getAll('attempts')).filter(a=>a.game==='wordtest').length)()")
  check('作答有記錄', rv>=25, rv)
  check('沒有錯誤', not errs, errs)
  pg.screenshot(path='/tmp/s21/wt.png')
  b.close()
finally: srv.kill()
print(f'合計：{ok[0]}/{sum(ok)}')
