# 2.1 新增：多益 Part 1～7 課程（每個 Part 補到約 5 課），聽力加入英式口音（B、BM）
# 由 build_content.py 執行（共用 say／multi／q／lesson／p1_item／conv_q／talk_q／p6／p7）

def tlesson(lid, ttype, title, titleEn, summary, concept, head, rows, tip, examples, questions, similar, ext,
            minutes=12, intro='先看題目，再作答。答錯會再出一題類似的。', ext_title='延伸練習'):
    steps = [{'kind': 'concept', 'title': '重點觀念', 'body': concept},
             {'kind': 'explain', 'title': '解題技巧', 'body': ['先記住這張表：'], 'table': {'head': head, 'rows': rows}, 'tip': tip}]
    if examples:
        steps.append({'kind': 'examples', 'title': '聽聽看', 'items': [
            {'en': en, 'zh': zh, 'highlight': hl, 'audio': say(f'assets/audio/lessons/{lid}/ex{i + 1}.mp3', en, v)}
            for i, (en, zh, hl, v) in enumerate(examples)]})
    steps += [{'kind': 'practice', 'title': '模擬練習', 'intro': intro, 'questions': questions, 'similar': similar},
              {'kind': 'review', 'title': '答案解析'},
              {'kind': 'practice', 'title': ext_title, 'intro': '多練兩題，加深印象。', 'questions': ext}]
    lesson({'id': lid, 'world': 'toeic', 'order': 0, 'type': ttype, 'title': title, 'titleEn': titleEn, 'summary': summary,
            'minutes': minutes, 'steps': steps})

def ext_q(id, prompt, options, answer, expl, **kw):
    return q(id, id, prompt, options, answer, expl, **kw)

# ================================================================ Part 1
P1_HEAD = ['句子長相', '意思', '照片裡沒有人時']
P1_ROWS = [['is／are ＋ 形容詞', '狀態：The door is open.', '常常是答案'],
           ['has／have been ＋ p.p.', '已經被放好：Cups have been placed on the table.', '常常是答案'],
           ['is／are being ＋ p.p.', '正在被做：The table is being cleaned.', '要有人正在做才對，沒有人通常是錯的'],
           ['A man／woman is ＋ V-ing', '某人正在做某事', '照片沒有人 → 直接刪掉']]

tlesson('toeic-p1-2', 'toeic-listen', 'Part 1 物品的狀態', 'Describing Objects',
    '照片裡沒有人的時候，聽「東西在哪裡、是什麼狀態」。',
    ['Part 1 常常出現沒有人的照片：倉庫、大廳、茶水間。這時候句子會描述東西的位置和狀態。',
     '狀態的說法很固定：is open（開著）、is closed（關著）、are stacked（疊起來）、is hanging（掛著）、is empty（空的）。'],
    P1_HEAD, P1_ROWS, '照片裡沒有人，句子卻說 A man is…，第一個刪掉。',
    [('The door is open.', '門是開著的。', 'open', W), ('Some boxes are stacked on the floor.', '有些箱子疊在地上。', 'stacked', BM),
     ('A picture is hanging on the wall.', '牆上掛著一幅畫。', 'hanging', B), ('No one is in the meeting room.', '會議室裡沒有人。', 'one', M)],
    [p1_item('p12-boxes-a', 'p12-boxes', 'boxes', ['Some boxes are stacked on the floor.', 'The door is closed.', 'A man is carrying a box.', 'The boxes are on a truck.'], 'A',
             ['有些箱子疊在地上', '門是關著的', '一名男子在搬箱子', '箱子在卡車上']),
     p1_item('p12-lobby-a', 'p12-lobby', 'lobby', ['A sofa is next to a window.', 'A woman is sitting on the sofa.', 'A picture is hanging on the wall.', 'The lamp is broken.'], 'C',
             ['沙發在窗戶旁邊', '一名女子坐在沙發上', '牆上掛著一幅畫', '檯燈壞了']),
     p1_item('p12-kitchen-a', 'p12-kitchen', 'kitchen', ['The cabinet doors are open.', 'Some cups are on a shelf.', 'A woman is making coffee.', 'The microwave is on the floor.'], 'B',
             ['櫥櫃門是開著的', '架子上有一些杯子', '一名女子在泡咖啡', '微波爐在地上']),
     p1_item('p12-room-a', 'p12-room', 'meeting-room', ['A man is giving a presentation.', 'The whiteboard is on the floor.', 'The cups are being washed.', 'No one is in the meeting room.'], 'D',
             ['一名男子在做簡報', '白板在地上', '杯子正在被清洗', '會議室裡沒有人'])],
    [p1_item('p12-boxes-b', 'p12-boxes', 'boxes', ['The cart is full of boxes.', 'A door has been left open.', 'Some boxes are being opened.', 'The floor is wet.'], 'B',
             ['推車上裝滿了箱子', '有一扇門開著', '有些箱子正在被打開', '地板是濕的']),
     p1_item('p12-lobby-b', 'p12-lobby', 'lobby', ['A plant is on the sofa.', 'Some people are waiting in the lobby.', 'The picture is lying on the floor.', 'A lamp is standing next to the sofa.'], 'D',
             ['植物在沙發上', '有些人在大廳等待', '畫放倒在地上', '一盞燈立在沙發旁邊']),
     p1_item('p12-kitchen-b', 'p12-kitchen', 'kitchen', ['A microwave is on the counter.', 'The shelf is empty.', 'Someone is washing the cups.', 'A kettle is on the shelf.'], 'A',
             ['微波爐在流理台上', '架子是空的', '有人在洗杯子', '水壺在架子上']),
     p1_item('p12-room-b', 'p12-room', 'meeting-room', ['Some cups have been placed on the table.', 'The chairs are being moved.', 'People are drinking coffee.', 'There is nothing on the table.'], 'A',
             ['桌上已經放了一些杯子', '椅子正在被搬動', '大家在喝咖啡', '桌上什麼都沒有'])],
    [ext_q('p12-x1', 'stacked 是什麼意思？', ['疊起來的', '壞掉的', '被搬走的'], '疊起來的', 'be stacked：疊放著。Part 1 很常考。'),
     ext_q('p12-x2', 'The door has been left open. 是什麼意思？', ['門被打開著（維持開著的狀態）', '門正在被打開', '門被鎖上了'], '門被打開著（維持開著的狀態）',
           'has been left open：被留著開著，描述現在的狀態。正在被打開是 is being opened。')],
    intro='先看照片，再按 ▶ 聽 4 個句子。')

tlesson('toeic-p1-3', 'toeic-listen', 'Part 1 進行式陷阱', 'Being vs. Been',
    '分清楚 is being（正在被做）和 has been（已經被做好）。',
    ['Part 1 最常見的陷阱：照片裡沒有人，選項卻用 is being ＋ p.p.（正在被…），表示有人正在做這件事，通常是錯的。',
     '如果是 has been／have been ＋ p.p.（已經被…），描述的是現在看到的狀態，常常是正確答案。',
     '例如桌上已經擺好盤子：The table has been set.（對）；The table is being set.（錯，沒有人在擺）。'],
    P1_HEAD, P1_ROWS, '聽到 being 先停一下：照片裡有沒有人「正在」做這件事？',
    [('Some fruit has been placed in baskets.', '水果已經被放在籃子裡。', 'placed', B), ('The table has been set for two people.', '桌子已經擺好兩人份的餐具。', 'set', W),
     ('Some suitcases have been lined up in a row.', '一些行李箱已經排成一排。', 'lined', BM), ('The table is being cleaned.', '桌子正在被擦。', 'being', M)],
    [p1_item('p13-market-a', 'p13-market', 'market', ['Fruit is being picked from a tree.', 'Some fruit has been placed in baskets.', 'A customer is paying for fruit.', 'The baskets are empty.'], 'B',
             ['水果正在從樹上被摘下', '水果已經被放在籃子裡', '一位顧客在付水果錢', '籃子是空的']),
     p1_item('p13-rest-a', 'p13-rest', 'restaurant', ['A waiter is setting the table.', 'The plates are being washed.', 'The table has been set for two people.', 'Two people are eating dinner.'], 'C',
             ['服務生在擺餐具', '盤子正在被清洗', '桌子已經擺好兩人份的餐具', '兩個人在吃晚餐']),
     p1_item('p13-bags-a', 'p13-bags', 'luggage', ['Suitcases are being loaded onto a plane.', 'Some suitcases have been lined up in a row.', 'A traveler is opening a bag.', 'The window is being cleaned.'], 'B',
             ['行李箱正在被裝上飛機', '一些行李箱已經排成一排', '一名旅客在打開包包', '窗戶正在被清潔']),
     p1_item('p13-desk-a', 'p13-desk', 'desk', ['The laptop is being repaired.', 'A plant has been placed next to the laptop.', 'Someone is typing on the laptop.', 'The desk is being moved.'], 'B',
             ['筆電正在被修理', '筆電旁邊放了一盆植物', '有人在用筆電打字', '桌子正在被搬動'])],
    [p1_item('p13-market-b', 'p13-market', 'market', ['Fruit is displayed in baskets.', 'The awning is being repaired.', 'A man is selling vegetables.', 'The table is being cleaned.'], 'A',
             ['水果陳列在籃子裡', '遮雨棚正在被修理', '一名男子在賣蔬菜', '桌子正在被擦']),
     p1_item('p13-rest-b', 'p13-rest', 'restaurant', ['The chairs are being stacked.', 'Some flowers have been put in a vase.', 'Someone is pouring water.', 'The glasses are full of juice.'], 'B',
             ['椅子正在被疊起來', '花已經被插在花瓶裡', '有人在倒水', '杯子裡裝滿了果汁']),
     p1_item('p13-bags-b', 'p13-bags', 'luggage', ['An airplane can be seen through the window.', 'The suitcases are being carried.', 'People are boarding the plane.', 'The bags are on a cart.'], 'A',
             ['從窗戶可以看到一架飛機', '行李箱正在被搬運', '大家正在登機', '包包在推車上']),
     p1_item('p13-desk-b', 'p13-desk', 'desk', ['The laptop has been left open.', 'A woman is watering the plant.', 'The chair is being cleaned.', 'Papers are being printed.'], 'A',
             ['筆電開著沒有關', '一名女子在幫植物澆水', '椅子正在被清潔', '文件正在被列印'])],
    [ext_q('p13-x1', '照片裡沒有人，哪一句最可能是錯的？', ['The chairs are being moved.', 'The chairs have been arranged.', 'The chairs are empty.'], 'The chairs are being moved.',
           'are being moved 表示有人正在搬，照片裡沒有人就不對。'),
     ext_q('p13-x2', 'Fruit is displayed. 是什麼意思？', ['水果被陳列著', '水果正在被吃', '水果壞掉了'], '水果被陳列著', 'be displayed：被陳列、展示。')],
    intro='先看照片，再按 ▶ 聽 4 個句子。')

tlesson('toeic-p1-4', 'toeic-listen', 'Part 1 戶外與交通', 'Outdoors & Transport',
    '街道、公車站、公園：戶外照片常考的說法。',
    ['戶外照片常出現車子、紅綠燈、長椅、樹木。要聽懂 is parked（停著）、beside（在旁邊）、no one（沒有人）。',
     'No one is sitting on the bench. 和 The bench is empty. 意思一樣：長椅上沒有人。'],
    ['說法', '意思', '例句'],
    [['be parked', '停放著', 'A car is parked on the street.'],
     ['beside／next to', '在旁邊', 'There is a tree beside the road.'],
     ['no one／nobody', '沒有人', 'No one is sitting on the bench.'],
     ['over', '在上方（有覆蓋）', 'There is a roof over the bench.']],
    '照片裡的車子是「停著」還是「在開」？停著用 is parked，正在開用 is driving。',
    [('A car is parked on the street.', '一輛車停在街上。', 'parked', BM), ('No one is sitting on the bench.', '沒有人坐在長椅上。', 'one', W),
     ('There is a tree beside the road.', '路旁有一棵樹。', 'beside', B), ('There is a roof over the bench.', '長椅上方有遮雨棚。', 'over', M)],
    [p1_item('p14-street-a', 'p14-street', 'street', ['A car is parked on the street.', 'A bus is stopping at the light.', 'People are crossing the road.', 'The building is being built.'], 'A',
             ['一輛車停在街上', '一輛公車停在紅綠燈前', '有人在過馬路', '大樓正在興建中']),
     p1_item('p14-stop-a', 'p14-stop', 'bus-stop', ['People are waiting for a bus.', 'A bus is arriving.', 'The bench is being painted.', 'No one is sitting on the bench.'], 'D',
             ['大家在等公車', '公車正在進站', '長椅正在被油漆', '沒有人坐在長椅上']),
     p1_item('p14-park-a', 'p14-park', 'park', ['The bench is occupied.', 'The sun is shining in the sky.', 'It is raining.', 'Some children are riding bikes.'], 'B',
             ['長椅上有人坐', '太陽在天空中照耀', '正在下雨', '有些小孩在騎腳踏車']),
     p1_item('p14-road-a', 'p14-road', 'street', ['The road is being repaired.', 'A car is driving into a garage.', 'There is a tree beside the road.', 'Trucks are parked in a row.'], 'C',
             ['道路正在被修理', '一輛車正開進車庫', '路旁有一棵樹', '卡車停成一排'])],
    [p1_item('p14-street-b', 'p14-street', 'street', ['A tree is being cut down.', 'Cars are waiting at a traffic light.', 'A traffic light is next to a building.', 'The street is crowded.'], 'C',
             ['一棵樹正在被砍倒', '車子在等紅綠燈', '紅綠燈在大樓旁邊', '街上很擁擠']),
     p1_item('p14-stop-b', 'p14-stop', 'bus-stop', ['A bus stop sign is next to a shelter.', 'Some passengers are getting off a bus.', 'The bench is covered with snow.', 'A man is reading a sign.'], 'A',
             ['公車站牌在候車亭旁邊', '有些乘客正在下公車', '長椅被雪覆蓋', '一名男子在看告示']),
     p1_item('p14-park-b', 'p14-park', 'park', ['Leaves are being raked.', 'A bicycle has been parked near a tree.', 'A woman is sitting on the bench.', 'The bicycle is lying on the grass.'], 'B',
             ['落葉正在被耙起來', '一輛腳踏車停在樹附近', '一名女子坐在長椅上', '腳踏車倒在草地上']),
     p1_item('p14-road-b', 'p14-road', 'bus-stop', ['A bus is parked at the stop.', 'There is a roof over the bench.', 'People are standing in line.', 'The sign is lying on the ground.'], 'B',
             ['一輛公車停在站牌', '長椅上方有遮雨棚', '大家在排隊', '站牌倒在地上'])],
    [ext_q('p14-x1', 'The bench is empty. 和哪一句意思一樣？', ['No one is sitting on the bench.', 'The bench is being moved.', 'Someone is on the bench.'], 'No one is sitting on the bench.',
           'empty（空的）＝ no one is sitting（沒有人坐）。多益很愛換句話說。'),
     ext_q('p14-x2', 'be parked 是什麼意思？', ['停放著', '正在開車', '被修理'], '停放著', 'A car is parked…：車子停著。')],
    intro='先看照片，再按 ▶ 聽 4 個句子。')

tlesson('toeic-p1-5', 'toeic-listen', 'Part 1 刪去法綜合練習', 'Elimination Practice',
    '用刪去法：名詞不對、動作不對、沒有的人，一個一個刪。',
    ['Part 1 不一定要聽懂每個字。只要確定三個選項是錯的，剩下的就是答案。',
     '常見錯誤：說了照片裡沒有的東西、動作不對（is being…）、位置不對（on／under 弄反）。'],
    ['錯在哪裡', '例子', '怎麼抓'],
    [['東西不對', '照片是水壺，句子說 coffee pot', '聽到照片沒有的名詞就刪'],
     ['動作不對', 'The cups are being washed.', '沒有人在洗 → 刪'],
     ['位置不對', 'The microwave is on the floor.', '在流理台上，不是地上 → 刪'],
     ['人不對', 'A man is pushing a cart.', '照片沒有人 → 刪']],
    '聽的時候在心裡打 ✓ 或 ✕，四句聽完再選。',
    [('There are price signs in front of the baskets.', '籃子前面有價格牌。', 'signs', W), ('A hand truck is next to the boxes.', '手推車在箱子旁邊。', 'truck', BM),
     ('A kettle is on the counter.', '水壺在流理台上。', 'kettle', B), ('The suitcases are different colors.', '行李箱的顏色都不一樣。', 'colors', M)],
    [p1_item('p15-market-a', 'p15-market', 'market', ['The fruit is being weighed.', 'There are price signs in front of the baskets.', 'The stand is closed.', 'A shopper is holding a basket.'], 'B',
             ['水果正在被秤重', '籃子前面有價格牌', '攤位關了', '一位顧客拿著籃子']),
     p1_item('p15-boxes-a', 'p15-boxes', 'boxes', ['A hand truck is next to the boxes.', 'Workers are moving boxes.', 'The door is being locked.', 'The boxes have been opened.'], 'A',
             ['手推車在箱子旁邊', '工人在搬箱子', '門正在被鎖上', '箱子已經被打開了']),
     p1_item('p15-kitchen-a', 'p15-kitchen', 'kitchen', ['A kettle is on the counter.', 'Someone is heating food.', 'The cups are being washed.', 'The cabinets are open.'], 'A',
             ['水壺在流理台上', '有人在加熱食物', '杯子正在被清洗', '櫥櫃是開著的']),
     p1_item('p15-bags-a', 'p15-bags', 'luggage', ['The suitcases are different colors.', 'Travelers are checking in.', 'A plane is landing on the road.', 'The bags are being opened.'], 'A',
             ['行李箱的顏色都不一樣', '旅客正在辦理報到', '一架飛機降落在馬路上', '包包正在被打開'])],
    [p1_item('p15-market-b', 'p15-market', 'market', ['Vegetables are piled on the ground.', 'A worker is setting up the awning.', 'Some fruit is on display under an awning.', 'The baskets are stacked on top of each other.'], 'C',
             ['蔬菜堆在地上', '一名工人在架設遮雨棚', '遮雨棚下陳列著水果', '籃子疊在一起']),
     p1_item('p15-boxes-b', 'p15-boxes', 'boxes', ['The boxes are on a shelf.', 'Some boxes are piled on top of each other.', 'A man is pushing a cart.', 'The door is being painted.'], 'B',
             ['箱子在架子上', '有些箱子堆疊在一起', '一名男子在推推車', '門正在被油漆']),
     p1_item('p15-kitchen-b', 'p15-kitchen', 'kitchen', ['The microwave door is open.', 'Some cups have been put on a shelf.', 'Water is boiling in a pot.', 'A man is cleaning the counter.'], 'B',
             ['微波爐的門是開著的', '架子上已經放了一些杯子', '鍋子裡的水正在沸騰', '一名男子在擦流理台']),
     p1_item('p15-bags-b', 'p15-bags', 'lobby', ['The sofa is being moved.', 'A guest is reading on the sofa.', 'There is a plant in the corner.', 'The picture is being taken down.'], 'C',
             ['沙發正在被搬動', '一位客人在沙發上看書', '角落有一盆植物', '畫正在被取下來'])],
    [ext_q('p15-x1', 'pile 是什麼意思？', ['堆疊', '推', '秤重'], '堆疊', 'be piled：被堆起來。和 stacked 意思接近。'),
     ext_q('p15-x2', 'on display 是什麼意思？', ['陳列中', '已售完', '正在送貨'], '陳列中', 'on display：展示、陳列中。')],
    intro='先看照片，再按 ▶ 聽 4 個句子。')

# ================================================================ Part 2
def p2v(id, group, question, opts, answer_letter, zh_q, zh_opts, explain, qv=M, av=W, shown=None):
    letters = ['A', 'B', 'C']
    segs = [(qv, question)] + [(av, f'{l}. {o}') for l, o in zip(letters, opts)]
    path = multi(f'assets/audio/toeic/{id}.mp3', segs)
    show_q, show_o = shown if shown else (question, opts)
    transcript = f'{show_q}（{zh_q}）　' + '　'.join(f'({l}) {o}（{z}）' for l, o, z in zip(letters, show_o, zh_opts))
    return q(id, group, '聽問題和 3 個回答，選出最適合的回答', letters, answer_letter,
             f'{explain}\n逐字稿：{transcript}', audio=path, audioLabel='▶ 播放題目與選項')

P2_INTRO = '按 ▶ 聽問題和 3 個回答。考試時不會印出文字。'

tlesson('toeic-p2-2', 'toeic-listen', 'Part 2 What／Which／How 問句', 'Wh- Questions 2',
    '問時間、哪一個、多少錢、多久：抓住問句第一個字。',
    ['Part 2 每題只有一句問題和三個回答，問題的第一、二個字最重要。',
     'What time 問幾點；Which 問哪一個；How much 問多少錢；How long 問多久；Whose 問是誰的。',
     'Wh 問句不能用 Yes／No 回答，聽到 Yes 開頭的選項，通常可以先刪掉。'],
    ['問句', '問什麼', '好的回答'],
    [['What time…?', '幾點', 'At nine o\'clock.'],
     ['Which…?', '哪一個', 'The number fifteen.'],
     ['How much…?', '多少錢', "It's forty dollars."],
     ['How long…?', '多久', 'About one hour.'],
     ['Whose…?', '誰的', "I think it's Kevin's."]],
    '陷阱：選項重複問句裡的字（close／close、long／long），常常是錯的。',
    [('What time does the store close?', '這家店幾點關門？', 'time', M), ('Which bus goes to the airport?', '哪一班公車到機場？', 'Which', B),
     ('How much is this jacket?', '這件夾克多少錢？', 'much', BM), ('How long will the meeting last?', '會議會開多久？', 'long', W)],
    [p2v('p22-time-a', 'p22-time', 'What time does the store close?', ["At nine o'clock.", "It's close to the station.", 'Yes, it is.'], 'A',
         '這家店幾點關門？', ['九點', '它離車站很近', '是的，它是'], 'What time 問時間。(B) 的 close 是「靠近」，和「關門」同字不同意思，是陷阱。'),
     p2v('p22-which-a', 'p22-which', 'Which bus goes to the airport?', ['About an hour.', 'The number fifteen.', "Yes, I'm going."], 'B',
         '哪一班公車到機場？', ['大約一小時', '15 號', '是的，我要去'], 'Which 問哪一個，回答「15 號公車」。', qv=B),
     p2v('p22-much-a', 'p22-much', 'How much is this jacket?', ["It's forty dollars.", 'Yes, very much.', 'In the blue box.'], 'A',
         '這件夾克多少錢？', ['四十美元', '是的，非常', '在藍色的盒子裡'], 'How much 問價錢。(B) 重複 much，是陷阱。', av=BM),
     p2v('p22-long-a', 'p22-long', 'How long will the meeting last?', ['In the main hall.', "It's a long table.", 'About one hour.'], 'C',
         '會議會開多久？', ['在大廳', '那是一張長桌', '大約一小時'], 'How long 問多久，回答「大約一小時」。(B) 重複 long，是陷阱。'),
     p2v('p22-whose-a', 'p22-whose', 'Whose umbrella is this?', ["It's raining.", "I think it's Kevin's.", 'Yes, it is.'], 'B',
         '這是誰的雨傘？', ['在下雨', '我想是 Kevin 的', '是的，它是'], 'Whose 問是誰的，回答「Kevin 的」。', qv=BM, av=B)],
    [p2v('p22-time-b', 'p22-time', 'What time is your flight?', ['Gate twenty.', 'It leaves at noon.', 'I flew to Paris.'], 'B',
         '你的班機是幾點？', ['20 號登機門', '中午起飛', '我飛去巴黎了'], 'What time 問時間，回答「中午」。'),
     p2v('p22-which-b', 'p22-which', 'Which room is the meeting in?', ['Room three oh two.', "At two o'clock.", 'I meet him often.'], 'A',
         '會議在哪一間會議室？', ['302 室', '兩點', '我常常見到他'], 'Which room 問哪一間，回答「302 室」。(C) 的 meet 和 meeting 很像，是陷阱。', qv=B,
         shown=('Which room is the meeting in?', ['Room 302.', "At two o'clock.", 'I meet him often.'])),
     p2v('p22-much-b', 'p22-much', 'How much does the ticket cost?', ['At the ticket office.', 'Twelve dollars.', 'It takes two hours.'], 'B',
         '這張票多少錢？', ['在售票處', '十二美元', '要花兩個小時'], 'How much 問價錢，回答「十二美元」。', av=BM),
     p2v('p22-long-b', 'p22-long', 'How long have you worked here?', ['For three years.', 'Every day.', "It's a long way."], 'A',
         '你在這裡工作多久了？', ['三年了', '每天', '路很遠'], 'How long 問多久，回答「三年」。'),
     p2v('p22-whose-b', 'p22-whose', 'Whose turn is it to clean the kitchen?', ["It's Maria's.", 'Turn left.', 'The kitchen is big.'], 'A',
         '輪到誰打掃廚房？', ['輪到 Maria', '左轉', '廚房很大'], 'Whose turn 問輪到誰，回答「Maria」。(B) 重複 turn，是陷阱。', qv=BM, av=B)],
    [ext_q('p22-x1', '「會議要開多久？」英文怎麼問？', ['How long will the meeting last?', 'How much will the meeting last?', 'What time will the meeting last?'], 'How long will the meeting last?', '問「多久」用 How long。'),
     ext_q('p22-x2', 'Wh 問句（What、Where…）的回答，哪一種通常是錯的？', ['用 Yes 或 No 開頭', '說出時間或地點', '說「我不確定」'], '用 Yes 或 No 開頭', 'Wh 問句要回答具體內容，不能只說 Yes／No。')],
    intro=P2_INTRO)

tlesson('toeic-p2-3', 'toeic-listen', 'Part 2 選擇疑問句', 'Choice Questions',
    'A or B? 的問題：選一個、兩個都可以，或都不要。',
    ['選擇疑問句長這樣：Would you like tea or coffee?（你要茶還是咖啡？）',
     '這種問題不能用 Yes／No 回答。好的回答是選其中一個、說「都可以」（Either is fine.）或「我都不介意」（I don\'t mind.）。'],
    ['回答方式', '例子', '意思'],
    [['選一個', 'Coffee, please.', '請給我咖啡'],
     ['都可以', 'Either is fine with me.', '哪一個都可以'],
     ['不介意', "I don't mind.", '我都不介意'],
     ['換個說法選', "It's only five minutes, so let's walk.", '只要五分鐘，走路吧']],
    '聽到 or，Yes 開頭的選項幾乎都是錯的。',
    [('Would you like tea or coffee?', '你要茶還是咖啡？', 'or', B), ('Either is fine with me.', '我哪一個都可以。', 'Either', W),
     ("I don't mind.", '我都不介意。', 'mind', BM), ('Coffee, please.', '請給我咖啡。', 'Coffee', M)],
    [p2v('p23-drink-a', 'p23-drink', 'Would you like tea or coffee?', ['Yes, please.', 'Coffee, please.', 'At the café.'], 'B',
         '你要茶還是咖啡？', ['是的，麻煩了', '請給我咖啡', '在咖啡店'], '選擇疑問句要選一個。(A) Yes 不能回答 A or B。', qv=B),
     p2v('p23-walk-a', 'p23-walk', 'Should we take a taxi or walk?', ["It's only five minutes, so let's walk.", 'I talked to him.', 'Yes, a taxi driver.'], 'A',
         '我們要搭計程車還是走路？', ['只要五分鐘，走路吧', '我跟他談過了', '是的，計程車司機'], '選走路，還說了原因。(B) talked 和 walk 發音像，是陷阱。'),
     p2v('p23-color-a', 'p23-color', 'Do you prefer the red one or the blue one?', ['Either is fine with me.', 'I read it yesterday.', 'Yes, I prefer.'], 'A',
         '你比較喜歡紅色的還是藍色的？', ['哪一個都可以', '我昨天讀過了', '是的，我比較喜歡'], 'Either is fine：都可以。(B) read 和 red 發音一樣，是陷阱。', qv=BM),
     p2v('p23-pay-a', 'p23-pay', 'Will you pay by cash or credit card?', ['Credit card, please.', "It's very expensive.", "I'll pay attention."], 'A',
         '你要付現還是刷卡？', ['刷卡，謝謝', '這很貴', '我會注意'], '選刷卡。(C) pay attention 是「注意」，重複 pay 是陷阱。', av=B),
     p2v('p23-file-a', 'p23-file', 'Should I email the file or print it?', ['Just email it, please.', 'The printer is new.', 'Yes, the file.'], 'A',
         '這個檔案我要用 email 寄還是印出來？', ['用 email 寄就好', '印表機是新的', '是的，那個檔案'], '選 email。(B) printer 和 print 很像，是陷阱。', qv=B, av=BM)],
    [p2v('p23-drink-b', 'p23-drink', 'Do you want to sit inside or outside?', ["Outside, if it's not too cold.", 'Yes, I do.', "It's a nice seat."], 'A',
         '你想坐室內還是室外？', ['室外，如果不會太冷的話', '是的，我想', '這是個好位子'], '選室外，還加上條件。', qv=B),
     p2v('p23-walk-b', 'p23-walk', 'Is the meeting on Monday or Tuesday?', ['Yes, on Monday.', "It's on Tuesday.", 'Every week.'], 'B',
         '會議是星期一還是星期二？', ['是的，星期一', '在星期二', '每週'], '選星期二。(A) 有 Yes，不能回答 A or B。'),
     p2v('p23-color-b', 'p23-color', 'Would you like a window seat or an aisle seat?', ["I don't mind.", 'Yes, I would.', 'The window is open.'], 'A',
         '你要靠窗還是靠走道的座位？', ['我都可以', '是的，我要', '窗戶是開的'], "I don't mind：我都不介意。", qv=BM),
     p2v('p23-pay-b', 'p23-pay', 'Are you driving or taking the train?', ["I'll take the train.", "Yes, it's raining.", "He's a good driver."], 'A',
         '你要開車還是搭火車？', ['我會搭火車', '是的，在下雨', '他是個好司機'], '選搭火車。(B) raining 和 train 音很像，是陷阱。', av=B),
     p2v('p23-file-b', 'p23-file', 'Do you want to eat now or later?', ["Let's eat later.", "Yes, it's late.", 'I ate a sandwich yesterday.'], 'A',
         '你想現在吃還是晚點吃？', ['晚點再吃吧', '是的，很晚了', '我昨天吃了三明治'], '選晚點。(B) late 和 later 很像，是陷阱。', qv=B, av=BM)],
    [ext_q('p23-x1', 'Either is fine with me. 是什麼意思？', ['哪一個都可以', '兩個都不要', '我已經選好了'], '哪一個都可以', 'either：兩者之中任一個。'),
     ext_q('p23-x2', 'A or B 的選擇疑問句，哪一種回答幾乎都錯？', ['Yes 開頭的回答', '選其中一個', "I don't mind."], 'Yes 開頭的回答', '選擇疑問句不能用 Yes／No 回答。')],
    intro=P2_INTRO)

tlesson('toeic-p2-4', 'toeic-listen', 'Part 2 間接回答與直述句', 'Indirect Responses',
    '最難的 Part 2：答案不直接回答，但意思接得上。',
    ['多益 Part 2 的正確答案不一定直接回答問題。例如問「報告在哪？」，回答「朴小姐拿走了」，也是好的回答。',
     '常見的間接回答：I\'m not sure.（我不確定）、Let me check.（我查一下）、I haven\'t heard yet.（我還沒聽說）。',
     '有些題目不是問句，而是一句話（直述句），例如「印表機又沒紙了」，回答要接得上：「我去拿一些」。'],
    ['類型', '題目', '好的回答'],
    [['間接回答', 'Where is the sales report?', 'Ms. Park has it.'],
     ['不知道', 'When does the new manager start?', "I haven't heard yet."],
     ['查一下', 'Who is going to lead the training?', 'Let me check the schedule.'],
     ['直述句', 'The printer is out of paper again.', "I'll get some more."]],
    '問自己：如果我是對方，聽到這句話會覺得「接得上」嗎？',
    [("I haven't heard yet.", '我還沒聽說。', 'heard', W), ('Let me check the schedule.', '我查一下行程表。', 'check', BM),
     ("I'll get some more.", '我去拿一些來。', 'get', B), ('Did you check your bag?', '你找過你的包包了嗎？', 'check', M)],
    [p2v('p24-where-a', 'p24-where', 'Where is the sales report?', ['Ms. Park has it.', 'Sales are up.', 'Yes, it is.'], 'A',
         '業務報告在哪裡？', ['朴小姐拿著', '業績上升了', '是的，它是'], '間接回答：報告在朴小姐那裡。(B) 重複 sales，是陷阱。', av=B),
     p2v('p24-when-a', 'p24-when', 'When does the new manager start?', ["I haven't heard yet.", 'At the front desk.', 'Yes, she started a business.'], 'A',
         '新經理什麼時候開始上班？', ['我還沒聽說', '在櫃台', '是的，她創業了'], '「還沒聽說」是很常見的正確答案。', qv=BM),
     p2v('p24-paper-a', 'p24-paper', 'The printer is out of paper again.', ["I'll get some more.", 'Yes, I printed it.', "It's on the paper."], 'A',
         '印表機又沒紙了。', ['我去拿一些來', '是的，我印了', '在紙上'], '直述句：對方說沒紙，回答「我去拿」接得上。', qv=B),
     p2v('p24-why-a', 'p24-why', 'Why is the store closed today?', ["Because it's a holiday.", 'Close the door, please.', "Since nine o'clock."], 'A',
         '這家店今天為什麼沒開？', ['因為今天是假日', '請關門', '從九點開始'], 'Why 問原因，回答 Because…。'),
     p2v('p24-cold-a', 'p24-cold', "It's very cold in this room.", ["I'll turn up the heat.", "It's a large room.", 'Yes, I have a cold.'], 'A',
         '這個房間好冷。', ['我把暖氣開大', '這個房間很大', '是的，我感冒了'], '直述句：說冷，回答「開暖氣」。(C) have a cold 是感冒，是陷阱。', qv=BM, av=B)],
    [p2v('p24-where-b', 'p24-where', 'Where did you put the keys?', ["They're key points.", 'Check the top drawer.', 'Yes, I did.'], 'B',
         '你把鑰匙放在哪裡？', ['那些是重點', '看看最上面的抽屜', '是的，我放了'], '回答「去看抽屜」。(A) key points 是重點，是陷阱。', av=B),
     p2v('p24-when-b', 'p24-when', 'Who is going to lead the training?', ['Let me check the schedule.', 'The train was late.', 'In room five.'], 'A',
         '誰要帶這次的訓練？', ['我查一下行程表', '火車誤點了', '在五號室'], 'Let me check：我查一下，是常見的正確答案。(B) train 和 training 很像，是陷阱。', qv=BM),
     p2v('p24-paper-b', 'p24-paper', "I can't find my phone.", ['Did you check your bag?', "It's a new phone number.", 'Yes, I can.'], 'A',
         '我找不到我的手機。', ['你找過你的包包了嗎？', '這是新的電話號碼', '是的，我可以'], '用問句回答，提醒對方去找包包。', qv=B),
     p2v('p24-why-b', 'p24-why', "Why didn't you come to the party?", ['I had to work late.', 'It was a great party.', 'Yes, I came.'], 'A',
         '你為什麼沒來派對？', ['我得加班', '那是很棒的派對', '是的，我來了'], '說明原因：要加班。不一定要用 because。'),
     p2v('p24-cold-b', 'p24-cold', 'The client is waiting in the lobby.', ["I'll be right there.", 'She is a good client.', 'The lobby is on the first floor.'], 'A',
         '客戶在大廳等。', ['我馬上過去', '她是個好客戶', '大廳在一樓'], '直述句：客戶在等，回答「馬上過去」。', qv=BM, av=B)],
    [ext_q('p24-x1', "I haven't heard yet. 是什麼意思？", ['我還沒聽說', '我聽不清楚', '我已經聽過了'], '我還沒聽說', '多益 Part 2 很常出現的正確答案。'),
     ext_q('p24-x2', '「印表機沒紙了。」最好的回應是？', ["I'll get some more.", 'Yes, I printed it.', "It's a nice printer."], "I'll get some more.", '對方說出問題，回答要解決它。')],
    intro=P2_INTRO)

tlesson('toeic-p2-5', 'toeic-listen', 'Part 2 否定疑問、附加問句與提議', 'Negative & Tag Questions',
    "Didn't you…? …, aren't you? Why don't we…? 這些句子怎麼回答。",
    ['否定疑問句（Didn\'t you…?）和附加問句（…, isn\'t it?）都是在確認事情，回答時看事實：是就說 Yes，不是就說 No。',
     'Why don\'t we…? 不是問原因，而是「我們何不…？」的提議，用 Because 回答是陷阱。',
     'Could you…? Would you mind…? 是請求；Shall I…? Do you want me to…? 是主動幫忙。'],
    ['句子', '真正的意思', '好的回答'],
    [["Didn't you receive my email?", '你沒收到我的信嗎？', "Yes, I'm reading it now."],
     ["You're coming, aren't you?", '你會來，對吧？', "Yes, I'll be there."],
     ["Why don't we take a break?", '我們休息一下吧？', "That's a good idea."],
     ['Would you mind closing the window?', '你介意關窗嗎？', 'Not at all.（不介意，我來關）']],
    'Would you mind…? 回答 Not at all 或 No, not at all，表示「不介意，可以」。',
    [("Didn't you receive my email?", '你沒收到我的電子郵件嗎？', 'receive', BM), ("Why don't we take a break?", '我們休息一下吧？', 'break', B),
     ('Would you mind closing the window?', '你介意把窗戶關起來嗎？', 'mind', M), ('Shall I book a hotel for you?', '要我幫你訂飯店嗎？', 'Shall', W)],
    [p2v('p25-neg-a', 'p25-neg', "Didn't you receive my email?", ["Yes, I'm reading it now.", "I'll mail the letter.", "No, she didn't."], 'A',
         '你沒收到我的電子郵件嗎？', ['有，我正在看', '我會寄那封信', '不，她沒有'], '有收到就說 Yes。(C) 主詞 she 不對。', qv=BM),
     p2v('p25-tag-a', 'p25-tag', "You're coming to the meeting, aren't you?", ["Yes, I'll be there.", "It's in Room B.", "No, he isn't."], 'A',
         '你會來開會，對吧？', ['會，我會到', '在 B 會議室', '不，他不是'], '附加問句在確認，回答「會到」。', qv=B),
     p2v('p25-why-a', 'p25-why', "Why don't we take a break?", ["Because I'm busy.", "That's a good idea.", "It's broken."], 'B',
         '我們休息一下吧？', ['因為我很忙', '好主意', '它壞了'], "Why don't we 是提議，不是問原因，所以 (A) Because 是陷阱。(C) broken 和 break 很像。", qv=BM, av=B),
     p2v('p25-req-a', 'p25-req', 'Could you help me carry these boxes?', ['Sure, where do they go?', "Yes, they're boxes.", 'I carried it.'], 'A',
         '可以幫我搬這些箱子嗎？', ['當然，要搬到哪裡？', '是的，它們是箱子', '我搬了它'], '答應請求，再問要搬去哪。'),
     p2v('p25-offer-a', 'p25-offer', 'Shall I book a hotel for you?', ['Yes, that would be great.', 'I read that book.', 'At the hotel.'], 'A',
         '要我幫你訂飯店嗎？', ['好，那太好了', '我讀過那本書', '在飯店'], '對方主動幫忙，回答「那太好了」。(B) book 是書，是陷阱。', qv=B)],
    [p2v('p25-neg-b', 'p25-neg', "Isn't the restaurant open today?", ["No, it's closed on Mondays.", "I'd like to order.", 'Yes, they did.'], 'A',
         '那家餐廳今天沒開嗎？', ['沒開，它星期一公休', '我想點餐', '是的，他們做了'], '沒開就說 No，再說明原因。', qv=BM),
     p2v('p25-tag-b', 'p25-tag', "The report is due today, isn't it?", ["No, it's due tomorrow.", 'I read the report.', 'Yes, he did.'], 'A',
         '報告今天要交，對吧？', ['不是，明天才要交', '我讀了報告', '是的，他做了'], '不是今天，就回答 No 再說正確的時間。', qv=B),
     p2v('p25-why-b', 'p25-why', "Why don't you ask Mr. Tanaka for help?", ['Because he helped me.', "OK, I'll call him now.", 'Yes, he is.'], 'B',
         '你何不請田中先生幫忙？', ['因為他幫過我', '好，我現在就打給他', '是的，他是'], "Why don't you 是建議，接受建議最自然。", qv=BM, av=B),
     p2v('p25-req-b', 'p25-req', 'Would you mind closing the window?', ['Not at all.', "It's a nice view.", "Yes, it's closed."], 'A',
         '你介意把窗戶關起來嗎？', ['一點也不介意', '風景很好', '是的，它關了'], 'Would you mind…? 回答 Not at all 表示「不介意，我來做」。'),
     p2v('p25-offer-b', 'p25-offer', 'Do you want me to make copies of the handout?', ['Yes, twenty copies, please.', 'Coffee, please.', 'He made it.'], 'A',
         '要我幫你影印講義嗎？', ['好，請印二十份', '請給我咖啡', '是他做的'], '接受幫忙並說出份數。(B) coffee 和 copies 音很像，是陷阱。', qv=B)],
    [ext_q('p25-x1', "Why don't we have lunch together? 的意思是？", ['我們一起吃午餐吧？', '我們為什麼不一起吃午餐？（問原因）', '我們沒有一起吃午餐'], '我們一起吃午餐吧？',
           "Why don't we…? 是提議，不是問原因。"),
     ext_q('p25-x2', 'Would you mind opening the door? 想答應的話要說？', ['Not at all.', 'Yes, I mind.', 'No, I can\'t.'], 'Not at all.', 'mind 是介意，Not at all 是「一點也不介意」，表示願意。')],
    intro=P2_INTRO)

# ================================================================ Part 3
C32A_T = ("W: Hi, Daniel, hi, Tom. Did you hear the office is moving to a new building next month?　"
          "M1: Yes. I heard it's near the train station. That will make my trip to work much shorter.　"
          "M2: Same for me. But I'm worried about parking. The new building doesn't have a parking lot.　"
          "W: Actually, the company is going to give everyone a free monthly train pass.　M2: Really? That's great news.")
C32A = multi('assets/audio/toeic/p32-conv1.mp3', [
    (B, 'Hi, Daniel, hi, Tom. Did you hear the office is moving to a new building next month?'),
    (M, "Yes. I heard it's near the train station. That will make my trip to work much shorter."),
    (BM, "Same for me. But I'm worried about parking. The new building doesn't have a parking lot."),
    (B, 'Actually, the company is going to give everyone a free monthly train pass.'),
    (BM, "Really? That's great news.")])
C32B_T = ("M: Sarah, the client wants to change the design of the brochure by Friday.　W: By Friday? We only have two days.　"
          "M: I know. Can you work on it with Ken? I'll ask him to help.　W: OK. I'll start on it this afternoon.")
C32B = multi('assets/audio/toeic/p32-conv2.mp3', [
    (M, 'Sarah, the client wants to change the design of the brochure by Friday.'),
    (W, 'By Friday? We only have two days.'),
    (M, "I know. Can you work on it with Ken? I'll ask him to help."),
    (W, "OK. I'll start on it this afternoon.")])
tlesson('toeic-p3-2', 'toeic-listen', 'Part 3 三人對話與說話者意圖', 'Three Speakers & Intent',
    '三個人一起說話，還有「說這句話是什麼意思」的題目。',
    ['Part 3 有時候是三個人的對話，聲音和口音都不一樣（美式、英式都有）。不用記住誰是誰，只要聽懂「誰擔心什麼、誰要做什麼」。',
     '意圖題長這樣：What does the woman mean when she says, "We only have two days"? 要從前後文判斷她的意思：時間太趕了。'],
    ['題目', '中文', '怎麼解'],
    [['What are the speakers mainly discussing?', '主要在討論什麼？', '聽開頭一兩句'],
     ['What is the man worried about?', '男子擔心什麼？', "聽 I'm worried about…"],
     ['What does the woman mean when she says "…"?', '她說這句話是什麼意思？', '看那句話的前一句'],
     ['What will the woman do next?', '女子接下來會做什麼？', "聽最後的 I'll…"]],
    '意圖題的答案通常不是字面意思，要想「她為什麼這樣說」。',
    [("I'm worried about parking.", '我擔心停車的問題。', 'worried', BM), ('We only have two days.', '我們只有兩天。', 'only', W),
     ("That's great news.", '那真是好消息。', 'great', B), ("I'll start on it this afternoon.", '我今天下午就開始做。', 'start', M)],
    [conv_q('p32-c1-q1', 'p32-c1-q1', C32A, 'What are the speakers mainly discussing?', '說話者主要在討論什麼？', ['An office move', 'A business trip', 'A new train line'], 'An office move',
            f'the office is moving to a new building：辦公室要搬家。\n逐字稿：{C32A_T}'),
     conv_q('p32-c1-q2', 'p32-c1-q2', C32A, 'What is one of the men worried about?', '其中一名男子擔心什麼？', ['Parking', 'The rent', 'A long meeting'], 'Parking',
            f"I'm worried about parking. 新大樓沒有停車場。\n逐字稿：{C32A_T}"),
     conv_q('p32-c1-q3', 'p32-c1-q3', C32A, 'What will the company provide?', '公司會提供什麼？', ['A free train pass', 'A company car', 'Free lunch every day'], 'A free train pass',
            f'give everyone a free monthly train pass：每個人一張免費的火車月票。\n逐字稿：{C32A_T}'),
     conv_q('p32-c2-q1', 'p32-c2-q1', C32B, 'What does the woman mean when she says, "We only have two days"?', '女子說「我們只有兩天」是什麼意思？',
            ['She thinks the time is short.', 'She wants to take two days off.', 'She has finished the work.'], 'She thinks the time is short.',
            f'客戶要在星期五前改好，她說「只有兩天」，意思是時間很趕。\n逐字稿：{C32B_T}'),
     conv_q('p32-c2-q2', 'p32-c2-q2', C32B, 'What does the man say he will do?', '男子說他會做什麼？', ['Ask a coworker to help', 'Call the client', 'Change the deadline'], 'Ask a coworker to help',
            f"I'll ask him（Ken）to help. coworker 是同事。\n逐字稿：{C32B_T}"),
     conv_q('p32-c2-q3', 'p32-c2-q3', C32B, 'When will the woman start working on the brochure?', '女子什麼時候開始做小冊子？', ['This afternoon', 'On Friday', 'Tomorrow morning'], 'This afternoon',
            f"I'll start on it this afternoon.\n逐字稿：{C32B_T}")],
    [],
    [ext_q('p32-x1', 'coworker 是什麼意思？', ['同事', '客戶', '主管'], '同事', 'coworker ＝ colleague：同事。'),
     ext_q('p32-x2', 'brochure 是什麼意思？', ['小冊子、宣傳手冊', '公事包', '早餐'], '小冊子、宣傳手冊', 'brochure：介紹產品或服務的小冊子。')],
    minutes=15, intro='先看題目，再按 ▶ 聽對話。每段對話有 3 題。')

# ================================================================ Part 4
def talk(path, voice, spoken):
    return multi(path, [(voice, spoken)])

def p4lesson(lid, title, titleEn, summary, concept, rows, tip, examples, talks, ext):
    qs = []
    for ti, (audio, text, label, items) in enumerate(talks):
        for qi, (en, zh, opts, ans, expl) in enumerate(items):
            qs.append(talk_q(f'{lid[6:]}-t{ti + 1}-q{qi + 1}', audio, en, zh, opts, ans, f'{expl}\n逐字稿：{text}', label))
    tlesson(lid, 'toeic-listen', title, titleEn, summary, concept, ['類型', '開頭常聽到', '常考'], rows, tip, examples, qs, [], ext,
            minutes=15, intro='先看題目，再按 ▶ 聽。每段有 3 題。')

T42A_TEXT = ('Are you looking for a new sofa? Come to Home Style Furniture this weekend! Everything in the store is 30% off. '
             'We are open from 10 a.m. to 8 p.m. on Saturday and Sunday. And if you spend more than $500, we will deliver your furniture for free.')
T42A = talk('assets/audio/toeic/p42-talk1.mp3', B, 'Are you looking for a new sofa? Come to Home Style Furniture this weekend! Everything in the store is thirty percent off. '
            'We are open from ten a.m. to eight p.m. on Saturday and Sunday. And if you spend more than five hundred dollars, we will deliver your furniture for free.')
T42B_TEXT = ('Want to learn a new language? City Language School offers small classes in English, Japanese, and Spanish. Classes start on June 1. '
             'Sign up before May 20 and get your first month free. Visit our website to see the full schedule.')
T42B = talk('assets/audio/toeic/p42-talk2.mp3', M, 'Want to learn a new language? City Language School offers small classes in English, Japanese, and Spanish. Classes start on June first. '
            'Sign up before May twentieth and get your first month free. Visit our website to see the full schedule.')
p4lesson('toeic-p4-2', 'Part 4 廣告', 'Advertisements', '聽廣告：賣什麼、有什麼優惠、怎麼參加。',
    ['廣告是 Part 4 常見的類型。開頭常用問句吸引人：Are you looking for…?（你在找…嗎？）',
     '廣告必考三件事：賣什麼（What is being advertised?）、有什麼優惠（discount、free）、要怎麼做（visit、call、sign up）。'],
    [['廣告', 'Are you looking for…? Want to…?', '賣什麼、優惠、期限'],
     ['優惠', '30% off、free、get… free', '折扣多少、怎樣才能拿到'],
     ['行動', 'Visit our website. Sign up before…', '要做什麼、截止日期']],
    '30% off 在選項常寫成 a discount（折扣）；get your first month free 常寫成 a free month。',
    [('Everything in the store is thirty percent off.', '店內全部商品打七折。', 'off', B), ('We will deliver your furniture for free.', '我們會免費幫你運送家具。', 'free', M),
     ('Sign up before May twentieth.', '請在五月二十日前報名。', 'Sign', BM), ('Visit our website to see the full schedule.', '請上我們的網站看完整課表。', 'Visit', W)],
    [(T42A, T42A_TEXT, '▶ 播放廣告', [
        ('What is being advertised?', '這是什麼的廣告？', ['A furniture store', 'A moving company', 'A hotel'], 'A furniture store', 'Home Style Furniture：家具店。'),
        ('What is offered this weekend?', '這個週末有什麼優惠？', ['A discount', 'Free coffee', 'A gift card'], 'A discount', '30% off 就是打折（a discount）。'),
        ('How can customers get free delivery?', '顧客要怎樣才能免運費？', ['By spending more than $500', 'By shopping on Saturday', 'By paying in cash'], 'By spending more than $500',
         'if you spend more than $500, we will deliver your furniture for free.')]),
     (T42B, T42B_TEXT, '▶ 播放廣告', [
        ('What does the school offer?', '這間學校提供什麼？', ['Language classes', 'Cooking classes', 'Computer classes'], 'Language classes', 'English, Japanese, and Spanish：語言課。'),
        ('When do classes start?', '課程什麼時候開始？', ['June 1', 'May 20', 'May 1'], 'June 1', 'Classes start on June 1. May 20 是報名優惠的截止日。'),
        ('How can listeners see the schedule?', '聽眾要怎麼看課表？', ['By visiting a website', 'By calling the school', 'By reading a newspaper'], 'By visiting a website',
         'Visit our website to see the full schedule.')])],
    [ext_q('p42-x1', '30% off 是什麼意思？', ['打七折', '打三折', '加價 30%'], '打七折', '30% off：減掉 30%，也就是中文的七折。'),
     ext_q('p42-x2', 'sign up 是什麼意思？', ['報名、登記', '簽合約', '舉牌'], '報名、登記', 'sign up for a class：報名課程。')])

T43A_TEXT = ('Good morning, everyone. Before we start, I have an announcement. Our new computer system will be installed this Friday. '
             "Because of this, you won't be able to use your computers on Friday afternoon. Please save all your files before noon. "
             'If you have any questions, please contact Lisa in the IT department.')
T43A = talk('assets/audio/toeic/p43-talk1.mp3', BM, T43A_TEXT)
T43B_TEXT = ("Hello, everyone. I'm happy to tell you that our team sold more products this quarter than ever before. Sales went up 15%. "
             "To thank you for your hard work, we will have a team dinner next Thursday at Rosa's Italian Restaurant. Please let me know by Monday if you can come.")
T43B = talk('assets/audio/toeic/p43-talk2.mp3', W, "Hello, everyone. I'm happy to tell you that our team sold more products this quarter than ever before. Sales went up fifteen percent. "
            "To thank you for your hard work, we will have a team dinner next Thursday at Rosa's Italian Restaurant. Please let me know by Monday if you can come.")
p4lesson('toeic-p4-3', 'Part 4 會議與職場公告', 'Workplace Announcements', '聽會議裡的公告：發生什麼事、要大家做什麼。',
    ['職場公告通常在會議開頭：Good morning, everyone. I have an announcement.',
     '必考：會發生什麼事（What will happen…?）、聽眾要做什麼（What are listeners asked to do?）、某個人是誰（Who is…?）。'],
    [['公告', 'I have an announcement.', '發生什麼事、什麼時候'],
     ['好消息', "I'm happy to tell you…", '數字（sales went up…）'],
     ['請求', 'Please… / Please let me know by…', '要做什麼、期限']],
    'fifteen（15）和 fifty（50）很容易聽錯：fifteen 重音在後面，fifty 重音在前面。',
    [('Our new computer system will be installed this Friday.', '我們新的電腦系統這星期五會安裝。', 'installed', BM),
     ('Please save all your files before noon.', '請在中午前儲存所有檔案。', 'save', W),
     ('Sales went up fifteen percent.', '銷售額上升了百分之十五。', 'fifteen', B), ('Please let me know by Monday.', '請在星期一前告訴我。', 'know', M)],
    [(T43A, T43A_TEXT, '▶ 播放公告', [
        ('What will happen on Friday?', '星期五會發生什麼事？', ['A new computer system will be installed.', 'The office will close.', 'A new manager will arrive.'],
         'A new computer system will be installed.', 'Our new computer system will be installed this Friday.'),
        ('What are listeners asked to do?', '聽眾被要求做什麼？', ['Save their files before noon', 'Buy new computers', 'Work from home'], 'Save their files before noon',
         'Please save all your files before noon.'),
        ('Who most likely is Lisa?', 'Lisa 最可能是誰？', ['An IT worker', 'A client', 'The speaker\'s manager'], 'An IT worker', 'Lisa in the IT department：資訊部門的人員。')]),
     (T43B, T43B_TEXT, '▶ 播放公告', [
        ('What is the main topic of the talk?', '這段話的主題是什麼？', ['Good sales results', 'A new product', 'A change in schedule'], 'Good sales results',
         'sold more products this quarter than ever before：這一季賣得比以前都好。'),
        ('By how much did sales increase?', '銷售額增加了多少？', ['15%', '50%', '5%'], '15%', 'Sales went up 15%. 注意 fifteen 和 fifty 的分別。'),
        ('What should listeners do by Monday?', '聽眾在星期一前要做什麼？', ['Tell the speaker if they can come', 'Finish a sales report', 'Book a restaurant'],
         'Tell the speaker if they can come', 'Please let me know by Monday if you can come.')])],
    [ext_q('p43-x1', 'install 是什麼意思？', ['安裝', '邀請', '檢查'], '安裝', 'be installed：被安裝。'),
     ext_q('p43-x2', 'quarter 在商業上常指？', ['一季（三個月）', '一刻鐘', '四分之一美元'], '一季（三個月）', 'this quarter：這一季。多益財務相關題目很常見。')])

T44A_TEXT = ('Good evening. Here is the weather report. Tomorrow will be sunny in the morning, but heavy rain is expected in the afternoon. '
             "So if you are going out, don't forget your umbrella. The rain will stop on Sunday, and it will be warm and sunny again next week.")
T44A = talk('assets/audio/toeic/p44-talk1.mp3', W, T44A_TEXT)
T44B_TEXT = ("Welcome to Greenfield Chocolate Factory. My name is Peter, and I'll be your guide today. First, we will see how our chocolate is made. "
             'After that, you can taste five kinds of chocolate in our tasting room. The tour will end at the gift shop, where you can buy chocolate for your friends. '
             'Please remember that taking photos is not allowed in the factory.')
T44B = talk('assets/audio/toeic/p44-talk2.mp3', BM, T44B_TEXT)
p4lesson('toeic-p4-4', 'Part 4 天氣預報與導覽', 'Weather & Tours', '天氣預報和參觀導覽：時間順序最重要。',
    ['天氣預報會說「什麼時候、什麼天氣」，還常建議聽眾做什麼（帶傘、穿外套）。',
     '導覽會先自我介紹（My name is…, I\'ll be your guide），再依順序說行程：First…, After that…, The tour will end…，最後說注意事項。'],
    [['天氣預報', 'Here is the weather report.', '哪天、哪個時段、建議'],
     ['導覽', "I'll be your guide today.", '說話者是誰、行程順序'],
     ['注意事項', '…is not allowed. Please remember…', '不能做什麼']],
    '順序題：聽 First → After that → Finally，用手指頭記下順序。',
    [('Heavy rain is expected in the afternoon.', '預計下午會有大雨。', 'expected', W), ("Don't forget your umbrella.", '別忘了帶傘。', 'umbrella', B),
     ("I'll be your guide today.", '我是今天的導覽員。', 'guide', BM), ('Taking photos is not allowed.', '禁止拍照。', 'allowed', M)],
    [(T44A, T44A_TEXT, '▶ 播放天氣預報', [
        ('What will the weather be like tomorrow afternoon?', '明天下午的天氣會如何？', ['Rainy', 'Sunny', 'Snowy'], 'Rainy',
         'heavy rain is expected in the afternoon. 早上才是晴天。'),
        ('What does the speaker suggest?', '說話者建議什麼？', ['Taking an umbrella', 'Staying home', 'Wearing a coat'], 'Taking an umbrella', "don't forget your umbrella：記得帶傘。"),
        ('When will the rain stop?', '雨什麼時候會停？', ['On Sunday', 'Tomorrow morning', 'Next week'], 'On Sunday', 'The rain will stop on Sunday.')]),
     (T44B, T44B_TEXT, '▶ 播放導覽', [
        ('Who is Peter?', 'Peter 是誰？', ['A tour guide', 'A chef', 'A shop clerk'], 'A tour guide', "I'll be your guide today. 他是導覽員。"),
        ('What will listeners do after seeing how chocolate is made?', '看完巧克力製作過程後，聽眾會做什麼？', ['Taste chocolate', 'Buy tickets', 'Watch a movie'], 'Taste chocolate',
         'After that, you can taste five kinds of chocolate.'),
        ('What are listeners not allowed to do?', '聽眾不可以做什麼？', ['Take photos', 'Eat chocolate', 'Visit the gift shop'], 'Take photos',
         'taking photos is not allowed in the factory.')])],
    [ext_q('p44-x1', 'be expected 在天氣預報裡是什麼意思？', ['預計會', '已經發生', '被取消'], '預計會', 'Heavy rain is expected.：預計會下大雨。'),
     ext_q('p44-x2', 'is not allowed 是什麼意思？', ['不被允許', '很推薦', '免費'], '不被允許', 'Smoking is not allowed.：禁止吸菸。')])

T45A_TEXT = ('Hi, Ms. Garcia. This is David from Quick Car Repair. Your car is ready. We fixed the brakes and changed the oil. The total cost is $210. '
             "We close at six today, so please come before then. Oh, and we found a small problem with one of the tires. Well, it's not urgent, "
             'but you might want to replace it soon.')
T45A = talk('assets/audio/toeic/p45-talk1.mp3', M, 'Hi, Ms. Garcia. This is David from Quick Car Repair. Your car is ready. We fixed the brakes and changed the oil. '
            "The total cost is two hundred and ten dollars. We close at six today, so please come before then. Oh, and we found a small problem with one of the tires. "
            "Well, it's not urgent, but you might want to replace it soon.")
T45B_TEXT = ("Hello, this is Emma Wilson calling from Brightway Hotel. I'm calling about your reservation for next weekend. Unfortunately, the room with a sea view "
             'is no longer available. However, we can offer you a larger room with a garden view at the same price. Please call me back at 555-2481 to let me know if this is OK.')
T45B = talk('assets/audio/toeic/p45-talk2.mp3', B, "Hello, this is Emma Wilson calling from Brightway Hotel. I'm calling about your reservation for next weekend. "
            'Unfortunately, the room with a sea view is no longer available. However, we can offer you a larger room with a garden view at the same price. '
            'Please call me back at five five five, two four eight one, to let me know if this is OK.')
p4lesson('toeic-p4-5', 'Part 4 電話留言與意圖題', 'Voicemail & Intent', '電話留言：誰打來、為什麼、要你做什麼。',
    ['電話留言一開頭就會說：This is（名字）from（公司）. 馬上知道是誰、哪裡打來的。',
     '接著說打來的原因（I\'m calling about…），最後請你做事（Please call me back…）。',
     '意圖題：What does the speaker imply when he says, "it\'s not urgent"? 要想說話者「為什麼這樣說」。'],
    [['留言開頭', 'This is David from Quick Car Repair.', '說話者是誰、在哪裡工作'],
     ['原因', "I'm calling about your reservation.", '為什麼打來'],
     ['轉折', 'Unfortunately… However…', '問題是什麼、提供什麼方案']],
    'Unfortunately 後面是壞消息（問題）；However 後面是解決方法。',
    [('Your car is ready.', '您的車修好了。', 'ready', M), ("It's not urgent.", '這不急。', 'urgent', BM),
     ("I'm calling about your reservation.", '我打來是關於您的訂房。', 'calling', B), ('Please call me back.', '請回電給我。', 'back', W)],
    [(T45A, T45A_TEXT, '▶ 播放留言', [
        ('Why is the speaker calling?', '說話者為什麼打電話？', ['To say a car is ready', 'To book an appointment', 'To sell a new car'], 'To say a car is ready', 'Your car is ready. 車修好了。'),
        ('What does the speaker imply when he says, "it\'s not urgent"?', '說話者說「這不急」，意思是什麼？',
         ['The tire does not need to be replaced today.', 'The repair is very expensive.', 'The shop is closing early.'], 'The tire does not need to be replaced today.',
         '輪胎有小問題但不急，意思是不用今天換，可以之後再處理。'),
        ('What time does the shop close today?', '修車廠今天幾點關門？', ['6:00', '2:10', '10:00'], '6:00', 'We close at six today. 210 是修理費（$210），不是時間。')]),
     (T45B, T45B_TEXT, '▶ 播放留言', [
        ('Where does the speaker work?', '說話者在哪裡工作？', ['At a hotel', 'At a travel agency', 'At a restaurant'], 'At a hotel', 'calling from Brightway Hotel：飯店。'),
        ('What problem does the speaker mention?', '說話者提到什麼問題？', ['A room is not available.', 'A price has gone up.', 'A payment was not received.'], 'A room is not available.',
         'the room with a sea view is no longer available：海景房沒有了。'),
        ('What does the speaker offer?', '說話者提供什麼方案？', ['A larger room', 'A free breakfast', 'A lower price'], 'A larger room',
         'we can offer you a larger room with a garden view at the same price：同樣價格換大一點的花園景觀房。')])],
    [ext_q('p45-x1', 'urgent 是什麼意思？', ['緊急的', '昂貴的', '簡單的'], '緊急的', "It's not urgent.：不急。"),
     ext_q('p45-x2', 'no longer available 是什麼意思？', ['已經沒有了', '還很多', '明天才有'], '已經沒有了', 'no longer：不再。no longer available：已經不能用、沒有了。')])

# ================================================================ Part 5
def p5(id, group, sentence, zh, options, answer, expl):
    return q(id, group, '選出最適合填入空格的答案', options, answer, expl, sentence=sentence, zh=zh)

def p5lesson(lid, title, titleEn, summary, concept, head, rows, tip, examples, items, sims, ext):
    pre = lid.replace('toeic-', '').replace('-', '')
    qs = [p5(f'{pre}-{i}a', f'{pre}-{i}', *x) for i, x in enumerate(items)]
    ss = [p5(f'{pre}-{i}b', f'{pre}-{i}', *x) for i, x in enumerate(sims)]
    ex = [q(f'{pre}-x{i}', f'{pre}-x{i}', '多益實戰：選出最適合的答案', o, a, e, sentence=s, zh=z) for i, (s, z, o, a, e) in enumerate(ext)]
    tlesson(lid, 'toeic', title, titleEn, summary, concept, head, rows, tip, examples, qs, ss, ex, ext_title='延伸練習：多益實戰')

p5lesson('toeic-p5-2', 'Part 5 動詞題', 'Verb Forms',
    '時態、主動被動、單複數：動詞題一次搞定。',
    ['Part 5 常常四個選項都是同一個動詞的不同形態，例如 open、opened、will open、has opened。',
     '解題三步驟：① 找時間字決定時態 ② 主詞是單數還是複數 ③ 主詞是「自己做」還是「被做」。'],
    ['線索', '用什麼', '例子'],
    [['next month、tomorrow', '未來式 will ＋ V', 'will open'],
     ['yesterday、ago、last…', '過去式', 'submitted'],
     ['since 2018、for five years', '現在完成式 have／has ＋ p.p.', 'has worked'],
     ['each、every ＋ 單數名詞', '單數動詞', 'Each employee receives…'],
     ['主詞是被做的', '被動 be ＋ p.p.', 'Orders are shipped.']],
    'since ＋ 時間點（since 2018）、for ＋ 一段時間（for five years），都是現在完成式的好朋友。',
    [('The new branch will open next month.', '新分店下個月開幕。', 'will', W), ('All orders are shipped within two business days.', '所有訂單都在兩個工作天內出貨。', 'shipped', BM),
     ('Ms. Tanaka has worked here since 2018.', '田中小姐從 2018 年就在這裡工作。', 'has', B), ('Each employee receives a parking card.', '每位員工都會拿到一張停車卡。', 'receives', M)],
    [('The new branch ___ next month.', '新分店下個月開幕。', ['open', 'opened', 'will open', 'has opened'], 'will open', 'next month 是未來，用 will open。'),
     ('All orders ___ within two business days.', '所有訂單都在兩個工作天內出貨。', ['ship', 'are shipped', 'shipping', 'to ship'], 'are shipped', '訂單是「被寄出」，用被動 are shipped。'),
     ('Ms. Tanaka ___ for this company since 2018.', '田中小姐從 2018 年起就在這家公司工作。', ['works', 'worked', 'has worked', 'will work'], 'has worked',
      'since 2018 表示從過去持續到現在，用現在完成式 has worked。'),
     ('Each employee ___ a parking card.', '每位員工都會拿到一張停車卡。', ['receive', 'receives', 'receiving', 'have received'], 'receives', 'each ＋ 單數名詞，動詞用單數 receives。'),
     ('The meeting ___ because the manager was sick.', '因為經理生病，會議被取消了。', ['canceled', 'was canceled', 'cancels', 'is canceling'], 'was canceled',
      '會議是「被取消」，而且是過去的事，用 was canceled。'),
     ('Mr. Brown ___ the report yesterday.', '布朗先生昨天交了報告。', ['submit', 'submits', 'submitted', 'will submit'], 'submitted', 'yesterday 是過去，用 submitted。')],
    [('The store ___ a big sale next week.', '這家店下週有大特價。', ['have', 'had', 'will have', 'has had'], 'will have', 'next week 是未來，用 will have。'),
     ('Breakfast ___ in the lobby every morning.', '早餐每天早上在大廳供應。', ['serves', 'is served', 'serving', 'to serve'], 'is served', '早餐是「被供應」，用 is served。'),
     ('We ___ here since last year.', '我們從去年就住在這裡。', ['live', 'lived', 'have lived', 'will live'], 'have lived', 'since last year，用現在完成式 have lived。'),
     ('Every room ___ free Wi-Fi.', '每間房間都有免費 Wi-Fi。', ['have', 'has', 'having', 'are having'], 'has', 'every ＋ 單數名詞，動詞用單數 has。'),
     ('The flight ___ because of the snow.', '班機因為下雪而延誤。', ['delayed', 'was delayed', 'delays', 'is delaying'], 'was delayed', '班機是「被延誤」，用 was delayed。'),
     ('I ___ the client two days ago.', '我兩天前打電話給客戶。', ['call', 'calls', 'called', 'will call'], 'called', 'two days ago 是過去，用 called。')],
    [("The quarterly results ___ at next week's board meeting.", '季度成績將在下週的董事會上公布。', ['announced', 'will be announced', 'announcing', 'have announced'], 'will be announced',
      '成績是「被公布」，而且是下週（未來），用 will be announced。'),
     ('Over the past five years, the company ___ three new factories.', '過去五年來，公司開了三間新工廠。', ['opens', 'has opened', 'will open', 'opening'], 'has opened',
      'over the past five years（過去五年到現在），用現在完成式 has opened。')])

p5lesson('toeic-p5-3', 'Part 5 代名詞題', 'Pronouns',
    '主格、所有格、受格、所有代名詞、反身代名詞：看位置就能選。',
    ['代名詞題的四個選項通常是 he、his、him、himself 這種同一組字。',
     '只要看空格的位置：放在動詞前面當主詞用主格（he）；放在名詞前面用所有格（his）；放在動詞或介系詞後面用受格（him）。',
     '「自己做」用反身代名詞（himself），by himself 是「獨自」。'],
    ['類型', '位置', '例子'],
    [['主格 I／he／she／we／they', '動詞前面（主詞）', 'We will meet the client.'],
     ['所有格 my／his／her／our／their／its', '名詞前面', 'his umbrella、its garden'],
     ['受格 me／him／her／us／them', '動詞、介系詞後面', 'Please send me the file.'],
     ['所有代名詞 mine／yours／hers', '單獨使用＝所有格＋名詞', 'That one is yours.'],
     ['反身 myself／himself／herself', '自己、獨自', 'She did it by herself.']],
    "its（它的）和 it's（it is）不一樣：the company and its employees。",
    [('Please send me the file by Friday.', '請在星期五前把檔案寄給我。', 'me', B), ('Mr. Lee forgot his umbrella.', '李先生忘了他的雨傘。', 'his', M),
     ('Ms. Ito finished the project by herself.', '伊藤小姐自己完成了這個專案。', 'herself', W), ('The company thanked its employees.', '公司感謝了它的員工。', 'its', BM)],
    [('Please send ___ the file by Friday.', '請在星期五前把檔案寄給我。', ['I', 'my', 'me', 'mine'], 'me', 'send 後面接受格 me。'),
     ('Mr. Lee forgot ___ umbrella in the office.', '李先生把雨傘忘在辦公室。', ['he', 'his', 'him', 'himself'], 'his', 'umbrella 是名詞，前面用所有格 his。'),
     ('Ms. Ito finished the project by ___.', '伊藤小姐獨自完成了這個專案。', ['she', 'her', 'hers', 'herself'], 'herself', 'by herself：獨自、靠自己。'),
     ('___ will meet the client at the airport.', '我們會在機場跟客戶碰面。', ['We', 'Our', 'Us', 'Ours'], 'We', '動詞 will meet 前面需要主詞，用主格 We。'),
     ('This desk is mine, and that one is ___.', '這張桌子是我的，那張是你的。', ['your', 'yours', 'you', 'yourself'], 'yours', 'yours ＝ your desk，後面不用再加名詞。'),
     ('The company thanked ___ employees for their hard work.', '公司感謝員工的辛勞。', ['it', 'its', "it's", 'itself'], 'its', 'employees 是名詞，前面用所有格 its（公司的）。')],
    [('Can you call ___ tomorrow?', '你明天可以打給我們嗎？', ['we', 'our', 'us', 'ours'], 'us', 'call 後面接受格 us。'),
     ('Ms. Kim left ___ phone in the car.', '金小姐把手機留在車上。', ['she', 'her', 'hers', 'herself'], 'her', 'phone 是名詞，前面用所有格 her。'),
     ('He fixed the printer ___.', '他自己修好了印表機。', ['he', 'his', 'him', 'himself'], 'himself', '強調「自己」做，用 himself。'),
     ('___ are going to the conference next week.', '他們下週要去參加研討會。', ['They', 'Their', 'Them', 'Theirs'], 'They', '動詞 are going 前面需要主詞 They。'),
     ('Is this pen ___?', '這支筆是你的嗎？', ['your', 'yours', 'you', 'yourself'], 'yours', 'yours ＝ your pen。'),
     ('The hotel is famous for ___ beautiful garden.', '這家飯店以美麗的花園聞名。', ['it', 'its', "it's", 'itself'], 'its', 'garden 前面用所有格 its（飯店的）。')],
    [('Employees should keep ___ ID cards with them at all times.', '員工應隨時攜帶識別證。', ['they', 'their', 'them', 'themselves'], 'their',
      'ID cards 是名詞，前面用所有格 their。'),
     ('Ms. Diaz prepared the presentation slides ___ because her assistant was on vacation.', '因為助理在休假，迪亞茲小姐自己準備了簡報投影片。',
      ['she', 'her', 'hers', 'herself'], 'herself', '句子已經完整，空格強調「她自己」做，用反身代名詞 herself。')])

p5lesson('toeic-p5-4', 'Part 5 介系詞還是連接詞', 'Prepositions vs. Conjunctions',
    'because 還是 because of？although 還是 despite？看後面接什麼。',
    ['這是多益超級常考的題型：意思一樣的字，有的後面接名詞（介系詞），有的後面接句子（連接詞）。',
     '例如「因為」：because ＋ 句子（because it rained）；because of ＋ 名詞（because of the rain）。',
     '「雖然」：although ＋ 句子；despite ＋ 名詞。「在…期間」：while ＋ 句子；during ＋ 名詞。'],
    ['意思', '＋ 句子（連接詞）', '＋ 名詞（介系詞）'],
    [['因為', 'because', 'because of'],
     ['雖然、儘管', 'although', 'despite'],
     ['在…的時候、期間', 'while', 'during']],
    '判斷方法：空格後面有沒有「主詞＋動詞」？有就是句子，用連接詞。',
    [('The game was canceled because of the rain.', '比賽因為下雨被取消。', 'because', BM), ('Although it was raining, we went hiking.', '雖然在下雨，我們還是去爬山。', 'Although', W),
     ('Despite the high price, the tickets sold out quickly.', '儘管價格很高，票還是很快就賣完了。', 'Despite', B), ('Please do not talk during the movie.', '電影播放期間請勿交談。', 'during', M)],
    [('The game was canceled ___ the rain.', '比賽因為下雨被取消。', ['because', 'because of', 'although', 'while'], 'because of', 'the rain 是名詞，用 because of。'),
     ('___ it was raining, we went hiking.', '雖然在下雨，我們還是去爬山。', ['Although', 'Despite', 'Because of', 'During'], 'Although', 'it was raining 是句子，而且前後相反，用 Although。'),
     ('Please do not talk ___ the movie.', '電影播放期間請勿交談。', ['while', 'during', 'although', 'because'], 'during', 'the movie 是名詞，用 during。'),
     ('___ the high price, the tickets sold out quickly.', '儘管價格很高，票還是很快賣完。', ['Although', 'Despite', 'Because', 'While'], 'Despite', 'the high price 是名詞，意思相反，用 Despite。'),
     ('Mr. Chen read the newspaper ___ he was waiting for the train.', '陳先生在等火車的時候看報紙。', ['during', 'while', 'despite', 'because of'], 'while',
      'he was waiting 是句子，用 while。'),
     ('The store closed early ___ there were no customers.', '因為沒有客人，這家店提早關門。', ['because', 'because of', 'despite', 'during'], 'because', 'there were no customers 是句子，用 because。')],
    [('The flight was delayed ___ the storm.', '班機因為暴風雨延誤。', ['because', 'because of', 'although', 'while'], 'because of', 'the storm 是名詞，用 because of。'),
     ('___ he was tired, he finished the report.', '雖然他很累，還是完成了報告。', ['Although', 'Despite', 'During', 'Because of'], 'Although', 'he was tired 是句子，用 Although。'),
     ('Many people fell asleep ___ the long speech.', '很多人在冗長的演講中睡著了。', ['while', 'during', 'although', 'because'], 'during', 'the long speech 是名詞，用 during。'),
     ('___ the bad weather, the event was a success.', '儘管天氣不好，活動還是很成功。', ['Although', 'Despite', 'Because', 'While'], 'Despite', 'the bad weather 是名詞，用 Despite。'),
     ('She listens to music ___ she is driving.', '她開車的時候會聽音樂。', ['during', 'while', 'despite', 'because of'], 'while', 'she is driving 是句子，用 while。'),
     ('We stayed home ___ it was too cold.', '因為太冷，我們待在家。', ['because', 'because of', 'despite', 'during'], 'because', 'it was too cold 是句子，用 because。')],
    [('___ the delay in shipping, the products arrived in time for the sale.', '儘管運送延遲，產品還是及時在特賣前送到。', ['Although', 'Despite', 'Because', 'Unless'], 'Despite',
      'the delay in shipping 是名詞片語，意思相反，用 Despite。'),
     ('Visitors must wear a badge ___ they are in the factory.', '訪客在工廠內必須配戴識別證。', ['during', 'while', 'despite', 'because of'], 'while',
      'they are in the factory 是句子，用 while。')])

p5lesson('toeic-p5-5', 'Part 5 單字題：常考搭配', 'Collocations',
    'make a reservation、place an order：多益最愛考的固定搭配。',
    ['單字題的四個選項意思都不一樣，要選「最搭」的那一個。',
     '很多英文的動詞和名詞是固定搭配，中文直譯會出錯。例如「訂位」是 make a reservation，不是 do a reservation。'],
    ['搭配', '意思', '例句'],
    [['make a reservation', '預約、訂位', 'I would like to make a reservation.'],
     ['meet a deadline', '趕上期限', 'We need to meet the deadline.'],
     ['place an order', '下訂單', 'You can place an order online.'],
     ['attend a meeting', '出席會議', 'All staff must attend the meeting.'],
     ['submit an application', '提交申請', 'Please submit your application.'],
     ['give a presentation', '做簡報', 'She will give a presentation.']],
    '背單字時連搭配一起背：不要只背 deadline，要背 meet a deadline。',
    [('I would like to make a reservation for two.', '我想訂兩個人的位子。', 'make', B), ('Customers can place an order online.', '顧客可以在網路上下訂單。', 'place', M),
     ('All staff must attend the safety training.', '所有員工都必須參加安全訓練。', 'attend', W), ('We need to meet the deadline.', '我們必須趕上期限。', 'meet', BM)],
    [('I would like to ___ a reservation for two.', '我想訂兩個人的位子。', ['do', 'make', 'take', 'have'], 'make', 'make a reservation：預約、訂位。'),
     ('We need to ___ the deadline.', '我們必須趕上期限。', ['meet', 'do', 'go', 'put'], 'meet', 'meet a deadline：趕上期限。'),
     ('Customers can ___ an order online.', '顧客可以在網路上下訂單。', ['place', 'put', 'give', 'set'], 'place', 'place an order：下訂單。'),
     ('All staff must ___ the safety training.', '所有員工都必須參加安全訓練。', ['attend', 'listen', 'arrive', 'go'], 'attend', 'attend ＋ 活動（不用加 to）：參加。'),
     ('Please ___ your application by May 1.', '請在五月一日前提交申請。', ['submit', 'arrive', 'apply', 'reply'], 'submit', 'submit an application：提交申請。'),
     ('The company offers a 10% ___ to new customers.', '公司提供新客戶九折優惠。', ['discount', 'account', 'amount', 'count'], 'discount', 'a 10% discount：九折優惠。')],
    [('Did you ___ a reservation at the hotel?', '你有預約飯店嗎？', ['do', 'make', 'give', 'go'], 'make', 'make a reservation：預約。'),
     ('If we work late, we can ___ the deadline.', '如果我們加班，就能趕上期限。', ['meet', 'do', 'go', 'put'], 'meet', 'meet the deadline：趕上期限。'),
     ("I'd like to ___ an order for 50 chairs.", '我想訂 50 張椅子。', ['place', 'put', 'give', 'set'], 'place', 'place an order：下訂單。'),
     ('Mr. Wu could not ___ the meeting because he was sick.', '吳先生因為生病無法出席會議。', ['attend', 'listen', 'arrive', 'go'], 'attend', 'attend the meeting：出席會議。'),
     ('Applicants should ___ their résumés by email.', '應徵者應該用電子郵件寄出履歷。', ['submit', 'arrive', 'apply', 'reply'], 'submit', 'submit a résumé：提交履歷。'),
     ('Members get a 20% ___ on all books.', '會員所有書籍都打八折。', ['discount', 'account', 'amount', 'count'], 'discount', 'a 20% discount：八折。')],
    [('The marketing manager will ___ a presentation on the new product.', '行銷經理將針對新產品做簡報。', ['give', 'do', 'say', 'tell'], 'give', 'give a presentation：做簡報。'),
     ('Please ___ the form and return it to the front desk.', '請填寫表格並交回櫃台。', ['fill out', 'fill up', 'full out', 'feel out'], 'fill out', 'fill out a form：填寫表格。')])

# ================================================================ Part 6
def p6lesson(lid, title, titleEn, summary, concept, rows, tip, examples, passages, ext):
    qs = []
    pre = lid.replace('toeic-', '').replace('-', '')
    for text, items in passages:
        for blank, opts, ans, expl in items:
            qs.append(p6(f'{pre}-{blank}', text, blank, opts, ans, expl))
    tlesson(lid, 'toeic', title, titleEn, summary, concept, ['題型', '選項長相', '怎麼解'], rows, tip, examples, qs, [], ext,
            minutes=15, intro='每題都會顯示整篇文章，看到第幾個空格就作答那一格。')

P62A = ("To: Mark Evans\nFrom: Lucy Park\nSubject: Job Interview\n\nDear Mr. Evans,\n\nThank you for (1)______ for the sales assistant position. "
        "We would like to invite you to an interview on Tuesday, May 14, at 10 a.m. The interview will take about 30 minutes. (2)______, please bring a copy of your résumé. "
        "If this time is not (3)______ for you, please call me at 555-0147. (4)______\n\nBest regards,\nLucy Park\nHR Manager")
P62B = ("Dear Ms. Wong,\n\nWe have received your order for 20 office chairs. Unfortunately, the chairs you ordered are (5)______ out of stock. "
        "We expect to receive more next week. (6)______ We can also offer you a similar model in black at the same price. Please let us know which option you (7)______. "
        "We are sorry (8)______ the inconvenience.\n\nSincerely,\nTom Hill\nCustomer Service")
p6lesson('toeic-p6-2', 'Part 6 Email 填空', 'Emails', '面試通知和訂單問題：讀懂 email 的來龍去脈。',
    ['Part 6 最常出現 email。先看 Subject（主旨）就知道這封信在講什麼。',
     '文法題看空格前後幾個字就能解；句子題一定要看前後句，選意思接得上的。'],
    [['文法題', 'apply／applying／applied', 'Thank you for ＋ V-ing'],
     ['副詞題', 'current／currently', '修飾整句或形容詞，用副詞'],
     ['句子題', '四個完整句子', '看上下句，選意思接得上的']],
    'Thank you for ＋ 名詞或 V-ing；be sorry for ＋ 名詞：這兩個很常考。',
    [('Thank you for applying for the position.', '謝謝您應徵這個職位。', 'applying', B), ('We look forward to meeting you.', '我們期待與您見面。', 'forward', M),
     ('The chairs are currently out of stock.', '這些椅子目前缺貨。', 'currently', W), ('We are sorry for the inconvenience.', '造成不便，我們很抱歉。', 'sorry', BM)],
    [(P62A, [(1, ['apply', 'applying', 'applied', 'application'], 'applying', 'Thank you for 後面接名詞或 V-ing，for applying：謝謝你應徵。'),
             (2, ['However', 'Also', 'Because', 'Instead'], 'Also', '前面說面試時間，這裡「另外」請帶履歷，用 Also。'),
             (3, ['convenient', 'convenience', 'conveniently', 'convene'], 'convenient', 'is not 後面放形容詞：convenient（方便的）。'),
             (4, ['We look forward to meeting you.', 'Thank you for your order.', 'The position has already been filled.'], 'We look forward to meeting you.',
              '邀請面試的信，結尾說「期待見面」最自然。職位已經找到人的話就不會邀請面試。')]),
     (P62B, [(5, ['current', 'currently', 'currency', 'more current'], 'currently', '修飾 out of stock（缺貨），用副詞 currently（目前）。'),
             (6, ['We will ship your order as soon as they arrive.', 'Your chairs were delivered yesterday.', 'We do not sell office furniture.'],
              'We will ship your order as soon as they arrive.', '前一句說下週會進貨，接「一到貨就出貨」最合理。'),
             (7, ['prefer', 'preferring', 'preference', 'preferable'], 'prefer', 'which option you ___：主詞 you 後面要接動詞 prefer。'),
             (8, ['for', 'with', 'at', 'on'], 'for', 'be sorry for ＋ 名詞：為…感到抱歉。')])],
    [ext_q('p62-x1', 'out of stock 是什麼意思？', ['缺貨', '特價', '已寄出'], '缺貨', 'out of stock：沒有庫存、缺貨。in stock 是有貨。'),
     ext_q('p62-x2', 'inconvenience 是什麼意思？', ['不便', '便利商店', '方便的'], '不便', 'sorry for the inconvenience：造成不便很抱歉。')])

P63A = ("NOTICE\n\nThe elevators in this building (1)______ on Saturday, June 8, from 9 a.m. to 3 p.m. During this time, please use the stairs. "
        "We understand this may be difficult for some people. (2)______ If you need help (3)______ heavy items, please contact the front desk. "
        "We thank you for your (4)______.")
P63B = ("Greenville Public Library\n\nStarting next month, the library will (5)______ its hours. It will open at 8 a.m. instead of 9 a.m. on weekdays. "
        "Many visitors asked for earlier hours (6)______ they could study before work. (7)______ The weekend hours will not change. "
        "For more (8)______, please visit our website.")
p6lesson('toeic-p6-3', 'Part 6 公告與通知', 'Notices', '電梯檢修、圖書館延長開放：公告的固定寫法。',
    ['公告的結構很固定：發生什麼事 → 時間 → 對大家的影響 → 請大家做什麼 → 感謝。',
     '知道這個順序，句子題就很好猜：說完「不方便」，接下來通常是「我們會怎麼幫忙」。'],
    [['時態題', 'inspect／will be inspected', '看日期；東西「被做」用被動'],
     ['詞性題', 'patient／patience', 'your 後面接名詞'],
     ['連接詞題', 'so that／because of', 'so that ＋ 句子：為了能夠…']],
    'patience（耐心）和 patients（病人）發音很像，Part 6 很愛考。',
    [('The elevators will be inspected on Saturday.', '電梯將在星期六進行檢查。', 'inspected', BM), ('We thank you for your patience.', '感謝您的耐心。', 'patience', B),
     ('The library will extend its hours.', '圖書館將延長開放時間。', 'extend', W), ('For more information, please visit our website.', '更多資訊請上我們的網站。', 'information', M)],
    [(P63A, [(1, ['inspect', 'inspected', 'will be inspected', 'are inspecting'], 'will be inspected', '電梯是「被檢查」，日期是之後的星期六，用 will be inspected。'),
             (2, ['Staff will be available to help with deliveries.', 'The new elevators are very fast.', 'The building was built in 1995.'],
              'Staff will be available to help with deliveries.', '前一句說可能造成不便，接「會有工作人員幫忙」最合理。'),
             (3, ['carry', 'carrying', 'carried', 'carries'], 'carrying', 'need help ＋ V-ing：需要幫忙做某事。'),
             (4, ['patient', 'patience', 'patiently', 'patients'], 'patience', 'your 後面接名詞，「耐心」是 patience；patients 是病人。')]),
     (P63B, [(5, ['extend', 'extended', 'extension', 'extending'], 'extend', 'will 後面接動詞原形 extend（延長）。'),
             (6, ['so that', 'because of', 'despite', 'during'], 'so that', '後面是句子 they could study，表示目的「為了能夠…」，用 so that。'),
             (7, ['We are happy to meet their needs.', 'The library will be closed for good.', 'Books cannot be borrowed anymore.'], 'We are happy to meet their needs.',
              '前一句說讀者希望早點開，接「很高興滿足他們的需求」。'),
             (8, ['inform', 'information', 'informed', 'informative'], 'information', 'more 後面接名詞 information。')])],
    [ext_q('p63-x1', 'patience 是什麼意思？', ['耐心', '病人', '耐心地'], '耐心', 'patience 耐心；patient 有耐心的（也可當病人）；patients 病人（複數）。'),
     ext_q('p63-x2', 'so that 是什麼意思？', ['為了能夠、以便', '因為', '雖然'], '為了能夠、以便', 'so that ＋ 句子：表示目的。')])

P64A = ("How to Use the New Coffee Machine\n\nThe new coffee machine in the break room is easy to use. First, place a cup under the spout. "
        "(1)______, choose the type of coffee you want. The machine will make your coffee in about 30 seconds. Please clean the area after you (2)______ it. "
        "(3)______ If the machine stops working, do not try to fix it (4)______. Instead, call the maintenance office at extension 210.")
P64B = ("Local Bakery Wins Award\n\nSweet Corner Bakery won the \"Best Bakery in Town\" award last week. The bakery (5)______ by Maria Lopez ten years ago. "
        "It is (6)______ for its fresh bread and fruit pies. (7)______ Ms. Lopez says she will use the prize money to (8)______ her shop and hire two more bakers.")
p6lesson('toeic-p6-4', 'Part 6 說明與報導', 'Instructions & Articles', '使用說明和地方新聞：注意順序和時態。',
    ['使用說明會用順序字：First（首先）、Next（接著）、Then（然後）、Finally（最後）。',
     '新聞報導常用過去式說發生的事，被動語態說「被誰創立、被誰選上」。'],
    [['順序題', 'First／Next／Finally', '看是第幾個步驟'],
     ['被動題', 'opened／was opened', '店是「被開」的'],
     ['固定說法', 'be known for', '以…聞名']],
    'be known for（以…聞名）是多益常考片語，known 一定要用過去分詞。',
    [('First, place a cup under the spout.', '首先，把杯子放在出水口下面。', 'First', W), ('Next, choose the type of coffee you want.', '接著，選擇你要的咖啡種類。', 'Next', B),
     ('The bakery is known for its fresh bread.', '這家麵包店以新鮮麵包聞名。', 'known', BM), ('She will use the prize money to expand her shop.', '她會用獎金擴大店面。', 'expand', M)],
    [(P64A, [(1, ['Next', 'Before', 'Although', 'Finally'], 'Next', '第一步之後的下一步，用 Next。後面還有步驟，所以不是 Finally。'),
             (2, ['use', 'used', 'using', 'will use'], 'use', 'after you ___ it：after 後面的句子用現在式表示未來，主詞 you 用 use。'),
             (3, ['Also, please do not leave dirty cups in the sink.', 'The old machine made better coffee.', 'Coffee is sold at the café across the street.'],
              'Also, please do not leave dirty cups in the sink.', '前一句請大家清理，接「另外別把髒杯子留在水槽」最合理。'),
             (4, ['you', 'your', 'yours', 'yourself'], 'yourself', 'do not try to fix it yourself：不要自己修。')]),
     (P64B, [(5, ['opened', 'was opened', 'is opening', 'opens'], 'was opened', '麵包店是「被開」的，而且是十年前，用 was opened。'),
             (6, ['know', 'knew', 'known', 'knowing'], 'known', 'be known for：以…聞名。'),
             (7, ['Customers often wait in line to buy them.', 'The bakery will close next month.', 'Ms. Lopez does not like baking.'], 'Customers often wait in line to buy them.',
              '前一句說麵包和派很有名，接「顧客常排隊購買」最合理。them 指 bread and pies。'),
             (8, ['expand', 'expansion', 'expanded', 'expansive'], 'expand', 'to 後面接動詞原形 expand（擴大）。')])],
    [ext_q('p64-x1', 'be known for 是什麼意思？', ['以…聞名', '知道…', '為…而工作'], '以…聞名', 'The city is known for its night markets.：這座城市以夜市聞名。'),
     ext_q('p64-x2', 'expand 是什麼意思？', ['擴大、擴展', '解釋', '花費'], '擴大、擴展', 'expand a business：擴展事業。')])

# ================================================================ Part 7
def p7lesson(lid, title, titleEn, summary, concept, rows, tip, examples, passages, ext, minutes=15):
    qs = []
    pre = lid.replace('toeic-', '').replace('-', '')
    for pi, (text, items) in enumerate(passages):
        for qi, (en, zh, opts, ans, expl) in enumerate(items):
            qs.append(p7(f'{pre}-{pi + 1}{qi + 1}', text, en, zh, opts, ans, expl))
    tlesson(lid, 'toeic', title, titleEn, summary, concept, ['題目', '中文', '去哪裡找'], rows, tip, examples, qs, [], ext,
            minutes=minutes, intro='每題都會顯示文章，看完題目再回文章找答案。')

P72A = ("From: Anna Lee <anna.lee@brightdesign.com>\nTo: All Staff\nDate: March 3\nSubject: Office Cleaning\n\nHi everyone,\n\n"
        "The carpets in our office will be cleaned this Saturday, March 8. Please take all personal items off the floor before you leave on Friday. "
        "The cleaning will take about five hours, so the office will be closed on Saturday. It will open again as usual on Monday morning.\n\nThank you,\nAnna Lee\nOffice Manager")
P72B = ("Parkview Apartments — Notice to Residents\n\nThe water will be turned off on Wednesday, July 10, from 1 p.m. to 4 p.m. because workers will be repairing "
        "pipes on the third floor. We suggest that you store some water before 1 p.m. We are sorry for any trouble this may cause. "
        "If you have questions, please contact the building manager, Mr. Ortiz, at 555-0172.")
p7lesson('toeic-p7-2', 'Part 7 Email 與公告', 'Emails & Notices', '辦公室清潔、大樓停水：找目的、時間、要做的事。',
    ['Part 7 的 email 和公告，第一、二句通常就說出目的。',
     '題目問「要大家做什麼」，就去找 Please…、We suggest that…；問時間就找日期和星期。',
     '注意寄信日期（Date: March 3）和活動日期（March 8）不一樣，是常見陷阱。'],
    [['What is the purpose of…?', '目的是什麼？', '第一、二句'],
     ['What are staff asked to do?', '員工被要求做什麼？', 'Please… / We suggest…'],
     ['Who is…?', '某人是誰？', '名字前後的職稱']],
    '答案常是換句話說：take items off the floor ＝ remove items from the floor。',
    [('Please take all personal items off the floor.', '請把所有個人物品從地上拿起來。', 'items', B), ('The office will be closed on Saturday.', '辦公室星期六不開放。', 'closed', M),
     ('We suggest that you store some water.', '我們建議您先儲存一些水。', 'suggest', W), ('Please contact the building manager.', '請聯絡大樓管理員。', 'contact', BM)],
    [(P72A, [('What is the purpose of the email?', '這封 email 的目的是什麼？', ['To announce office cleaning', 'To invite staff to a party', 'To introduce a new manager'],
              'To announce office cleaning', '第一句就說地毯週六要清潔。'),
             ('What are staff asked to do?', '員工被要求做什麼？', ['Remove items from the floor', 'Clean their desks on Saturday', 'Come to work early on Monday'],
              'Remove items from the floor', 'take all personal items off the floor 換句話說就是 remove items from the floor。'),
             ('When will the office be closed?', '辦公室哪一天不開放？', ['On March 8', 'On March 3', 'On Monday'], 'On March 8',
              '清潔在星期六 March 8，那天不開放。March 3 是寄信日期。')]),
     (P72B, [('Why will the water be turned off?', '為什麼要停水？', ['Pipes will be repaired.', 'The building will be painted.', 'A new manager will start.'], 'Pipes will be repaired.',
              'workers will be repairing pipes：工人要修水管。'),
             ('How long will the water be off?', '會停水多久？', ['Three hours', 'One hour', 'Four hours'], 'Three hours', 'from 1 p.m. to 4 p.m.：下午一點到四點，共三個小時。'),
             ('What does the notice suggest residents do?', '公告建議住戶做什麼？', ['Store water in advance', 'Leave the building', 'Call a plumber'], 'Store water in advance',
              'We suggest that you store some water before 1 p.m. in advance 是「事先」。'),
             ('Who is Mr. Ortiz?', 'Ortiz 先生是誰？', ['The building manager', 'A plumber', 'A resident'], 'The building manager', 'the building manager, Mr. Ortiz：大樓管理員。')])],
    [ext_q('p72-x1', 'resident 是什麼意思？', ['住戶、居民', '總統', '餐廳'], '住戶、居民', 'Notice to Residents：給住戶的公告。'),
     ext_q('p72-x2', 'in advance 是什麼意思？', ['事先', '前進', '進步'], '事先', 'book in advance：事先預訂。')])

P73A = ("[Advertisement]\nHillside Hotel — Summer Special\n• Standard room: $90 per night\n• Deluxe room (with balcony): $130 per night\n• Free breakfast for all guests\n"
        "• Stay 3 nights or more and get 10% off!\nBook at www.hillsidehotel.com\n\n[Email]\nTo: reservations@hillsidehotel.com\nFrom: Jason Clark\nSubject: Booking\n\n"
        "Hello,\nI would like to book a room with a balcony for my wife and me from August 5 to August 8. Could you also tell me if there is parking at the hotel?\n\nThank you,\nJason Clark")
P73B = ("[Schedule]\nCity Training Center — Computer Classes (October)\n• Excel Basics: Mondays, 6–8 p.m., Room 101\n• Excel Advanced: Wednesdays, 6–8 p.m., Room 204\n"
        "• PowerPoint: Thursdays, 7–9 p.m., Room 101\nFee: $60 per class (members: $45)\n\n[Text messages]\n"
        "Amy (5:40 p.m.): Hi Ben, I'm running late. Can you save me a seat in Room 204? Class starts at 6, right?\nBen (5:42 p.m.): Yes. I'm already here. See you soon!")
p7lesson('toeic-p7-3', 'Part 7 雙篇閱讀', 'Double Passages', '兩篇文章一起看：答案要「對照兩篇」才找得到。',
    ['多益 Part 7 後半段會出現兩篇或三篇文章一組，例如「廣告＋email」、「課表＋簡訊」。',
     '有些題目只看一篇就能答，但一定會有一題要兩篇一起看。例如 email 說要「有陽台的房間」，廣告寫「有陽台的是豪華房」，答案就是豪華房。'],
    [['What kind of room does he want?', '他想要哪種房間？', '兩篇對照'],
     ['How many nights…?', '住幾晚？', '算日期（8 號減 5 號）'],
     ['What will he probably receive?', '他可能會得到什麼？', '把條件套進廣告']],
    '看到題目有 probably、most likely，通常要兩篇一起推論。',
    [('I would like to book a room with a balcony.', '我想訂一間有陽台的房間。', 'balcony', W), ('Stay three nights or more and get ten percent off.', '住三晚以上打九折。', 'off', BM),
     ("I'm running late.", '我會晚一點到。', 'late', B), ('Can you save me a seat?', '可以幫我留個位子嗎？', 'save', M)],
    [(P73A, [('What kind of room does Mr. Clark want?', 'Clark 先生想要哪一種房間？', ['A deluxe room', 'A standard room', 'A family room'], 'A deluxe room',
              'email 說要 a room with a balcony，廣告寫有陽台的是 Deluxe room。要兩篇對照。'),
             ('How many nights will Mr. Clark stay?', 'Clark 先生會住幾晚？', ['Three', 'Two', 'Four'], 'Three', 'August 5 到 August 8：5、6、7 號住三晚，8 號退房。'),
             ('What will Mr. Clark probably receive?', 'Clark 先生可能會得到什麼？', ['A 10% discount', 'A free dinner', 'A free parking space'], 'A 10% discount',
              '住三晚，符合廣告的 Stay 3 nights or more and get 10% off。'),
             ('What does Mr. Clark ask about?', 'Clark 先生詢問什麼？', ['Parking', 'Breakfast', 'The price of a standard room'], 'Parking',
              'Could you also tell me if there is parking at the hotel?')]),
     (P73B, [('Which class are Amy and Ben taking?', 'Amy 和 Ben 上的是哪一堂課？', ['Excel Advanced', 'Excel Basics', 'PowerPoint'], 'Excel Advanced',
              'Amy 說 Room 204、6 點上課，課表上 Room 204 是 Excel Advanced。'),
             ('On what day were the messages most likely sent?', '這些簡訊最可能是星期幾傳的？', ['Wednesday', 'Monday', 'Thursday'], 'Wednesday',
              'Excel Advanced 在星期三上課，所以簡訊是星期三傳的。'),
             ('How much does one class cost for members?', '會員上一堂課要多少錢？', ['$45', '$60', '$15'], '$45', 'Fee: $60 per class (members: $45)。')])],
    [ext_q('p73-x1', "I'm running late. 是什麼意思？", ['我會晚到', '我在跑步', '我很早到'], '我會晚到', 'running late：進度落後、會晚到。'),
     ext_q('p73-x2', 'balcony 是什麼意思？', ['陽台', '包廂', '浴缸'], '陽台', 'a room with a balcony：有陽台的房間。')])

V21_TOEIC = {
    'part1': ['toeic-p1-2', 'toeic-p1-3', 'toeic-p1-4', 'toeic-p1-5'],
    'part2': ['toeic-p2-2', 'toeic-p2-3', 'toeic-p2-4', 'toeic-p2-5'],
    'part3': ['toeic-p3-2'],
    'part4': ['toeic-p4-2', 'toeic-p4-3', 'toeic-p4-4', 'toeic-p4-5'],
    'part5': ['toeic-p5-2', 'toeic-p5-3', 'toeic-p5-4', 'toeic-p5-5'],
    'part6': ['toeic-p6-2', 'toeic-p6-3', 'toeic-p6-4'],
    'part7': ['toeic-p7-2', 'toeic-p7-3'],
}

# Part 7 限時作答：每題建議 60 秒（正式考試閱讀 75 分鐘 100 題，Part 7 平均一題不到 1 分鐘）
for _l in LESSONS:
    if _l['id'] in ('toeic-p7', 'toeic-p7-2', 'toeic-p7-3'):
        _l['pace'] = 60
        for _st in _l['steps']:
            if _st['kind'] == 'practice' and _st.get('title') == '模擬練習':
                _st['intro'] = _st['intro'].rstrip('。') + '。⏱ 限時練習：每題建議 60 秒內作答，題號旁邊會倒數；超時不會被打斷。'
        write(f"data/lessons/{_l['id']}.json", _l)
