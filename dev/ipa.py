# CMU 發音字典（ARPAbet）轉成課本用的美式 IPA：/ˈæpəl/ 這種寫法
import os, re

V = {'AA': 'ɑ', 'AE': 'æ', 'AH': 'ʌ', 'AO': 'ɔ', 'AW': 'aʊ', 'AY': 'aɪ', 'EH': 'ɛ', 'ER': 'ɜr',
     'EY': 'eɪ', 'IH': 'ɪ', 'IY': 'i', 'OW': 'oʊ', 'OY': 'ɔɪ', 'UH': 'ʊ', 'UW': 'u'}
C = {'B': 'b', 'CH': 'tʃ', 'D': 'd', 'DH': 'ð', 'F': 'f', 'G': 'ɡ', 'HH': 'h', 'JH': 'dʒ', 'K': 'k',
     'L': 'l', 'M': 'm', 'N': 'n', 'NG': 'ŋ', 'P': 'p', 'R': 'r', 'S': 's', 'SH': 'ʃ', 'T': 't',
     'TH': 'θ', 'V': 'v', 'W': 'w', 'Y': 'j', 'Z': 'z', 'ZH': 'ʒ'}
# 合法的英文字首子音組合（用來決定重音符號放在哪個子音前面）
ONSETS = {(), *[(c,) for c in C if c != 'NG'],
          ('P', 'L'), ('P', 'R'), ('B', 'L'), ('B', 'R'), ('T', 'R'), ('D', 'R'), ('K', 'L'), ('K', 'R'),
          ('G', 'L'), ('G', 'R'), ('F', 'L'), ('F', 'R'), ('TH', 'R'), ('SH', 'R'), ('S', 'P'), ('S', 'T'),
          ('S', 'K'), ('S', 'M'), ('S', 'N'), ('S', 'L'), ('S', 'W'), ('K', 'W'), ('T', 'W'), ('D', 'W'),
          ('G', 'W'), ('P', 'Y'), ('B', 'Y'), ('K', 'Y'), ('F', 'Y'), ('M', 'Y'), ('V', 'Y'), ('HH', 'Y'),
          ('S', 'P', 'L'), ('S', 'P', 'R'), ('S', 'T', 'R'), ('S', 'K', 'R'), ('S', 'K', 'W'), ('S', 'K', 'Y'), ('S', 'P', 'Y')}

def load_cmu(path):
    d = {}
    for line in open(path, encoding='latin-1'):
        if line.startswith(';;;'): continue
        w, p = line.rstrip('\n').split('  ', 1)
        w = w.lower()
        if '(' in w: continue
        d.setdefault(w, p.split())
    return d

def to_ipa(phones):
    # ER 後面緊接母音（correctly、garage）：r 歸到下一個音節，前面唸 ə／ɜ
    fixed = []
    for i, ph in enumerate(phones):
        nxt = phones[i + 1] if i + 1 < len(phones) else ''
        if ph.startswith('ER') and re.sub(r'\d', '', nxt) in V:
            fixed += ['EX' + ph[-1], 'R']
        else:
            fixed.append(ph)
    phones = fixed
    sylls = []  # 每個音節：[onset, vowel, stress]
    pending = []
    out = []
    for ph in phones:
        base = re.sub(r'\d', '', ph)
        if base in V or base == 'EX':
            stress = int(ph[-1])
            # 從前面的子音中，取最長的合法字首當這個音節的開頭
            k = 0
            for i in range(len(pending) + 1):
                if tuple(pending[i:]) in ONSETS:
                    k = i; break
            coda, onset = pending[:k], pending[k:]
            if out: out[-1]['coda'] += coda
            else: onset = pending  # 第一個音節：前面全部都是字首
            if base == 'EX': v = 'ə' if stress == 0 else 'ɜ'
            elif base == 'AH' and stress == 0: v = 'ə'
            elif base == 'ER' and stress == 0: v = 'ər'
            else: v = V[base]
            out.append({'onset': onset, 'v': v, 'stress': stress, 'coda': []})
            pending = []
        else:
            pending.append(base)
    if out: out[-1]['coda'] += pending
    prim = next((i for i, x in enumerate(out) if x['stress'] == 1), None)
    # 次重音只保留一個：在主重音之前、且不緊貼主重音
    sec = next((i for i, x in enumerate(out) if x['stress'] == 2 and prim is not None and i < prim - 1), None)
    s = ''
    for i, syl in enumerate(out):
        mark = 'ˈ' if i == prim and len(out) > 1 else ('ˌ' if i == sec else '')
        s += mark + ''.join(C[c] for c in syl['onset']) + syl['v'] + ''.join(C[c] for c in syl['coda'])
    return '/' + s + '/'

if __name__ == '__main__':
    import json, glob, sys
    cmu = load_cmu(sys.argv[1])
    root = sys.argv[2]
    bad = 0
    for f in glob.glob(os.path.join(root, 'data/vocab/*.json')):
        for w in json.load(open(f)):
            got = to_ipa(cmu[w['en'].lower()])
            if got != w['ipa']: bad += 1; print(w['en'], w['ipa'], got)
    print('差異', bad)
