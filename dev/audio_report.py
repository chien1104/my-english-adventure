# 列出驗證沒通過、需要人工檢查的音檔：python3 dev/audio_report.py <專案路徑>
import json, os, sys
ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
man = json.load(open(os.path.join(ROOT, 'dev/audio_manifest.json')))
import glob
cache = {}
for f in sorted(glob.glob('/home/claude/tools/audio_cache*.json')): cache.update(json.load(open(f)))
n = 0
for path, e in man.items():
    r = cache.get(path)
    if not r or ('--all' not in sys.argv and not e.get('bank')): continue
    text = ' '.join(t for _, t in e['segments'])
    if e['kind'] == 'sentence' and r.get('wer', 0) > 0.12:
        n += 1; print(f'句子 {r["wer"]:.2f} {path}\n   原文：{text}\n   聽到：{r["heard"]}')
    elif e['kind'] == 'word' and 'heard' in r and not r.get('ipa_ok'):
        if not r['heard'].lower().rstrip('.').endswith(text.lower().rstrip('.')):
            n += 1; print(f'單字 {path}：{text} 聽成 {r["heard"]}')
print('共', n, '個')
