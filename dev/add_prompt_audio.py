# 題目文字裡的英文單字／片語加上發音：python3 dev/add_prompt_audio.py <專案路徑>
# 每題加上 promptSay = {"text": 題目中的英文, "audio": 音檔路徑}，畫面會在那個英文旁邊放播放鍵。
# 已有單字音檔就沿用；其他寫進 dev/audio_manifest.json，再用 gen_audio.py 產生並驗證。
# 可重複執行（build_content.py 最後會自動呼叫）。
import json, os, re, sys, glob, unicodedata

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
HERE = os.path.dirname(os.path.abspath(__file__))
MAN_F = os.path.join(HERE, 'audio_manifest.json')
NAMES = {'Amy', 'Ken', 'Kevin', 'Mike', 'Sarah'}  # 人名不是要學的單字，不加
SEG = re.compile(r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’.\- ]*[A-Za-zÀ-ÿ.]|[A-Za-zÀ-ÿ]")
SPOKEN = {'be': 'be.'}  # 單獨一個 be 唸清楚一點

man = json.load(open(MAN_F))

def slug(text):
    s = unicodedata.normalize('NFKD', text.replace("'", '').replace('’', '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def audio_for(text):
    word_path = f'assets/audio/words/{slug(text)}.mp3'
    if word_path in man:
        return word_path
    path = f'assets/audio/prompts/{slug(text)}.mp3'
    single = ' ' not in text and not text.endswith('.')
    man[path] = {'segments': [['af_heart', SPOKEN.get(text, text)]], 'kind': 'word' if single else 'sentence'}
    return path

count = 0
def walk(o):
    global count
    if isinstance(o, dict):
        if 'prompt' in o and 'type' in o:
            o.pop('promptSay', None)
            segs = [s.strip() for s in SEG.findall(o['prompt']) if s.strip() not in NAMES]
            if segs:
                text = segs[0]
                o['promptSay'] = {'text': text, 'audio': audio_for(text)}
                count += 1
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)

for f in sorted(glob.glob(os.path.join(ROOT, 'data/lessons/*.json'))) + [os.path.join(ROOT, 'data/diagnosis.json')]:
    data = json.load(open(f))
    before = json.dumps(data, ensure_ascii=False)
    walk(data)
    after = json.dumps(data, ensure_ascii=False, indent=2)
    if json.dumps(data, ensure_ascii=False) != before:
        open(f, 'w').write(after + '\n')

json.dump(man, open(MAN_F, 'w'), ensure_ascii=False, indent=1)
print(f'{count} 題加上題目發音；音檔清單共 {len(man)} 個')
