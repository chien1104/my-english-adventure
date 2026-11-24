# 教材產生器：產生課程 JSON 與音檔清單（tools/audio_manifest.json）
# 用法：python3 build_content.py <專案路徑>
import json, os, sys

ROOT = sys.argv[1]
W, M, B = 'af_heart', 'am_michael', 'bf_emma'   # 美式女聲、美式男聲、英式女聲
AUD = {}

def say(path, text, voice=W, kind='sentence'):
    AUD[path] = {'segments': [[voice, text]], 'kind': kind}
    return path

def multi(path, segs):
    AUD[path] = {'segments': [list(s) for s in segs], 'kind': 'sentence'}
    return path

def q(id, group, prompt, options, answer, explanation, **kw):
    d = {'id': id, 'group': group, 'type': 'choice', 'prompt': prompt, 'options': options, 'answer': answer, 'explanation': explanation}
    d.update(kw)
    return d

def write(rel, obj):
    p = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(obj, open(p, 'w'), ensure_ascii=False, indent=2)

LESSONS = []
def lesson(obj):
    LESSONS.append(obj)
    write(f"data/lessons/{obj['id']}.json", obj)

# ---------------------------------------------------------------- 既有教材補上音檔
VOCAB_FILES = ['data/vocab/breakfast.json', 'data/vocab/home.json', 'data/vocab/colors.json', 'data/vocab/office.json']

def office_words():
    def w(id, zh, pos, posZh, ipa, ex_en, ex_zh, note=None):
        d = {'id': id, 'en': id, 'zh': zh, 'pos': pos, 'posZh': posZh, 'ipa': ipa, 'level': 2, 'topic': 'office',
             'image': f'assets/img/words/{id}.svg', 'audio': f'assets/audio/words/{id}.mp3',
             'example': {'en': ex_en, 'zh': ex_zh}}
        if note: d['note'] = note
        return d
    return [
        w('computer', '電腦', 'n.', '名詞（可數）', '/kəmˈpjutər/', 'My computer is very slow today.', '我的電腦今天很慢。'),
        w('printer', '印表機', 'n.', '名詞（可數）', '/ˈprɪntər/', 'The printer is out of paper.', '印表機沒紙了。', 'out of paper：沒有紙了。'),
        w('desk', '書桌；辦公桌', 'n.', '名詞（可數）', '/dɛsk/', 'Please put the files on my desk.', '請把文件放在我的桌上。'),
        w('meeting', '會議', 'n.', '名詞（可數）', '/ˈmitɪŋ/', 'We have a meeting at ten.', '我們十點有一場會議。'),
        w('email', '電子郵件', 'n.', '名詞（可數）', '/ˈimeɪl/', 'I will send you an email.', '我會寄一封電子郵件給你。', 'email 開頭是母音的聲音，所以說 an email。'),
        w('manager', '經理', 'n.', '名詞（可數）', '/ˈmænɪdʒər/', 'She is the manager of our team.', '她是我們團隊的經理。'),
        w('report', '報告', 'n.', '名詞（可數）', '/rɪˈpɔrt/', 'Please finish the report by Friday.', '請在星期五前完成報告。'),
        w('schedule', '行程表；時間表', 'n.', '名詞（可數）', '/ˈskɛdʒul/', 'Let me check my schedule.', '讓我看一下我的行程表。', '這是美式發音；英式常唸 /ˈʃɛdjuːl/。'),
    ]

write('data/vocab/office.json', office_words())
for vf in VOCAB_FILES:
    words = json.load(open(os.path.join(ROOT, vf)))
    for w in words:
        say(w['audio'], w['en'], W, kind='word')
        AUD[w['audio']]['ipa'] = w['ipa']
        w['exampleAudio'] = say(f"assets/audio/sentences/{w['id']}.mp3", w['example']['en'], W)
    write(vf, words)

# 既有課程的例句也加上音檔
for lid in ['vocab-1', 'vocab-2', 'vocab-3', 'grammar-1', 'grammar-2', 'grammar-3', 'toeic-p5-1']:
    rel = f'data/lessons/{lid}.json'
    obj = json.load(open(os.path.join(ROOT, rel)))
    for st in obj['steps']:
        if st['kind'] == 'examples':
            for i, it in enumerate(st['items']):
                it['audio'] = say(f'assets/audio/lessons/{lid}/ex{i + 1}.mp3', it['en'], W if i % 2 == 0 else M)
    if lid == 'toeic-p5-1':
        obj['order'] = 5
        obj.pop('requires', None)
    write(rel, obj)

# ================================================================ 字母森林（自然發音）
def phon(word): return say(f'assets/audio/phonics/{word}.mp3', word, W, kind='word')
PHONICS_IPA = {}
def listen_word(id, group, word, options, expl, ipa):
    PHONICS_IPA[word] = ipa
    return q(id, group, '聽音檔，選出你聽到的單字', options, word, expl, audio=phon(word), audioLabel='▶ 播放單字', audioHint='可以重複播放')
def missing(id, group, pattern, zh, options, answer, expl):
    return q(id, group, '看中文，選出缺少的字母', options, answer, expl, sentence=pattern, zh=zh)
def spell(id, word, hint, expl, ipa):
    PHONICS_IPA[word] = ipa
    return {'id': id, 'group': id, 'type': 'type', 'prompt': '聽音檔，拼出你聽到的單字', 'audio': phon(word), 'audioLabel': '▶ 播放單字', 'hint': hint, 'answer': word, 'explanation': expl}
def ex_words(lid, items):
    out = []
    for w, zh, ipa in items:
        PHONICS_IPA[w] = ipa
        out.append({'en': w, 'zh': f'{zh}　{ipa}', 'audio': phon(w)})
    return out

lesson({
    'id': 'phonics-1', 'world': 'alphabet-forest', 'order': 1, 'type': 'phonics',
    'title': '短母音 a、i、o', 'titleEn': 'Short Vowels a, i, o', 'minutes': 10,
    'summary': '學會字母的「聲音」，看到單字就能試著唸出來。',
    'steps': [
        {'kind': 'concept', 'title': '什麼是自然發音', 'body': [
            '英文字母有「名字」也有「聲音」。例如字母 a 的名字唸 /eɪ/，但在 cat 裡發的是短短的 /æ/。',
            '學會字母的聲音，看到沒學過的字也能試著唸出來，這叫做「自然發音（Phonics）」。',
            '這一課先學三個短母音：a、i、o。每個單字都可以按 ▶ 聽發音，跟著唸效果最好。']},
        {'kind': 'explain', 'title': '三個短母音', 'body': ['先聽例字，注意中間母音的聲音：'],
         'table': {'head': ['字母', '短母音', '例字'], 'rows': [
             ['a', '/æ/ 嘴巴張大，嘴角往兩邊拉', 'cat、hat、map'],
             ['i', '/ɪ/ 短而放鬆，比中文「一」短', 'sit、pig、big'],
             ['o', '/ɑ/ 嘴巴張大，聲音從喉嚨出來', 'hot、dog、box']]},
         'tip': '「子音＋母音＋子音」的短字（像 c-a-t），中間的母音通常發短母音。'},
        {'kind': 'examples', 'title': '聽聽看', 'items': ex_words('phonics-1', [
            ('cat', '貓', '/kæt/'), ('map', '地圖', '/mæp/'), ('pig', '豬', '/pɪɡ/'),
            ('big', '大的', '/bɪɡ/'), ('hot', '熱的', '/hɑt/'), ('dog', '狗', '/dɑɡ/')])},
        {'kind': 'breakdown', 'title': '把聲音拼起來', 'items': [
            {'parts': [{'text': 'c', 'label': '/k/'}, {'text': 'a', 'label': '/æ/'}, {'text': 't', 'label': '/t/'}], 'zh': 'c-a-t → cat（貓）'},
            {'parts': [{'text': 'p', 'label': '/p/'}, {'text': 'i', 'label': '/ɪ/'}, {'text': 'g', 'label': '/ɡ/'}], 'zh': 'p-i-g → pig（豬）'}]},
        {'kind': 'practice', 'title': '互動練習', 'intro': '先聽，再選。可以重複播放。',
         'questions': [
             listen_word('ph1-hat', 'ph1-a', 'hat', ['hat', 'hit', 'hot'], 'hat /hæt/（帽子）中間是短母音 a /æ/；hit 是 /ɪ/，hot 是 /ɑ/。', '/hæt/'),
             listen_word('ph1-sit', 'ph1-i', 'sit', ['sat', 'sit', 'set'], 'sit /sɪt/（坐）中間是短母音 i /ɪ/。', '/sɪt/'),
             listen_word('ph1-hot', 'ph1-o', 'hot', ['hut', 'hat', 'hot'], 'hot /hɑt/（熱的）中間是短母音 o /ɑ/。', '/hɑt/'),
             missing('ph1-cat', 'ph1-a2', 'c _ t', '貓', ['a', 'i', 'o'], 'a', 'cat（貓）：c-a-t，中間是 a /æ/。'),
             missing('ph1-pig', 'ph1-i2', 'p _ g', '豬', ['a', 'i', 'o'], 'i', 'pig（豬）：p-i-g，中間是 i /ɪ/。'),
             missing('ph1-box', 'ph1-o2', 'b _ x', '箱子', ['a', 'i', 'o'], 'o', 'box（箱子）：b-o-x，中間是 o /ɑ/。')],
         'similar': [
             listen_word('ph1-map', 'ph1-a', 'map', ['mop', 'map', 'mat'], 'map /mæp/（地圖）；mop 是拖把，mat 是墊子。', '/mæp/'),
             listen_word('ph1-big', 'ph1-i', 'big', ['bag', 'bog', 'big'], 'big /bɪɡ/（大的）中間是 i /ɪ/；bag 是 /æ/。', '/bɪɡ/'),
             listen_word('ph1-dog', 'ph1-o', 'dog', ['dog', 'dig', 'dug'], 'dog /dɑɡ/（狗）中間是 o /ɑ/；dig 是 /ɪ/，dug 是 /ʌ/。', '/dɑɡ/'),
             missing('ph1-hat2', 'ph1-a2', 'h _ t', '帽子', ['a', 'i', 'o'], 'a', 'hat（帽子）：h-a-t。hit 是打，hot 是熱的。'),
             missing('ph1-big2', 'ph1-i2', 'b _ g', '大的', ['a', 'i', 'o'], 'i', 'big（大的）：b-i-g。bag 是袋子。'),
             missing('ph1-hot2', 'ph1-o2', 'h _ t', '熱的', ['a', 'i', 'o'], 'o', 'hot（熱的）：h-o-t。')]},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習：聽寫', 'intro': '聽音檔，把單字拼出來。',
         'questions': [
             spell('ph1-sp-cat', 'cat', '3 個字母，c 開頭', 'cat：c-a-t。', '/kæt/'),
             spell('ph1-sp-dog', 'dog', '3 個字母，d 開頭', 'dog：d-o-g。', '/dɑɡ/'),
             spell('ph1-sp-pig', 'pig', '3 個字母，p 開頭', 'pig：p-i-g。', '/pɪɡ/')]},
    ]})

lesson({
    'id': 'phonics-2', 'world': 'alphabet-forest', 'order': 2, 'type': 'phonics',
    'title': '短母音 e、u', 'titleEn': 'Short Vowels e, u', 'minutes': 10,
    'summary': '再學兩個短母音，五個短母音就全部學會了。',
    'steps': [
        {'kind': 'concept', 'title': '這一課學什麼', 'body': [
            '上一課學了 a、i、o，這一課學最後兩個短母音：e 和 u。',
            'e 和 a 聽起來有點像，u 和 o 也有點像，多聽幾次比較差別。']},
        {'kind': 'explain', 'title': '兩個短母音', 'body': ['注意嘴巴張開的大小：'],
         'table': {'head': ['字母', '短母音', '例字'], 'rows': [
             ['e', '/ɛ/ 嘴巴微開，比 a /æ/ 小', 'bed、pen、red'],
             ['u', '/ʌ/ 短促放鬆，像輕輕的「ㄜ」', 'cup、bus、sun']]},
         'tip': '比較看看：bad /æ/ 和 bed /ɛ/、cap /æ/ 和 cup /ʌ/。'},
        {'kind': 'examples', 'title': '聽聽看', 'items': ex_words('phonics-2', [
            ('bed', '床', '/bɛd/'), ('pen', '筆', '/pɛn/'), ('red', '紅色', '/rɛd/'),
            ('cup', '杯子', '/kʌp/'), ('bus', '公車', '/bʌs/'), ('sun', '太陽', '/sʌn/')])},
        {'kind': 'breakdown', 'title': '把聲音拼起來', 'items': [
            {'parts': [{'text': 'b', 'label': '/b/'}, {'text': 'e', 'label': '/ɛ/'}, {'text': 'd', 'label': '/d/'}], 'zh': 'b-e-d → bed（床）'},
            {'parts': [{'text': 's', 'label': '/s/'}, {'text': 'u', 'label': '/ʌ/'}, {'text': 'n', 'label': '/n/'}], 'zh': 's-u-n → sun（太陽）'}]},
        {'kind': 'practice', 'title': '互動練習', 'intro': '先聽，再選。可以重複播放。',
         'questions': [
             listen_word('ph2-bed', 'ph2-e', 'bed', ['bad', 'bed', 'bud'], 'bed /bɛd/（床）中間是 e /ɛ/；bad 是 /æ/，bud 是 /ʌ/。', '/bɛd/'),
             listen_word('ph2-cup', 'ph2-u', 'cup', ['cap', 'cop', 'cup'], 'cup /kʌp/（杯子）中間是 u /ʌ/；cap 是 /æ/。', '/kʌp/'),
             listen_word('ph2-pen', 'ph2-e2', 'pen', ['pen', 'pan', 'pin'], 'pen /pɛn/（筆）；pan 是平底鍋，pin 是別針。', '/pɛn/'),
             listen_word('ph2-sun', 'ph2-u2', 'sun', ['sin', 'sun', 'sand'], 'sun /sʌn/（太陽）中間是 u /ʌ/。', '/sʌn/'),
             missing('ph2-red', 'ph2-e3', 'r _ d', '紅色', ['e', 'u', 'a'], 'e', 'red（紅色）：r-e-d。'),
             missing('ph2-cup2', 'ph2-u3', 'c _ p', '杯子', ['e', 'u', 'a'], 'u', 'cup（杯子）：c-u-p。cap 是帽子。')],
         'similar': [
             listen_word('ph2-red2', 'ph2-e', 'red', ['rid', 'red', 'rod'], 'red /rɛd/（紅色）中間是 e /ɛ/。', '/rɛd/'),
             listen_word('ph2-nut', 'ph2-u', 'nut', ['net', 'not', 'nut'], 'nut /nʌt/（堅果）中間是 u /ʌ/；net 是網子。', '/nʌt/'),
             listen_word('ph2-ten', 'ph2-e2', 'ten', ['tin', 'ten', 'tan'], 'ten /tɛn/（十）中間是 e /ɛ/。', '/tɛn/'),
             listen_word('ph2-run', 'ph2-u2', 'run', ['run', 'ran', 'rain'], 'run /rʌn/（跑）中間是 u /ʌ/；ran 是 /æ/。', '/rʌn/'),
             missing('ph2-bed2', 'ph2-e3', 'b _ d', '床', ['e', 'u', 'a'], 'e', 'bed（床）：b-e-d。'),
             missing('ph2-sun2', 'ph2-u3', 's _ n', '太陽', ['e', 'u', 'a'], 'u', 'sun（太陽）：s-u-n。')]},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習：聽寫', 'intro': '聽音檔，把單字拼出來。',
         'questions': [
             spell('ph2-sp-bed', 'bed', '3 個字母，b 開頭', 'bed：b-e-d。', '/bɛd/'),
             spell('ph2-sp-sun', 'sun', '3 個字母，s 開頭', 'sun：s-u-n。', '/sʌn/'),
             spell('ph2-sp-pen', 'pen', '3 個字母，p 開頭', 'pen：p-e-n。', '/pɛn/')]},
    ]})

lesson({
    'id': 'phonics-3', 'world': 'alphabet-forest', 'order': 3, 'type': 'phonics',
    'title': '子音組合 sh、ch、th', 'titleEn': 'sh, ch, th', 'minutes': 10,
    'summary': '兩個字母合在一起，變成一個新的聲音。',
    'steps': [
        {'kind': 'concept', 'title': '這一課學什麼', 'body': [
            '有些子音兩個字母一起出現時，會變成一個新的聲音。',
            '最常見的三組是 sh、ch、th。學會它們，ship、chair、three 這些常用字就能唸對。']},
        {'kind': 'explain', 'title': '三個子音組合', 'body': ['先聽例字，注意開頭或結尾的聲音：'],
         'table': {'head': ['組合', '聲音', '例字'], 'rows': [
             ['sh', '/ʃ/ 嘴唇往前噘，送出長長的氣，像叫人「噓」安靜', 'ship、fish、shop'],
             ['ch', '/tʃ/ 舌頭先頂住再放開，比 sh 短促', 'chair、chip、lunch'],
             ['th', '/θ/ 舌尖輕放在上下牙齒之間吹氣', 'three、thank、bath']]},
         'tip': 'th 不要唸成 s 或 f：three 不是 sree，也不是 free。'},
        {'kind': 'examples', 'title': '聽聽看', 'items': ex_words('phonics-3', [
            ('ship', '船', '/ʃɪp/'), ('fish', '魚', '/fɪʃ/'), ('chair', '椅子', '/tʃɛr/'),
            ('lunch', '午餐', '/lʌntʃ/'), ('three', '三', '/θri/'), ('thank', '感謝', '/θæŋk/')])},
        {'kind': 'breakdown', 'title': '把聲音拼起來', 'items': [
            {'parts': [{'text': 'sh', 'label': '/ʃ/'}, {'text': 'i', 'label': '/ɪ/'}, {'text': 'p', 'label': '/p/'}], 'zh': 'sh-i-p → ship（船）'},
            {'parts': [{'text': 'ch', 'label': '/tʃ/'}, {'text': 'i', 'label': '/ɪ/'}, {'text': 'p', 'label': '/p/'}], 'zh': 'ch-i-p → chip（洋芋片）'}]},
        {'kind': 'practice', 'title': '互動練習', 'intro': '先聽，再選。可以重複播放。',
         'questions': [
             listen_word('ph3-ship', 'ph3-sh', 'ship', ['ship', 'chip', 'sip'], 'ship /ʃɪp/（船）開頭是 sh /ʃ/。chip 開頭是 ch /tʃ/。', '/ʃɪp/'),
             listen_word('ph3-chair', 'ph3-ch', 'chair', ['share', 'chair', 'hair'], 'chair /tʃɛr/（椅子）開頭是 ch /tʃ/；share 開頭是 sh /ʃ/。', '/tʃɛr/'),
             listen_word('ph3-three', 'ph3-th', 'three', ['tree', 'free', 'three'], 'three /θri/（三）開頭是 th /θ/；tree 是樹，free 是免費。', '/θri/'),
             missing('ph3-fish', 'ph3-sh2', 'fi _ _', '魚', ['sh', 'ch', 'th'], 'sh', 'fish（魚）：f-i-sh，結尾是 sh /ʃ/。'),
             missing('ph3-lunch', 'ph3-ch2', 'lun _ _', '午餐', ['sh', 'ch', 'th'], 'ch', 'lunch（午餐）：l-u-n-ch，結尾是 ch /tʃ/。'),
             missing('ph3-thank', 'ph3-th2', '_ _ ank', '感謝', ['sh', 'ch', 'th'], 'th', 'thank（感謝）：th-a-n-k，開頭是 th /θ/。')],
         'similar': [
             listen_word('ph3-shop', 'ph3-sh', 'shop', ['chop', 'shop', 'top'], 'shop /ʃɑp/（商店）開頭是 sh /ʃ/；chop 是切。', '/ʃɑp/'),
             listen_word('ph3-chin', 'ph3-ch', 'chin', ['chin', 'shin', 'thin'], 'chin /tʃɪn/（下巴）開頭是 ch /tʃ/；thin 是瘦的。', '/tʃɪn/'),
             listen_word('ph3-thank2', 'ph3-th', 'thank', ['tank', 'thank', 'sank'], 'thank /θæŋk/（感謝）開頭是 th /θ/；tank 是坦克、水槽。', '/θæŋk/'),
             missing('ph3-dish', 'ph3-sh2', 'di _ _', '盤子', ['sh', 'ch', 'th'], 'sh', 'dish（盤子）：d-i-sh。'),
             missing('ph3-each', 'ph3-ch2', 'ea _ _', '每一個', ['sh', 'ch', 'th'], 'ch', 'each（每一個）：ea-ch。'),
             missing('ph3-bath', 'ph3-th2', 'ba _ _', '洗澡', ['sh', 'ch', 'th'], 'th', 'bath（洗澡）：b-a-th。')]},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習：聽寫', 'intro': '聽音檔，把單字拼出來。',
         'questions': [
             spell('ph3-sp-fish', 'fish', '4 個字母，f 開頭', 'fish：f-i-sh。', '/fɪʃ/'),
             spell('ph3-sp-ship', 'ship', '4 個字母，s 開頭', 'ship：sh-i-p。', '/ʃɪp/')]},
    ]})

# ================================================================ 生活冒險島（對話）
def dialogue(lid, scene, lines):
    out, segs = [], []
    for i, (who, voice, side, en, zh) in enumerate(lines):
        out.append({'speaker': who, 'side': side, 'en': en, 'zh': zh, 'audio': say(f'assets/audio/lessons/{lid}/d{i + 1}.mp3', en, voice)})
        segs.append((voice, en))
    return {'kind': 'dialogue', 'title': '聽聽看這段對話', 'scene': scene, 'audio': multi(f'assets/audio/lessons/{lid}/dialogue.mp3', segs), 'lines': out}
def phrases(lid, items):
    return {'kind': 'examples', 'title': '重點句子', 'items': [
        {'en': en, 'zh': zh, 'highlight': hl, 'audio': say(f'assets/audio/lessons/{lid}/p{i + 1}.mp3', en, W if i % 2 == 0 else M)}
        for i, (en, zh, hl) in enumerate(items)]}
def lq(lid, id, group, prompt, options, answer, expl, sentence=None, audio_text=None, voice=W, **kw):
    extra = dict(kw)
    if sentence: extra['sentence'] = sentence
    if audio_text:
        extra['audio'] = say(f'assets/audio/lessons/{lid}/{id}.mp3', audio_text, voice)
    return q(id, group, prompt, options, answer, expl, **extra)

L = 'life-1'
lesson({
    'id': L, 'world': 'life-island', 'order': 1, 'type': 'dialogue', 'requires': ['vocab-1', 'grammar-1'], 'title': '在餐廳點餐', 'titleEn': 'Ordering Food', 'minutes': 12,
    'summary': '學會點餐、點飲料、內用外帶和結帳。',
    'steps': [
        {'kind': 'concept', 'title': '這一課學什麼', 'body': [
            '出國旅遊、在餐廳吃飯，最常用到的就是點餐英文。',
            '這一課先聽一段完整的點餐對話，再學 4 個最常用的句子。',
            '每一句都可以按 ▶ 聽，跟著唸幾次效果最好。']},
        dialogue(L, '場景：在一家咖啡餐廳', [
            ('店員', W, 'left', 'Hi! Are you ready to order?', '你好！準備好點餐了嗎？'),
            ('你', M, 'right', 'Yes. Can I have a chicken sandwich, please?', '好的，可以給我一份雞肉三明治嗎？'),
            ('店員', W, 'left', 'Sure. Anything to drink?', '好的。要喝點什麼嗎？'),
            ('你', M, 'right', 'An iced tea, please.', '一杯冰茶，謝謝。'),
            ('店員', W, 'left', 'For here or to go?', '內用還是外帶？'),
            ('你', M, 'right', 'For here, please.', '內用，謝謝。'),
            ('店員', W, 'left', "Okay. That's eight dollars.", '好的，一共八美元。')]),
        phrases(L, [
            ('Can I have a sandwich, please?', '可以給我一份三明治嗎？（點餐萬用句）', 'Can'),
            ('Anything to drink?', '要喝點什麼嗎？', 'drink'),
            ('For here or to go?', '內用還是外帶？', 'here'),
            ('Can I get the check, please?', '可以幫我結帳嗎？', 'check')]),
        {'kind': 'practice', 'title': '互動練習', 'intro': '選出最適合的說法。有 ▶ 的題目要先聽。',
         'questions': [
             lq(L, 'l1-togo-a', 'l1-togo', '店員這樣問，你想外帶，要怎麼回答？', ['To go, please.', 'Yes, I am.', 'Eight dollars.'], 'To go, please.',
                'For here or to go? 是問內用還是外帶。內用回答 For here，外帶回答 To go。', sentence='For here or to go?'),
             lq(L, 'l1-drink-a', 'l1-drink', '店員這樣問，哪一個回答最適合？', ['A sandwich, please.', 'A coffee, please.', 'To go, please.'], 'A coffee, please.',
                'Anything to drink? 是問要喝什麼，要回答飲料。sandwich 是吃的。', sentence='Anything to drink?'),
             lq(L, 'l1-order-a', 'l1-order', '你想點一杯咖啡，要怎麼說？', ['Can I have a coffee, please?', 'Can I have coffee to me?', 'I am a coffee.'], 'Can I have a coffee, please?',
                '點餐萬用句：Can I have ＋ 餐點, please?'),
             lq(L, 'l1-check-a', 'l1-check', '吃完了想結帳，要怎麼說？', ['Can I get the menu, please?', 'Can I get the check, please?', 'Are you ready to order?'], 'Can I get the check, please?',
                '結帳是 the check；menu 是菜單。'),
             lq(L, 'l1-price-a', 'l1-price', '聽音檔：店員說多少錢？', ['8 美元', '18 美元', '80 美元'], '8 美元',
                "That's eight dollars. 是 8 美元。eighteen 是 18，eighty 是 80。", audio_text="That's eight dollars.")],
         'similar': [
             lq(L, 'l1-togo-b', 'l1-togo', '聽音檔：店員問了什麼？哪一個回答最適合？', ['Yes. Can I have a salad, please?', 'For here, please.', "It's eight dollars."], 'Yes. Can I have a salad, please?',
                '店員問 Are you ready to order?（準備好點餐了嗎？），所以要回答 Yes 並點餐。', audio_text='Are you ready to order?'),
             lq(L, 'l1-drink-b', 'l1-drink', '聽音檔：哪一個回答最適合？', ['Orange juice, please.', 'Chicken, please.', 'For here.'], 'Orange juice, please.',
                '店員問 What would you like to drink?（想喝什麼？），要回答飲料：orange juice 柳橙汁。', audio_text='What would you like to drink?'),
             lq(L, 'l1-order-b', 'l1-order', '你想點一份沙拉（salad），要怎麼說？', ['Can you have a salad?', 'Can I have a salad, please?', 'Salad me, please.'], 'Can I have a salad, please?',
                'Can I have ＋ 餐點, please? 是我想要；Can you have 變成問對方。'),
             lq(L, 'l1-check-b', 'l1-check', '聽音檔：這位客人想做什麼？', ['點餐', '看菜單', '結帳'], '結帳',
                'Can I get the check, please? 是請店員結帳。', audio_text='Can I get the check, please?', voice=M),
             lq(L, 'l1-price-b', 'l1-price', '聽音檔：店員說多少錢？', ['50 美元', '15 美元', '5 美元'], '15 美元',
                "That's fifteen dollars. 是 15 美元。fifteen 重音在後面，fifty（50）重音在前面。", audio_text="That's fifteen dollars.")]},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習', 'intro': '排句子、寫寫看。',
         'questions': [
             {'id': 'l1-ord', 'group': 'l1-ord', 'type': 'order', 'prompt': '把單字排成正確的句子', 'zh': '可以給我一杯咖啡嗎？',
              'tokens': ['coffee', 'I', 'a', 'Can', 'have'], 'answer': ['Can', 'I', 'have', 'a', 'coffee'], 'punct': '?', 'explanation': 'Can I have ＋ a coffee？'},
             {'id': 'l1-type', 'group': 'l1-type', 'type': 'type', 'prompt': '「外帶」的英文怎麼說？（兩個字）', 'hint': 't _  g _', 'answer': 'to go', 'explanation': '外帶是 to go；內用是 for here。'}]},
    ]})

L = 'life-2'
lesson({
    'id': L, 'world': 'life-island', 'order': 2, 'type': 'dialogue', 'title': '逛街買東西', 'titleEn': 'Shopping', 'minutes': 12,
    'summary': '學會問價錢、問尺寸、試穿和決定購買。',
    'steps': [
        {'kind': 'concept', 'title': '這一課學什麼', 'body': [
            '買東西時最常用的四句話：多少錢、有沒有別的尺寸、可以試穿嗎、我要買這個。',
            '另外要特別注意數字：13 和 30、14 和 40 聽起來很像，這一課會練習分辨。']},
        dialogue(L, '場景：在服飾店', [
            ('店員', W, 'left', 'Hi, can I help you?', '你好，需要幫忙嗎？'),
            ('你', M, 'right', 'Yes. How much is this jacket?', '是的，這件外套多少錢？'),
            ('店員', W, 'left', "It's forty dollars.", '四十美元。'),
            ('你', M, 'right', 'Do you have it in a smaller size?', '有小一點的尺寸嗎？'),
            ('店員', W, 'left', 'Yes, here you are.', '有的，給你。'),
            ('你', M, 'right', 'Can I try it on?', '我可以試穿嗎？'),
            ('店員', W, 'left', 'Sure. The fitting room is over there.', '當然，試衣間在那邊。'),
            ('你', M, 'right', "It fits well. I'll take it.", '很合身，我要買這件。')]),
        phrases(L, [
            ('How much is this?', '這個多少錢？', 'much'),
            ('Do you have it in a smaller size?', '有小一點的尺寸嗎？', 'size'),
            ('Can I try it on?', '我可以試穿嗎？', 'try'),
            ("I'll take it.", '我要買這個。', 'take')]),
        {'kind': 'practice', 'title': '互動練習', 'intro': '選出最適合的說法。有 ▶ 的題目要先聽。',
         'questions': [
             lq(L, 'l2-price-a', 'l2-price', '你想問價錢，要怎麼說？', ['How many is this?', 'How much is this?', 'What is this money?'], 'How much is this?',
                '問價錢用 How much…？；How many 是問「幾個」。'),
             lq(L, 'l2-try-a', 'l2-try', '你想試穿，要怎麼說？', ['Can I try it on?', 'Can I take it on?', 'Can I try it in?'], 'Can I try it on?', '試穿是 try on，東西放中間：try it on。'),
             lq(L, 'l2-buy-a', 'l2-buy', '決定要買了，要怎麼說？', ["I'll try it.", "I'll help it.", "I'll take it."], "I'll take it.", "I'll take it. 在購物時是「我要買這個」。"),
             lq(L, 'l2-num-a', 'l2-num', '聽音檔：店員說多少錢？', ['14 美元', '40 美元', '4 美元'], '40 美元',
                "It's forty dollars. 是 40。forty 重音在前面，fourteen（14）重音在後面。", audio_text="It's forty dollars."),
             lq(L, 'l2-size-a', 'l2-size', '聽音檔：客人想要什麼？', ['小一點的尺寸', '別的顏色', '便宜一點的'], '小一點的尺寸',
                'Do you have it in a smaller size? 是問有沒有小一點的尺寸。', audio_text='Do you have it in a smaller size?', voice=M)],
         'similar': [
             lq(L, 'l2-price-b', 'l2-price', '聽音檔：客人在問什麼？', ['鞋子的尺寸', '鞋子的價錢', '鞋子的顏色'], '鞋子的價錢',
                'How much are these shoes? 是問鞋子多少錢。', audio_text='How much are these shoes?', voice=M),
             lq(L, 'l2-try-b', 'l2-try', '聽音檔：客人想做什麼？', ['試穿牛仔褲', '買牛仔褲', '退貨'], '試穿牛仔褲',
                'Can I try these jeans on? 是問可以試穿這件牛仔褲嗎。', audio_text='Can I try these jeans on?', voice=M),
             lq(L, 'l2-buy-b', 'l2-buy', '聽音檔：客人最後決定怎麼做？', ['不買了', '買下來', '換尺寸'], '買下來',
                "It fits well. I'll take it. 很合身，我要買。", audio_text="It fits well. I'll take it.", voice=M),
             lq(L, 'l2-num-b', 'l2-num', '聽音檔：店員說多少錢？', ['30 美元', '3 美元', '13 美元'], '13 美元',
                "It's thirteen dollars. 是 13。thirteen 重音在後面，thirty（30）重音在前面。", audio_text="It's thirteen dollars."),
             lq(L, 'l2-size-b', 'l2-size', '你想要大一點的尺寸，要怎麼說？', ['Do you have it in a bigger size?', 'Do you have it in a big money?', 'Are you a bigger size?'], 'Do you have it in a bigger size?',
                '問尺寸：Do you have it in a bigger／smaller size?')]},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習', 'intro': '排句子、寫寫看。',
         'questions': [
             {'id': 'l2-ord', 'group': 'l2-ord', 'type': 'order', 'prompt': '把單字排成正確的句子', 'zh': '這個多少錢？',
              'tokens': ['is', 'How', 'this', 'much'], 'answer': ['How', 'much', 'is', 'this'], 'punct': '?', 'explanation': '問價錢：How much is this?'},
             {'id': 'l2-type', 'group': 'l2-type', 'type': 'type', 'prompt': '「試穿」的片語是 try it ___，空格填什麼？', 'hint': '2 個字母', 'answer': 'on', 'explanation': '試穿：try it on。'}]},
    ]})

L = 'life-3'
lesson({
    'id': L, 'world': 'life-island', 'order': 3, 'type': 'dialogue', 'title': '問路', 'titleEn': 'Asking for Directions', 'minutes': 12,
    'summary': '學會問地點、聽懂左轉右轉和距離。',
    'steps': [
        {'kind': 'concept', 'title': '這一課學什麼', 'body': [
            '在國外迷路時，先說 Excuse me（不好意思），再問 Where is…?（…在哪裡？）。',
            '聽回答時抓三個重點：直走或轉彎、在什麼旁邊、要走多久。']},
        dialogue(L, '場景：在街上', [
            ('你', W, 'left', 'Excuse me. Where is the train station?', '不好意思，請問火車站在哪裡？'),
            ('路人', M, 'right', 'Go straight and turn left at the second corner.', '直走，在第二個路口左轉。'),
            ('你', W, 'left', 'Is it far from here?', '離這裡遠嗎？'),
            ('路人', M, 'right', "No. It's about five minutes on foot.", '不遠，走路大約五分鐘。'),
            ('你', W, 'left', 'Is it next to the bank?', '在銀行旁邊嗎？'),
            ('路人', M, 'right', "Yes, it's right next to the bank.", '對，就在銀行旁邊。'),
            ('你', W, 'left', 'Thank you so much!', '非常謝謝你！')]),
        phrases(L, [
            ('Excuse me. Where is the station?', '不好意思，車站在哪裡？', 'Where'),
            ('Go straight.', '直走。', 'straight'),
            ('Turn left at the corner.', '在路口左轉。', 'left'),
            ("It's next to the bank.", '在銀行旁邊。', 'next')]),
        {'kind': 'practice', 'title': '互動練習', 'intro': '選出最適合的答案。有 ▶ 的題目要先聽。',
         'questions': [
             lq(L, 'l3-where-a', 'l3-where', '你想問廁所在哪裡，要怎麼說？', ['Excuse me. What is the restroom?', 'Excuse me. Where is the restroom?', 'Excuse me. When is the restroom?'], 'Excuse me. Where is the restroom?',
                '問地點用 Where。restroom 是公共廁所。'),
             lq(L, 'l3-left-a', 'l3-left', '聽音檔：對方要你怎麼走？', ['在路口左轉', '在路口右轉', '一直直走'], '在路口左轉',
                'Turn left at the corner. 在路口左轉。', audio_text='Turn left at the corner.', voice=M),
             lq(L, 'l3-straight-a', 'l3-straight', '「直走」的英文是？', ['Go street.', 'Go strong.', 'Go straight.'], 'Go straight.', '直走是 go straight；street 是街道。'),
             lq(L, 'l3-far-a', 'l3-far', '聽音檔：走路要多久？', ['大約 5 分鐘', '大約 15 分鐘', '大約 50 分鐘'], '大約 5 分鐘',
                "It's about five minutes on foot. on foot 是走路。", audio_text="It's about five minutes on foot.", voice=M),
             lq(L, 'l3-next-a', 'l3-next', '聽音檔：書店在哪裡？', ['在銀行旁邊', '在銀行對面', '在銀行樓上'], '在銀行旁邊',
                "The bookstore is next to the bank. next to 是在…旁邊。", audio_text='The bookstore is next to the bank.', voice=M)],
         'similar': [
             lq(L, 'l3-where-b', 'l3-where', '你想問博物館在哪裡，要怎麼說？', ['Who is the museum?', 'How is the museum?', 'Where is the museum?'], 'Where is the museum?', '問地點用 Where。'),
             lq(L, 'l3-left-b', 'l3-left', '聽音檔：對方要你怎麼走？', ['在銀行左轉', '在銀行右轉', '在銀行停下來'], '在銀行右轉',
                'Turn right at the bank. 在銀行右轉。', audio_text='Turn right at the bank.', voice=M),
             lq(L, 'l3-straight-b', 'l3-straight', '聽音檔：對方要你怎麼走？', ['直走兩個街區', '走兩分鐘', '左轉兩次'], '直走兩個街區',
                'Go straight for two blocks. block 是街區。', audio_text='Go straight for two blocks.', voice=M),
             lq(L, 'l3-far-b', 'l3-far', '聽音檔：到那裡要多久？', ['走路大約 10 分鐘', '搭公車大約 10 分鐘', '搭公車大約 2 分鐘'], '搭公車大約 10 分鐘',
                "It's about ten minutes by bus. by bus 是搭公車。", audio_text="It's about ten minutes by bus.", voice=M),
             lq(L, 'l3-next-b', 'l3-next', '「在郵局旁邊」的英文是？', ["It's next to the post office.", "It's next the post office.", "It's next on the post office."], "It's next to the post office.",
                '在…旁邊是 next to，to 不能省略。')]},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習', 'intro': '排句子、寫寫看。',
         'questions': [
             {'id': 'l3-ord', 'group': 'l3-ord', 'type': 'order', 'prompt': '把單字排成正確的句子', 'zh': '車站在哪裡？',
              'tokens': ['the', 'Where', 'station', 'is'], 'answer': ['Where', 'is', 'the', 'station'], 'punct': '?', 'explanation': '問地點：Where is the station?'},
             {'id': 'l3-type', 'group': 'l3-type', 'type': 'type', 'prompt': '「右轉」的英文是 turn ___，空格填什麼？', 'hint': 'r 開頭，5 個字母', 'answer': 'right', 'explanation': '右轉 turn right，左轉 turn left。'}]},
    ]})

# ================================================================ 聽讀學院（短文）
def passage(lid, key, title, en, zh, notes, voice=W, audio_text=None):
    return {'kind': 'passage', 'title': title, 'en': en, 'zh': zh, 'notes': [{'en': a, 'zh': b} for a, b in notes],
            'audio': say(f'assets/audio/lessons/{lid}/{key}.mp3', audio_text or en.replace('\n', ' '), voice)}

L = 'read-1'
lesson({
    'id': L, 'world': 'listen-academy', 'order': 1, 'type': 'reading', 'requires': ['vocab-1', 'grammar-1'], 'title': 'Amy 的一天', 'titleEn': "Amy's Day", 'minutes': 12,
    'summary': '先聽後讀一篇短文，練習抓重點。',
    'steps': [
        {'kind': 'concept', 'title': '怎麼練習', 'body': [
            '這一課練習「聽」和「讀」同一篇短文。',
            '建議順序：先按 ▶ 聽一次，不看中文；再讀一次英文；最後才看中文確認。',
            '短文用的都是現在簡單式，說每天的習慣。主詞是 she 時，動詞要加 s：she gets、she drinks。']},
        passage(L, 'passage', '短文：Amy 的一天',
                'Amy is an office worker in Taipei. She gets up at seven every morning. She drinks a cup of coffee and eats some bread for breakfast. Then she takes the bus to work. Amy works from nine to six. After work, she goes to the gym. She goes to bed at eleven.',
                'Amy 是台北的上班族。她每天早上七點起床。她早餐喝一杯咖啡、吃一些麵包。然後她搭公車去上班。Amy 從九點工作到六點。下班後，她去健身房。她十一點睡覺。',
                [('get up', '起床'), ('take the bus', '搭公車'), ('after work', '下班後'), ('gym', '健身房'), ('go to bed', '去睡覺')]),
        {'kind': 'practice', 'title': '閱讀理解', 'intro': '可以回上一步重看短文。',
         'questions': [
             q('r1-up-a', 'r1-time', 'Amy 每天幾點起床？', ['7 點', '9 點', '11 點'], '7 點', 'She gets up at seven every morning. 她每天七點起床。', sentence='What time does Amy get up?'),
             q('r1-bus-a', 'r1-how', 'Amy 怎麼去上班？', ['By train.', 'By bus.', 'On foot.'], 'By bus.', 'Then she takes the bus to work. 她搭公車上班。', sentence='How does Amy go to work?'),
             q('r1-gym-a', 'r1-after', 'Amy 下班後做什麼？', ['She goes to bed.', 'She drinks coffee.', 'She goes to the gym.'], 'She goes to the gym.', 'After work, she goes to the gym. 下班後去健身房。', sentence='What does Amy do after work?'),
             q('r1-gram-a', 'r1-gram', '選出正確的動詞', ['drink', 'drinks', 'drinking'], 'drinks', '主詞 she，現在簡單式動詞要加 s：drinks。', sentence='She ___ a cup of coffee every morning.', zh='她每天早上喝一杯咖啡。')],
         'similar': [
             q('r1-up-b', 'r1-time', 'Amy 幾點睡覺？', ['6 點', '11 點', '7 點'], '11 點', 'She goes to bed at eleven. 她十一點睡覺。', sentence='What time does Amy go to bed?'),
             q('r1-bus-b', 'r1-how', 'Amy 早餐吃什麼？', ['An egg.', 'A banana.', 'Bread.'], 'Bread.', 'She eats some bread for breakfast. 早餐吃麵包。', sentence='What does Amy eat for breakfast?'),
             q('r1-gym-b', 'r1-after', 'Amy 工作到幾點？', ['6 點', '9 點', '7 點'], '6 點', 'Amy works from nine to six. 從九點工作到六點。', sentence='When does Amy finish work?'),
             q('r1-gram-b', 'r1-gram', '選出正確的動詞', ['take', 'taking', 'takes'], 'takes', '主詞 she，動詞加 s：takes。', sentence='She ___ the bus to work.', zh='她搭公車去上班。')]},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習：聽力', 'intro': '聽音檔，選出正確的中文。',
         'questions': [
             q('r1-l1', 'r1-l1', '聽音檔，選出正確的中文', ['她下班後去睡覺。', '她下班後去健身房。', '她上班前去健身房。'], '她下班後去健身房。',
               'She goes to the gym after work. after work 是下班後。', audio=say(f'assets/audio/lessons/{L}/l1.mp3', 'She goes to the gym after work.', W)),
             q('r1-l2', 'r1-l2', '聽音檔，選出正確的中文', ['他每天六點起床。', '他每天七點起床。', '他每天六點睡覺。'], '他每天六點起床。',
               'He gets up at six every day. get up 是起床。', audio=say(f'assets/audio/lessons/{L}/l2.mp3', 'He gets up at six every day.', M))]},
    ]})

L = 'read-2'
lesson({
    'id': L, 'world': 'listen-academy', 'order': 2, 'type': 'reading', 'title': '公告與通知', 'titleEn': 'Notices', 'minutes': 12,
    'summary': '看懂公告：什麼事、什麼時候、在哪裡。',
    'steps': [
        {'kind': 'concept', 'title': '怎麼讀公告', 'body': [
            '生活和工作中常看到英文公告：設施關閉、活動通知、時間變更。',
            '讀公告的秘訣：先找「什麼事」、「什麼時候」、「在哪裡」，不需要每個字都看懂。',
            '這一課有兩篇短公告，都可以先聽再讀。']},
        passage(L, 'notice1', '公告一：游泳池',
                'NOTICE\nThe swimming pool will be closed for cleaning from Monday, June 3, to Wednesday, June 5. It will open again on Thursday at 8 a.m. We are sorry for any trouble.',
                '公告\n游泳池將於 6 月 3 日（星期一）至 6 月 5 日（星期三）關閉清潔，星期四早上 8 點重新開放。造成不便，敬請見諒。',
                [('be closed', '關閉'), ('cleaning', '清潔'), ('open again', '重新開放'), ('trouble', '麻煩、不便')],
                audio_text='Notice. The swimming pool will be closed for cleaning from Monday, June third, to Wednesday, June fifth. It will open again on Thursday at eight a.m. We are sorry for any trouble.'),
        passage(L, 'notice2', '公告二：圖書館特賣',
                'Dear Members,\nOur library is having a book sale this Saturday from 10 a.m. to 4 p.m. All books are only two dollars. Please come and bring your friends!\nCity Library',
                '親愛的會員：\n本館這個星期六上午 10 點到下午 4 點舉辦書籍特賣，所有書都只要 2 美元。歡迎帶朋友一起來！\n市立圖書館',
                [('member', '會員'), ('book sale', '書籍特賣'), ('bring', '帶來')], voice=M,
                audio_text='Dear Members, our library is having a book sale this Saturday from ten a.m. to four p.m. All books are only two dollars. Please come and bring your friends! City Library.'),
        {'kind': 'practice', 'title': '閱讀理解', 'intro': '可以回上一步重看公告。',
         'questions': [
             q('r2-why-a', 'r2-why', '游泳池為什麼關閉？', ['修理', '清潔', '放假'], '清潔', 'closed for cleaning：因為清潔而關閉。', sentence='Why will the pool be closed?'),
             q('r2-day-a', 'r2-day', '特賣會在哪一天？', ['星期六', '星期日', '星期五'], '星期六', 'a book sale this Saturday：這個星期六。', sentence='When is the book sale?'),
             q('r2-price-a', 'r2-price', '每本書多少錢？', ['10 美元', '2 美元', '4 美元'], '2 美元', 'All books are only two dollars. 每本都只要 2 美元。', sentence='How much is each book?'),
             q('r2-time-a', 'r2-time', '特賣會幾點結束？', ['上午 10 點', '下午 2 點', '下午 4 點'], '下午 4 點', 'from 10 a.m. to 4 p.m.：從上午 10 點到下午 4 點。', sentence='What time does the sale end?')],
         'similar': [
             q('r2-why-b', 'r2-why', '游泳池哪一天重新開放？', ['星期一', '星期四', '星期三'], '星期四', 'It will open again on Thursday. 星期四重新開放。', sentence='When will the pool open again?'),
             q('r2-day-b', 'r2-day', '游泳池從哪一天開始關閉？', ['6 月 3 日', '6 月 5 日', '6 月 8 日'], '6 月 3 日', 'from Monday, June 3：從 6 月 3 日開始。', sentence='When does the closing start?'),
             q('r2-price-b', 'r2-price', '這則圖書館公告是寫給誰的？', ['會員', '員工', '作家'], '會員', 'Dear Members：寫給會員。', sentence='Who is the notice for?'),
             q('r2-time-b', 'r2-time', '游泳池重新開放的時間是？', ['晚上 8 點', '早上 10 點', '早上 8 點'], '早上 8 點', 'on Thursday at 8 a.m.：星期四早上 8 點。', sentence='What time will the pool open?')]},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習：聽力', 'intro': '聽音檔，回答問題。',
         'questions': [
             q('r2-l1', 'r2-l1', '聽音檔：博物館什麼時候休館？', ['星期日', '星期一', '每天'], '星期一',
               'The museum will be closed on Monday. 博物館星期一休館。', audio=say(f'assets/audio/lessons/{L}/l1.mp3', 'The museum will be closed on Monday.', M)),
             q('r2-l2', 'r2-l2', '聽音檔：會議幾點開始？', ['2:30', '3:30', '2:13'], '2:30',
               'The meeting will start at two thirty. two thirty 是 2 點 30 分。', audio=say(f'assets/audio/lessons/{L}/l2.mp3', 'The meeting will start at two thirty.', W))]},
    ]})

# ================================================================ 商務城市
def wq(id, group, wordId, prompt, options, answer, expl, **kw):
    return q(id, group, prompt, options, answer, expl, wordId=wordId, **kw)
lesson({
    'id': 'biz-1', 'world': 'business-city', 'order': 1, 'type': 'vocab', 'requires': ['vocab-2', 'grammar-2'], 'title': '辦公室常用字', 'titleEn': 'Office Words', 'minutes': 10,
    'summary': '8 個職場和多益最常出現的單字。',
    'steps': [
        {'kind': 'concept', 'title': '這一課要學什麼', 'body': [
            '多益的題目大多是職場情境：開會、寄 email、交報告、看行程表。',
            '這一課的 8 個單字在多益裡出現的頻率非常高，學會了讀題目會輕鬆很多。']},
        {'kind': 'words', 'title': '認識單字', 'wordIds': ['computer', 'printer', 'desk', 'meeting', 'email', 'manager', 'report', 'schedule']},
        {'kind': 'practice', 'title': '互動練習', 'intro': '看圖或看字，選出正確答案。',
         'questions': [
             wq('b1-computer-a', 'computer', 'computer', '這是什麼？', ['printer', 'computer', 'desk'], 'computer', 'computer /kəmˈpjutər/ 是電腦，重音在中間。', image='computer'),
             wq('b1-printer-a', 'printer', 'printer', 'printer 的中文是？', ['印表機', '電腦', '報告'], '印表機', 'printer 是印表機，print 是列印。', sentence='printer'),
             wq('b1-meeting-a', 'meeting', 'meeting', '選出適合填入空格的單字', ['report', 'meeting', 'printer'], 'meeting', '「開會」：have a meeting。', sentence='We have a ___ at ten.', zh='我們十點有一場會議。'),
             wq('b1-email-a', 'email', 'email', '這是什麼？', ['email', 'schedule', 'report'], 'email', 'email 是電子郵件。', image='email'),
             wq('b1-manager-a', 'manager', 'manager', 'manager 的中文是？', ['員工', '客戶', '經理'], '經理', 'manager /ˈmænɪdʒər/ 是經理。', sentence='manager'),
             wq('b1-report-a', 'report', 'report', '選出適合填入空格的單字', ['desk', 'email', 'report'], 'report', '「完成報告」：finish the report。', sentence='Please finish the ___ by Friday.', zh='請在星期五前完成報告。'),
             wq('b1-schedule-a', 'schedule', 'schedule', '這是什麼？', ['schedule', 'computer', 'manager'], 'schedule', 'schedule 是行程表、時間表。', image='schedule'),
             wq('b1-desk-a', 'desk', 'desk', 'desk 的中文是？', ['書桌；辦公桌', '椅子', '會議'], '書桌；辦公桌', 'desk 是書桌、辦公桌。', sentence='desk')],
         'similar': [
             wq('b1-computer-b', 'computer', 'computer', '「電腦」的英文是？', ['printer', 'manager', 'computer'], 'computer', '電腦是 computer。'),
             wq('b1-printer-b', 'printer', 'printer', '這是什麼？', ['printer', 'desk', 'email'], 'printer', '這是 printer（印表機）。', image='printer'),
             wq('b1-meeting-b', 'meeting', 'meeting', '這是什麼？', ['report', 'meeting', 'schedule'], 'meeting', '一群人圍著桌子討論是 meeting（會議）。', image='meeting'),
             wq('b1-email-b', 'email', 'email', '選出適合填入空格的單字', ['email', 'desk', 'printer'], 'email', '「寄電子郵件」：send an email。', sentence='I will send you an ___.', zh='我會寄一封電子郵件給你。'),
             wq('b1-manager-b', 'manager', 'manager', '這是什麼？', ['computer', 'manager', 'meeting'], 'manager', '打領帶的主管：manager（經理）。', image='manager'),
             wq('b1-report-b', 'report', 'report', '這是什麼？', ['report', 'email', 'schedule'], 'report', '有圖表的文件：report（報告）。', image='report'),
             wq('b1-schedule-b', 'schedule', 'schedule', 'schedule 的中文是？', ['報告', '行程表；時間表', '電子郵件'], '行程表；時間表', 'schedule 是行程表、時間表。', sentence='schedule'),
             wq('b1-desk-b', 'desk', 'desk', '這是什麼？', ['desk', 'printer', 'computer'], 'desk', '這是 desk（辦公桌）。', image='desk')]},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習：拼拼看', 'intro': '看中文，輸入英文單字。',
         'questions': [
             {'id': 'b1-sp-desk', 'group': 'b1-sp-desk', 'wordId': 'desk', 'type': 'type', 'prompt': '「辦公桌」的英文怎麼拼？', 'hint': 'd _ _ _（4 個字母）', 'answer': 'desk', 'explanation': 'desk：d-e-s-k。'},
             {'id': 'b1-sp-email', 'group': 'b1-sp-email', 'wordId': 'email', 'type': 'type', 'prompt': '「電子郵件」的英文怎麼拼？', 'hint': 'e _ _ _ _（5 個字母）', 'answer': 'email', 'accept': ['e-mail'], 'explanation': 'email：e-m-a-i-l，也可以寫成 e-mail。'}]},
    ]})

L = 'biz-2'
lesson({
    'id': L, 'world': 'business-city', 'order': 2, 'type': 'reading', 'title': '商務 Email 入門', 'titleEn': 'Business Email', 'minutes': 12,
    'summary': '看懂商務 email 的固定格式和常用句。',
    'steps': [
        {'kind': 'concept', 'title': '商務 email 的格式', 'body': [
            '多益和工作上最常讀到的就是 email。',
            '商務 email 有固定格式：稱呼、目的、請求、結尾。學會幾個固定句子，就能看懂大部分的 email。']},
        {'kind': 'explain', 'title': '固定句型', 'body': ['這些句子幾乎每封商務 email 都會出現：'],
         'table': {'head': ['部分', '常見寫法', '中文'], 'rows': [
             ['稱呼', 'Dear Ms. Chen,', '親愛的陳小姐'],
             ['目的', 'I am writing to ask about...', '我寫信是想詢問…'],
             ['請求', 'Could you please...?', '可以請您…嗎？'],
             ['感謝', 'Thank you for your help.', '謝謝您的幫忙。'],
             ['結尾', 'Best regards,', '敬上']]},
         'tip': 'Ms. 用在女性（不管已婚未婚），Mr. 用在男性。'},
        passage(L, 'email', 'Email 範例',
                'Dear Ms. Chen,\nI am writing to ask about the meeting next week. Could you please send me the schedule? I would also like to know the room number.\nThank you for your help.\nBest regards,\nKevin Lin',
                '親愛的陳小姐：\n我寫信是想詢問下週的會議。可以請您寄行程表給我嗎？我也想知道會議室的號碼。\n謝謝您的幫忙。\n敬上\nKevin Lin',
                [('I am writing to', '我寫信是為了'), ('Could you please', '可以請您'), ('I would like to know', '我想知道'), ('Best regards', '敬上')], voice=M),
        {'kind': 'practice', 'title': '互動練習', 'intro': '可以回上一步重看 email。',
         'questions': [
             q('b2-purpose-a', 'b2-purpose', 'Kevin 寫信的目的是什麼？', ['取消會議', '詢問下週的會議', '邀請陳小姐吃飯'], '詢問下週的會議', 'I am writing to ask about the meeting next week. 寫信詢問下週的會議。'),
             q('b2-dear-a', 'b2-dear', 'email 開頭稱呼女性主管陳小姐，要怎麼寫？', ['Dear Ms. Chen,', 'Hi Chen girl,', 'To Chen Ms.,'], 'Dear Ms. Chen,', '正式稱呼：Dear ＋ Ms./Mr. ＋ 姓氏。'),
             q('b2-request-a', 'b2-request', '禮貌地請對方寄檔案，哪一句最好？', ['Send me file now.', 'You send file?', 'Could you please send me the file?'], 'Could you please send me the file?', 'Could you please…? 是最常用的禮貌請求。'),
             q('b2-to-a', 'b2-to', '選出適合填入空格的字', ['to', 'for', 'at'], 'to', 'I am writing to ＋ 動詞原形：寫信是為了做某事。', sentence='I am writing ___ ask about your prices.', zh='我寫信是想詢問貴公司的價格。')],
         'similar': [
             q('b2-purpose-b', 'b2-purpose', 'Kevin 請陳小姐寄什麼？', ['報告', '會議室鑰匙', '行程表'], '行程表', 'Could you please send me the schedule? 請寄行程表。'),
             q('b2-dear-b', 'b2-dear', 'email 結尾的「敬上」常寫成？', ['See you,', 'Best regards,', 'Hello,'], 'Best regards,', '正式結尾：Best regards,'),
             q('b2-request-b', 'b2-request', 'Kevin 還想知道什麼？', ['會議室號碼', '會議的價格', '陳小姐的電話'], '會議室號碼', 'I would also like to know the room number. 也想知道會議室號碼。'),
             q('b2-to-b', 'b2-to', '選出適合填入空格的字', ['thanks', 'thank', 'thanking'], 'thank', 'Thank you for ＋ 名詞：謝謝你的…。', sentence='___ you for your help.', zh='謝謝您的幫忙。')]},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習', 'intro': '排出禮貌的請求句。',
         'questions': [
             {'id': 'b2-ord', 'group': 'b2-ord', 'type': 'order', 'prompt': '把單字排成正確的句子', 'zh': '可以請您寄給我嗎？',
              'tokens': ['send', 'you', 'please', 'it', 'Could'], 'answer': ['Could', 'you', 'please', 'send', 'it'], 'punct': '?', 'explanation': 'Could you please ＋ 動詞原形？'}]},
    ]})

# ================================================================ 多益訓練營
def p1_item(id, group, scene, statements, answer_letter, zh_list):
    letters = ['A', 'B', 'C', 'D']
    segs = [(M, f'{l}. {s}') for l, s in zip(letters, statements)]
    path = multi(f'assets/audio/toeic/{id}.mp3', segs)
    transcript = '　'.join(f'({l}) {s}（{z}）' for l, s, z in zip(letters, statements, zh_list))
    ans = statements[letters.index(answer_letter)]
    return q(id, group, '看照片，聽 4 個句子，選出最符合照片的描述', letters, answer_letter,
             f'正確答案 ({answer_letter}) {ans}\n逐字稿：{transcript}', scene=f'assets/img/scenes/{scene}.svg', audio=path, audioLabel='▶ 播放 4 個句子')

def p2_item(id, group, question, opts, answer_letter, zh_q, zh_opts, explain):
    letters = ['A', 'B', 'C']
    segs = [(M, question)] + [(W, f'{l}. {o}') for l, o in zip(letters, opts)]
    path = multi(f'assets/audio/toeic/{id}.mp3', segs)
    transcript = f'{question}（{zh_q}）　' + '　'.join(f'({l}) {o}（{z}）' for l, o, z in zip(letters, opts, zh_opts))
    return q(id, group, '聽問題和 3 個回答，選出最適合的回答', letters, answer_letter,
             f'{explain}\n逐字稿：{transcript}', audio=path, audioLabel='▶ 播放題目與選項')

lesson({
    'id': 'toeic-p1', 'world': 'toeic-camp', 'order': 1, 'type': 'toeic-listen', 'title': 'Part 1 照片描述', 'titleEn': 'Photographs', 'minutes': 12,
    'requires': ['grammar-1', 'grammar-2', 'grammar-3'],
    'summary': '看照片、聽四個句子，選出正確的描述。',
    'steps': [
        {'kind': 'concept', 'title': 'Part 1 是什麼', 'body': [
            'Part 1 會給你一張照片，播放 4 個英文句子，選出最符合照片的一句。考試時句子不會印出來，只能用聽的。',
            '解題重點：先看照片有哪些「東西」、在「哪裡」，再注意位置的說法：on、under、next to。']},
        {'kind': 'explain', 'title': '位置的說法', 'body': ['Part 1 最常考東西在哪裡：'],
         'table': {'head': ['說法', '意思', '例句'], 'rows': [
             ['on', '在…上面', 'A laptop is on the desk.'],
             ['under', '在…下面', 'A bag is under the chair.'],
             ['next to', '在…旁邊', 'A plant is next to the laptop.'],
             ['on the wall', '在牆上', 'A clock is on the wall.']]},
         'tip': '句子裡提到照片中「沒有」的人或東西，就可以直接刪掉。'},
        {'kind': 'examples', 'title': '聽聽看', 'items': [
            {'en': s, 'zh': z, 'highlight': h, 'audio': say(f'assets/audio/toeic/p1-ex{i + 1}.mp3', s, M if i % 2 else W)}
            for i, (s, z, h) in enumerate([('A laptop is on the desk.', '筆電在桌上。', 'on'), ('A bag is under the chair.', '包包在椅子下面。', 'under'),
                                            ('A plant is next to the laptop.', '植物在筆電旁邊。', 'next'), ('A clock is on the wall.', '時鐘在牆上。', 'wall')])]},
        {'kind': 'practice', 'title': '模擬練習', 'intro': '先看照片，再按 ▶ 聽 4 個句子。',
         'questions': [
             p1_item('p1-desk-a', 'p1-desk', 'desk', ['A laptop is on the desk.', 'A man is using a phone.', 'The desk is empty.', 'A cat is sleeping.'], 'A',
                     ['筆電在桌上', '一名男子在用手機', '桌上是空的', '一隻貓在睡覺']),
             p1_item('p1-shelf-a', 'p1-shelf', 'shelf', ['The shelf is empty.', 'Some books are on the shelf.', 'A clock is on the floor.', 'A woman is reading.'], 'B',
                     ['書架是空的', '書架上有一些書', '時鐘在地上', '一名女子在看書']),
             p1_item('p1-room-a', 'p1-room', 'meeting-room', ['The chairs are stacked.', 'A man is drawing on the whiteboard.', 'Some cups are on the table.', 'The room is full of people.'], 'C',
                     ['椅子疊起來了', '一名男子在白板上畫畫', '桌上有一些杯子', '房間裡擠滿了人']),
             p1_item('p1-park-a', 'p1-park', 'park', ['A car is on the road.', 'People are sitting on the bench.', 'The tree has no leaves.', 'A bicycle is parked next to a tree.'], 'D',
                     ['路上有一輛車', '有人坐在長椅上', '樹沒有葉子', '一輛腳踏車停在樹旁邊'])],
         'similar': [
             p1_item('p1-desk-b', 'p1-desk', 'desk', ['The chair is on the desk.', 'A plant is next to the laptop.', 'The laptop is closed.', 'A lamp is on the floor.'], 'B',
                     ['椅子在桌上', '植物在筆電旁邊', '筆電是關著的', '檯燈在地上']),
             p1_item('p1-shelf-b', 'p1-shelf', 'shelf', ['A clock is on the wall.', 'The books are on the floor.', 'A man is carrying boxes.', 'The window is open.'], 'A',
                     ['時鐘在牆上', '書在地上', '一名男子在搬箱子', '窗戶是開著的']),
             p1_item('p1-room-b', 'p1-room', 'meeting-room', ['Two people are talking.', 'The cups are broken.', 'The whiteboard is on the floor.', 'Nobody is in the room.'], 'D',
                     ['兩個人在說話', '杯子破了', '白板在地上', '房間裡沒有人']),
             p1_item('p1-park-b', 'p1-park', 'park', ['A man is riding a bicycle.', 'A bench is near the tree.', 'It is raining.', 'The bicycle is on the bench.'], 'B',
                     ['一名男子在騎腳踏車', '長椅在樹附近', '正在下雨', '腳踏車在長椅上'])]},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習：聽位置', 'intro': '聽音檔，選出正確的中文。',
         'questions': [
             q('p1-ext-1', 'p1-ext-1', '聽音檔，選出正確的意思', ['電腦上面有一盆植物', '電腦旁邊有一盆植物', '電腦下面有一盆植物'], '電腦旁邊有一盆植物',
               'A plant is next to the computer. next to 是在…旁邊。', audio=say('assets/audio/toeic/p1-ext1.mp3', 'A plant is next to the computer.', M)),
             q('p1-ext-2', 'p1-ext-2', '聽音檔，選出正確的意思', ['椅子下面有一個包包', '椅子上面有一個包包', '椅子旁邊有一個包包'], '椅子下面有一個包包',
               'A bag is under the chair. under 是在…下面。', audio=say('assets/audio/toeic/p1-ext2.mp3', 'A bag is under the chair.', W))]},
    ]})

lesson({
    'id': 'toeic-p2', 'world': 'toeic-camp', 'order': 2, 'type': 'toeic-listen', 'title': 'Part 2 應答問題', 'titleEn': 'Question-Response', 'minutes': 12,
    'summary': '聽懂疑問詞，選出合理的回答。',
    'steps': [
        {'kind': 'concept', 'title': 'Part 2 是什麼', 'body': [
            'Part 2 會聽到一個問題或句子，接著聽 3 個回答，選出最適合的回答。題目和選項都不會印出來。',
            '最重要的是聽清楚開頭的疑問詞：Where 問地點、When 問時間、Who 問人、How 問方式或狀況。']},
        {'kind': 'explain', 'title': '疑問詞對應的答案', 'body': ['先抓開頭的字，就能刪掉大部分的錯誤選項：'],
         'table': {'head': ['疑問詞', '問什麼', '合理的回答'], 'rows': [
             ['Where', '地點', 'On the second floor.'],
             ['When', '時間', 'At three o\'clock.'],
             ['Who', '人', 'Mr. Brown did.'],
             ['How', '方式、狀況', 'By bus. ／ It was great.'],
             ['Can／Do／Is…', '是不是、可不可以', 'Sure. ／ Yes, here you are.']]},
         'tip': '陷阱：選項裡出現和題目「發音很像」或「同一個字」的，常常是錯的。'},
        {'kind': 'examples', 'title': '聽聽看', 'items': [
            {'en': f'{a} — {b}', 'zh': z, 'highlight': h, 'audio': multi(f'assets/audio/toeic/p2-ex{i + 1}.mp3', [(M, a), (W, b)])}
            for i, (a, b, z, h) in enumerate([
                ('Where is the meeting room?', "It's on the second floor.", '會議室在哪裡？——在二樓。', 'Where'),
                ('When does the store open?', 'At nine a.m.', '店幾點開？——早上九點。', 'When'),
                ('How do you get to work?', 'I usually take the train.', '你怎麼去上班？——我通常搭火車。', 'How')])]},
        {'kind': 'practice', 'title': '模擬練習', 'intro': '按 ▶ 聽題目和三個選項，再選答案。',
         'questions': [
             p2_item('p2-where-a', 'p2-where', 'Where is the meeting room?', ["It's on the second floor.", 'At two o\'clock.', "Yes, I'll meet him."], 'A',
                     '會議室在哪裡？', ['在二樓', '兩點', '是的，我會跟他見面'], 'Where 問地點，回答「在二樓」最合理。(C) 用發音相近的 meet 當陷阱。'),
             p2_item('p2-when-a', 'p2-when', 'When does the store open?', ["It's next to the bank.", 'At nine a.m.', 'A new store.'], 'B',
                     '這家店幾點開？', ['在銀行旁邊', '早上九點', '一家新店'], 'When 問時間，回答時間「早上九點」。'),
             p2_item('p2-who-a', 'p2-who', 'Who is going to the conference?', ['In Tokyo.', 'Next Monday.', 'Ms. Park is.'], 'C',
                     '誰要去參加研討會？', ['在東京', '下週一', '朴小姐要去'], 'Who 問人，回答人名。(A) 是地點，(B) 是時間。'),
             p2_item('p2-how-a', 'p2-how', 'How do you get to work?', ['I usually take the train.', 'Yes, I work here.', 'At the office.'], 'A',
                     '你怎麼去上班？', ['我通常搭火車', '是的，我在這裡工作', '在辦公室'], 'How 問方式，回答交通方式。'),
             p2_item('p2-yn-a', 'p2-yn', 'Can you send me the report today?', ["It's a long report.", "Sure, I'll do it this afternoon.", 'Yes, he sent it.'], 'B',
                     '你今天可以把報告寄給我嗎？', ['這份報告很長', '當然，我下午就寄', '是的，他寄了'], '請求要回答可以或不行。(C) 主詞是 he 而且是過去式，不合理。')],
         'similar': [
             p2_item('p2-where-b', 'p2-where', 'Where can I buy a ticket?', ['At the counter over there.', 'Ten dollars.', 'Yes, I bought it.'], 'A',
                     '我可以在哪裡買票？', ['在那邊的櫃台', '十美元', '是的，我買了'], 'Where 問地點，回答「在櫃台」。'),
             p2_item('p2-when-b', 'p2-when', 'When will the meeting start?', ['In room three.', "It's a long meeting.", 'At ten thirty.'], 'C',
                     '會議什麼時候開始？', ['在三號會議室', '這是個很長的會議', '十點半'], 'When 問時間，回答「十點半」。'),
             p2_item('p2-who-b', 'p2-who', 'Who wrote this email?', ['Mr. Kim did.', 'Yesterday morning.', 'To the manager.'], 'A',
                     '這封 email 是誰寫的？', ['金先生寫的', '昨天早上', '寄給經理'], 'Who 問人，回答「金先生」。'),
             p2_item('p2-how-b', 'p2-how', 'How was your trip to Japan?', ['By plane.', 'It was great, thanks.', 'Next week.'], 'B',
                     '你的日本之旅怎麼樣？', ['搭飛機', '很棒，謝謝', '下週'], 'How was…? 是問感想，不是問交通方式，所以 (A) 是陷阱。'),
             p2_item('p2-yn-b', 'p2-yn', 'Do you have a pen?', ['Yes, here you are.', 'I have a meeting.', "It's open."], 'A',
                     '你有筆嗎？', ['有，給你', '我有個會議', '它是開著的'], 'Do you have…? 回答 Yes, here you are.（有，給你）。')]},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習：選出問句', 'intro': '看中文，選出正確的英文問句。',
         'questions': [
             q('p2-ext-1', 'p2-ext-1', '「這家店幾點開？」英文怎麼問？', ['Where does the store open?', 'When does the store open?', 'Who does the store open?'], 'When does the store open?', '問時間用 When。'),
             q('p2-ext-2', 'p2-ext-2', '「你怎麼去上班？」英文怎麼問？', ['How do you get to work?', 'Who do you get to work?', 'Where do you get to work?'], 'How do you get to work?', '問方式用 How。')]},
    ]})

def conv_q(id, group, audio, prompt_en, zh, options, answer, expl):
    return q(id, group, zh, options, answer, expl, sentence=prompt_en, audio=audio, audioLabel='▶ 播放對話', audioHint='可以重複播放')

C1 = multi('assets/audio/toeic/p3-conv1.mp3', [
    (W, "Hi, I'd like to return this printer. It doesn't work."),
    (M, "I'm sorry to hear that. Do you have your receipt?"),
    (W, 'Yes, here it is. I bought it last Friday.'),
    (M, 'Okay. Would you like a new one or your money back?'),
    (W, 'A new one, please.')])
C1_T = "W: Hi, I'd like to return this printer. It doesn't work.　M: I'm sorry to hear that. Do you have your receipt?　W: Yes, here it is. I bought it last Friday.　M: Okay. Would you like a new one or your money back?　W: A new one, please."
C2 = multi('assets/audio/toeic/p3-conv2.mp3', [
    (M, 'Good morning, Lisa. Are you ready for the meeting with the client?'),
    (B, "Almost. But the projector in Room A isn't working."),
    (M, "Let's use Room B, then. I'll tell the client."),
    (B, "Great. I'll move our things there now.")])
C2_T = "M: Good morning, Lisa. Are you ready for the meeting with the client?　W: Almost. But the projector in Room A isn't working.　M: Let's use Room B, then. I'll tell the client.　W: Great. I'll move our things there now."
lesson({
    'id': 'toeic-p3', 'world': 'toeic-camp', 'order': 3, 'type': 'toeic-listen', 'title': 'Part 3 簡短對話', 'titleEn': 'Conversations', 'minutes': 15,
    'summary': '聽兩人對話，回答地點、問題和下一步。',
    'steps': [
        {'kind': 'concept', 'title': 'Part 3 是什麼', 'body': [
            'Part 3 會聽一段兩到三人的對話，每段對話有 3 題。考試時題目和選項會印在題本上。',
            '秘訣：聽之前先看題目，知道要聽「在哪裡、什麼問題、接下來做什麼」。']},
        {'kind': 'explain', 'title': '常見問法', 'body': ['這三種問法幾乎每段對話都會出現：'],
         'table': {'head': ['題目', '中文', '要聽什麼'], 'rows': [
             ['Where most likely are the speakers?', '說話者最可能在哪裡？', '關鍵字：receipt → 商店'],
             ['What is the problem?', '發生了什麼問題？', 'doesn\'t work、late、broken'],
             ['What will the woman do next?', '女子接下來會做什麼？', '最後一兩句的 I\'ll…']]},
         'tip': '答案常常是對話內容「換句話說」，例如 doesn\'t work 換成 is broken。'},
        {'kind': 'practice', 'title': '模擬練習', 'intro': '先看題目，再按 ▶ 聽對話。每段對話有 3 題。',
         'questions': [
             conv_q('p3-c1-q1', 'p3-c1-q1', C1, 'Where most likely are the speakers?', '說話者最可能在哪裡？', ['In a store', 'In a restaurant', 'At a train station'], 'In a store',
                    f'退貨（return）、收據（receipt）都表示在商店。\n逐字稿：{C1_T}'),
             conv_q('p3-c1-q2', 'p3-c1-q2', C1, 'What is the problem?', '發生了什麼問題？', ['The receipt is lost.', 'The printer does not work.', 'The store is closed.'], 'The printer does not work.',
                    f"It doesn't work. 印表機壞了。\n逐字稿：{C1_T}"),
             conv_q('p3-c1-q3', 'p3-c1-q3', C1, 'What does the woman want?', '女子想要什麼？', ['Her money back', 'A different color', 'A new printer'], 'A new printer',
                    f'A new one, please. 她要換一台新的。\n逐字稿：{C1_T}'),
             conv_q('p3-c2-q1', 'p3-c2-q1', C2, 'Where most likely do the speakers work?', '說話者最可能在哪裡工作？', ['In an office', 'In a hospital', 'At a restaurant'], 'In an office',
                    f'和客戶（client）開會、會議室，表示在辦公室。\n逐字稿：{C2_T}'),
             conv_q('p3-c2-q2', 'p3-c2-q2', C2, 'What is the problem?', '發生了什麼問題？', ['The client is late.', 'Room B is too small.', 'A projector is not working.'], 'A projector is not working.',
                    f"The projector in Room A isn't working. 投影機壞了。\n逐字稿：{C2_T}"),
             conv_q('p3-c2-q3', 'p3-c2-q3', C2, 'What will the woman do next?', '女子接下來會做什麼？', ['Move things to Room B', 'Call the client', 'Fix the projector'], 'Move things to Room B',
                    f"I'll move our things there now. there 指 Room B。打給客戶的是男子。\n逐字稿：{C2_T}")],
         'similar': []},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習：換句話說', 'intro': '多益很愛換句話說，練習看看。',
         'questions': [
             q('p3-ext-1', 'p3-ext-1', "It doesn't work. 換句話說是哪一句？", ['It is broken.', 'It is new.', 'It is cheap.'], 'It is broken.', "doesn't work（不能用）＝ is broken（壞了）。"),
             q('p3-ext-2', 'p3-ext-2', 'money back 是什麼意思？', ['退款', '找零', '借錢'], '退款', 'get your money back：拿回你的錢，也就是退款。')]},
    ]})

T1_TEXT = 'Attention, passengers. Flight 205 to Tokyo will leave thirty minutes late because of bad weather. The new departure time is 3:30 p.m. Please wait near Gate 12. Thank you.'
T1 = multi('assets/audio/toeic/p4-talk1.mp3', [(W, 'Attention, passengers. Flight two oh five to Tokyo will leave thirty minutes late because of bad weather. The new departure time is three thirty p.m. Please wait near Gate twelve. Thank you.')])
T2_TEXT = "Hi, this is Tom from Green Dental Clinic. I'm calling about your appointment tomorrow at 10 a.m. The doctor is not available in the morning. Could you come at 2 p.m. instead? Please call us back at 555-0123. Thanks."
T2 = multi('assets/audio/toeic/p4-talk2.mp3', [(M, "Hi, this is Tom from Green Dental Clinic. I'm calling about your appointment tomorrow at ten a.m. The doctor is not available in the morning. Could you come at two p.m. instead? Please call us back at five five five, zero one two three. Thanks.")])
def talk_q(id, audio, en, zh, options, answer, expl, label='▶ 播放獨白'):
    return q(id, id, zh, options, answer, expl, sentence=en, audio=audio, audioLabel=label)
lesson({
    'id': 'toeic-p4', 'world': 'toeic-camp', 'order': 4, 'type': 'toeic-listen', 'title': 'Part 4 簡短獨白', 'titleEn': 'Talks', 'minutes': 15,
    'summary': '聽廣播和電話留言，抓時間、地點、原因。',
    'steps': [
        {'kind': 'concept', 'title': 'Part 4 是什麼', 'body': [
            'Part 4 是一個人說話：機場廣播、電話留言、會議宣布等，每段有 3 題，題目印在題本上。',
            '秘訣和 Part 3 一樣：先看題目再聽。特別注意時間、地點、數字和原因（because of…）。']},
        {'kind': 'explain', 'title': '常見的獨白類型', 'body': ['開頭第一句通常就告訴你是哪一種：'],
         'table': {'head': ['類型', '開頭常聽到', '常考'], 'rows': [
             ['廣播', 'Attention, passengers.', '延誤原因、新時間、登機門'],
             ['電話留言', 'Hi, this is… from…', '誰打來、為什麼、要你做什麼'],
             ['導覽、會議', 'Welcome to…／Good morning, everyone.', '說話者身分、行程、注意事項']]},
         'tip': '聽到 because of 後面就是原因；聽到 Could you…? Please… 就是要你做的事。'},
        {'kind': 'practice', 'title': '模擬練習', 'intro': '先看題目，再按 ▶ 聽。每段有 3 題。',
         'questions': [
             talk_q('p4-t1-q1', T1, 'Where is this announcement probably heard?', '這段廣播最可能在哪裡聽到？', ['At an airport', 'On a bus', 'In a hotel'], 'At an airport', f'passengers、flight、gate 都表示在機場。\n逐字稿：{T1_TEXT}', '▶ 播放廣播'),
             talk_q('p4-t1-q2', T1, 'Why will the flight be late?', '班機為什麼會延誤？', ['Because the pilot is sick', 'Because of bad weather', 'Because of a problem with the plane'], 'Because of bad weather', f'because of bad weather：因為天氣不好。\n逐字稿：{T1_TEXT}', '▶ 播放廣播'),
             talk_q('p4-t1-q3', T1, 'What time will the flight leave?', '班機幾點出發？', ['3:00 p.m.', '2:05 p.m.', '3:30 p.m.'], '3:30 p.m.', f'The new departure time is 3:30 p.m. 205 是班機號碼，不是時間。\n逐字稿：{T1_TEXT}', '▶ 播放廣播'),
             talk_q('p4-t2-q1', T2, 'Who is the speaker?', '說話者是誰？', ['A doctor', 'A clinic worker', 'A patient'], 'A clinic worker', f'Tom from Green Dental Clinic，而且他說 The doctor is not available，所以他是診所人員，不是醫生。\n逐字稿：{T2_TEXT}', '▶ 播放留言'),
             talk_q('p4-t2-q2', T2, 'What does the speaker ask the listener to do?', '說話者請聽者做什麼？', ['Come at a different time', 'Cancel the appointment', 'Pay the bill'], 'Come at a different time', f'Could you come at 2 p.m. instead? 請改下午兩點來。\n逐字稿：{T2_TEXT}', '▶ 播放留言'),
             talk_q('p4-t2-q3', T2, 'What time was the original appointment?', '原本約的是幾點？', ['2 p.m.', '10 a.m.', '12 p.m.'], '10 a.m.', f'your appointment tomorrow at 10 a.m. 原本是早上十點，改到下午兩點。\n逐字稿：{T2_TEXT}', '▶ 播放留言')],
         'similar': []},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習：關鍵字', 'intro': '這些字在 Part 4 很常出現。',
         'questions': [
             q('p4-ext-1', 'p4-ext-1', 'departure time 是什麼意思？', ['抵達時間', '出發時間', '休息時間'], '出發時間', 'departure 是出發；arrival 是抵達。'),
             q('p4-ext-2', 'p4-ext-2', 'appointment 是什麼意思？', ['預約', '會議室', '帳單'], '預約', 'appointment 是預約、約診。')]},
    ]})

P6A = "To: All Staff\nSubject: Office Party\n\nOur end-of-year party (1)______ on Friday, December 20, at 6 p.m. It will be in the main meeting room. Food and drinks (2)______ provided. Please tell Jenny in the HR department (3)______ you can come. (4)______ We hope to see you all there!"
P6B = "Dear Customers,\n\nOur store (5)______ closed on Sunday, March 3, for repairs. We will open again on Monday at 9 a.m. During the repairs, you can still (6)______ products on our website. (7)______ Thank you for your understanding."
def p6(id, text, blank, options, answer, expl):
    return q(id, id, f'第 {blank} 個空格要填什麼？', options, answer, expl, text=text)
lesson({
    'id': 'toeic-p6', 'world': 'toeic-camp', 'order': 6, 'type': 'toeic', 'title': 'Part 6 段落填空', 'titleEn': 'Text Completion', 'minutes': 15,
    'summary': '讀 email 和公告，選出空格的字或句子。',
    'steps': [
        {'kind': 'concept', 'title': 'Part 6 是什麼', 'body': [
            'Part 6 是一篇短文（email、公告），挖 4 個空格。有的考文法、有的考單字，還有一題要選一整個句子。',
            '秘訣：不要只看空格那一句，要看前後文。時間（yesterday、next week）會決定用過去式還是未來式。']},
        {'kind': 'explain', 'title': '三種題型', 'body': ['看到選項就知道是哪一種：'],
         'table': {'head': ['題型', '選項長相', '怎麼解'], 'rows': [
             ['文法題', 'will be／was／is', '看主詞和時間'],
             ['連接詞題', 'if／but／so', '看前後兩句的關係'],
             ['句子題', '四個完整句子', '看上下句，選意思接得上的']]},
         'tip': 'Please ＋ 動詞原形；can ＋ 動詞原形，這兩個規則 Part 6 很常考。'},
        {'kind': 'practice', 'title': '模擬練習', 'intro': '每題都會顯示整篇文章，看到第幾個空格就作答那一格。',
         'questions': [
             p6('p6-a1', P6A, 1, ['held', 'will be held', 'holding', 'holds'], 'will be held', '派對在 12 月 20 日，還沒發生，用未來被動 will be held（將被舉辦）。'),
             p6('p6-a2', P6A, 2, ['is', 'was', 'will be', 'being'], 'will be', '食物和飲料「將被提供」：will be provided。'),
             p6('p6-a3', P6A, 3, ['if', 'but', 'so', 'because'], 'if', 'tell Jenny if you can come：告訴 Jenny 你「是否」能來。'),
             p6('p6-a4', P6A, 4, ['The party was a great success.', 'Please reply by December 15.', 'Our office is closed on Sundays.'], 'Please reply by December 15.',
                '前一句請大家回覆能不能來，接「請在 12 月 15 日前回覆」最合理。派對還沒辦，不能說 was a great success。'),
             p6('p6-b1', P6B, 5, ['will be', 'is being', 'was', 'be'], 'will be', '3 月 3 日還沒到，用未來式 will be closed。'),
             p6('p6-b2', P6B, 6, ['orders', 'order', 'ordering', 'ordered'], 'order', 'can 後面接動詞原形：can order（可以訂購）。'),
             p6('p6-b3', P6B, 7, ['Please bring your own bag.', 'We opened the store in 2010.', 'We are sorry for any trouble.'], 'We are sorry for any trouble.',
                '公告關店維修，接著道歉「造成不便很抱歉」，再接 Thank you for your understanding.')],
         'similar': []},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習：關鍵字', 'intro': '公告和 email 常見的字。',
         'questions': [
             q('p6-ext-1', 'p6-ext-1', 'be provided 是什麼意思？', ['被提供', '被購買', '被取消'], '被提供', 'provide 是提供，be provided 是被提供。'),
             q('p6-ext-2', 'p6-ext-2', 'repairs 是什麼意思？', ['搬家', '特價', '維修'], '維修', 'closed for repairs：因為維修而關閉。')]},
    ]})

P7A = "Sunny Café — Now Hiring!\nWe are looking for a part-time server.\n• Hours: Saturday and Sunday, 8 a.m. to 2 p.m.\n• Pay: $15 per hour\n• Experience is helpful but not necessary.\nTo apply, please send your résumé to jobs@sunnycafe.com by April 10."
P7B = "Mike (9:15): Hi Sarah, my train is late. I'll be at the office around 10:00.\nSarah (9:17): No problem. The client meeting is at 10:30, so you have time.\nMike (9:18): Great. Could you print the sales report for me?\nSarah (9:20): Sure. I'll put it on your desk."
def p7(id, text, en, zh, options, answer, expl):
    return q(id, id, zh, options, answer, expl, sentence=en, text=text)
lesson({
    'id': 'toeic-p7', 'world': 'toeic-camp', 'order': 7, 'type': 'toeic', 'title': 'Part 7 閱讀理解', 'titleEn': 'Reading Comprehension', 'minutes': 15,
    'summary': '讀廣告和簡訊，先看題目再找答案。',
    'steps': [
        {'kind': 'concept', 'title': 'Part 7 是什麼', 'body': [
            'Part 7 是閱讀理解：廣告、email、公告、簡訊對話等，每篇有 2～5 題。',
            '秘訣：先看題目，再回文章找關鍵字。遇到 What is true…? 要一個一個選項對照文章。']},
        {'kind': 'explain', 'title': '常見問法', 'body': ['看懂題目在問什麼，就成功一半：'],
         'table': {'head': ['題目', '中文', '去哪裡找'], 'rows': [
             ['What is the purpose of…?', '…的目的是什麼？', '通常在第一、二句'],
             ['What is true about…?', '關於…哪一項正確？', '逐一對照選項'],
             ['How should people…?', '人們應該怎麼…？', '找 please、to apply 等字']]},
         'tip': '答案常是文章的「換句話說」：Saturday and Sunday ＝ on weekends。'},
        {'kind': 'practice', 'title': '模擬練習', 'intro': '每題都會顯示文章，看完題目再回文章找答案。',
         'questions': [
             p7('p7-a1', P7A, 'What job is the café offering?', '咖啡店在徵什麼工作？', ['A full-time cook', 'A part-time server', 'A manager'], 'A part-time server', 'We are looking for a part-time server. 徵兼職服務生。'),
             p7('p7-a2', P7A, 'When will the server work?', '服務生什麼時候上班？', ['On weekends', 'On weekdays', 'Every evening'], 'On weekends', 'Saturday and Sunday 換句話說就是 on weekends（週末）。'),
             p7('p7-a3', P7A, 'What is true about the job?', '關於這份工作，哪一項正確？', ['The pay is $50 per hour.', 'The job starts at 2 p.m.', 'Experience is not necessary.'], 'Experience is not necessary.',
                'Experience is helpful but not necessary. 經驗有幫助但不是必要。時薪是 15 美元，上班時間是早上 8 點到下午 2 點。'),
             p7('p7-a4', P7A, 'How should people apply?', '應徵的人該怎麼做？', ['By calling the café', 'By sending a résumé by email', 'By visiting the café on April 10'], 'By sending a résumé by email',
                'send your résumé to jobs@sunnycafe.com：寄履歷到 email 信箱。'),
             p7('p7-b1', P7B, 'Why will Mike be late?', 'Mike 為什麼會晚到？', ['His train is late.', 'He is sick.', 'He has a client meeting.'], 'His train is late.', 'my train is late：他的火車誤點。'),
             p7('p7-b2', P7B, 'What time is the client meeting?', '和客戶的會議幾點？', ['10:00', '9:15', '10:30'], '10:30', 'The client meeting is at 10:30. 10:00 是 Mike 到公司的時間。'),
             p7('p7-b3', P7B, 'What will Sarah do?', 'Sarah 會做什麼？', ['Call the client', 'Print a report', 'Pick Mike up at the station'], 'Print a report', 'Mike 請她印業務報告，她回答 Sure。')],
         'similar': []},
        {'kind': 'review', 'title': '答案解析'},
        {'kind': 'practice', 'title': '延伸練習：關鍵字', 'intro': '徵人廣告常見的字。',
         'questions': [
             q('p7-ext-1', 'p7-ext-1', 'résumé 是什麼意思？', ['履歷', '收據', '菜單'], '履歷', 'résumé（也寫 resume）是履歷。'),
             q('p7-ext-2', 'p7-ext-2', 'part-time 是什麼意思？', ['全職', '兼職', '加班'], '兼職', 'part-time 兼職；full-time 全職。')]},
    ]})

# ================================================================ 550 分挑戰殿堂：迷你模擬考
MC3 = multi('assets/audio/toeic/mock-conv.mp3', [
    (M, "Hi, I'm calling to book a table for four people this Saturday evening."),
    (W, 'Sure. What time would you like to come?'),
    (M, 'Around seven, please. And could we sit by the window?'),
    (W, 'Let me check. Yes, a window table is available.')])
MC3_T = "M: Hi, I'm calling to book a table for four people this Saturday evening.　W: Sure. What time would you like to come?　M: Around seven, please. And could we sit by the window?　W: Let me check. Yes, a window table is available."
MT4_T = "Good morning, everyone. Welcome to the City Art Museum. Today's tour will take about one hour. We will start on the second floor with paintings from Europe. Please do not take photos inside the museum. Now, please follow me."
MT4 = multi('assets/audio/toeic/mock-talk.mp3', [(B, MT4_T)])
MP6 = "Dear Mr. Brown,\n\nThank you for your order. Your package (1)______ yesterday, and it will arrive in two or three days. If you have any questions, please (2)______ us at 555-0198. (3)______\n\nBest regards,\nOnline Shop Team"
MP7 = "Riverside Gym — New Yoga Class!\nStarting May 1, we will offer a yoga class every Tuesday and Thursday from 7 p.m. to 8 p.m. The class is free for gym members. Non-members can join for $10 per class. Sign up at the front desk."
def mk(part, d):
    d['part'] = part
    return d
mock_questions = [
    mk(1, p1_item('m-p1-1', 'm-p1-1', 'desk', ['A plant is on the floor.', 'The laptop is open.', 'A woman is typing.', 'The chair is broken.'], 'B', ['植物在地上', '筆電是打開的', '一名女子在打字', '椅子壞了'])),
    mk(1, p1_item('m-p1-2', 'm-p1-2', 'shelf', ['Books are arranged on a shelf.', 'A clock is lying on the shelf.', 'A man is reading a book.', 'The shelf is being painted.'], 'A', ['書排放在書架上', '時鐘倒放在書架上', '一名男子在看書', '書架正在被油漆'])),
    mk(1, p1_item('m-p1-3', 'm-p1-3', 'park', ['Children are playing.', 'A bicycle is next to a tree.', 'A bench is being repaired.', 'A dog is running.'], 'B', ['小孩在玩', '腳踏車在樹旁邊', '長椅正在被修理', '一隻狗在跑'])),
    mk(2, p2_item('m-p2-1', 'm-p2-1', 'Where should I put these boxes?', ['In the storage room, please.', 'Yes, they are heavy.', 'Twelve boxes.'], 'A', '這些箱子要放在哪裡？', ['請放在儲藏室', '對，它們很重', '十二個箱子'], 'Where 問地點，回答「放在儲藏室」。')),
    mk(2, p2_item('m-p2-2', 'm-p2-2', 'When is the report due?', ['Mr. Lee wrote it.', 'By Thursday afternoon.', 'In the report.'], 'B', '報告什麼時候要交？', ['李先生寫的', '星期四下午前', '在報告裡'], 'When 問時間，due 是到期，回答「星期四下午前」。')),
    mk(2, p2_item('m-p2-3', 'm-p2-3', 'Would you like some coffee?', ['The coffee shop is closed.', 'No, thanks. I just had some.', 'Yes, I made copies.'], 'B', '要喝點咖啡嗎？', ['咖啡店關了', '不用了，謝謝，我剛喝過', '是的，我影印了'], '回答要不要喝。(C) copies 和 coffee 發音相近，是陷阱。')),
    mk(3, conv_q('m-p3-1', 'm-p3-1', MC3, 'Who most likely is the woman?', '女子最可能是誰？', ['A restaurant employee', 'A hotel guest', 'A taxi driver'], 'A restaurant employee', f'男子打電話訂位（book a table），女子幫他查座位，是餐廳員工。\n逐字稿：{MC3_T}')),
    mk(3, conv_q('m-p3-2', 'm-p3-2', MC3, 'How many people will come?', '會有幾個人來？', ['Two', 'Four', 'Seven'], 'Four', f'a table for four people：四個人。seven 是時間。\n逐字稿：{MC3_T}')),
    mk(3, conv_q('m-p3-3', 'm-p3-3', MC3, 'What does the man ask for?', '男子要求什麼？', ['A cheaper menu', 'A later time', 'A table by the window'], 'A table by the window', f'could we sit by the window? 想坐靠窗。\n逐字稿：{MC3_T}')),
    mk(4, talk_q('m-p4-1', MT4, 'Who most likely is the speaker?', '說話者最可能是誰？', ['A tour guide', 'A painter', 'A security guard'], 'A tour guide', f'Welcome to the museum、today\'s tour、please follow me：導覽員。\n逐字稿：{MT4_T}', '▶ 播放獨白')),
    mk(4, talk_q('m-p4-2', MT4, 'How long will the tour take?', '導覽要多久？', ['About two hours', 'About one hour', 'About thirty minutes'], 'About one hour', f'The tour will take about one hour.\n逐字稿：{MT4_T}', '▶ 播放獨白')),
    mk(4, talk_q('m-p4-3', MT4, 'What are listeners asked not to do?', '聽眾被要求不要做什麼？', ['Talk loudly', 'Eat food', 'Take photos'], 'Take photos', f'Please do not take photos inside the museum.\n逐字稿：{MT4_T}', '▶ 播放獨白')),
    mk(5, q('m-p5-1', 'm-p5-1', '選出最適合的答案', ['is', 'are', 'am', 'be'], 'are', '主詞 the new employees 是複數，用 are。', sentence='The new employees ___ very friendly.')),
    mk(5, q('m-p5-2', 'm-p5-2', '選出最適合的答案', ['a', 'an', 'many', 'few'], 'an', 'email 是單數、母音開頭，用 an。many／few 後面要接複數 emails。', sentence='Please send ___ email to all customers.')),
    mk(5, q('m-p5-3', 'm-p5-3', '選出最適合的答案', ['go', 'going', 'goes', 'gone'], 'goes', 'usually 表示習慣，主詞 Ms. Wang 是第三人稱單數，用 goes。', sentence='Ms. Wang usually ___ to work by train.')),
    mk(6, q('m-p6-1', 'm-p6-1', '第 1 個空格要填什麼？', ['sends', 'was sent', 'is sending', 'send'], 'was sent', 'yesterday 表示過去，包裹「被寄出」：was sent。', text=MP6)),
    mk(6, q('m-p6-2', 'm-p6-2', '第 2 個空格要填什麼？', ['call', 'calls', 'calling', 'called'], 'call', 'please 後面接動詞原形：please call us。', text=MP6)),
    mk(6, q('m-p6-3', 'm-p6-3', '第 3 個空格要填什麼？', ['Your package is too heavy.', 'Thank you for shopping with us.', 'We do not sell books.'], 'Thank you for shopping with us.', '信的結尾前，感謝顧客購物最自然。', text=MP6)),
    mk(7, p7('m-p7-1', MP7, 'What is the notice about?', '這則公告是關於什麼？', ['A gym closing', 'A price increase', 'A new class'], 'A new class', 'New Yoga Class：新的瑜珈課。')),
    mk(7, p7('m-p7-2', MP7, 'When is the class held?', '課程在什麼時候？', ['Tuesdays and Thursdays', 'Every weekend', 'Every morning'], 'Tuesdays and Thursdays', 'every Tuesday and Thursday from 7 p.m. to 8 p.m.')),
    mk(7, p7('m-p7-3', MP7, 'How much does the class cost for gym members?', '會員上課要多少錢？', ['$10 per class', 'It is free.', '$8 per class'], 'It is free.', 'The class is free for gym members. 會員免費，非會員才是 10 美元。')),
]
lesson({
    'id': 'mock-1', 'world': 'hall-550', 'order': 1, 'type': 'exam', 'title': '迷你模擬考 A', 'titleEn': 'Mini Mock Test A', 'minutes': 20,
    'timeLimit': 20 * 60, 'requires': ['toeic-p1', 'toeic-p2', 'toeic-p3', 'toeic-p4', 'toeic-p5-1', 'toeic-p6', 'toeic-p7'],
    'summary': '七大題型各 3 題，限時 20 分鐘，交卷後才看答案。',
    'steps': [{'kind': 'practice', 'title': '模擬考', 'questions': mock_questions, 'similar': []}]})

# ---------------------------------------------------------------- 教材清單與音檔清單
cat_path = os.path.join(ROOT, 'data/catalog.json')
cat = json.load(open(cat_path))
cat['contentVersion'] = '2026.11.24-say'
cat['vocab'] = VOCAB_FILES
order = ['vocab-1', 'vocab-2', 'vocab-3', 'grammar-1', 'grammar-2', 'grammar-3', 'phonics-1', 'phonics-2', 'phonics-3',
         'life-1', 'life-2', 'life-3', 'read-1', 'read-2', 'biz-1', 'biz-2',
         'toeic-p1', 'toeic-p2', 'toeic-p3', 'toeic-p4', 'toeic-p5-1', 'toeic-p6', 'toeic-p7', 'mock-1']
cat['lessons'] = [f'data/lessons/{x}.json' for x in order]
json.dump(cat, open(cat_path, 'w'), ensure_ascii=False, indent=2)

for word, ipa in PHONICS_IPA.items():
    AUD[f'assets/audio/phonics/{word}.mp3']['ipa'] = ipa
json.dump(AUD, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio_manifest.json'), 'w'), ensure_ascii=False, indent=1)
print(len(LESSONS), 'new lessons;', len(AUD), 'audio clips')

# 題目裡的英文加上發音（會更新上面寫出的課程 JSON 與音檔清單）
import subprocess
subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'add_prompt_audio.py'), ROOT], check=True)
