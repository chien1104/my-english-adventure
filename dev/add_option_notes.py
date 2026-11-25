# 錯誤選項逐一解析：選擇題的選項如果是單字庫裡的字，就在題目加上 optionNotes（每個錯誤選項的詞性和中文）
# 只處理「同一字族」的詞性題（例如 decide／decision／decisive），其他題型的字意可能和題目用法對不上，不加。
# 用法：python3 dev/add_option_notes.py <專案路徑>（build_content.py 最後會自動執行）
import json, os, sys, glob

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
DICT = {}
for f in sorted(glob.glob(os.path.join(ROOT, 'data/vocab/*.json'))):
    for w in json.load(open(f)):
        DICT.setdefault(w['en'].lower(), w)
for f in sorted(glob.glob(os.path.join(ROOT, 'data/vocab/bank-*.json'))):
    for w in json.load(open(f)):
        DICT.setdefault(w['en'].lower(), w)

def note(o):
    w = DICT.get(o.lower())
    return f"{w['en']}（{w['posZh']}）是「{w['zh']}」" if w else None

count = 0
def walk(o):
    global count
    if isinstance(o, dict):
        if o.get('type') == 'choice' and isinstance(o.get('options'), list):
            o.pop('optionNotes', None)
            opts = o['options']
            single = all(isinstance(x, str) and x.isascii() and x.replace('-', '').isalpha() for x in opts)
            family = single and len({x[:4].lower() for x in opts}) == 1
            if family:
                notes = {x: note(x) for x in opts if x != o['answer'] and note(x)}
                if notes:
                    o['optionNotes'] = notes
                    count += 1
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)

for f in sorted(glob.glob(os.path.join(ROOT, 'data/lessons/*.json'))):
    d = json.load(open(f))
    walk(d)
    json.dump(d, open(f, 'w'), ensure_ascii=False, indent=2)
    open(f, 'a').write('\n')
print(f'{count} 題加上錯誤選項解析')
