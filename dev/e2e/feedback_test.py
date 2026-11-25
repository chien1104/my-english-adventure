import subprocess, sys, time, json, glob
from playwright.sync_api import sync_playwright
AUTO_CLOSE = "new MutationObserver(()=>{const b=document.querySelector('[data-act=close-celebrate]'); if(b&&!b.dataset.auto){b.dataset.auto=1;setTimeout(()=>b.click(),300);}}).observe(document,{childList:true,subtree:true});"  # 測試時自動關閉慶祝卡（就像使用者按「太好了」）
srv=subprocess.Popen([sys.executable,'-m','http.server','8773','-d',sys.argv[1] if len(sys.argv)>1 else 'my-english-adventure'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
Q={}
for f in glob.glob((sys.argv[1] if len(sys.argv)>1 else 'my-english-adventure')+'/data/lessons/*.json'):
    for st in json.load(open(f))['steps']:
        for q in st.get('questions',[])+st.get('similar',[]): Q[q['id']]=q
res=[]
def check(n,c,d=''): res.append((n,bool(c),d))
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']); pg=b.new_page(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True); pg.add_init_script(AUTO_CLOSE)
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    B='http://localhost:8773/'
    pg.goto(B); pg.wait_for_selector('html[data-ready="true"]')
    pg.goto(B+'#/diagnosis'); pg.click('[data-act=start]')
    while pg.locator('[data-testid=diagnosis-run]').count(): pg.click('[data-act=skip]'); pg.wait_for_timeout(10)
    pg.wait_for_selector('[data-testid=diagnosis-result]')
    pg.goto(B+'#/lesson?id=vocab-1'); pg.wait_for_selector('[data-testid=player]')
    while pg.get_attribute('[data-role=body]','data-kind')!='practice': pg.click('[data-act=next]'); pg.wait_for_timeout(30)
    # 答對：不用捲動，自動下一題
    q=Q[pg.get_attribute('.q','data-qid')]; opts=pg.locator('.opt').all_inner_texts()
    pg.click(f'[data-opt="{opts.index(q["answer"])}"]'); pg.wait_for_selector('.feedback-sheet .feedback')
    box=pg.locator('[data-role=feedback] [data-act=continue]').bounding_box()
    check('答對後「繼續」在畫面內，不用往下滑', box and box['y']+box['height'] <= 844, str(box))
    pg.wait_for_timeout(300); pg.screenshot(path='shots/fb-correct.png')
    first=q['id']; pg.wait_for_timeout(1500)
    check('答對約 1 秒後自動跳到下一題', pg.get_attribute('.q','data-qid')!=first)
    # 答錯：停住等按繼續
    q=Q[pg.get_attribute('.q','data-qid')]; opts=pg.locator('.opt').all_inner_texts()
    pg.click(f'[data-opt="{next(i for i,o in enumerate(opts) if o!=q["answer"])}"]'); pg.wait_for_selector('.feedback-sheet .feedback')
    box=pg.locator('[data-role=feedback] [data-act=continue]').bounding_box()
    check('答錯後「繼續」在畫面內', box and box['y']+box['height'] <= 844, str(box))
    pg.wait_for_timeout(400)
    sb=pg.locator('.feedback-sheet').bounding_box()
    check('回饋卡貼在畫面底部（下方選單上面）', sb and 844 - (sb['y']+sb['height']) < 110, str(sb))
    pg.screenshot(path='shots/fb-wrong.png')
    pg.wait_for_timeout(1800)
    check('答錯不會自動跳題（留時間看解析）', pg.get_attribute('.q','data-qid')==q['id'])
    pg.click('[data-role=feedback] [data-act=continue]'); pg.wait_for_timeout(200)
    check('按繼續前往下一題', pg.get_attribute('.q','data-qid')!=q['id'])
    check('新題目時沒有殘留的回饋卡', pg.locator('.feedback').count()==0)
    sw=pg.evaluate('document.documentElement.scrollWidth'); check('沒有水平捲動', sw<=390, str(sw))
    check('沒有 JS 錯誤', not errs, str(errs))
    b.close()
finally: srv.terminate()
for n,ok,d in res: print(('PASS ' if ok else 'FAIL ')+n+(f' -- {d}' if d and not ok else ''))
