import sys, subprocess, time
from playwright.sync_api import sync_playwright
ROOT=sys.argv[1]; PORT=8766
srv=subprocess.Popen([sys.executable,'-m','http.server',str(PORT),'-d',ROOT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']); pg=b.new_page()
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    pg.goto(f'http://localhost:{PORT}/tests/index.html'); pg.wait_for_function('window.__testResults',timeout=20000)
    r=pg.evaluate('window.__testResults')
    for x in r['results']:
      if not x['pass']: print('FAIL',x['name'],x.get('error'))
    print(f"{r['passed']}/{r['total']}", errs)
finally: srv.terminate()
