# 依多益考試架構分配世界：python3 dev/assign_worlds.py <專案路徑>
# 基礎（發音、單字、文法）→ 聽力 Part 1～4 → 閱讀 Part 5～7 → 模擬考
# 會改寫每堂課的 world、order、requires，並依此排序 catalog.json 的課程清單。可重複執行。
import json, os, sys

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
PLAN = [
    ('words', ['vocab-1', 'vocab-2', 'vocab-3', 'biz-1']),
    ('grammar', ['grammar-1', 'grammar-2', 'grammar-3']),
    ('phonics', ['phonics-1', 'phonics-2', 'phonics-3']),
    ('part1', ['toeic-p1']),
    ('part2', ['toeic-p2']),
    ('part3', ['life-1', 'life-2', 'life-3', 'toeic-p3']),
    ('part4', ['toeic-p4']),
    ('part5', ['toeic-p5-1']),
    ('part6', ['biz-2', 'toeic-p6']),
    ('part7', ['read-1', 'read-2', 'toeic-p7']),
    ('mock', ['mock-1']),
]
# 每個世界的第一課沒有「上一課」可以等，用 requires 接上原本的學習順序
REQUIRES = {
    'toeic-p1': ['grammar-1', 'grammar-2', 'grammar-3'],
    'toeic-p2': ['toeic-p1'],
    'life-1': ['vocab-1', 'grammar-1'],
    'toeic-p3': ['toeic-p2'],
    'toeic-p4': ['toeic-p3'],
    'toeic-p5-1': ['grammar-1', 'grammar-2', 'grammar-3'],
    'biz-2': ['vocab-2', 'grammar-2'],
    'toeic-p6': ['toeic-p5-1'],
    'read-1': ['vocab-1', 'grammar-1'],
    'toeic-p7': ['toeic-p6'],
    'biz-1': ['vocab-2', 'grammar-2'],
    'mock-1': ['toeic-p1', 'toeic-p2', 'toeic-p3', 'toeic-p4', 'toeic-p5-1', 'toeic-p6', 'toeic-p7'],
}

cat_path = os.path.join(ROOT, 'data/catalog.json')
cat = json.load(open(cat_path))
order = []
for world, ids in PLAN:
    for i, lid in enumerate(ids):
        path = os.path.join(ROOT, f'data/lessons/{lid}.json')
        lesson = json.load(open(path))
        lesson['world'] = world
        lesson['order'] = i + 1
        if lid in REQUIRES: lesson['requires'] = REQUIRES[lid]
        else: lesson.pop('requires', None)
        json.dump(lesson, open(path, 'w'), ensure_ascii=False, indent=2)
        open(path, 'a').write('\n')
        order.append(f'data/lessons/{lid}.json')
missing = set(cat['lessons']) - set(order)
if missing: sys.exit(f'這些課程沒有分配世界：{missing}')
cat['lessons'] = order
json.dump(cat, open(cat_path, 'w'), ensure_ascii=False, indent=2)
print(f'{len(order)} 堂課分配到 {len(PLAN)} 個世界')
