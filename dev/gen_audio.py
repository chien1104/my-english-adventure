# 產生並驗證所有音檔：python3 gen_audio.py <專案路徑>
import json, os, sys, hashlib, re, subprocess, tempfile
ROOT = os.path.abspath(sys.argv[1])  # 必須在切換資料夾之前取得
import numpy as np, soundfile as sf
sys.path.insert(0, '/home/claude/tts')
os.chdir('/home/claude/tts')
from kokoro_onnx import Kokoro
from num2words import num2words
import asr2

MAN = json.load(open(os.path.join(ROOT, 'dev/audio_manifest.json')))
ONLY = sys.argv[2] if len(sys.argv) > 2 else ''  # 只產生路徑包含這段文字的音檔
# 可以分成兩個程序同時跑（例如一個跑 sentences/、一個跑 words/）：各自寫自己的快取檔，讀取時合併
import glob as _glob
CACHE_DIR = '/home/claude/tools'
REVERSE = os.environ.get('REVERSE') == '1'  # 從清單尾端往前做（讓第二個程序分擔同一類音檔）
CACHE_F = os.path.join(CACHE_DIR, f'audio_cache{"-" + ONLY.strip("/").replace("/", "_") if ONLY else ""}{"-rev" if REVERSE else ""}.json')
cache = {}
for _f in sorted(_glob.glob(os.path.join(CACHE_DIR, 'audio_cache*.json'))):
    cache.update(json.load(open(_f)))
k = Kokoro('kokoro-v1.0.onnx' if os.path.exists('kokoro-v1.0.onnx') else 'kokoro-v1.0.int8.onnx', 'voices-v1.0.bin')
SR = 24000

# buffet（自助餐）要唸 /bəˈfeɪ/，語音引擎預設唸成動詞 /ˈbʌfɪt/
PHON_FIX = [('bˈʌfɪt', 'bəfˈeɪ'),           # buffet（自助餐）
            ('dˈuːplᵻkˌeɪt', 'dˈuːplᵻkət'),  # duplicate（名詞：副本）
            ('kˈɑːnstɹʌkt', 'kənstɹˈʌkt'),   # construct（動詞）
            ('ˈætɹɪbjˌuːt', 'ɐtɹˈɪbjuːt')]   # attribute（動詞）
SPOKEN = [('Mrs.', 'Missus'), ('Ms.', 'Miz'), ('Mr.', 'Mister')]
def synth(text, voice, speed):
    for a, b in SPOKEN: text = text.replace(a, b)   # 稱謂唸成完整的字，不要逐字母拼
    lang = 'en-gb' if voice.startswith('b') else 'en-us'   # 英式聲音用英式發音規則
    if lang == 'en-gb':
        s, sr = k.create(text, voice=voice, speed=speed, lang=lang)
        return s.astype('float32')
    ph = k.tokenizer.phonemize(text, 'en-us')
    fixed = ph
    for a, b in PHON_FIX: fixed = fixed.replace(a, b)
    if fixed != ph:  # 語音引擎唸錯的字：直接給正確的音素
        s, sr = k.create(fixed, voice=voice, speed=speed, lang='en-us', is_phonemes=True)
        return s.astype('float32')
    s, sr = k.create(text, voice=voice, speed=speed, lang='en-us')
    return s.astype('float32')

def build(entry):
    word = entry['kind'] == 'word'
    speed = 0.85 if word else 0.92
    parts = [np.zeros(int(SR * 0.15), dtype='float32')]
    for i, (voice, text) in enumerate(entry['segments']):
        if i: parts.append(np.zeros(int(SR * 0.5), dtype='float32'))
        parts.append(synth(text, voice, speed))
    parts.append(np.zeros(int(SR * 0.2), dtype='float32'))
    return np.concatenate(parts)

def to_mp3(samples, path, rate='48k'):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav') as t:
        sf.write(t.name, samples, SR)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', t.name, '-ac', '1', '-b:a', rate, path], check=True)

def norm_text(s):
    s = s.lower().replace('a.m.', ' am ').replace('p.m.', ' pm ').replace("o'clock", ' oclock ').replace('—', ' ')
    s = re.sub(r'(\d+):(\d+)', lambda m: f'{m.group(1)} {m.group(2)}', s)
    s = re.sub(r'\$(\d+)', lambda m: f'{m.group(1)} dollars', s)
    s = re.sub(r'\d+', lambda m: ' ' + num2words(int(m.group())) + ' ', s)
    s = s.replace('-', ' ')
    s = re.sub(r"[^a-z' ]", ' ', s)
    s = s.replace("'", '')
    return s.split()

def wer(ref, hyp):
    r, h = norm_text(ref.replace('%', ' percent')), norm_text(hyp.replace('%', ' percent'))
    if ''.join(r) == ''.join(h): return 0.0  # cell phone／cellphone 這種只差空格的不算錯
    d = [[0] * (len(h) + 1) for _ in range(len(r) + 1)]
    for i in range(len(r) + 1): d[i][0] = i
    for j in range(len(h) + 1): d[0][j] = j
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] != h[j - 1]))
    return d[len(r)][len(h)] / max(1, len(r))

def norm_ipa(s):
    s = s.strip('/').replace('ˈ', '').replace('ˌ', '').replace('ː', '').replace('ɹ', 'r').replace('ɐ', 'ə').replace('ɾ', 't').replace('ɚ', 'ər').replace('ᵻ', 'ɪ').replace('g', 'ɡ')
    return s

def loose_ipa(s):
    # 單字庫用：母音弱化（ə／ɪ／ʌ）、r 音色、ɑ／ɔ 的差別不算錯，子音要一致
    s = norm_ipa(s).replace('ər', 'ə').replace('ɜr', 'ɜ').replace('r', '').replace('t', 't')
    for a, b in [('ɪ', 'ə'), ('ʌ', 'ə'), ('ɛ', 'ə'), ('ɜ', 'ə'), ('ɔ', 'ɑ'), ('ʊ', 'u'), ('oʊ', 'o'), ('ɑ', 'a'), ('æ', 'a'), ('i', 'ə'), ('ə', '')]:
        s = s.replace(a, b)
    return s.strip('.')

import time as _time
START = _time.time() - 3 * 3600
issues = []
done = 0
for path, entry in sorted(MAN.items(), reverse=REVERSE):
    key = hashlib.sha1(json.dumps(entry, sort_keys=True).encode()).hexdigest()
    out = os.path.join(ROOT, path)
    if cache.get(path, {}).get('key') == key and os.path.exists(out):
        continue
    if ONLY and ONLY not in path:
        continue
    if REVERSE and os.path.exists(out) and os.path.getmtime(out) > START:
        break  # 已經和另一個程序在中間碰頭
    print('→', path, flush=True)
    samples = build(entry)
    to_mp3(samples, out, '32k' if entry.get('bank') else '48k')
    text = ' '.join(t for _, t in entry['segments'])
    rec = {'key': key}
    if entry['kind'] == 'word':
        voice, word = entry['segments'][0]
        ph = k.tokenizer.phonemize(word, 'en-us')
        rec['phonemes'] = ph
        if 'ipa' in entry:
            ok_ipa = norm_ipa(ph) == norm_ipa(entry['ipa']) or (entry.get('bank') and loose_ipa(ph) == loose_ipa(entry['ipa']))
            rec['ipa_ok'] = ok_ipa
            if not ok_ipa and not entry.get('bank'): issues.append(f'IPA  {path}: 音標 {entry["ipa"]} vs 語音 /{ph}/')
        if entry.get('bank') and rec.get('ipa_ok'):
            cache[path] = rec; done += 1
            continue  # 單字庫：語音音素和課本音標一致，就不必再用語音辨識確認
        carrier = synth(f'I said {word}.', voice, 0.9)
        with tempfile.NamedTemporaryFile(suffix='.wav') as t:
            sf.write(t.name, carrier, SR)
            heard = asr2.transcribe(t.name)
        rec['heard'] = heard
        if norm_text(heard)[-1:] != norm_text(word)[-1:]:
            issues.append(f'ASR  {path}: "{word}" 聽成 "{heard}"')
    else:
        heard = asr2.transcribe(out)
        rec['heard'] = heard
        rec['wer'] = round(wer(text, heard), 3)
        if rec['wer'] > 0.12:  # 短句容易被辨識模型聽錯：前面加一段引導語再聽一次
            h2 = re.sub(r'^\W*the word is\W*', '', asr2.transcribe(out, True), flags=re.I)
            w2 = round(wer(text, h2), 3)
            if w2 < rec['wer']: rec['heard'], rec['wer'] = h2, w2
        if rec['wer'] > 0.12:
            issues.append(f'WER {rec["wer"]:.2f} {path}\n     原文：{text}\n     聽到：{heard}')
    cache[path] = rec
    done += 1
    if done % 25 == 0:
        json.dump(cache, open(CACHE_F, 'w'), ensure_ascii=False, indent=1)
        print('…', done, flush=True)
json.dump(cache, open(CACHE_F, 'w'), ensure_ascii=False, indent=1)
print(f'產生 {done} 個；需要檢查 {len(issues)} 個')
for i in issues: print(i)
