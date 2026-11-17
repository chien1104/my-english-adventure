# 產生並驗證所有音檔：python3 gen_audio.py <專案路徑>
import json, os, sys, hashlib, re, subprocess, tempfile
ROOT = os.path.abspath(sys.argv[1])  # 必須在切換資料夾之前取得
import numpy as np, soundfile as sf
sys.path.insert(0, '/home/claude/tts')
os.chdir('/home/claude/tts')
from kokoro_onnx import Kokoro
from num2words import num2words
import asr2

MAN = json.load(open('/home/claude/tools/audio_manifest.json'))
CACHE_F = '/home/claude/tools/audio_cache.json'
cache = json.load(open(CACHE_F)) if os.path.exists(CACHE_F) else {}
k = Kokoro('kokoro-v1.0.int8.onnx', 'voices-v1.0.bin')
SR = 24000

SPOKEN = [('Mrs.', 'Missus'), ('Ms.', 'Miz'), ('Mr.', 'Mister')]
def synth(text, voice, speed):
    for a, b in SPOKEN: text = text.replace(a, b)   # 稱謂唸成完整的字，不要逐字母拼
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

def to_mp3(samples, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav') as t:
        sf.write(t.name, samples, SR)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', t.name, '-ac', '1', '-b:a', '48k', path], check=True)

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
    r, h = norm_text(ref), norm_text(hyp)
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

issues = []
done = 0
for path, entry in sorted(MAN.items()):
    key = hashlib.sha1(json.dumps(entry, sort_keys=True).encode()).hexdigest()
    out = os.path.join(ROOT, path)
    if cache.get(path, {}).get('key') == key and os.path.exists(out):
        continue
    print('→', path, flush=True)
    samples = build(entry)
    to_mp3(samples, out)
    text = ' '.join(t for _, t in entry['segments'])
    rec = {'key': key}
    if entry['kind'] == 'word':
        voice, word = entry['segments'][0]
        ph = k.tokenizer.phonemize(word, 'en-us')
        rec['phonemes'] = ph
        if 'ipa' in entry:
            ok_ipa = norm_ipa(ph) == norm_ipa(entry['ipa'])
            rec['ipa_ok'] = ok_ipa
            if not ok_ipa: issues.append(f'IPA  {path}: 音標 {entry["ipa"]} vs 語音 /{ph}/')
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
