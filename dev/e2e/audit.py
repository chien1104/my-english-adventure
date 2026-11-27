# 全面版面與按鈕稽核：python3 audit.py <專案路徑> <截圖資料夾>
import sys, json, subprocess, time, os, glob
from playwright.sync_api import sync_playwright
AUTO_CLOSE = "new MutationObserver(()=>{const b=document.querySelector('[data-act=close-celebrate]'); if(b&&!b.dataset.auto){b.dataset.auto=1;setTimeout(()=>b.click(),300);}}).observe(document,{childList:true,subtree:true});"  # 測試時自動關閉慶祝卡（就像使用者按「太好了」）

ROOT, OUT = sys.argv[1], sys.argv[2]
PORT = 8771
BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
CAT = json.load(open(os.path.join(ROOT, 'data/catalog.json')))
LESSONS = [json.load(open(os.path.join(ROOT, p))) for p in CAT['lessons']]
WIDTHS = [320, 375, 414, 768, 1024]
problems, errors = [], []
checked = {'pages': 0, 'steps': 0, 'buttons': 0}

LAYOUT_JS = r"""
(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  if (document.documentElement.scrollWidth > vw + 1) out.push(`整頁水平溢出 ${document.documentElement.scrollWidth}>${vw}`);
  const scrollOk = (el) => el.closest('.filter-row, .table-wrap, .exam__grid, pre');
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden], details:not([open]) > :not(summary), .modal-overlay ~ *'); };
  const name = (el) => (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase()) + (el.dataset.testid ? `[${el.dataset.testid}]` : '') + ' "' + (el.textContent || '').trim().slice(0, 20) + '"';
  for (const el of document.querySelectorAll('#app *, .topbar *, .tabbar *')) {
    if (!visible(el) || scrollOk(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && !el.closest('.toast-root')) out.push(`超出畫面右側 ${Math.round(r.right - vw)}px：${name(el)}`);
    const cs = getComputedStyle(el);
    if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll' && el.clientWidth > 0 && !['IMG','SVG','svg','path','INPUT'].includes(el.tagName) && !el.closest('svg')) {
      if (cs.textOverflow !== 'ellipsis') out.push(`內容被擠出／截斷：${name(el)} (${el.scrollWidth}>${el.clientWidth})`);
    }
  }
  for (const b of document.querySelectorAll('#app button, #app a.btn, .tabbar a, .topbar a')) {
    if (!visible(b) || b.classList.contains('col')) continue;
    const r = b.getBoundingClientRect();
    if (r.height < 30 || r.width < 30) out.push(`按鈕太小（${Math.round(r.width)}×${Math.round(r.height)}）：${name(b)}`);
  }
  const brand = document.querySelector('.brand')?.getBoundingClientRect();
  const right = document.querySelector('.topbar__right')?.getBoundingClientRect();
  if (brand && right && brand.right > right.left + 1) out.push('頂部列：標題和右側按鈕重疊');
  return [...new Set(out)];
})()
"""

def audit(page, label):
    page.wait_for_timeout(250)
    for p in page.evaluate(LAYOUT_JS):
        problems.append(f'[{label}] {p}')
    checked['pages'] += 1

SEED_JS = r"""
(async () => {
  const db = window.__mea.db; const now = Date.now();
  await db.put('progress', { id: 'diagnosis', total: 10, max: 13, sections: { vocab: { score: 5, max: 5, title: '單字' }, grammar: { score: 4, max: 5, title: '文法' }, reading: { score: 1, max: 3, title: '閱讀' } }, level: { id: 'solid', label: '基礎穩固', message: '' }, details: [], completedAt: now });
  for (const l of await db.getAll('lessons')) await db.put('progress', { id: 'lesson:' + l.id, lessonId: l.id, status: 'completed', stepIndex: 0, practice: {}, timesCompleted: 1, lastAccuracy: 80, bestAccuracy: 80, updatedAt: now });
  for (const w of await db.getAll('vocab')) await db.put('reviews', { wordId: w.id, status: 'learning', box: 1, correct: 1, wrong: 1, streak: 0, lastSeenAt: now, dueAt: now - 1000 });
  await db.put('attempts', { kind: 'lesson', lessonId: 'toeic-p2', itemId: 'p2-how-b', group: 'p2-how', correct: false, answer: 'A', createdAt: now });
  await db.put('attempts', { kind: 'lesson', lessonId: 'toeic-p6', itemId: 'p6-a1', group: 'p6-a1', correct: false, answer: 'held', createdAt: now });
  await db.put('attempts', { kind: 'lesson', lessonId: 'toeic-p1', itemId: 'p1-room-a', group: 'p1-room', correct: false, answer: 'A', createdAt: now });
  await db.put('attempts', { kind: 'review', wordId: 'schedule', itemId: 'rv-schedule', group: 'schedule', correct: false, answer: 'x', createdAt: now });
  for (const g of ['match', 'speed', 'spell']) await db.put('progress', { id: 'game:' + g, best: 3, plays: 1, lastAt: now, lastScore: 3 });
})()
"""

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        ctx = browser.new_context(viewport={'width': 375, 'height': 812}, is_mobile=True, has_touch=True, accept_downloads=True)
        ctx.add_init_script(AUTO_CLOSE)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.on('console', lambda m: m.type == 'error' and '404' not in m.text and errors.append(f'console: {m.text}'))
        page.add_init_script("window.__played = []; const op = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__played.push(this.src); return Promise.resolve(); };")
        page.goto(BASE); page.wait_for_selector('html[data-ready="true"]')

        ONLY_BUTTONS = len(sys.argv) > 3 and sys.argv[3] == 'buttons'
        # 空白使用者先檢查一輪
        for w in ([] if ONLY_BUTTONS else WIDTHS):
            page.set_viewport_size({'width': w, 'height': 800})
            for r in ['#/home', '#/worlds', '#/words', '#/games', '#/mistakes', '#/settings', '#/achievements', '#/stats', '#/diagnosis', '#/listening']:
                page.goto(BASE + r); page.wait_for_selector('#app section, #app .player', timeout=8000); audit(page, f'新使用者 {w}px {r}')

        page.evaluate(SEED_JS); page.reload(); page.wait_for_selector('html[data-ready="true"]')
        routes = ['#/home', '#/worlds', '#/words', '#/review', '#/review?mode=free', '#/games', '#/game?id=match', '#/game?id=speed', '#/game?id=spell',
                  '#/mistakes', '#/mistake-practice', '#/settings', '#/achievements', '#/stats', '#/diagnosis', '#/exam?id=mock-1',
                  '#/series?id=hot', '#/series?id=core3', '#/series?id=topic-travel', '#/unit?id=hot:0', '#/unit?id=toeic:3',
                  '#/exam?id=mock-2', '#/exam?id=level', '#/listening', '#/listening?mode=dictation', '#/listening?mode=shadow', '#/review?mode=fav']
        worlds = sorted({l['world'] for l in LESSONS})
        routes += [f'#/world?id={w}' for w in worlds]
        for w in ([] if ONLY_BUTTONS else WIDTHS):
            page.set_viewport_size({'width': w, 'height': 800})
            for r in routes:
                page.goto(BASE + r); page.wait_for_timeout(350); audit(page, f'{w}px {r}')
                if r == '#/words':
                    page.click('.word-row summary >> nth=0'); audit(page, f'{w}px 單字卡展開')
                if r == '#/stats':
                    page.click('.table-view summary'); audit(page, f'{w}px 分析表格')
            if w in (320, 1024):
                page.goto(BASE + '#/home'); page.wait_for_timeout(300)
                page.screenshot(path=f'{OUT}/audit-home-{w}.png', full_page=True)

        # 每一堂課的每一步（320px）
        page.set_viewport_size({'width': 320, 'height': 700})
        for l in ([] if ONLY_BUTTONS else LESSONS):
            if l['type'] == 'exam': continue
            page.goto(BASE + f"#/world?id={l['world']}"); page.wait_for_timeout(150)
            page.goto(BASE + f"#/lesson?id={l['id']}"); page.wait_for_selector('[data-testid=player]')
            guard = 0
            while page.locator('[data-testid=player]').count() and guard < 80:
                guard += 1
                try: kind = page.get_attribute('[data-role=body]', 'data-kind', timeout=3000)
                except Exception:  # 答對自動跳題、課程剛好結束
                    page.wait_for_timeout(1500); continue
                audit(page, f"320px {l['id']} 第{guard}步({kind})")
                checked['steps'] += 1
                if kind == 'practice':
                    if page.locator('.opt').count():
                        page.click('.opt >> nth=0')
                    elif page.locator('.q__type').count():
                        page.fill('.q__type input', 'test'); page.click('.q__type button[type=submit]')
                    elif page.locator('[data-tok]').count():
                        n = page.locator('[data-tok]').count()
                        for i in range(n): page.click(f'[data-tok="{i}"]')
                        page.click('[data-act=order-submit]')
                    page.wait_for_selector('.feedback'); audit(page, f"320px {l['id']} 作答回饋")
                    try: page.click('[data-role=feedback] [data-act=continue]', timeout=1500)
                    except Exception: pass  # 答對已自動前往下一題
                else:
                    page.click('[data-act=next]')
                page.wait_for_timeout(40)
            if page.locator('[data-testid=lesson-complete]').count():
                page.wait_for_timeout(600)  # 「下一課」按鈕是之後才加上去的
                audit(page, f"320px {l['id']} 完成畫面")
            if l['id'] in ('life-1', 'toeic-p1', 'read-1'):
                pass

        # 模擬考：作答中＋結果頁
        page.goto(BASE + '#/exam?id=mock-1'); page.wait_for_selector('[data-testid=exam-intro]')
        page.click('[data-testid=exam-start]'); page.wait_for_selector('[data-testid=exam-run]')
        for i in range(0 if ONLY_BUTTONS else 21):
            if page.locator('.opt').count(): page.click('.opt >> nth=0')
            audit(page, f'320px 模擬考第{i + 1}題')
            if page.is_visible('[data-act=next]'): page.click('[data-act=next]')
        if not ONLY_BUTTONS:
            page.click('.exam__map summary'); audit(page, '320px 模擬考題號總覽')
            page.click('[data-testid=exam-submit]'); page.click('.modal [data-act=ok]'); page.wait_for_selector('[data-testid=exam-result]')
            audit(page, '320px 模擬考結果'); page.screenshot(path=f'{OUT}/audit-exam-result.png', full_page=True)

        # 每一個按鈕都要有反應
        page.set_viewport_size({'width': 375, 'height': 800})
        CLICK_JS = r"""
        (sel) => new Promise((resolve) => {
          const el = document.querySelectorAll(sel.q)[sel.i];
          if (!el) return resolve('missing');
          if (el.disabled) return resolve('ok');  // 隨機題目重新載入後，同位置可能是停用的按鈕
          const hash = location.hash; const before = window.__played.length;
          let mutated = false;
          const mo = new MutationObserver(() => { mutated = true; }); mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
          el.click();
          setTimeout(() => { mo.disconnect(); resolve(mutated || location.hash !== hash || window.__played.length > before ? 'ok' : 'none'); }, 450);
        })
        """
        SKIP = {'apply-update', 'do-restore'}
        for r in routes + ['#/lesson?id=life-1', '#/lesson?id=toeic-p2']:
            page.goto(BASE + r); page.wait_for_timeout(350)
            sels = page.evaluate("""() => [...document.querySelectorAll('#app button, #app a.btn, #app summary, #app label.btn')].map((b, i) => ({ i, q: '#app button, #app a.btn, #app summary, #app label.btn', act: b.dataset.act || '', vis: b.offsetParent !== null && !b.disabled && !b.closest('[hidden]'), text: b.textContent.trim().slice(0, 20) }))""")
            for s in sels:
                if not s['vis'] or s['act'] in SKIP: continue
                page.goto(BASE + r); page.reload(); page.wait_for_selector('html[data-ready="true"]'); page.wait_for_timeout(350)
                if s['text'].startswith('選擇備份檔'):
                    with page.expect_file_chooser(timeout=3000) as fc:
                        page.locator('label.file-btn').click()
                    checked['buttons'] += 1
                    continue
                res = page.evaluate(CLICK_JS, {'q': s['q'], 'i': s['i']})
                checked['buttons'] += 1
                if page.locator('.modal-overlay').count(): page.click('.modal [data-act=cancel]')
                if res == 'missing' and r == '#/game?id=spell': res = 'ok'  # 每次重新載入是不同的隨機單字，字母方塊數量不同
                if res != 'ok': problems.append(f'[按鈕沒有反應] {r} 「{s["text"]}」({res})')
        browser.close()
except Exception as ex:
    import traceback; traceback.print_exc(limit=2)
    errors.append('ABORT: ' + str(ex).splitlines()[0])
finally:
    srv.terminate()

print(f"檢查頁面狀態 {checked['pages']} 次、課程步驟 {checked['steps']} 步、按鈕 {checked['buttons']} 個")
uniq = sorted(set(problems))
print(f'發現問題 {len(uniq)} 個；JS 錯誤 {len(errors)} 個')
import collections, re as _re
groups = collections.Counter(_re.sub(r'第\d+(步|題)', '第N\\1', _re.sub(r'\[\d+px ', '[', x)) for x in uniq)
for g, n in groups.most_common(): print(f' - ({n}) {g}')
open(OUT + '/audit.txt', 'w').write('\n'.join(uniq))
for e in errors[:10]: print(' !', e)
