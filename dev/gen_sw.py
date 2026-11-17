import os, sys, json
root = sys.argv[1]
version = sys.argv[2]
files = []
for dp, dn, fn in os.walk(root):
    rel = os.path.relpath(dp, root)
    if rel.startswith(('tests', 'assets/audio', 'dev', '.git')) or '/.' in dp:
        continue
    for f in fn:
        if f.startswith('.') or f in ('sw.js', 'README.md', 'CLAUDE.md'):
            continue
        files.append(os.path.normpath(os.path.join(rel, f)).replace('\\', '/'))
files = sorted(files)
tmpl = open(os.path.join(os.path.dirname(__file__), 'sw.template.js')).read()
out = tmpl.replace('__VERSION__', version).replace('__PRECACHE__', json.dumps(['./'] + files, indent=2, ensure_ascii=False))
open(os.path.join(root, 'sw.js'), 'w').write(out)
print(len(files), 'files')
