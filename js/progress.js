// 課程解鎖與今日安排（純邏輯）
// 解鎖依「能力」：完成診斷後開放世界；前一課完成、或診斷該項達標，就開放下一課。

export const WORLD_SECTION = { 'word-village': 'vocab', 'grammar-castle': 'grammar' };
export const REVIEW_MINUTES = 5;
export const TYPE_LABEL = { vocab: '單字', grammar: '文法', phonics: '發音', dialogue: '會話', reading: '閱讀', toeic: '多益閱讀', 'toeic-listen': '多益聽力', exam: '模擬考' };
export const TYPE_ICON = { vocab: '🏡', grammar: '🏰', phonics: '🌲', dialogue: '🏝️', reading: '🎧', toeic: '⛺', 'toeic-listen': '⛺', exam: '🏆' };
export const lessonHref = (l) => (l.type === 'exam' ? `#/exam?id=${l.id}` : `#/lesson?id=${l.id}`);

export const lessonKey = (id) => `lesson:${id}`;

export function computeAccess(lessons, progressById, diagnosis, thresholds = {}) {
  const access = new Map();
  const byWorld = new Map();
  const titles = new Map(lessons.map((l) => [l.id, l.title]));
  for (const l of lessons) {
    if (!byWorld.has(l.world)) byWorld.set(l.world, []);
    byWorld.get(l.world).push(l);
  }
  for (const [world, list] of byWorld) {
    list.sort((a, b) => a.order - b.order);
    const section = WORLD_SECTION[world];
    const score = diagnosis && section ? diagnosis.sections?.[section]?.score ?? 0 : 0;
    const threshold = thresholds[section] ?? Infinity;
    const testedOut = !!diagnosis && score >= threshold;
    let prevDone = true;
    for (const l of list) {
      const p = progressById.get(lessonKey(l.id));
      const completed = !!(p && p.timesCompleted > 0);
      const inProgress = !!(p && p.status === 'in_progress');
      let unlocked = false;
      let reason = '';
      const started = !!p;
      const missing = (l.requires || []).filter((id) => !(progressById.get(lessonKey(id))?.timesCompleted > 0));
      if (!diagnosis) reason = '完成程度診斷後開放';
      else if (missing.length && !started) reason = `完成${missing.map((id) => `「${titles.get(id) || id}」`).join('、')}後開放`;
      else if (prevDone || testedOut || started) unlocked = true;
      else reason = '完成上一課後開放';
      const status = !unlocked ? 'locked' : inProgress ? 'in_progress' : completed ? 'completed' : 'new';
      access.set(l.id, { unlocked, status, reason, completed, testedOut, stepIndex: inProgress ? p.stepIndex : 0 });
      prevDone = completed;
    }
  }
  return access;
}

export function openWorldIds(lessons, diagnosis, access = null) {
  if (!diagnosis) return new Set();
  return new Set(lessons.filter((l) => !access || access.get(l.id)?.unlocked).map((l) => l.world));
}

// 依精神狀態與時間安排今天要做什麼
export const MISTAKE_MINUTES = 5;

export function planToday({ mode, minutes, lessons, access, dueCount = 0, mistakeCount = 0 }) {
  const items = [];
  const canReview = dueCount > 0;
  const hasMistakes = mistakeCount > 0;

  const inProgress = lessons.filter((l) => access.get(l.id)?.status === 'in_progress');
  const fresh = lessons.filter((l) => access.get(l.id)?.status === 'new');
  // 交錯安排單字與文法，避免一次塞太多同類型
  const queue = [...inProgress];
  const vocab = fresh.filter((l) => l.type === 'vocab');
  const grammar = fresh.filter((l) => l.type !== 'vocab');
  let lastType = queue.length ? queue[queue.length - 1].type : null;
  while (vocab.length || grammar.length) {
    const preferGrammar = lastType === 'vocab';
    const next = (preferGrammar ? grammar.shift() || vocab.shift() : vocab.shift() || grammar.shift());
    queue.push(next);
    lastType = next.type;
  }

  if (mode === 'low') {
    if (canReview) {
      items.push({ type: 'review', minutes: Math.min(REVIEW_MINUTES, minutes), count: dueCount });
    } else if (hasMistakes) {
      items.push({ type: 'mistakes', minutes: Math.min(MISTAKE_MINUTES, minutes), count: mistakeCount });
    } else if (queue.length) {
      items.push({ type: 'lesson', lesson: queue[0], minutes: queue[0].minutes, partial: true });
    }
    return { items, note: '低電量模式：只做一點點就好，隨時可以暫停，下次會從暫停的地方繼續。' };
  }

  let budget = minutes;
  if (canReview) {
    items.push({ type: 'review', minutes: REVIEW_MINUTES, count: dueCount });
    budget -= REVIEW_MINUTES;
  }
  if (hasMistakes) {
    items.push({ type: 'mistakes', minutes: MISTAKE_MINUTES, count: mistakeCount });
    budget -= MISTAKE_MINUTES;
  }
  for (const l of queue) {
    const hasLesson = items.some((i) => i.type === 'lesson');
    if (budget <= 0 && hasLesson) break;
    if (l.minutes > budget && hasLesson) break;
    items.push({ type: 'lesson', lesson: l, minutes: l.minutes, partial: l.minutes > budget });
    budget -= l.minutes;
  }

  let note = '';
  if (!items.some((i) => i.type === 'lesson')) {
    note = queue.length === 0 && lessons.length
      ? '目前開放的課程都完成了！可以複習單字，或重新學習已完成的課程。'
      : '';
  }
  return { items, note };
}
