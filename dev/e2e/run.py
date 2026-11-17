import sys, json, subprocess, time, os
from playwright.sync_api import sync_playwright

ROOT = sys.argv[1]
OUT = sys.argv[2]
PORT = 8765
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', ROOT],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
BASE = f'http://localhost:{PORT}/'
results = []
errors = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])

        # 1) 單元測試頁
        ctx = browser.new_context()
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'tests: {e}'))
        page.goto(BASE + 'tests/index.html')
        page.wait_for_function('window.__testResults', timeout=20000)
        tr = page.evaluate('window.__testResults')
        for r in tr['results']:
            check('[單元] ' + r['name'], r['pass'], r.get('error', ''))
        ctx.close()

        # 2) 端對端：手機尺寸 375x812
        ctx = browser.new_context(viewport={'width': 375, 'height': 812}, device_scale_factor=2, is_mobile=True, has_touch=True)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'app: {e}'))
        page.on('console', lambda m: m.type == 'error' and '404' not in m.text and errors.append(f'console: {m.text}'))
        page.goto(BASE)
        page.wait_for_selector('html[data-ready="true"]', timeout=10000)
        check('[E2E] 空網址自動導向 #/home', page.url.endswith('#/home'), page.url)
        check('[E2E] 首頁數據讀自資料庫（Lv 1、0 EXP、學過單字 0、完成課程 0、錯題 0）',
              page.inner_text('[data-testid=review-count]') == '0' and page.inner_text('[data-testid=done-count]') == '0'
              and page.inner_text('[data-testid=mistake-count]') == '0' and page.inner_text('[data-testid=level]') == 'Lv 1'
              and page.inner_text('[data-testid=exp]') == '0 EXP')
        check('[E2E] 首頁顯示保存狀態', '本機保存' in page.inner_text('[data-testid=home-save-summary]'))
        check('[E2E] 頂部保存狀態徽章可見', page.is_visible('#save-indicator'))
        page.screenshot(path=f'{OUT}/01-home.png', full_page=True)

        # 選模式 → 重新整理後保留
        page.click('[data-mode=low]')
        check('[E2E] 點選低電量模式立即顯示已保存', '低電量模式，5 分鐘（已保存）' in page.inner_text('[data-testid=mode-note]'))
        page.reload(); page.wait_for_selector('html[data-ready="true"]')
        check('[E2E] 重新整理後今日模式仍為低電量',
              page.get_attribute('[data-mode=low]', 'aria-pressed') == 'true')

        # 暱稱
        page.click('[data-testid=set-nickname-link]')
        page.wait_for_selector('[data-testid=nickname-input]')
        page.fill('[data-testid=nickname-input]', '  <b>芊芊</b>  ')
        page.click('[data-testid=nickname-form] button[type=submit]')
        page.wait_for_selector('.toast')
        page.click('.tabbar__link[href="#/home"]')
        page.wait_for_selector('.hero__title')
        title = page.inner_text('.hero__title')
        check('[E2E] 暱稱保存並在首頁顯示（HTML 被跳脫，不會執行）', title == '嗨，<b>芊芊</b>', title)

        # 關閉分頁、開新分頁
        page.close()
        page = ctx.new_page()
        page.goto(BASE + '#/home'); page.wait_for_selector('html[data-ready="true"]')
        check('[E2E] 關閉分頁再開，暱稱與模式仍在',
              '芊芊' in page.inner_text('.hero__title') and page.get_attribute('[data-mode=low]', 'aria-pressed') == 'true')

        # 模式時間設定 + 超出範圍自動調整
        page.goto(BASE + '#/settings?section=modes'); page.wait_for_selector('[data-testid=modes-form]')
        page.check('input[name=defaultMode][value=focus]')
        page.fill('input[name=min-normal]', '20')
        page.fill('input[name=min-challenge]', '999')
        page.click('[data-testid=modes-form] button[type=submit]')
        page.wait_for_selector('.toast')
        check('[E2E] 超出範圍的時間自動調整為上限 120', page.input_value('input[name=min-challenge]') == '120')
        page.reload(); page.wait_for_selector('[data-testid=modes-form]')
        check('[E2E] 模式設定重新整理後保留',
              page.input_value('input[name=min-normal]') == '20' and page.is_checked('input[name=defaultMode][value=focus]'))

        # 恢復預設：先取消、再確認
        page.click('[data-act=reset-minutes]')
        page.wait_for_selector('.modal')
        page.click('.modal [data-act=cancel]')
        check('[E2E] 確認框按取消不會變更', page.input_value('input[name=min-normal]') == '20')
        page.click('[data-act=reset-minutes]')
        page.click('.modal [data-act=ok]')
        page.wait_for_timeout(200)
        check('[E2E] 確認後時間恢復預設', page.input_value('input[name=min-normal]') == '15')

        # 保存狀態與持久保存申請
        page.goto(BASE + '#/settings?section=data'); page.wait_for_selector('[data-testid=status-list] .status-row')
        status_text = page.inner_text('[data-testid=status-list]')
        check('[E2E] 狀態列出 資料庫／持久保存／申請結果／空間／備份',
              all(k in status_text for k in ['本機資料庫', '持久保存', '申請結果', '已使用空間', '備份狀態']))
        check('[E2E] 備份狀態如實顯示尚未備份', '尚未備份' in status_text)
        check('[E2E] 頁面明確說明沒有雲端同步與雲端備份', '沒有雲端同步，也沒有雲端備份' in page.inner_text('#data'))
        btn = page.locator('[data-testid=persist-btn]')
        if btn.is_enabled():
            btn.click()
            page.wait_for_function("!document.querySelector('[data-key=request] dd').textContent.includes('尚未申請')")
        req_text = page.inner_text('[data-key=request] dd')
        check('[E2E] 按下申請後顯示申請結果與時間', ('核准' in req_text) or ('不支援' in req_text), req_text)
        page.screenshot(path=f'{OUT}/03-settings-data.png', full_page=True)

        # 世界地圖
        page.click('.tabbar__link[href="#/worlds"]')
        page.wait_for_selector('[data-testid=world-list]')
        check('[E2E] 世界地圖 8 個世界都有課程，診斷前皆鎖住',
              page.locator('.world').count() == 8 and page.locator('.badge--lock').count() == 8)
        check('[E2E] 底部導覽高亮目前頁', page.get_attribute('.tabbar__link[href="#/worlds"]', 'aria-current') == 'page')
        page.screenshot(path=f'{OUT}/02-worlds.png', full_page=True)

        # 返回鍵
        page.go_back(); page.wait_for_timeout(300)
        check('[E2E] 手機返回鍵回到上一頁', '#/settings' in page.url, page.url)

        # 404
        page.goto(BASE + '#/abc'); page.wait_for_timeout(300)
        check('[E2E] 未知網址顯示找不到頁面', '找不到這個頁面' in page.inner_text('#app'))

        # 375px 不跑版：檢查每頁沒有水平捲動
        for path in ['#/home', '#/worlds', '#/settings']:
            page.goto(BASE + path); page.wait_for_timeout(300)
            sw = page.evaluate('document.documentElement.scrollWidth')
            check(f'[E2E] 375px 寬無水平捲動 {path}', sw <= 375, f'scrollWidth={sw}')

        # 所有按鈕都有實際處理（不得有無作用按鈕）：檢查每個 button 是 submit / 有 data-act / data-mode
        for path in ['#/home', '#/settings']:
            page.goto(BASE + path); page.wait_for_timeout(300)
            orphan = page.evaluate("""[...document.querySelectorAll('#app button')].filter(b =>
                !(b.type === 'submit' || b.dataset.act || b.dataset.mode || b.dataset.filter)).map(b => b.textContent.trim())""")
            check(f'[E2E] {path} 沒有無作用的按鈕', len(orphan) == 0, str(orphan))

        # 損毀設定：App 仍能啟動
        page.goto(BASE + '#/home'); page.wait_for_selector('.hero__title')
        page.evaluate("localStorage.setItem('mea.settings.v1', '{broken')")
        page.reload(); page.wait_for_selector('html[data-ready="true"]')
        check('[E2E] 設定資料損毀時 App 仍正常啟動', page.is_visible('.hero__title'))
        page.goto(BASE + '#/home'); page.wait_for_selector('.hero__title')
        page.screenshot(path=f'{OUT}/00-home-fresh.png', full_page=True)
        ctx.close()
        browser.close()
finally:
    srv.terminate()

check('[E2E] 全程沒有 JavaScript 錯誤', len(errors) == 0, '; '.join(errors))
passed = sum(1 for r in results if r[1])
for name, ok, detail in results:
    print(('PASS ' if ok else 'FAIL ') + name + (f'  -- {detail}' if (detail and not ok) else ''))
print(f'\n合計：{passed}/{len(results)} 通過')
