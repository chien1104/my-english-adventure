// 獎勵發放（會寫資料庫）：所有作答、活動都經過這裡，經驗值只發一次。
import { EXP, EXP_KINDS, levelInfo, dailyTasks, dailyChallenge, newAchievements, studyDays, dayOf } from './gamify.js';
import { todayKey } from './settings.js';
import { lessonKey } from './progress.js';

export async function totalExp(db) {
  const log = await db.getAll('expLog');
  return log.reduce((n, e) => n + e.amount, 0);
}

// 以 key 保證同一件事只給一次經驗值
export async function awardExp(db, key, amount, reason, now = Date.now()) {
  if (await db.get('expLog', key)) return null;
  const before = levelInfo(await totalExp(db));
  await db.put('expLog', { id: key, amount, reason, createdAt: now, day: dayOf(now) });
  const after = levelInfo(before.exp + amount);
  const profile = (await db.get('profile', 'me')) || { id: 'me', createdAt: now };
  await db.put('profile', { ...profile, exp: after.exp, level: after.level });
  return { amount, reason, levelUp: after.level > before.level ? after : null };
}

export async function recordAttempt(db, attempt) {
  const id = await db.put('attempts', attempt);
  if (attempt.correct && EXP_KINDS.has(attempt.kind)) {
    return awardExp(db, `att:${id}`, EXP.correct, '答對一題', attempt.createdAt);
  }
  return null;
}

export async function logSession(db, session, now = Date.now()) {
  const row = { ...session, createdAt: now, day: dayOf(now) };
  const id = await db.put('sessions', row);
  const rules = {
    review: [EXP.reviewSession, '完成單字複習'],
    mistake: [EXP.mistakeSession, '完成錯題重練'],
    game: [EXP.gameSession, '玩完一局遊戲'],
  };
  const rule = rules[session.type];
  return rule ? awardExp(db, `session:${id}`, rule[0], rule[1], now) : null;
}

export async function awardLessonComplete(db, lessonId, timesCompleted, title, now = Date.now()) {
  const first = timesCompleted === 1;
  return awardExp(db, `lesson:${lessonId}:${timesCompleted}`, first ? EXP.lessonFirst : EXP.lessonRepeat,
    first ? `完成「${title}」` : `重新完成「${title}」`, now);
}

// 收集算成就需要的數據
export async function achievementStats(db, ctx) {
  const sessions = await db.getAll('sessions');
  const completed = ctx.lessons.filter((l) => ctx.access.get(l.id)?.completed);
  const perfect = ctx.lessons.some((l) => (ctx.progressById.get(lessonKey(l.id))?.bestAccuracy ?? 0) === 100);
  const games = await Promise.all(['match', 'speed', 'spell'].map((g) => db.get('progress', `game:${g}`)));
  return {
    diagnosisDone: !!ctx.diagnosis,
    lessonsCompleted: completed.length,
    totalLessons: ctx.lessons.length,
    perfectLesson: perfect,
    learnedCount: ctx.learnedCount,
    familiarCount: [...ctx.records.values()].filter((r) => r.status === 'familiar').length,
    fixedMistakes: ctx.mistakes.filter((m) => m.fixed).length,
    gamesPlayed: games.filter((g) => g && g.plays > 0).length,
    speedBest: games[1]?.best ?? 0,
    studyDays: studyDays(ctx.attempts, sessions).size,
    level: levelInfo(await totalExp(db)).level,
    sessions,
  };
}

// 每次活動結束後呼叫：發每日任務、每日挑戰、成就的獎勵。回傳新得到的獎勵（給畫面提示）。
export async function settleRewards(db, ctx, mode, now = Date.now()) {
  const results = [];
  const today = todayKey(new Date(now));
  const stats = await achievementStats(db, ctx);
  const gamesAvailable = ctx.learnedWords.length >= 4;

  const tasks = dailyTasks({ mode, today, attempts: ctx.attempts, sessions: stats.sessions, learnedCount: ctx.learnedCount, gamesAvailable });
  for (const t of tasks.filter((x) => x.done)) {
    const r = await awardExp(db, `daily:${today}:${t.id}`, EXP.dailyTask, `每日任務：${t.label}`, now);
    if (r) results.push(r);
  }
  if (tasks.length && tasks.every((t) => t.done)) {
    const r = await awardExp(db, `daily:${today}:all`, EXP.dailyAll, '今日任務全部完成', now);
    if (r) results.push(r);
  }
  if (gamesAvailable) {
    const c = dailyChallenge(today, stats.sessions);
    if (c.done) {
      const r = await awardExp(db, `challenge:${today}`, EXP.challenge, `每日挑戰：${c.label}`, now);
      if (r) results.push(r);
    }
  }

  // 成就可能因為上面的經驗值而升級，所以算兩輪
  for (let round = 0; round < 2; round++) {
    const unlocked = new Set((await db.getAll('achievements')).map((a) => a.id));
    stats.level = levelInfo(await totalExp(db)).level;
    for (const a of newAchievements(stats, unlocked)) {
      await db.put('achievements', { id: a.id, unlockedAt: now });
      const r = await awardExp(db, `ach:${a.id}`, EXP.achievement, `成就：${a.name}`, now);
      results.push({ ...(r || { amount: 0 }), achievement: a });
    }
  }
  return { results, tasks, stats };
}

// P4 之前的學習紀錄：補發經驗值（用相同的 key，不會重複）
export async function backfillExp(db, ctx) {
  if (await db.getMeta('expBackfillV1')) return;
  for (const a of ctx.attempts) {
    if (a.correct && EXP_KINDS.has(a.kind) && a.id !== undefined) {
      await awardExp(db, `att:${a.id}`, EXP.correct, '答對一題', a.createdAt);
    }
  }
  for (const l of ctx.lessons) {
    const p = ctx.progressById.get(lessonKey(l.id));
    for (let i = 1; i <= (p?.timesCompleted || 0); i++) await awardLessonComplete(db, l.id, i, l.title, p.updatedAt || Date.now());
  }
  if (ctx.diagnosis) await awardExp(db, 'diagnosis:first', EXP.diagnosis, '完成程度診斷', ctx.diagnosis.completedAt);
  await db.setMeta('expBackfillV1', Date.now());
}
