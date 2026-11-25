# 2.1 新增：半長模擬考 B、C（各 100 題：聽力 50＋閱讀 50，限時 60 分鐘）
# 題數比例照正式多益的一半：Part 1 4、Part 2 13、Part 3 18、Part 4 15、Part 5 15、Part 6 8、Part 7 27
# 由 build_content.py 執行（共用 q／multi／p1_item／p2v／conv_q／talk_q／p7／mk）

def rot(correct, wrongs, k):
    """把正確答案放在第 k 個位置（k 由題號決定，讓答案平均分散）。"""
    opts = list(wrongs)
    k %= len(opts) + 1
    opts.insert(k, correct)
    return opts

class MockBuilder:
    def __init__(self, pre):
        self.pre, self.items, self.n = pre, [], 0

    def _id(self, part):
        self.n += 1
        return f'{self.pre}-p{part}-{self.n}'

    def p1(self, scene, correct, wrongs, zh_correct, zh_wrongs):
        i = self._id(1)
        k = self.n % 4
        st, zh = rot(correct, wrongs, k), rot(zh_correct, zh_wrongs, k)
        self.items.append(mk(1, p1_item(i, i, scene, st, 'ABCD'[k], zh)))

    def p2(self, question, correct, wrongs, zh_q, zh_correct, zh_wrongs, expl, qv=M, av=W, shown=None):
        i = self._id(2)
        k = (self.n * 2) % 3
        opts, zh = rot(correct, wrongs, k), rot(zh_correct, zh_wrongs, k)
        sh = (shown[0], rot(shown[1], shown[2], k)) if shown else None
        self.items.append(mk(2, p2v(i, i, question, opts, 'ABC'[k], zh_q, zh, expl, qv=qv, av=av, shown=sh)))

    def conv(self, segs, transcript, qs):
        path = multi(f'assets/audio/toeic/{self.pre}-conv{self.n + 1}.mp3', segs)
        for en, zh, correct, wrongs, expl in qs:
            i = self._id(3)
            self.items.append(mk(3, conv_q(i, i, path, en, zh, rot(correct, wrongs, self.n), correct, f'{expl}\n逐字稿：{transcript}')))

    def talk(self, voice, spoken, text, qs, label='▶ 播放獨白'):
        path = multi(f'assets/audio/toeic/{self.pre}-talk{self.n + 1}.mp3', [(voice, spoken)])
        for en, zh, correct, wrongs, expl in qs:
            i = self._id(4)
            self.items.append(mk(4, talk_q(i, path, en, zh, rot(correct, wrongs, self.n), correct, f'{expl}\n逐字稿：{text}', label)))

    def p5(self, sentence, zh, options, answer, expl):
        i = self._id(5)
        self.items.append(mk(5, q(i, i, '選出最適合填入空格的答案', options, answer, expl, sentence=sentence, zh=zh)))

    def p6(self, text, items):
        for blank, options, answer, expl in items:
            i = self._id(6)
            self.items.append(mk(6, q(i, i, f'第 {blank} 個空格要填什麼？', options, answer, expl, text=text)))

    def p7(self, text, qs):
        for en, zh, correct, wrongs, expl in qs:
            i = self._id(7)
            self.items.append(mk(7, p7(i, text, en, zh, rot(correct, wrongs, self.n), correct, expl)))

def mock_lesson(lid, title, titleEn, items):
    counts = {}
    for it in items: counts[it['part']] = counts.get(it['part'], 0) + 1
    assert len(items) == 100 and counts == {1: 4, 2: 13, 3: 18, 4: 15, 5: 15, 6: 8, 7: 27}, (lid, len(items), counts)
    lesson({'id': lid, 'world': 'mock', 'order': 0, 'type': 'exam', 'title': title, 'titleEn': titleEn, 'minutes': 60, 'timeLimit': 60 * 60,
            'summary': '正式多益一半的份量：聽力 50 題＋閱讀 50 題，限時 60 分鐘，交卷後看各 Part 成績和預估分數。',
            'steps': [{'kind': 'practice', 'title': '半長模擬考', 'questions': items, 'similar': []}]})

# ================================================================ 模擬考 B
b = MockBuilder('m2')
b.p1('street', 'A traffic light stands near a building.', ['A car is being washed.', 'Some people are riding bicycles.', 'The road is covered with leaves.'],
     '紅綠燈立在大樓附近', ['一輛車正在被清洗', '有些人在騎腳踏車', '路上滿是落葉'])
b.p1('restaurant', 'Two chairs have been placed at a table.', ['A waiter is pouring water.', 'The table is being cleared.', 'Food is being served.'],
     '桌子旁擺了兩張椅子', ['服務生在倒水', '桌子正在被收拾', '食物正在被端上桌'])
b.p1('kitchen', 'A microwave has been placed on a counter.', ['A cup is being filled with coffee.', 'The cabinets are being repaired.', 'Someone is opening a drawer.'],
     '流理台上放著一台微波爐', ['杯子正在被倒滿咖啡', '櫥櫃正在被修理', '有人在開抽屜'])
b.p1('luggage', 'Several suitcases are standing in a row.', ['Passengers are boarding a plane.', 'Some bags are being weighed.', 'A worker is cleaning the window.'],
     '幾個行李箱排成一排', ['乘客正在登機', '有些包包正在被秤重', '一名工人在擦窗戶'])

b.p2("Where's the nearest post office?", 'Two blocks down this street.', ['I sent it yesterday.', 'At nine thirty.'],
     '最近的郵局在哪裡？', '沿著這條街走兩個街區', ['我昨天寄了', '九點半'], 'Where 問地點。(B) sent 和郵局有關但沒回答地點。')
b.p2("Who's in charge of the new project?", 'Ms. Ramos is.', ["It's a big project.", 'Next Monday.'],
     '誰負責這個新專案？', 'Ramos 小姐', ['這是個大專案', '下週一'], 'Who 問人，回答「Ramos 小姐」。', qv=B)
b.p2('When will the repairs be finished?', 'By the end of the week.', ['The repair shop.', 'Yes, they are.'],
     '修理什麼時候會完成？', '這週結束前', ['修理店', '是的，它們是'], 'When 問時間。', av=BM)
b.p2('Why is the meeting room locked?', "I'll ask security.", ["It's on the second floor.", 'Yes, at three.'],
     '會議室為什麼鎖著？', '我去問警衛', ['在二樓', '是的，三點'], '間接回答：不知道原因，去問警衛。', qv=BM)
b.p2('How did you get here so quickly?', 'I took the subway.', ["It's very quick.", 'About ten people.'],
     '你怎麼這麼快就到了？', '我搭地鐵', ['它很快', '大約十個人'], 'How 問方式，回答交通工具。(B) 重複 quick，是陷阱。', av=B)
b.p2('Would you like to join us for lunch?', "I'd love to.", ['I joined last year.', 'The lunch box.'],
     '要不要跟我們一起吃午餐？', '我很樂意', ['我去年加入的', '午餐盒'], '邀請，回答「很樂意」。(B) 重複 join，是陷阱。')
b.p2('Should we order more paper or wait until next week?', "Let's order it now.", ['The paper is white.', 'Yes, I waited.'],
     '我們要現在多訂一些紙，還是等到下週？', '現在就訂吧', ['紙是白色的', '是的，我等了'], '選擇疑問句，選「現在訂」。', qv=B, av=BM)
b.p2("You've met our new director, haven't you?", "Yes, at last week's meeting.", ["The director's office.", "No, I didn't meet it."],
     '你見過我們的新主管了，對吧？', '見過，在上週的會議', ['主管的辦公室', '不，我沒見過它'], '附加問句在確認，回答「見過」並說明在哪。(C) 用 it 指人是錯的。', qv=BM)
b.p2("Why don't we reserve a table for Friday?", "Good idea. I'll call now.", ["Because it's full.", 'The table is wooden.'],
     '我們何不訂星期五的位子？', '好主意，我現在就打', ['因為客滿了', '桌子是木頭的'], "Why don't we 是提議，(B) Because 是陷阱。", av=B)
b.p2("The copier on the third floor isn't working.", "I'll call the technician.", ['Three copies, please.', 'It works for a bank.'],
     '三樓的影印機壞了。', '我來打給技術人員', ['請印三份', '它為一家銀行工作'], '直述句：說影印機壞了，回答「找技術人員」。')
b.p2('How often do you visit the Tokyo office?', 'About twice a month.', ["It's a big office.", 'For two hours.'],
     '你多久去一次東京辦公室？', '大約一個月兩次', ['那是個大辦公室', '兩個小時'], 'How often 問頻率，回答「一個月兩次」。How long 才是問多久。', qv=B)
b.p2("Didn't the shipment arrive this morning?", "No, it's been delayed.", ["I'll ship it.", 'In the morning paper.'],
     '貨不是今天早上到嗎？', '沒有，延誤了', ['我會寄出', '在晨報上'], '否定疑問句：沒到就說 No，再說原因。', qv=BM, av=B)
b.p2('Can you show me how to use this software?', 'Sure, have a seat.', ["It's a soft chair.", 'I used it yesterday.'],
     '你可以教我怎麼用這個軟體嗎？', '當然，請坐', ['那是張軟椅子', '我昨天用過'], '答應請求。(B) soft 和 software 很像，是陷阱。')

b.conv([(M, 'Good evening. I have a reservation under the name Carter.'),
        (W, "Welcome, Mr. Carter. You're staying for two nights, right?"),
        (M, "That's right. Is breakfast included?"),
        (W, "Yes, it's served from six thirty to ten in the restaurant on the first floor. Here's your key. Your room is on the eighth floor.")],
       "M: Good evening. I have a reservation under the name Carter.　W: Welcome, Mr. Carter. You're staying for two nights, right?　M: That's right. Is breakfast included?　"
       "W: Yes, it's served from 6:30 to 10 in the restaurant on the first floor. Here's your key. Your room is on the eighth floor.",
       [('Where most likely are the speakers?', '說話者最可能在哪裡？', 'At a hotel', ['At an airport', 'At a restaurant'], 'reservation、key、room 都表示在飯店櫃台。'),
        ('How long will the man stay?', '男子會住多久？', 'Two nights', ['One night', 'Eight nights'], "You're staying for two nights. eighth 是樓層。"),
        ('Where is breakfast served?', '早餐在哪裡供應？', 'In a restaurant on the first floor', ["In the man's room", 'On the eighth floor'], 'served in the restaurant on the first floor。')])
b.conv([(B, 'Hi, James. The printer is almost out of ink. Did you order more?'),
        (BM, "I did, but the supplier said the delivery will be late. It won't arrive until Thursday."),
        (B, 'Thursday? I need to print the training handouts tomorrow.'),
        (BM, "You could use the printer on the fifth floor. I'll let them know you're coming.")],
       "W: Hi, James. The printer is almost out of ink. Did you order more?　M: I did, but the supplier said the delivery will be late. It won't arrive until Thursday.　"
       "W: Thursday? I need to print the training handouts tomorrow.　M: You could use the printer on the fifth floor. I'll let them know you're coming.",
       [('What problem does the man mention?', '男子提到什麼問題？', 'A delivery will be late.', ['A meeting was canceled.', 'A supplier has closed.'], 'the delivery will be late：送貨會晚到。'),
        ('What does the woman need to do tomorrow?', '女子明天需要做什麼？', 'Print some handouts', ['Lead a meeting', 'Visit a supplier'], 'I need to print the training handouts tomorrow.'),
        ('What does the man suggest?', '男子建議什麼？', 'Using a different printer', ['Buying ink at a store', 'Postponing the training'], 'You could use the printer on the fifth floor. 用別台印表機。')])
b.conv([(W, "Thanks for meeting with me. I'd like to talk about the company picnic."),
        (M, 'Sure. Last year it was at Lakeside Park, and everyone enjoyed it.'),
        (BM, 'But it rained in the afternoon, remember? This year, maybe we should rent a place with a roof.'),
        (W, 'Good point. Mark, could you look for places and send me a list by Friday?'),
        (BM, 'No problem.')],
       "W: Thanks for meeting with me. I'd like to talk about the company picnic.　M1: Sure. Last year it was at Lakeside Park, and everyone enjoyed it.　"
       "M2: But it rained in the afternoon, remember? This year, maybe we should rent a place with a roof.　W: Good point. Mark, could you look for places and send me a list by Friday?　M2: No problem.",
       [('What are the speakers planning?', '說話者在計畫什麼？', 'A company picnic', ['A product launch', 'A training session'], "I'd like to talk about the company picnic."),
        ('What happened last year?', '去年發生了什麼事？', 'It rained.', ['The park was closed.', 'Few people came.'], 'it rained in the afternoon：下午下雨了。'),
        ('What is one of the men asked to do?', '其中一名男子被要求做什麼？', 'Send a list of places', ['Book a park', 'Buy food'], 'could you look for places and send me a list by Friday?')])
b.conv([(W, "Excuse me. I bought this shirt here yesterday, but it's too small. Can I exchange it?"),
        (M, 'Of course. Do you have the receipt?'),
        (W, 'Yes, here. Do you have it in a large?'),
        (M, "Let me check. Hmm, we don't have large in blue, but we have it in gray."),
        (W, 'Gray is fine.')],
       "W: Excuse me. I bought this shirt here yesterday, but it's too small. Can I exchange it?　M: Of course. Do you have the receipt?　W: Yes, here. Do you have it in a large?　"
       "M: Let me check. Hmm, we don't have large in blue, but we have it in gray.　W: Gray is fine.",
       [('Why does the woman want an exchange?', '女子為什麼想換貨？', 'The shirt is too small.', ['The shirt is damaged.', 'She does not like the color.'], "it's too small：太小了。"),
        ('What does the man ask for?', '男子要求看什麼？', 'A receipt', ['An ID card', 'A credit card'], 'Do you have the receipt?'),
        ('What color will the woman probably get?', '女子最後可能拿到什麼顏色？', 'Gray', ['Blue', 'Black'], '藍色沒有 large，她說 Gray is fine。')])
b.conv([(B, "Hello, this is Rachel from Hartley Bank. We'd like to invite you to a second interview."),
        (M, "That's great! When would it be?"),
        (B, 'Would Wednesday at two work for you?'),
        (M, "I'm afraid I have a class then. Is Thursday possible?"),
        (B, "Yes, Thursday at two is fine. You'll meet our branch manager.")],
       "W: Hello, this is Rachel from Hartley Bank. We'd like to invite you to a second interview.　M: That's great! When would it be?　W: Would Wednesday at two work for you?　"
       "M: I'm afraid I have a class then. Is Thursday possible?　W: Yes, Thursday at two is fine. You'll meet our branch manager.",
       [('Why is the woman calling?', '女子為什麼打電話？', 'To set up an interview', ['To open a bank account', 'To cancel a class'], 'invite you to a second interview：安排第二次面試。'),
        ('What does the man mean when he says, "I\'m afraid I have a class then"?', '男子說「恐怕我那時有課」是什麼意思？', 'He cannot come on Wednesday.',
         ['He is worried about a test.', 'He wants to teach a class.'], '星期三兩點他有課，所以不能來，接著問星期四可不可以。'),
        ('Who will the man meet?', '男子會見到誰？', 'A branch manager', ['A teacher', 'A bank customer'], "You'll meet our branch manager.")])
b.conv([(M, 'Excuse me, is this the platform for the train to Boston?'),
        (W, "It was, but the train has been moved to platform six because of track repairs."),
        (M, 'Oh, thanks. Is it still leaving at ten fifteen?'),
        (W, "It'll be about twenty minutes late. You can get a coffee at the café upstairs while you wait.")],
       "M: Excuse me, is this the platform for the train to Boston?　W: It was, but the train has been moved to platform six because of track repairs.　"
       "M: Oh, thanks. Is it still leaving at 10:15?　W: It'll be about twenty minutes late. You can get a coffee at the café upstairs while you wait.",
       [('Where most likely are the speakers?', '說話者最可能在哪裡？', 'At a train station', ['At an airport', 'At a bus stop'], 'platform、train 表示在火車站。'),
        ('Why has the train been moved?', '火車為什麼換月台？', 'Because of track repairs', ['Because of bad weather', 'Because it is full'], 'because of track repairs：因為軌道維修。'),
        ('What does the woman suggest?', '女子建議什麼？', 'Getting a coffee', ['Taking a bus', 'Buying a new ticket'], 'You can get a coffee at the café upstairs.')])

b.talk(BM, 'Attention, passengers on Sky Air flight seven twenty to London. The departure gate has changed from Gate fourteen to Gate thirty-two. '
           'Boarding will begin at four forty-five. Passengers traveling with small children may board first. Thank you.',
       'Attention, passengers on Sky Air flight 720 to London. The departure gate has changed from Gate 14 to Gate 32. Boarding will begin at 4:45. '
       'Passengers traveling with small children may board first. Thank you.',
       [('What has changed?', '什麼改變了？', 'The departure gate', ['The departure time', 'The destination'], 'The departure gate has changed：登機門改了。'),
        ('When will boarding begin?', '幾點開始登機？', '4:45', ['7:20', '3:20'], 'Boarding will begin at 4:45. 720 是班機號碼。'),
        ('Who may board first?', '誰可以先登機？', 'Passengers with small children', ['Business class passengers', 'Airline staff'], 'Passengers traveling with small children may board first.')],
       '▶ 播放廣播')
b.talk(W, 'Good afternoon, shoppers. Thank you for shopping at Fresh Market. Today only, all fruit and vegetables are buy one, get one free. '
          'Also, our bakery has just taken fresh bread out of the oven. Please note that the store will close early today, at six p.m., for a staff meeting.',
       'Good afternoon, shoppers. Thank you for shopping at Fresh Market. Today only, all fruit and vegetables are buy one, get one free. '
       'Also, our bakery has just taken fresh bread out of the oven. Please note that the store will close early today, at 6 p.m., for a staff meeting.',
       [('Where is the announcement being made?', '這段廣播在哪裡播放？', 'In a supermarket', ['In a restaurant', 'At a cooking school'], 'shoppers、Fresh Market、fruit and vegetables：超市。'),
        ('What is on special today?', '今天什麼在特價？', 'Fruit and vegetables', ['Bread', 'Meat'], 'all fruit and vegetables are buy one, get one free：買一送一。'),
        ('Why will the store close early?', '店為什麼提早關門？', 'For a staff meeting', ['For cleaning', 'For a holiday'], 'close early today… for a staff meeting.')],
       '▶ 播放廣播')
b.talk(B, "Hi, Mr. Patel. This is Sophie from Lane Dental Office. I'm calling to remind you about your appointment with Dr. Hughes tomorrow at nine a.m. "
          'Please arrive ten minutes early to fill out a form. If you need to change the time, call us at five five five, three one nine zero. See you tomorrow.',
       "Hi, Mr. Patel. This is Sophie from Lane Dental Office. I'm calling to remind you about your appointment with Dr. Hughes tomorrow at 9 a.m. "
       'Please arrive ten minutes early to fill out a form. If you need to change the time, call us at 555-3190. See you tomorrow.',
       [('What is the purpose of the call?', '這通電話的目的是什麼？', 'To give a reminder about an appointment', ['To change an appointment', 'To ask for a payment'],
         "I'm calling to remind you about your appointment：提醒預約。"),
        ('What is the listener asked to do?', '聽者被要求做什麼？', 'Arrive early', ['Bring an ID card', 'Call Dr. Hughes'], 'Please arrive ten minutes early to fill out a form.'),
        ('Who most likely is Dr. Hughes?', 'Hughes 醫師最可能是誰？', 'A dentist', ['A receptionist', 'A patient'], 'Lane Dental Office 是牙醫診所，Dr. Hughes 是牙醫。')],
       '▶ 播放留言')
b.talk(M, 'Before we finish, I want to remind everyone about our new travel policy. Starting next month, all business trips must be approved by your manager '
          'at least two weeks in advance. Also, please keep all your receipts. You will need them to get your money back. '
          "I'll send the full policy by email this afternoon.",
       'Before we finish, I want to remind everyone about our new travel policy. Starting next month, all business trips must be approved by your manager '
       "at least two weeks in advance. Also, please keep all your receipts. You will need them to get your money back. I'll send the full policy by email this afternoon.",
       [('What is the talk mainly about?', '這段話主要在說什麼？', 'A new travel policy', ['A sales report', 'A new office'], 'remind everyone about our new travel policy：新的出差規定。'),
        ('What must employees do two weeks before a trip?', '員工出差前兩週必須做什麼？', 'Get approval from a manager', ['Book a hotel', 'Buy tickets'],
         'must be approved by your manager at least two weeks in advance。'),
        ('What will the speaker do this afternoon?', '說話者今天下午會做什麼？', 'Send an email', ['Take a trip', 'Meet a client'], "I'll send the full policy by email this afternoon.")])
b.talk(BM, "In local news, the city's first electric bus service will start next Monday. The new buses will run between the central station and the airport "
           'every fifteen minutes. A one-way ticket costs three dollars. City officials hope the service will reduce traffic and air pollution downtown.',
       "In local news, the city's first electric bus service will start next Monday. The new buses will run between the central station and the airport "
       'every 15 minutes. A one-way ticket costs $3. City officials hope the service will reduce traffic and air pollution downtown.',
       [('What will start next Monday?', '下週一會開始什麼？', 'An electric bus service', ['A new airport', 'A road repair'], "the city's first electric bus service will start next Monday."),
        ('How often will the buses run?', '公車多久一班？', 'Every 15 minutes', ['Every 50 minutes', 'Every hour'], 'every fifteen minutes。注意 fifteen 和 fifty。'),
        ('What do city officials hope?', '市府官員希望什麼？', 'Traffic will decrease.', ['Ticket prices will fall.', 'More people will visit the airport.'],
         'reduce traffic：減少車流。decrease 是 reduce 的換句話說。')],
       '▶ 播放新聞')

b.p5('Please ___ the attached file before the meeting.', '請在開會前看過附件檔案。', ['review', 'reviewing', 'reviewer', 'reviewed'], 'review', 'Please 後面接動詞原形 review。')
b.p5('The new software is very easy ___ use.', '新軟體很容易使用。', ['to', 'for', 'at', 'with'], 'to', 'easy to ＋ 動詞原形：很容易做某事。')
b.p5("Mr. Okafor is ___ for the company's marketing.", '奧卡佛先生負責公司的行銷。', ['responsible', 'responsibility', 'responsibly', 'respond'], 'responsible',
     'be responsible for：負責…。is 後面放形容詞 responsible。')
b.p5('Our sales have increased ___ since we opened the new store.', '開新店以來，我們的業績穩定成長。', ['steady', 'steadily', 'steadiness', 'steadied'], 'steadily',
     '修飾動詞 increased，用副詞 steadily。')
b.p5('The package will be delivered ___ Friday.', '包裹會在星期五送達。', ['on', 'in', 'at', 'during'], 'on', '星期幾用 on。')
b.p5('All employees ___ attend the safety training next week.', '所有員工下週都必須參加安全訓練。', ['must', 'has', 'are', 'will be'], 'must',
     '空格後面是動詞原形 attend，前面要放助動詞 must。')
b.p5('Ms. Grant has worked here ___ ten years.', '葛蘭特小姐在這裡工作十年了。', ['for', 'since', 'during', 'while'], 'for', 'for ＋ 一段時間（ten years）。since 後面要接時間點。')
b.p5('Neither the manager ___ the staff knew about the change.', '經理和員工都不知道這個改變。', ['or', 'nor', 'and', 'but'], 'nor', 'neither A nor B：A 和 B 都不。')
b.p5('This is the ___ hotel in the city.', '這是城裡最古老的飯店。', ['old', 'older', 'oldest', 'most old'], 'oldest', 'the ＋ 最高級，old → oldest。')
b.p5('The customer ___ complained yesterday has received a refund.', '昨天客訴的那位顧客已經拿到退款了。', ['who', 'which', 'whose', 'where'], 'who',
     'customer 是人，後面接動詞 complained，用 who。')
b.p5('Please contact ___ if you have any questions.', '如果有任何問題，請聯絡我。', ['I', 'my', 'me', 'mine'], 'me', 'contact 後面接受格 me。')
b.p5('The report must be ___ by noon tomorrow.', '報告必須在明天中午前完成。', ['complete', 'completed', 'completing', 'completes'], 'completed',
     '報告是「被完成」，must be ＋ 過去分詞 completed。')
b.p5('___ the weather was bad, the outdoor concert was held as planned.', '雖然天氣不好，戶外音樂會還是如期舉行。', ['Although', 'Despite', 'Because', 'So'], 'Although',
     '後面是句子，而且前後意思相反，用 Although。Despite 後面要接名詞。')
b.p5('We are pleased to ___ that Ms. Chen will be our new director.', '我們很高興宣布陳小姐將擔任新主管。', ['announce', 'announcement', 'announcing', 'announced'], 'announce',
     'be pleased to ＋ 動詞原形 announce。')
b.p5('The hotel offers free parking ___ all guests.', '飯店提供所有房客免費停車。', ['to', 'at', 'of', 'by'], 'to', 'offer something to someone：提供某物給某人。')

b.p6("To: All Employees\nFrom: Facilities Department\nSubject: Parking Lot Repairs\n\nThe east parking lot will be closed for repairs (1)______ Monday, October 7, "
     "to Friday, October 11. During this time, employees may park in the west lot. (2)______ Please arrive a few minutes early, as the west lot is (3)______ than the east lot. "
     "We apologize for any inconvenience and thank you for your (4)______.",
     [(1, ['from', 'at', 'in', 'since'], 'from', 'from A to B：從 A 到 B。'),
      (2, ['Extra spaces have been made available there.', 'The east lot was built last year.', 'Parking will be free on weekends.'], 'Extra spaces have been made available there.',
       '前一句說可以停西邊停車場，接「那裡已經多開放了一些車位」最合理。'),
      (3, ['small', 'smaller', 'smallest', 'more small'], 'smaller', '後面有 than，用比較級 smaller。'),
      (4, ['cooperate', 'cooperation', 'cooperative', 'cooperatively'], 'cooperation', 'your 後面接名詞 cooperation（合作）。')])
b.p6("Dear Mr. Silva,\n\nThank you for staying at the Ocean View Hotel last weekend. We hope you (5)______ your stay. We are always trying to improve our service, "
     "so we would like to hear your opinion. (6)______ It will take only five minutes to complete. As a thank-you, you will receive a coupon for 20% off your next stay. "
     "We look forward to (7)______ you again (8)______.\n\nSincerely,\nKaren Mills\nGuest Services Manager",
     [(5, ['enjoy', 'enjoyed', 'enjoying', 'will enjoy'], 'enjoyed', '住宿是上週末的事，用過去式 enjoyed。'),
      (6, ['Please take a short online survey.', 'Our hotel opened in 1990.', 'Your room was cleaned twice a day.'], 'Please take a short online survey.',
       '前面說想聽意見，後面說「只要五分鐘」，中間接「請填線上問卷」。'),
      (7, ['welcome', 'welcoming', 'welcomed', 'to welcome'], 'welcoming', 'look forward to ＋ V-ing：期待做某事。這裡的 to 是介系詞。'),
      (8, ['soon', 'ago', 'already', 'yet'], 'soon', 'see you again soon：期待很快再見到您。')])

b.p7("Lina Ortega (2:05 p.m.): Hi Mr. Grant, I'm at the reception desk. Your 2:00 visitor from Delta Supplies has arrived.\n"
     "Paul Grant (2:06 p.m.): Thanks, Lina. I'm still on a phone call. Could you take her to Meeting Room 3 and offer her some coffee?\nLina Ortega (2:07 p.m.): Of course.",
     [('Who most likely is Ms. Ortega?', 'Ortega 小姐最可能是誰？', 'A receptionist', ['A supplier', "Mr. Grant's client"], "I'm at the reception desk：她在接待櫃台。"),
      ('What does Mr. Grant ask Ms. Ortega to do?', 'Grant 先生請 Ortega 小姐做什麼？', 'Take a visitor to a meeting room', ['Call Delta Supplies', 'Cancel a meeting'],
       'Could you take her to Meeting Room 3…?')])
b.p7("Lost and Found\n\nIf you have lost an item on one of our buses, please visit the Lost and Found office at Central Station. The office is open Monday to Friday, "
     "9 a.m. to 5 p.m. Items are kept for 30 days. Please bring a photo ID when you pick up your item.",
     [('Where is the Lost and Found office?', '失物招領處在哪裡？', 'At Central Station', ['On every bus', 'At the airport'], 'the Lost and Found office at Central Station。'),
      ('What must people bring to pick up an item?', '領回物品要帶什麼？', 'A photo ID', ['A bus ticket', 'A receipt'], 'Please bring a photo ID.')])
b.p7("FOR RENT\n\nBright two-bedroom apartment on Maple Street. Close to shops and a subway station. Rent: $1,200 per month, including water and Internet. "
     "Electricity is not included. Pets are not allowed. Available from September 1. Call Tina at 555-0186 to arrange a visit.",
     [('What is being advertised?', '這是什麼的廣告？', 'An apartment', ['A shop', 'An office'], 'two-bedroom apartment：兩房公寓。'),
      ('What is NOT included in the rent?', '租金不包含什麼？', 'Electricity', ['Water', 'Internet'], 'Electricity is not included. 水和網路有包含。'),
      ('What is true about the apartment?', '關於這間公寓，哪一項正確？', 'It is near a subway station.', ['Pets are welcome.', 'It is available in August.'],
       'Close to… a subway station。不能養寵物，九月一日才可入住。')])
b.p7("To: Jenny Cho\nFrom: Mark Daniels\nDate: May 2\nSubject: Sales Conference\n\nHi Jenny,\nI won't be able to attend the sales conference in Chicago next week "
     "because I have to meet an important client in Seattle. Could you go in my place? I have already booked a hotel room, so you would only need to buy a plane ticket. "
     "The company will pay for it, of course. Please let me know by Friday.\n\nThanks,\nMark",
     [('Why is Mark writing to Jenny?', 'Mark 為什麼寫信給 Jenny？', 'To ask her to attend a conference for him', ['To invite her to Seattle', 'To ask her to book a hotel'],
       'Could you go in my place? 請她代替他去。'),
      ("Why can't Mark go to Chicago?", 'Mark 為什麼不能去芝加哥？', 'He has to meet a client.', ['He is sick.', 'He has no plane ticket.'], 'I have to meet an important client in Seattle.'),
      ('What would Jenny need to do if she goes?', '如果 Jenny 去，她需要做什麼？', 'Buy a plane ticket', ['Book a hotel', 'Pay for the trip herself'],
       'you would only need to buy a plane ticket. 飯店已經訂好，費用公司出。')])
b.p7("Riverside Mall to Open New Food Court\n\nRiverside Mall will open a new food court on its third floor next month. The food court will have twelve restaurants "
     "serving food from around the world, including Korean, Mexican, and Italian dishes. \"Our customers asked for more places to eat,\" said mall manager Leo Park. "
     "The mall also plans to add 200 parking spaces by the end of the year.",
     [('What is the article mainly about?', '這篇報導主要在說什麼？', 'A new food court', ['A famous chef', 'A parking problem'], 'Riverside Mall to Open New Food Court。'),
      ('How many restaurants will the food court have?', '美食街會有幾家餐廳？', '12', ['3', '200'], 'twelve restaurants。3 是樓層，200 是停車位。'),
      ('Who is Leo Park?', 'Leo Park 是誰？', 'A mall manager', ['A restaurant owner', 'A customer'], 'mall manager Leo Park。')])
b.p7("MEMO\nTo: All Staff\nFrom: Sandra Lee, Human Resources\nDate: June 10\n\nWe are happy to announce that our company will offer free English and Japanese classes "
     "for employees starting July 1. Classes will be held on Tuesday and Thursday evenings from 6 to 7:30 p.m. in Training Room B. Each class can have up to 15 students. "
     "To sign up, please send an email to Sandra Lee by June 20. Employees who attend 90% of the classes will receive a certificate.",
     [('What is the purpose of the memo?', '這份備忘錄的目的是什麼？', 'To announce free language classes', ['To hire new teachers', 'To change working hours'],
       'offer free English and Japanese classes：提供免費語言課。'),
      ('When will the classes be held?', '課程什麼時候上？', 'On Tuesday and Thursday evenings', ['Every weekday morning', 'On weekends'], 'Tuesday and Thursday evenings from 6 to 7:30 p.m.'),
      ('How can employees sign up?', '員工要怎麼報名？', 'By sending an email', ['By calling Human Resources', 'By visiting Training Room B'], 'please send an email to Sandra Lee。'),
      ('What will employees receive if they attend most of the classes?', '大部分的課都出席的員工會得到什麼？', 'A certificate', ['A bonus', 'A day off'],
       'attend 90% of the classes will receive a certificate：證書。')])
b.p7("[Schedule]\nGreen Business Forum — Saturday, April 12\n9:00 a.m. Opening speech — Hall A\n10:30 a.m. Saving Energy at the Office — Room 201\n"
     "1:00 p.m. Lunch — Garden Café\n2:00 p.m. Green Marketing — Room 305\nTickets: $40 (students: $20)\n\n[Email]\nTo: info@greenforum.org\nFrom: Kenji Mori\nDate: April 1\n\n"
     "Hello,\nI bought a student ticket for the forum, but I can only stay until lunch because I have to work in the afternoon. I am most interested in the session on "
     "saving energy. Could you tell me if the slides from the afternoon session will be available online later?\n\nThank you,\nKenji Mori",
     [('How much did Mr. Mori pay for his ticket?', 'Mori 先生的票多少錢？', '$20', ['$40', '$12'], '他買的是學生票（student ticket），課表寫 students: $20。'),
      ('Which session will Mr. Mori probably miss?', 'Mori 先生可能會錯過哪一場？', 'Green Marketing', ['Saving Energy at the Office', 'Opening speech'],
       '他只待到午餐，下午兩點的 Green Marketing 會錯過。'),
      ('Where will Mr. Mori most likely be at 10:30 a.m.?', 'Mori 先生早上 10:30 最可能在哪裡？', 'Room 201', ['Room 305', 'Hall A'],
       '他對 saving energy 最有興趣，那場在 10:30、Room 201。'),
      ("Why can't Mr. Mori stay all day?", 'Mori 先生為什麼不能待一整天？', 'He has to work.', ['He has a class.', 'He is traveling.'], 'I have to work in the afternoon.'),
      ('What does Mr. Mori ask about?', 'Mori 先生詢問什麼？', 'Slides from a session', ['A ticket refund', 'Lunch options'], 'if the slides from the afternoon session will be available online。')])
b.p7("[Order Form]\nBest Print Shop — Order #4521\nCustomer: Olivia Hart, Hart Design\nBusiness cards (500): $45\nBrochures (200): $120\nDelivery: Standard (5 days): Free\n"
     "Total: $165\nOrder date: March 12\n\n[Email]\nTo: orders@bestprint.com\nFrom: Olivia Hart\nDate: March 13\n\nHello,\nI placed order #4521 yesterday. "
     "I would like to change the delivery to express (2 days) because I need the brochures for a trade show on March 16. I understand there is an extra charge of $15 "
     "for express delivery. Please also check that my phone number on the business cards is 555-0199.\n\nBest,\nOlivia Hart",
     [('What did Hart Design order?', 'Hart Design 訂了什麼？', 'Business cards and brochures', ['Posters', 'Office chairs'], '訂單上有 Business cards 和 Brochures。'),
      ('What does Ms. Hart want to change?', 'Hart 小姐想改什麼？', 'The delivery method', ['The number of brochures', 'Her address'], 'change the delivery to express：改成快遞。'),
      ('Why does Ms. Hart need the items quickly?', 'Hart 小姐為什麼急著要？', 'For a trade show', ['For a job interview', 'For a party'], 'I need the brochures for a trade show on March 16.'),
      ('What will the new total most likely be?', '新的總金額最可能是多少？', '$180', ['$165', '$150'], '原本 $165，加上快遞費 $15，共 $180。要兩篇一起看。'),
      ('When did Ms. Hart place the order?', 'Hart 小姐什麼時候下訂單？', 'March 12', ['March 13', 'March 16'], 'Order date: March 12。她 3 月 13 日寫信說「昨天」下單。')])
mock_lesson('mock-2', '半長模擬考 B', 'Half Mock Test B', b.items)

# ================================================================ 模擬考 C
c = MockBuilder('m3')
c.p1('park', 'A bicycle is parked near a tree.', ['A man is riding a bicycle.', 'A bench is being painted.', 'Leaves are being raked.'],
     '一輛腳踏車停在樹附近', ['一名男子在騎腳踏車', '長椅正在被油漆', '落葉正在被耙起來'])
c.p1('bus-stop', 'The bus shelter has a roof.', ['People are waiting in line.', 'A bus is pulling away.', 'The bench is being repaired.'],
     '公車候車亭有屋頂', ['大家在排隊', '一輛公車正在開走', '長椅正在被修理'])
c.p1('lobby', 'A picture has been hung above the sofa.', ['A man is reading a newspaper.', 'A lamp is being carried.', 'Some cushions are on the floor.'],
     '沙發上方掛著一幅畫', ['一名男子在看報紙', '一盞燈正在被搬走', '地上有一些靠墊'])
c.p1('market', 'Fruit has been arranged in baskets.', ['A vendor is weighing some apples.', 'A customer is choosing fruit.', 'The baskets are on the ground.'],
     '水果已經擺在籃子裡', ['一名攤販在秤蘋果', '一位顧客在挑水果', '籃子在地上'])

c.p2('Where can I find the meeting schedule?', "It's on the company website.", ["At four o'clock.", 'Yes, I can.'],
     '我可以在哪裡找到會議時間表？', '在公司網站上', ['四點', '是的，我可以'], 'Where 問地點，回答「在公司網站上」。', qv=B)
c.p2('When is Mr. Lopez coming back from vacation?', "He'll be back on Monday.", ['To Spain.', 'A two-week vacation.'],
     '羅培茲先生什麼時候休假回來？', '他星期一回來', ['去西班牙', '兩週的假期'], 'When 問時間，回答「星期一」。', av=BM)
c.p2('Who should I give this application to?', 'Leave it with Ms. Kato.', ["It's a long application.", 'Yes, I applied.'],
     '這份申請書我該交給誰？', '交給加藤小姐', ['這份申請書很長', '是的，我申請了'], 'Who 問人，回答「交給加藤小姐」。', qv=BM)
c.p2('Why is the highway so crowded today?', "There's a big concert downtown.", ["It's a crowded city.", 'Highway nine.'],
     '今天高速公路為什麼這麼塞？', '市中心有一場大型演唱會', ['這是個擁擠的城市', '九號公路'], '說明原因，不一定要用 because。', av=B,
     shown=('Why is the highway so crowded today?', "There's a big concert downtown.", ["It's a crowded city.", 'Highway 9.']))
c.p2('How many people are coming to the training?', 'About thirty.', ["It's on the third floor.", 'The train is coming.'],
     '有多少人會來參加訓練？', '大約三十個', ['在三樓', '火車來了'], 'How many 問數量。(C) train 和 training 很像，是陷阱。')
c.p2('Would you prefer a morning or afternoon appointment?', 'The morning works better for me.', ['Yes, I would.', 'I made it myself.'],
     '你比較想約早上還是下午？', '早上對我比較方便', ['是的，我想', '我自己做的'], '選擇疑問句，選早上。', qv=B, av=BM)
c.p2("Isn't the cafeteria closed for renovations?", 'Yes, until next week.', ['The food is good.', 'I closed the window.'],
     '員工餐廳不是在整修嗎？', '對，整修到下週', ['食物很好吃', '我關了窗戶'], '否定疑問句：是在整修就回答 Yes。', qv=BM)
c.p2('The air conditioner is making a strange noise.', "I'll call maintenance.", ["It's very strange news.", 'It was made in Japan.'],
     '冷氣發出奇怪的聲音。', '我來打給維修部門', ['這是很奇怪的新聞', '它是日本製的'], '直述句：說冷氣怪怪的，回答「找維修」。(B) news 和 noise 很像。', av=B)
c.p2('Could you send me the updated price list?', "I'll do it right away.", ['The price is high.', 'Yes, I listed them.'],
     '可以寄最新的價目表給我嗎？', '我馬上寄', ['價格很高', '是的，我列出來了'], '答應請求。')
c.p2('Which hotel did you stay at in Seoul?', 'The one near the station.', ['For three nights.', 'I stayed late.'],
     '你在首爾住哪一家飯店？', '車站附近那家', ['住三晚', '我待到很晚'], 'Which 問哪一家，回答「車站附近那家」。', qv=B)
c.p2('Have you finished the budget report?', "Almost. I'll send it in an hour.", ['The budget is small.', 'I reported it.'],
     '你完成預算報告了嗎？', '快好了，一小時內寄給你', ['預算很少', '我報告過了'], '還沒完全好，但說了什麼時候給。', qv=BM, av=B)
c.p2('What do you think of the new logo?', 'I like the colors.', ['I think so.', 'I thought about it.'],
     '你覺得新標誌怎麼樣？', '我喜歡它的顏色', ['我想是吧', '我想過了'], 'What do you think of…? 問意見，回答「喜歡顏色」。(B)(C) 重複 think，是陷阱。')
c.p2("Let's ask the client what she thinks.", "Good idea. I'll call her.", ['She thinks so.', 'The client list.'],
     '我們問問客戶的想法吧。', '好主意，我打給她', ['她是這麼想的', '客戶名單'], '直述句提議，回答「好主意」。', qv=B)

c.conv([(W, "Hi, I'd like to rent a car for three days, starting tomorrow."),
        (M, 'Certainly. We have a small car for forty dollars a day or a larger one for sixty.'),
        (W, "The small one is fine. It's just me. Can I return it at the airport?"),
        (M, "Yes, but there's a fifteen-dollar fee for airport returns.")],
       "W: Hi, I'd like to rent a car for three days, starting tomorrow.　M: Certainly. We have a small car for $40 a day or a larger one for $60.　"
       "W: The small one is fine. It's just me. Can I return it at the airport?　M: Yes, but there's a $15 fee for airport returns.",
       [('What does the woman want to do?', '女子想做什麼？', 'Rent a car', ['Buy a car', 'Repair a car'], "I'd like to rent a car：租車。"),
        ('How much will the woman pay per day?', '女子一天要付多少錢？', '$40', ['$60', '$15'], '她選小車（The small one），一天 $40。'),
        ('What does the man say about airport returns?', '關於在機場還車，男子說了什麼？', 'There is an extra fee.', ['They are not possible.', 'They are free on weekends.'],
         "there's a fifteen-dollar fee for airport returns：要另外收費。")])
c.conv([(BM, "Hi, Grace. Welcome to the team! I'm Oliver. Your desk is the one by the window."),
        (B, "Thanks, Oliver. Do you know when I'll get my computer?"),
        (BM, "The IT team said they'll set it up this afternoon. In the meantime, I can show you around the office."),
        (B, 'That would be great.')],
       "M: Hi, Grace. Welcome to the team! I'm Oliver. Your desk is the one by the window.　W: Thanks, Oliver. Do you know when I'll get my computer?　"
       "M: The IT team said they'll set it up this afternoon. In the meantime, I can show you around the office.　W: That would be great.",
       [('Who most likely is the woman?', '女子最可能是誰？', 'A new employee', ['A client', 'An IT technician'], 'Welcome to the team! 還在等電腦，是新同事。'),
        ('What will happen this afternoon?', '今天下午會發生什麼事？', 'A computer will be set up.', ['A meeting will start.', 'The woman will move desks.'],
         "they'll set it up this afternoon：下午會幫她設定電腦。"),
        ('What will the man probably do next?', '男子接下來可能會做什麼？', 'Show the woman around', ['Call the IT team', 'Go to lunch'], 'I can show you around the office. 女子說好。')])
c.conv([(M, 'Rachel, Emily, thanks for coming. As you know, our online orders have doubled this year.'),
        (W, 'Yes, and our warehouse team is working overtime almost every day.'),
        (B, 'I think we should hire more staff for the busy season.'),
        (M, 'I agree. Emily, can you post a job ad this week?'),
        (B, "Sure, I'll do it today.")],
       "M: Rachel, Emily, thanks for coming. As you know, our online orders have doubled this year.　W1: Yes, and our warehouse team is working overtime almost every day.　"
       "W2: I think we should hire more staff for the busy season.　M: I agree. Emily, can you post a job ad this week?　W2: Sure, I'll do it today.",
       [('What has happened this year?', '今年發生了什麼事？', 'Online orders have increased.', ['A warehouse has closed.', 'Prices have gone down.'],
         'our online orders have doubled：網路訂單變成兩倍。'),
        ('What does one of the women suggest?', '其中一名女子建議什麼？', 'Hiring more workers', ['Building a new warehouse', 'Raising prices'], 'we should hire more staff。'),
        ('What will Emily do today?', 'Emily 今天會做什麼？', 'Post a job advertisement', ['Work overtime', 'Call customers'], "can you post a job ad…? Sure, I'll do it today.")])
c.conv([(M, "Hello, I'd like to pick up a prescription for David Lee."),
        (W, "Let me see. I'm sorry, it's not ready yet. We're waiting for the doctor to confirm the dose."),
        (M, 'How long will it take?'),
        (W, 'Probably about an hour. We can send you a text message when it\'s ready.'),
        (M, 'That would be helpful. Thanks.')],
       "M: Hello, I'd like to pick up a prescription for David Lee.　W: Let me see. I'm sorry, it's not ready yet. We're waiting for the doctor to confirm the dose.　"
       "M: How long will it take?　W: Probably about an hour. We can send you a text message when it's ready.　M: That would be helpful. Thanks.",
       [('Where does the woman most likely work?', '女子最可能在哪裡工作？', 'At a pharmacy', ['At a bank', 'At a post office'], 'prescription（處方）、dose（劑量）：藥局。'),
        ('Why is the prescription not ready?', '處方藥為什麼還沒好？', 'The pharmacy is waiting for the doctor.', ['The medicine is sold out.', 'The man came on the wrong day.'],
         "We're waiting for the doctor to confirm the dose."),
        ('What does the woman offer to do?', '女子提議做什麼？', 'Send a text message', ['Call the doctor', 'Deliver the medicine'], "We can send you a text message when it's ready.")])
c.conv([(B, 'Kevin, have you seen the new coffee machine in the break room?'),
        (M, 'Yes, I tried it this morning. The coffee is much better than before.'),
        (B, "Really? I haven't had a chance yet. I've been in meetings all day."),
        (M, "Well, you'd better hurry. There's only one bag of beans left.")],
       "W: Kevin, have you seen the new coffee machine in the break room?　M: Yes, I tried it this morning. The coffee is much better than before.　"
       "W: Really? I haven't had a chance yet. I've been in meetings all day.　M: Well, you'd better hurry. There's only one bag of beans left.",
       [('What are the speakers discussing?', '說話者在討論什麼？', 'A new coffee machine', ['A meeting schedule', 'Cleaning the break room'], 'the new coffee machine in the break room。'),
        ("Why hasn't the woman tried the coffee?", '女子為什麼還沒喝到咖啡？', 'She has been busy with meetings.', ["She doesn't drink coffee.", 'The machine is broken.'],
         "I've been in meetings all day."),
        ('What does the man imply when he says, "There\'s only one bag of beans left"?', '男子說「只剩一包咖啡豆了」，意思是什麼？', 'The coffee may run out soon.',
         ['The machine is too expensive.', 'He did not like the coffee.'], '前一句叫她快一點，因為咖啡豆快用完了。')])
c.conv([(M, "Hi, I'm here for the marketing conference. My name is Paul Rivera."),
        (W, "Welcome, Mr. Rivera. Here's your name badge and a program. The first session starts at nine thirty in the main hall."),
        (M, 'Thanks. Is there somewhere I can leave my suitcase?'),
        (W, "Yes, there's a cloakroom next to the elevators.")],
       "M: Hi, I'm here for the marketing conference. My name is Paul Rivera.　W: Welcome, Mr. Rivera. Here's your name badge and a program. The first session starts at 9:30 in the main hall.　"
       "M: Thanks. Is there somewhere I can leave my suitcase?　W: Yes, there's a cloakroom next to the elevators.",
       [('Where most likely are the speakers?', '說話者最可能在哪裡？', 'At a conference', ['At a hotel restaurant', 'At an airport'], "I'm here for the marketing conference."),
        ('What does the woman give the man?', '女子給男子什麼？', 'A badge and a program', ['A room key', 'A plane ticket'], "Here's your name badge and a program."),
        ('Where can the man leave his suitcase?', '男子可以把行李箱放在哪裡？', 'Next to the elevators', ['In the main hall', 'At the front desk'],
         "there's a cloakroom next to the elevators：電梯旁邊的寄物處。")])

c.talk(W, "Good morning, and welcome aboard the City Sights bus tour. Our first stop will be the Old Harbor, where we'll stay for forty minutes. "
          "Then we'll visit the History Museum. Lunch is not included, but there are many restaurants near the museum. Please be back on the bus by one p.m.",
       "Good morning, and welcome aboard the City Sights bus tour. Our first stop will be the Old Harbor, where we'll stay for forty minutes. "
       "Then we'll visit the History Museum. Lunch is not included, but there are many restaurants near the museum. Please be back on the bus by 1 p.m.",
       [('Who most likely is the speaker?', '說話者最可能是誰？', 'A tour guide', ['A museum worker', 'A bus mechanic'], 'welcome aboard the City Sights bus tour：觀光巴士導遊。'),
        ('What is the first stop?', '第一站是哪裡？', 'The Old Harbor', ['The History Museum', 'A restaurant'], 'Our first stop will be the Old Harbor.'),
        ('What are listeners asked to do?', '聽眾被要求做什麼？', 'Return to the bus by 1 p.m.', ['Buy lunch tickets', 'Stay together in the museum'],
         'Please be back on the bus by 1 p.m.')], '▶ 播放導覽')
c.talk(BM, "Hello, this is Martin Hayes from Clearview Windows. I'm returning your call about the windows for your new office. I can come and measure them on Tuesday morning. "
           "After that, I'll send you a price estimate within two days. Please call me back to confirm the time. My number is five five five, seven two six zero.",
       "Hello, this is Martin Hayes from Clearview Windows. I'm returning your call about the windows for your new office. I can come and measure them on Tuesday morning. "
       "After that, I'll send you a price estimate within two days. Please call me back to confirm the time. My number is 555-7260.",
       [("What does the speaker's company most likely sell?", '說話者的公司最可能賣什麼？', 'Windows', ['Office furniture', 'Computers'], 'Clearview Windows：窗戶公司。'),
        ('What will the speaker do on Tuesday?', '說話者星期二會做什麼？', 'Measure some windows', ['Install new windows', 'Send a bill'], 'I can come and measure them on Tuesday morning.'),
        ('What will the listener receive after the visit?', '到訪之後，聽者會收到什麼？', 'A price estimate', ['New windows', 'A refund'],
         "I'll send you a price estimate within two days：估價單。")], '▶ 播放留言')
c.talk(B, "Welcome to today's cooking class. Before we start, please wash your hands and put on an apron. You'll find all the ingredients on the table in front of you. "
          "Today we're making a vegetable soup and fresh bread. At the end of the class, you can take home anything you make. "
          "Now, let's begin with the bread, because it needs time to rise.",
       "Welcome to today's cooking class. Before we start, please wash your hands and put on an apron. You'll find all the ingredients on the table in front of you. "
       "Today we're making a vegetable soup and fresh bread. At the end of the class, you can take home anything you make. Now, let's begin with the bread, because it needs time to rise.",
       [('Where is the talk most likely taking place?', '這段話最可能在哪裡？', 'At a cooking class', ['At a supermarket', 'At a farm'], "Welcome to today's cooking class."),
        ('What are listeners asked to do first?', '聽眾被要求先做什麼？', 'Wash their hands', ['Cut vegetables', 'Read a recipe'], 'Before we start, please wash your hands.'),
        ('Why will they start with the bread?', '為什麼要先做麵包？', 'It needs time to rise.', ['It is easy to make.', 'The soup is not ready.'],
         'because it needs time to rise：麵包需要時間發酵。')], '▶ 播放獨白')
c.talk(M, "Is your phone running slow? Bring it to Fast Fix Phone Repair! Our technicians can fix most problems in under an hour. This month, screen repairs are "
          "only forty-nine dollars, and every repair comes with a six-month warranty. We're located on Main Street, across from City Bank. Open seven days a week.",
       "Is your phone running slow? Bring it to Fast Fix Phone Repair! Our technicians can fix most problems in under an hour. This month, screen repairs are only $49, "
       "and every repair comes with a six-month warranty. We're located on Main Street, across from City Bank. Open seven days a week.",
       [('What is being advertised?', '這是什麼的廣告？', 'A phone repair shop', ['A bank', 'A new phone'], 'Fast Fix Phone Repair：手機維修店。'),
        ('How much is a screen repair this month?', '這個月換螢幕多少錢？', '$49', ['$94', '$19'], 'screen repairs are only forty-nine dollars。'),
        ('Where is the business located?', '這家店在哪裡？', 'Across from a bank', ['Next to a phone store', 'Inside a mall'], 'across from City Bank：在銀行對面。')], '▶ 播放廣告')
c.talk(BM, "OK, everyone, let's look at the results of our customer survey. Most customers are happy with our products, but many said our delivery is too slow. "
           "So starting next month, we'll work with a new delivery company that promises next-day delivery. I know this will cost more. "
           "But keeping our customers happy is worth it.",
       "OK, everyone, let's look at the results of our customer survey. Most customers are happy with our products, but many said our delivery is too slow. "
       "So starting next month, we'll work with a new delivery company that promises next-day delivery. I know this will cost more. But keeping our customers happy is worth it.",
       [('What did many customers complain about?', '很多顧客抱怨什麼？', 'Slow delivery', ['High prices', 'Poor product quality'], 'many said our delivery is too slow.'),
        ('What will change next month?', '下個月會有什麼改變？', 'A new delivery company will be used.', ['Prices will go up.', 'A new product will be released.'],
         "we'll work with a new delivery company：換新的物流公司。"),
        ('Why does the speaker say, "keeping our customers happy is worth it"?', '說話者為什麼說「讓顧客滿意是值得的」？', 'To explain why a higher cost is acceptable',
         ['To ask staff to work harder', 'To introduce a new product'], '前一句說會花更多錢，這句是說明為什麼值得多花錢。')], '▶ 播放獨白')

c.p5('The museum is closed ___ Mondays.', '博物館星期一休館。', ['on', 'in', 'at', 'by'], 'on', '星期幾用 on。')
c.p5('Mr. Yamada asked his assistant to ___ the files by noon.', '山田先生請助理在中午前整理好檔案。', ['organize', 'organization', 'organized', 'organizing'], 'organize',
     'ask someone to ＋ 動詞原形 organize。')
c.p5('The training session was ___ helpful for new employees.', '這次訓練對新員工非常有幫助。', ['extreme', 'extremely', 'extremes', 'extremity'], 'extremely',
     '修飾形容詞 helpful，用副詞 extremely。')
c.p5('If you ___ any problems, please call the help desk.', '如果有任何問題，請打給服務台。', ['have', 'has', 'having', 'to have'], 'have', '主詞 you，用 have。')
c.p5('The CEO ___ the new branch in Taipei next month.', '執行長下個月會參訪台北的新分公司。', ['visit', 'visited', 'will visit', 'visiting'], 'will visit', 'next month 是未來，用 will visit。')
c.p5('Ms. Park is the ___ candidate for the position.', '朴小姐是這個職位最合格的人選。', ['qualified', 'more qualified', 'most qualified', 'qualify'], 'most qualified',
     'the ＋ 最高級，qualified 是長字，用 most qualified。')
c.p5('The printer ___ is in the hallway is out of order.', '走廊上的那台印表機壞了。', ['who', 'which', 'whose', 'what'], 'which', 'printer 是東西，用 which。')
c.p5('Customers can return items ___ 30 days of purchase.', '顧客可以在購買後 30 天內退貨。', ['within', 'during', 'until', 'since'], 'within', 'within ＋ 一段時間：在…之內。')
c.p5('Please make sure the door is locked ___ you leave.', '離開前請確認門已上鎖。', ['before', 'during', 'despite', 'because of'], 'before',
     '後面是句子 you leave，表示時間「在…之前」，用 before。')
c.p5('Our new website ___ by more than 10,000 people last month.', '上個月有超過一萬人瀏覽我們的新網站。', ['visited', 'was visited', 'visits', 'is visiting'], 'was visited',
     '網站是「被瀏覽」，過去用 was visited。')
c.p5('The manager gave ___ a clear explanation of the new rules.', '經理清楚地向我們說明了新規定。', ['we', 'our', 'us', 'ours'], 'us', 'gave 後面接受格 us。')
c.p5('Interest in the product has grown ___ in Asia.', '亞洲對這項產品的興趣快速成長。', ['rapid', 'rapidly', 'rapidity', 'more rapid'], 'rapidly', '修飾動詞 has grown，用副詞 rapidly。')
c.p5('Both the sales team ___ the marketing team attended the workshop.', '業務團隊和行銷團隊都參加了研習。', ['and', 'or', 'nor', 'but'], 'and', 'both A and B：A 和 B 都。')
c.p5('The company plans to ___ its products to Europe next year.', '公司計畫明年把產品出口到歐洲。', ['export', 'exporter', 'exporting', 'exported'], 'export', 'plan to ＋ 動詞原形 export。')
c.p5('Mr. Bell will be out of the office ___ Thursday.', '貝爾先生會一直不在辦公室，直到星期四。', ['until', 'by', 'during', 'since'], 'until', '一直持續到星期四，用 until。by 是「在…之前完成」。')

c.p6("To All Tenants:\n\nThe building's fire alarm system (1)______ next Wednesday, November 6, between 10 a.m. and noon. You may hear the alarm several times "
     "during this period. (2)______ There is no need to leave the building. If you have any (3)______, please contact the management office. Thank you for your (4)______.",
     [(1, ['tests', 'tested', 'will be tested', 'testing'], 'will be tested', '警報系統是「被測試」，而且是下週三，用 will be tested。'),
      (2, ['This is only a test.', 'The alarm was installed in 1980.', 'Please leave the building immediately.'], 'This is only a test.',
       '前一句說會聽到警報，後一句說不用離開，中間接「這只是測試」。'),
      (3, ['concerns', 'concerned', 'concernedly', 'to concern'], 'concerns', 'any 後面接名詞 concerns（疑慮）。'),
      (4, ['understand', 'understanding', 'understood', 'understandable'], 'understanding', 'your 後面接名詞 understanding（體諒）。')])
c.p6("Dear Ms. Novak,\n\nThank you for your interest in (5)______ our team at Greenleaf Foods. We have reviewed your application and would like you to come in for an interview. "
     "(6)______ Please choose the time that works best for you. The interview will be held at our main office, (7)______ is located at 45 River Road. "
     "Please (8)______ a copy of your portfolio.\n\nBest regards,\nDaniel Reyes\nRecruiting Manager",
     [(5, ['join', 'joining', 'joined', 'to join'], 'joining', 'interest in ＋ V-ing：in 是介系詞，後面接 joining。'),
      (6, ['We have openings on Monday and Wednesday afternoon.', 'Our company was founded in 1998.', 'Unfortunately, the position has been filled.'],
       'We have openings on Monday and Wednesday afternoon.', '後一句請她選時間，前面要先給可以選的時段。'),
      (7, ['which', 'who', 'where', 'what'], 'which', '補充說明 our main office（東西），而且後面接動詞 is，用 which。'),
      (8, ['bring', 'brings', 'brought', 'bringing'], 'bring', 'Please 後面接動詞原形 bring。')])

c.p7("Nora Kim (10:12 a.m.): The delivery truck just arrived, but the boxes are much heavier than I expected.\nSam Ellis (10:13 a.m.): Do you need a hand?\n"
     "Nora Kim (10:13 a.m.): Yes, please! I'm at the back entrance.\nSam Ellis (10:14 a.m.): On my way.",
     [("What is Ms. Kim's problem?", 'Kim 小姐遇到什麼問題？', 'Some boxes are heavy.', ['A truck is late.', 'An entrance is locked.'], 'the boxes are much heavier than I expected.'),
      ('At 10:13 a.m., what does Mr. Ellis mean when he writes, "Do you need a hand?"', '10:13 時 Ellis 先生寫「Do you need a hand?」是什麼意思？', 'He is offering to help.',
       ['He wants to shake hands.', 'He has hurt his hand.'], 'need a hand：需要幫忙。他主動要幫忙搬。')])
c.p7("Swimming Pool Rules\n• Pool hours: 6 a.m. to 9 p.m. daily\n• Children under 12 must be with an adult.\n• Please take a shower before entering the pool.\n"
     "• No food or glass bottles in the pool area.\nThe pool will be closed for cleaning every Monday from 6 a.m. to 10 a.m.",
     [('What must swimmers do before entering the pool?', '下水前必須做什麼？', 'Take a shower', ['Show a membership card', 'Buy a ticket'], 'Please take a shower before entering the pool.'),
      ('When is the pool closed for cleaning?', '游泳池什麼時候因清潔關閉？', 'On Monday mornings', ['Every evening', 'On Sunday afternoons'], 'every Monday from 6 a.m. to 10 a.m.')])
c.p7("Hotel Front Desk Clerk Wanted\n\nThe Seaside Hotel is looking for a front desk clerk to work evening shifts (3 p.m. to 11 p.m.). Duties include checking guests in and out, "
     "answering phone calls, and taking reservations. Applicants should speak English well; Japanese is a plus. Previous hotel experience is required. "
     "Please send your résumé to hr@seasidehotel.com by July 15.",
     [('What is one of the duties of the job?', '這份工作的職責之一是什麼？', 'Answering phone calls', ['Cleaning rooms', 'Cooking breakfast'], 'Duties include… answering phone calls。'),
      ('What is required for the job?', '這份工作需要什麼條件？', 'Hotel experience', ['Japanese ability', "A driver's license"],
       'Previous hotel experience is required. 日文只是加分（a plus）。'),
      ('When will the clerk work?', '這個職位什麼時候上班？', 'In the evenings', ['In the mornings', 'On weekends only'], 'evening shifts (3 p.m. to 11 p.m.)。')])
c.p7("To: David Kim\nFrom: Rosa Martinez\nDate: September 18\nSubject: Thank you\n\nDear Mr. Kim,\nThank you for speaking at our company's annual conference last Friday. "
     "Many of our employees told me that your talk on time management was the best part of the day. I have attached a small gift card as a thank-you. "
     "We would be happy to invite you again next year.\n\nBest regards,\nRosa Martinez\nEvent Coordinator",
     [('Why did Ms. Martinez write the email?', 'Martinez 小姐為什麼寫這封信？', 'To thank a speaker', ['To invite employees to a conference', 'To ask for a gift'],
       'Thank you for speaking at our conference：感謝講者。'),
      ("What was Mr. Kim's talk about?", 'Kim 先生演講的主題是什麼？', 'Time management', ['Marketing', 'Event planning'], 'your talk on time management。'),
      ('What is attached to the email?', '信裡附上了什麼？', 'A gift card', ['A schedule', 'A contract'], 'I have attached a small gift card.')])
c.p7("Local Library Adds Weekend Story Time\n\nStarting this Saturday, the Pine Hill Library will hold a story time for children aged 3 to 6 every Saturday at 10 a.m. "
     "Volunteers will read picture books, and children can make simple crafts afterward. The event is free, but space is limited to 20 children, so parents should sign up "
     "at the front desk in advance. \"We want children to love books from an early age,\" said head librarian Mia Torres.",
     [('Who is the event for?', '這個活動是給誰參加的？', 'Young children', ['Teenagers', 'Volunteers'], 'for children aged 3 to 6：三到六歲的小孩。'),
      ('What should parents do?', '家長應該做什麼？', 'Sign up in advance', ['Pay a small fee', 'Bring picture books'], 'parents should sign up at the front desk in advance。活動是免費的。'),
      ('Who is Mia Torres?', 'Mia Torres 是誰？', 'A librarian', ['A volunteer', 'A parent'], 'head librarian Mia Torres：圖書館館長。')])
c.p7("MEMO\nTo: All Employees\nFrom: IT Department\nDate: February 3\nSubject: Password Update\n\nFor security reasons, all employees must change their computer passwords "
     "by February 14. New passwords must be at least 10 characters long and include at least one number. Please do not use the same password you have used before. "
     "If you have trouble, visit the IT help desk on the second floor or call extension 402. Employees who do not update their passwords by the deadline will be unable to log in.",
     [('What is the memo about?', '這份備忘錄是關於什麼？', 'Changing passwords', ['Buying new computers', 'Moving the help desk'], 'must change their computer passwords。'),
      ('What is a requirement for new passwords?', '新密碼有什麼規定？', 'They must include a number.', ['They must be 14 characters long.', 'They must be the same as the old one.'],
       'include at least one number。14 是截止日期，不是長度。'),
      ('Where is the IT help desk?', '資訊服務台在哪裡？', 'On the second floor', ['On the fourth floor', 'In the lobby'], 'the IT help desk on the second floor。'),
      ('What will happen if employees miss the deadline?', '如果員工超過期限會怎樣？', 'They will not be able to log in.', ['They will have to pay a fee.', 'They will lose their files.'],
       'will be unable to log in：無法登入。')])
c.p7("[Price List]\nSunrise Catering — Lunch Boxes\n• Sandwich Box: $8\n• Pasta Box: $10\n• Salad Box (vegetarian): $9\nOrders of 30 boxes or more: free delivery\n"
     "Orders must be placed at least two days in advance.\n\n[Email]\nTo: orders@sunrisecatering.com\nFrom: Helen Brooks\nDate: October 7\n\nHello,\n"
     "I would like to order lunch for a training session on October 10. We will have 25 people. Twenty of them would like pasta, and the other five are vegetarian. "
     "Please deliver the food to Room 12, Kent Building, by 11:45 a.m.\n\nThank you,\nHelen Brooks",
     [('Why is Ms. Brooks ordering food?', 'Brooks 小姐為什麼訂餐？', 'For a training session', ['For a birthday party', 'For a client dinner'], 'order lunch for a training session。'),
      ('How many Pasta Boxes does Ms. Brooks need?', 'Brooks 小姐需要幾個義大利麵餐盒？', '20', ['25', '5'], 'Twenty of them would like pasta.'),
      ('What will Ms. Brooks most likely order for the vegetarians?', 'Brooks 小姐最可能幫素食者訂什麼？', 'Salad Boxes', ['Sandwich Boxes', 'Pasta Boxes'],
       '價目表上標示 vegetarian 的是 Salad Box。'),
      ('What is suggested about the order?', '關於這筆訂單，可以推論出什麼？', 'It will not get free delivery.', ['It was placed too late.', 'It will be delivered to a restaurant.'],
       '25 盒不到 30 盒，所以不免運。10/7 訂 10/10 的餐，有提早兩天以上，不算太晚。'),
      ('How much will the lunch boxes cost in total?', '餐盒總共多少錢？', '$245', ['$250', '$225'], '20 × $10 ＋ 5 × $9 ＝ $200 ＋ $45 ＝ $245。')])
c.p7("[Flyer]\nRiverside Fun Run — Sunday, May 18\n• 5 km run: starts at 8:00 a.m.\n• 10 km run: starts at 7:30 a.m.\nRegistration: $25 (before May 1), $35 (after May 1)\n"
     "All runners will receive a free T-shirt.\nMoney raised will go to the City Children's Hospital.\n\n[Text messages]\n"
     "Leo (May 3, 9:10 p.m.): I just signed up for the 10 km run! Do you want to join me?\nMaya (May 3, 9:12 p.m.): Sounds fun, but 10 km is too long for me. I'll do the shorter one.\n"
     "Leo (May 3, 9:13 p.m.): Great! Let's meet at the park after your race.",
     [('What is the purpose of the event?', '這個活動的目的是什麼？', 'To raise money for a hospital', ['To open a new park', 'To sell T-shirts'],
       "Money raised will go to the City Children's Hospital：募款給兒童醫院。"),
      ('How much did Leo most likely pay to register?', 'Leo 報名最可能付了多少錢？', '$35', ['$25', '$10'], 'Leo 在 May 3 報名，已經過了 May 1，所以是 $35。'),
      ("What time will Maya's race start?", 'Maya 的比賽幾點開始？', '8:00 a.m.', ['7:30 a.m.', '9:10 a.m.'], 'Maya 選較短的（5 km），8:00 a.m. 開始。'),
      ('What will all runners receive?', '所有跑者都會得到什麼？', 'A T-shirt', ['A medal', 'A free drink'], 'All runners will receive a free T-shirt.'),
      ("Why won't Maya run 10 km?", 'Maya 為什麼不跑 10 公里？', 'It is too long for her.', ['She has to work.', 'It is too expensive.'], '10 km is too long for me.')])
mock_lesson('mock-3', '半長模擬考 C', 'Half Mock Test C', c.items)

V21_MOCK = ['mock-2', 'mock-3']
