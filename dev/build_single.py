# 產生單一 HTML 檔：python3 build_single.py <專案路徑> <輸出檔>
import base64, json, os, re, subprocess, sys

ROOT, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
MIME = {'.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg'}

def data_uri(rel):
    ext = os.path.splitext(rel)[1]
    raw = open(os.path.join(ROOT, rel), 'rb').read()
    if ext == '.svg':
        return 'data:image/svg+xml;base64,' + base64.b64encode(raw).decode()
    return f'data:{MIME[ext]};base64,' + base64.b64encode(raw).decode()

# 1. 收集要內嵌的素材
assets = {}
for dp, dn, fn in os.walk(os.path.join(ROOT, 'assets')):
    for f in fn:
        if os.path.splitext(f)[1] in MIME:
            rel = os.path.relpath(os.path.join(dp, f), ROOT).replace('\\', '/')
            assets[rel] = None  # 先登記，下面只內嵌真的用得到的檔案

# 單字庫有 8000 多個音檔，全部內嵌檔案會將近 100 MB：單檔版的單字庫只放文字，不放音檔
BANK_AUDIO = {}
for f in os.listdir(os.path.join(ROOT, 'data/vocab')):
    if f.startswith('bank-'):
        for w in json.load(open(os.path.join(ROOT, 'data/vocab', f))):
            BANK_AUDIO[w['audio']] = BANK_AUDIO[w['exampleAudio']] = True
for rel in list(assets):
    if rel in BANK_AUDIO: del assets[rel]
    else: assets[rel] = data_uri(rel)

# 2. 教材 JSON：把素材路徑換成 data URI
def strip_bank_audio(obj):
    if isinstance(obj, list):
        return [{k: v for k, v in w.items() if k not in ('audio', 'exampleAudio')} if isinstance(w, dict) and w.get('list') else w for w in obj]
    return obj
def inline(obj):
    if isinstance(obj, dict): return {k: inline(v) for k, v in obj.items()}
    if isinstance(obj, list): return [inline(v) for v in obj]
    if isinstance(obj, str) and obj in assets: return assets[obj]
    return obj
files = {}
for dp, dn, fn in os.walk(os.path.join(ROOT, 'data')):
    for f in fn:
        if f.endswith('.json'):
            rel = os.path.relpath(os.path.join(dp, f), ROOT).replace('\\', '/')
            files[rel] = inline(strip_bank_audio(json.load(open(os.path.join(ROOT, rel)))))
cat = files['data/catalog.json']
cat['contentVersion'] = cat['contentVersion'] + '-single'

# 3. 打包程式
bundle = subprocess.run(['npx', 'esbuild', os.path.join(ROOT, 'js/app.js'), '--bundle', '--format=iife', '--target=es2020', '--minify', '--charset=utf8'],
                        cwd='/home/claude/build', capture_output=True, text=True, check=True).stdout
css = '\n'.join(open(os.path.join(ROOT, f'css/{n}.css')).read() for n in ['tokens', 'base', 'components', 'theme', 'dark'])

# 4. 組合 HTML
html = open(os.path.join(ROOT, 'index.html')).read()
html = re.sub(r'\s*<link rel="stylesheet" href="css/[a-z]+\.css">', '', html)
html = html.replace('</head>', f'<style>\n{css}\n</style>\n</head>')
html = re.sub(r'\s*<link rel="manifest"[^>]*>', '', html)
html = re.sub(r'\s*<meta name="(apple-mobile-web-app-capable|mobile-web-app-capable)"[^>]*>', '', html)
for rel in ['assets/icons/favicon.svg', 'assets/icons/apple-touch-icon.png']:
    html = html.replace(f'"{rel}"', f'"{assets[rel]}"')

def js_json(o):
    return json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
shim = f"""<script>
window.__MEA_SINGLE__ = true;
window.__MEA_FILES__ = {js_json(files)};
(function () {{
  var files = window.__MEA_FILES__, nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {{
    var url = typeof input === 'string' ? input : input.url;
    var path = url.replace(location.href.split('#')[0].replace(/[^/]*$/, ''), '').replace(/^\\.\\//, '').split('?')[0];
    if (Object.prototype.hasOwnProperty.call(files, path)) {{
      return Promise.resolve(new Response(JSON.stringify(files[path]), {{ status: 200, headers: {{ 'content-type': 'application/json' }} }}));
    }}
    return nativeFetch(input, init);
  }};
}})();
</script>
<script>
{bundle.replace('</script', '<\\/script')}
</script>"""
html = re.sub(r'<script type="module" src="js/app.js"></script>', lambda m: shim, html)
assert 'js/app.js' not in html
open(OUT, 'w').write(html)
print(f'{OUT}：{os.path.getsize(OUT) / 1024 / 1024:.1f} MB，內嵌素材 {len(assets)} 個、教材檔 {len(files)} 個')
