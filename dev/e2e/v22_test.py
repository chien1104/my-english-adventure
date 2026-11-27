# 2.2 端對端：程度測驗（抽題、跳過聽力、只考閱讀、進步紀錄）、課程與聽寫的跳過。用法：在專案根目錄執行 python3 dev/e2e/v22_test.py
import subprocess,sys,time,json
from playwright.sync_api import sync_playwright
srv=subprocess.Popen([sys.executable,'-m','http.server','8811','-d','.'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
B='http://localhost:8811/'; ok=[0,0]
def check(n,c,x=''):
    ok[0 if c else 1]+=1; print(('PASS ' if c else 'FAIL ')+n, '' if c else x)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/google-chrome'); pg=b.new_page(viewport={'width':390,'height':844})
  pg.add_init_script("HTMLMediaElement.prototype.play=function(){return Promise.resolve();};new MutationObserver(()=>{const b=document.querySelector('[data-act=close-celebrate]'); if(b) setTimeout(()=>b.click(),100);}).observe(document,{childList:true,subtree:true});")
  errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
  pg.goto(B); pg.wait_for_selector('html[data-ready="true"]',timeout=60000)
  check('首頁有程度測驗入口', pg.locator('[data-testid=level-cta]').count()==1)
  def take(mode, skip_n, wrong_every):
    pg.goto(B+'#/home'); pg.wait_for_timeout(300); pg.goto(B+'#/exam?id=level'); pg.wait_for_selector('[data-testid=exam-intro]')
    pg.click('[data-testid=exam-start]' if mode=='full' else '[data-testid=exam-start-reading]'); pg.wait_for_selector('[data-testid=exam-run]')
    qs=pg.evaluate("(async()=>{const d=await window.__mea.db.get('progress','exam-draft:level');return d.qids})()")
    lessons={}
    skipped=0
    for i,qid in enumerate(qs):
        lid,src=qid.split('|',1)
        if lid not in lessons: lessons[lid]={q['id']:q for q in json.load(open(f'data/lessons/{lid}.json'))['steps'][0]['questions']}
        q=lessons[lid][src]
        if skipped<skip_n and q['part']<=4:
            pg.click('[data-testid=skip-listening]'); skipped+=1; continue
        ans=q['answer'] if i%wrong_every else next(o for o in q['options'] if o!=q['answer'])
        pg.click(f'.q [data-opt="{q["options"].index(ans)}"]')
        if i<len(qs)-1: pg.click('[data-act=next]')
    pg.click('[data-testid=exam-submit]'); pg.wait_for_timeout(300); pg.click('[data-act=ok]')
    pg.wait_for_selector('[data-testid=exam-result]',timeout=30000)
    return qs
  qs=take('full',2,4)
  check('程度測驗約 30 題', 28<=len(qs)<=34, len(qs))
  check('有聽力也有閱讀', any(int(x.split('|')[1].split('-p')[1][0])<=4 for x in qs if '-p' in x.split('|')[1]))
  check('跳過的聽力不計分', '跳過 2 題聽力' in pg.inner_text('[data-testid=exam-skipped]'))
  check('有預估總分', pg.locator('[data-testid=est-total]').count()==1)
  check('第一次：進步紀錄', pg.locator('[data-testid=level-history]').count()==1)
  qs2=take('full',0,3)
  check('第二次題目大多換新', len(set(qs)&set(qs2))<=8, len(set(qs)&set(qs2)))
  check('第二次：和上次比', pg.locator('[data-testid=level-delta]').count()==1)
  check('第二次：折線圖', pg.locator('[data-testid=level-chart]').count()==1)
  pg.screenshot(path='/tmp/s21/level-result.png', full_page=True)
  take('reading',0,5)
  check('只考閱讀：只估閱讀', pg.locator('[data-testid=est-total]').count()==0 and pg.locator('[data-testid=est-reading]').count()==1)
  hist=pg.evaluate("(async()=>(await window.__mea.db.get('progress','leveltest')).history.length)()")
  check('歷史 3 筆', hist==3, hist)
  pg.goto(B+'#/stats'); pg.wait_for_timeout(800)
  check('學習分析有程度變化圖', pg.locator('[data-testid=st-level] [data-testid=level-chart]').count()==1)
  pg.screenshot(path='/tmp/s21/stats-level.png', full_page=True)
  # 課程裡跳過聽力題
  pg.evaluate("(async()=>{const db=window.__mea.db;await db.put('progress',{id:'diagnosis',total:6,max:13,sections:{vocab:{score:3,max:5},grammar:{score:2,max:5}},level:{id:'basic',label:'基礎',message:''},details:[],completedAt:Date.now()});for(const l of await db.getAll('lessons')) if(l.id!=='toeic-p2-2') await db.put('progress',{id:'lesson:'+l.id,lessonId:l.id,status:'completed',stepIndex:0,practice:{},timesCompleted:1,updatedAt:Date.now()});})()")
  pg.goto(B+'#/lesson?id=toeic-p2-2'); pg.wait_for_selector('[data-testid=player]')
  for k in range(10):
    if pg.locator('[data-testid=skip-listening]').count(): break
    pg.click('[data-act=next]'); pg.wait_for_timeout(200)
  check('Part 2 課程有跳過鈕', pg.locator('[data-testid=skip-listening]').count()==1)
  before=pg.inner_text('[data-role=qcount]')
  pg.click('[data-testid=skip-listening]'); pg.wait_for_timeout(400)
  check('跳過後到下一題', pg.inner_text('[data-role=qcount]')!=before, before)
  # 聽寫跳過
  pg.goto(B+'#/listening?mode=dictation'); pg.wait_for_selector('[data-testid=listen-card]')
  t1=pg.inner_text('.listen-head'); pg.click('[data-testid=listen-skip]'); pg.wait_for_timeout(300)
  check('聽寫跳過：同一題號換一句', pg.inner_text('.listen-head')==t1)
  check('沒有錯誤', not errs, errs)
  b.close()
finally: srv.kill()
print(f'合計：{ok[0]}/{sum(ok)}')
