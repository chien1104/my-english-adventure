// 遊戲化規則（純邏輯）：經驗值、等級、每日任務、每日挑戰、成就
// 原則：經驗值只會增加，休息不會扣分、不會重置；不計算「連續打卡」。
import { todayKey } from './settings.js';

export const EXP = {
  correct: 2,          // 答對一題（課程、複習、錯題重練、遊戲）
  lessonFirst: 30,     // 第一次完成一堂課
  lessonRepeat: 10,    // 重新完成
  unitFirst: 20,       // 第一次學完一個單字單元
  unitRepeat: 5,       // 重新學完單字單元
  diagnosis: 20,       // 第一次完成程度診斷
  reviewSession: 10,   // 完成一次單字複習
  mistakeSession: 10,  // 完成一次錯題重練
  gameSession: 5,      // 玩完一局遊戲
  dailyTask: 15,       // 完成一個每日任務
  dailyAll: 20,        // 當天任務全部完成
  challenge: 30,       // 完成每日挑戰
  achievement: 30,     // 解鎖一個成就
};
export const EXP_KINDS = new Set(['lesson', 'review', 'mistake', 'game']);

export const LEVEL_TITLES = ['見習冒險者', '村莊旅人', '城堡學徒', '島嶼探險家', '學院研究生', '城市專員', '訓練營戰士', '殿堂挑戰者'];

// 升到第 n 級需要的累積經驗：Lv2 100、Lv3 300、Lv4 600、Lv5 1000…
export function expForLevel(n) { return 50 * (n - 1) * n; }

export function levelInfo(exp) {
  const total = Math.max(0, Math.floor(exp || 0));
  let level = 1;
  while (total >= expForLevel(level + 1)) level += 1;
  const cur = expForLevel(level);
  const next = expForLevel(level + 1);
  return {
    level, exp: total,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    into: total - cur, need: next - cur, nextAt: next,
    progress: (total - cur) / (next - cur),
  };
}

export const dayOf = (ts) => todayKey(new Date(ts));

// ---------- 每日任務（依今天的精神狀態調整份量）----------
const DAILY_PLAN = {
  low:       { correct: 5,  review: 3,  lesson: 0, game: 0 },
  normal:    { correct: 10, review: 5,  lesson: 1, game: 0 },
  focus:     { correct: 20, review: 8,  lesson: 1, game: 1 },
  challenge: { correct: 40, review: 10, lesson: 2, game: 2 },
};

export function dailyTasks({ mode, today, attempts, sessions, learnedCount, gamesAvailable }) {
  const plan = DAILY_PLAN[mode] || DAILY_PLAN.normal;
  const todays = attempts.filter((a) => dayOf(a.createdAt) === today);
  const todaySessions = sessions.filter((s) => s.day === today);
  const correct = todays.filter((a) => a.correct && EXP_KINDS.has(a.kind)).length;
  const reviewed = todays.filter((a) => a.kind === 'review').length;
  const lessons = todaySessions.filter((s) => s.type === 'lesson' || s.type === 'unit').length;
  const games = todaySessions.filter((s) => s.type === 'game').length;
  const tasks = [{ id: 'correct', icon: '✅', label: `答對 ${plan.correct} 題`, target: plan.correct, current: correct }];
  if (learnedCount > 0) tasks.push({ id: 'review', icon: '📚', label: `複習 ${plan.review} 個單字`, target: plan.review, current: reviewed, href: '#/review?mode=free' });
  if (plan.lesson) tasks.push({ id: 'lesson', icon: '📖', label: `完成 ${plan.lesson} 堂課或單字單元`, target: plan.lesson, current: lessons, href: '#/worlds' });
  if (plan.game && gamesAvailable) tasks.push({ id: 'game', icon: '🎮', label: `玩 ${plan.game} 局遊戲`, target: plan.game, current: games, href: '#/games' });
  for (const t of tasks) { t.current = Math.min(t.current, t.target); t.done = t.current >= t.target; }
  return tasks;
}

// ---------- 每日挑戰（每天輪換一款遊戲）----------
export const CHALLENGES = [
  { id: 'match', game: 'match', label: '圖字配對：失誤 1 次以內', test: (score) => score <= 1 },
  { id: 'speed', game: 'speed', label: '單字快打：拿到 10 分以上', test: (score) => score >= 10 },
  { id: 'spell', game: 'spell', label: '拼字工坊：一次拼對 4 題以上', test: (score) => score >= 4 },
];

export function dailyChallenge(today, sessions) {
  const [y, m, d] = today.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  const c = CHALLENGES[dayNumber % CHALLENGES.length];
  const done = sessions.some((s) => s.day === today && s.type === 'game' && s.gameId === c.game && c.test(s.score));
  return { ...c, done };
}

// ---------- 成就 ----------
export const ACHIEVEMENTS = [
  { id: 'first-step', icon: '🧭', name: '踏出第一步', desc: '完成程度診斷', test: (s) => s.diagnosisDone },
  { id: 'first-lesson', icon: '📖', name: '第一堂課', desc: '完成 1 堂課', test: (s) => s.lessonsCompleted >= 1 },
  { id: 'three-lessons', icon: '📚', name: '漸入佳境', desc: '完成 3 堂不同的課', test: (s) => s.lessonsCompleted >= 3 },
  { id: 'all-lessons', icon: '🏰', name: '課程全制霸', desc: '完成目前所有課程', test: (s) => s.totalLessons > 0 && s.lessonsCompleted >= s.totalLessons },
  { id: 'perfect', icon: '💯', name: '完美一課', desc: '一堂課第一次作答全對', test: (s) => s.perfectLesson },
  { id: 'words-10', icon: '🗂️', name: '單字收藏家', desc: '學過 10 個單字', test: (s) => s.learnedCount >= 10 },
  { id: 'words-20', icon: '📦', name: '單字倉庫', desc: '學過 20 個單字', test: (s) => s.learnedCount >= 20 },
  { id: 'words-100', icon: '📚', name: '百字達人', desc: '學過 100 個單字', test: (s) => s.learnedCount >= 100 },
  { id: 'words-500', icon: '🔥', name: '多益高頻通', desc: '學過 500 個單字', test: (s) => s.learnedCount >= 500 },
  { id: 'words-1000', icon: '🏅', name: '千字大師', desc: '學過 1000 個單字', test: (s) => s.learnedCount >= 1000 },
  { id: 'familiar-5', icon: '🌱', name: '熟能生巧', desc: '5 個單字達到熟悉', test: (s) => s.familiarCount >= 5 },
  { id: 'fix-5', icon: '🩹', name: '知錯能改', desc: '訂正 5 個錯題', test: (s) => s.fixedMistakes >= 5 },
  { id: 'games-all', icon: '🎮', name: '遊戲通', desc: '三款遊戲都玩過', test: (s) => s.gamesPlayed >= 3 },
  { id: 'speed-15', icon: '⚡', name: '快手', desc: '單字快打拿到 15 分', test: (s) => s.speedBest >= 15 },
  { id: 'days-7', icon: '📅', name: '持之以恆', desc: '累計 7 天有學習（不必連續）', test: (s) => s.studyDays >= 7 },
  { id: 'level-5', icon: '⭐', name: '五級冒險者', desc: '升到 Lv 5', test: (s) => s.level >= 5 },
];

export function newAchievements(stats, unlockedIds) {
  return ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id) && a.test(stats));
}

export function studyDays(attempts, sessions) {
  const days = new Set();
  for (const a of attempts) if (EXP_KINDS.has(a.kind)) days.add(dayOf(a.createdAt));
  for (const s of sessions) days.add(s.day);
  return days;
}
