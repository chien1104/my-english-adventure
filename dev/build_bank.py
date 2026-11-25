# 多益單字庫：python3 dev/build_bank.py <專案路徑>
# 來源單字表（依頻率排序）：
#   NGSL 1.01（New General Service List）與 TSL 1.1（TOEIC Service List），
#   Browne, C. & Culligan, B.，CC BY-SA 4.0，https://www.newgeneralservicelist.com/
# 中文、詞性、情境、例句由本專案撰寫（dev/bank_src/*.txt），音標由 CMU 發音字典轉換。
# 產生：data/vocab/bank-*.json、data/series.json、更新 data/catalog.json 與 dev/audio_manifest.json
import json, os, re, sys, glob, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ipa as IPA

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
SRC = os.path.join(ROOT, 'dev/bank_src')
CHUNK = 100
STRICT = '--strict' in sys.argv  # 全部完成時才要求每一段都寫滿

LISTS = json.load(open(os.path.join(SRC, 'lists.json')))
CMU = IPA.load_cmu(os.path.join(SRC, 'cmudict.txt'))

TOPICS = {
    'off': ('office', '辦公室'), 'mtg': ('meeting', '會議活動'), 'hr': ('hr', '人事職涯'),
    'fin': ('finance', '財務金融'), 'biz': ('business', '行銷業務'), 'trv': ('travel', '旅遊出差'),
    'din': ('dining', '餐飲'), 'shp': ('shopping', '購物消費'), 'log': ('production', '製造物流'),
    'trn': ('transport', '交通'), 'fac': ('facility', '房屋設施'), 'hlt': ('health', '健康醫療'),
    'gen': ('general', '一般常用'),
}
POS_ZH = {'n.': '名詞', 'v.': '動詞', 'adj.': '形容詞', 'adv.': '副詞', 'prep.': '介系詞', 'conj.': '連接詞',
          'pron.': '代名詞', 'det.': '限定詞', 'num.': '數詞', 'int.': '感嘆詞', 'aux.': '助動詞'}
SERIES = [
    {'id': 'hot', 'icon': '🔥', 'name': '多益高頻 500', 'desc': '多益考題出現頻率最高、一般英文較少見的 500 字，最先背。', 'list': 'tsl', 'from': 0, 'to': 500},
    {'id': 'toeic', 'icon': '📗', 'name': '多益必備字', 'desc': '其餘的多益專用字，常出現在公告、信件、廣告與對話。', 'list': 'tsl', 'from': 500, 'to': None},
    {'id': 'core1', 'icon': '📘', 'name': '基礎常用 1', 'desc': '英文最常用的前 1000 字，多益每一題都會用到。', 'list': 'ngsl', 'from': 0, 'to': 1000},
    {'id': 'core2', 'icon': '📙', 'name': '基礎常用 2', 'desc': '常用字第 1001～2000 名。', 'list': 'ngsl', 'from': 1000, 'to': 2000},
    {'id': 'core3', 'icon': '📕', 'name': '基礎常用 3', 'desc': '常用字第 2001 名之後。', 'list': 'ngsl', 'from': 2000, 'to': None},
]
UNIT = 20

def slug(text):
    s = unicodedata.normalize('NFKD', text.replace("'", '').replace('’', '').replace('.', '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def norm(w):
    return slug(w).replace('-', '')

def pos_zh(pos):
    parts = [p.strip() for p in pos.split('/')]
    out = []
    for p in parts:
        p = p if p.endswith('.') else p + '.'
        if p not in POS_ZH: raise ValueError(f'未知詞性 {pos}')
        out.append(POS_ZH[p])
    return '／'.join(out)

def ipa_for(en, lemma):
    for key in (en.lower(), lemma.lower()):
        if key in CMU: return IPA.to_ipa(CMU[key])
    words = en.lower().split()
    if len(words) > 1 and all(w in CMU for w in words):
        return '/' + ' '.join(IPA.to_ipa(CMU[w]).strip('/') for w in words) + '/'
    return None

existing = {}
for f in json.load(open(os.path.join(ROOT, 'data/catalog.json')))['vocab']:
    if '/bank-' in f: continue
    for w in json.load(open(os.path.join(ROOT, f))): existing[w['id']] = w

errors, warns = [], []
taken = set()
words_by_list = {'tsl': [], 'ngsl': []}
for list_name in ('tsl', 'ngsl'):
    lemmas = LISTS[list_name]
    for ci in range((len(lemmas) + CHUNK - 1) // CHUNK):
        path = os.path.join(SRC, f'{list_name}-{ci + 1:02d}.txt')
        start = ci * CHUNK
        want = lemmas[start:start + CHUNK]
        if not os.path.exists(path):
            if STRICT: errors.append(f'缺少 {os.path.basename(path)}')
            words_by_list[list_name].extend([None] * len(want))
            continue
        lines = [l.rstrip('\n') for l in open(path, encoding='utf-8') if l.strip() and not l.startswith('#')]
        if len(lines) != len(want):
            errors.append(f'{os.path.basename(path)}：寫了 {len(lines)} 行，應該是 {len(want)} 行')
        for i, line in enumerate(lines[:len(want)]):
            lemma = want[i]
            f = line.split('|')
            where = f'{os.path.basename(path)} 第 {i + 1} 行（{lemma}）'
            if len(f) not in (6, 7): errors.append(f'{where}：欄位數 {len(f)}'); continue
            en, pos, zh, topic, ex_en, ex_zh = [x.strip() for x in f[:6]]
            n_en, n_lemma = norm(en), norm(lemma)
            if not (n_en.startswith(n_lemma[:4]) or n_lemma.startswith(n_en[:4]) or en.lower() == {'mister': 'mr.'}.get(lemma, '')):
                errors.append(f'{where}：寫的是「{en}」，對不上')
            if topic not in TOPICS: errors.append(f'{where}：情境代碼 {topic}')
            try: pz = pos_zh(pos)
            except ValueError as e: errors.append(f'{where}：{e}'); continue
            if not re.search(r'[.?!"]$', ex_en): errors.append(f'{where}：例句要有句尾標點')
            lo, le = ex_en.lower(), en.lower()
            if not (le in lo or le[:max(3, len(le) - 3)] in lo): errors.append(f'{where}：例句沒有用到這個字（{ex_en}）')
            if re.search(r'[A-Za-z]{3,}', ex_zh.replace('email', '')) and 'Kevin' not in ex_zh: warns.append(f'{where}：中文翻譯含英文「{ex_zh}」')
            if not re.search(r'[一-鿿]', zh): errors.append(f'{where}：中文解釋沒有中文')
            ipa = f[6].strip() if len(f) == 7 else ipa_for(en, lemma)
            if not ipa: errors.append(f'{where}：沒有音標，請在第 7 欄補上'); continue
            wid = slug(en)
            rank = start + i + 1
            if wid in taken and wid not in existing:  # 拼法相同的不同字（résumé／resume）
                wid = f'{wid}-{pos.split(".")[0].split("/")[0]}'
            taken.add(wid)
            if wid in existing:
                words_by_list[list_name].append(existing[wid]['id'])
                continue
            if list_name == 'tsl': level = 2 if rank <= 500 else 3
            else: level = 1 if rank <= 1000 else 2 if rank <= 2000 else 3
            words_by_list[list_name].append({
                'id': wid, 'en': en, 'zh': zh, 'pos': pos, 'posZh': pz, 'ipa': ipa, 'level': level,
                'topic': TOPICS[topic][0], 'audio': f'assets/audio/words/{wid}.mp3',
                'example': {'en': ex_en, 'zh': ex_zh}, 'exampleAudio': f'assets/audio/sentences/{wid}.mp3',
                'list': list_name, 'rank': rank,
            })

# ---- 進階欄位（dev/bank_src/extra-*.txt）：詞性變化、常見搭配、同義字、易混淆字、多益常考意思
POS_RE = re.compile(r'^(.+?) (n\.|v\.|adj\.|adv\.|prep\.|conj\.) (.+)$')
def split_en_zh(item, where):
    m = re.search(r'[一-鿿（]', item)
    if not m or m.start() == 0: errors.append(f'{where}：「{item}」要寫成「英文 中文」'); return None
    return {'en': item[:m.start()].strip(), 'zh': item[m.start():].strip()}
by_en = {w['en'].lower(): w for ws in words_by_list.values() for w in ws if isinstance(w, dict)}
extra_count = 0
for path in sorted(glob.glob(os.path.join(SRC, 'extra-*.txt'))):
    for n, line in enumerate(open(path, encoding='utf-8'), 1):
        if not line.strip() or line.startswith('#'): continue
        f = [x.strip() for x in line.rstrip('\n').split('|')]
        where = f'{os.path.basename(path)} 第 {n} 行（{f[0]}）'
        if len(f) != 6: errors.append(f'{where}：欄位數 {len(f)}，應該是 6'); continue
        w = by_en.get(f[0].lower())
        if not w: warns.append(f'{where}：單字庫找不到這個字'); continue
        fam, col, syn, conf, sense = f[1:]
        if fam:
            out = []
            for item in fam.split('；'):
                m = POS_RE.match(item.strip())
                if not m: errors.append(f'{where}：詞性變化「{item}」要寫成「英文 詞性 中文」'); continue
                out.append({'en': m.group(1), 'pos': m.group(2), 'zh': m.group(3)})
            w['family'] = out
        if col: w['collocations'] = [x for x in (split_en_zh(i.strip(), where) for i in col.split('；')) if x]
        if syn:
            if re.search(r'[一-鿿]', syn): errors.append(f'{where}：同義字只寫英文')
            w['synonyms'] = [x.strip() for x in syn.split(',') if x.strip()]
        if conf: w['confusables'] = [x for x in (split_en_zh(i.strip(), where) for i in conf.split('；')) if x]
        if sense: w['toeicSense'] = sense
        if fam or col or syn or conf or sense: extra_count += 1
print(f'進階欄位：{extra_count} 個字')

# 同一個 id 不能出現兩次
seen = {}
for ln, ws in words_by_list.items():
    for w in ws:
        if isinstance(w, dict):
            if w['id'] in seen: errors.append(f'重複的單字 id：{w["id"]}（{seen[w["id"]]} 與 {ln}）')
            seen[w['id']] = ln

if errors:
    print('發現問題：'); [print(' ✗', e) for e in errors]
    sys.exit(1)

# ---- 輸出單字檔
files = []
for ln, ws in words_by_list.items():
    data = [w for w in ws if isinstance(w, dict)]
    for part in range(0, len(data), 1000):
        name = f'data/vocab/bank-{ln}-{part // 1000 + 1}.json'
        json.dump(data[part:part + 1000], open(os.path.join(ROOT, name), 'w'), ensure_ascii=False, separators=(',', ':'))
        files.append(name)
for old in glob.glob(os.path.join(ROOT, 'data/vocab/bank-*.json')):
    if os.path.relpath(old, ROOT) not in files: os.remove(old)

# ---- 系列與單元
series_out = []
for s in SERIES:
    ids = [w['id'] if isinstance(w, dict) else w for w in words_by_list[s['list']][s['from']:s['to']] if w]
    if not ids: continue
    units = [ids[i:i + UNIT] for i in range(0, len(ids), UNIT)]
    series_out.append({k: s[k] for k in ('id', 'icon', 'name', 'desc')} | {'count': len(ids), 'units': units})
json.dump({'unitSize': UNIT, 'topics': {v[0]: v[1] for v in TOPICS.values()}, 'series': series_out,
           'source': 'NGSL 1.01／TSL 1.1（Browne & Culligan，CC BY-SA 4.0）'},
          open(os.path.join(ROOT, 'data/series.json'), 'w'), ensure_ascii=False, separators=(',', ':'))

cat_path = os.path.join(ROOT, 'data/catalog.json')
cat = json.load(open(cat_path))
cat['vocab'] = [v for v in cat['vocab'] if '/bank-' not in v] + files
cat['series'] = 'data/series.json'
# 教材版本：所有教材檔內容的雜湊，任何教材改動都會換版本，App 就會重新載入
import hashlib
h = hashlib.sha1()
for f in sorted(set(cat['vocab'] + cat['lessons'] + [cat['diagnosis'], cat['series']])):
    h.update(open(os.path.join(ROOT, f), 'rb').read())
cat['contentVersion'] = '2026.11.24-' + h.hexdigest()[:8]
json.dump(cat, open(cat_path, 'w'), ensure_ascii=False, indent=2)

# ---- 音檔清單（單字＋例句）
man_f = os.path.join(ROOT, 'dev/audio_manifest.json')
man = json.load(open(man_f))
for k in [k for k, v in man.items() if v.get('bank')]: del man[k]
total = 0
for ws in words_by_list.values():
    for w in ws:
        if not isinstance(w, dict): continue
        man[w['audio']] = {'segments': [['af_heart', w['en']]], 'kind': 'word', 'ipa': w['ipa'], 'bank': True}
        man[w['exampleAudio']] = {'segments': [['af_heart', w['example']['en']]], 'kind': 'sentence', 'bank': True}
        total += 1
json.dump(man, open(man_f, 'w'), ensure_ascii=False, indent=1)
print(f'單字庫 {total} 個新字；系列 {len(series_out)} 個；警告 {len(warns)} 個')
for w in warns[:30]: print(' !', w)
