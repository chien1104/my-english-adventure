import { test, assert } from './runner.js';
import { levelInfo, expForLevel, dailyTasks, dailyChallenge, newAchievements, ACHIEVEMENTS, studyDays } from '../js/gamify.js';
import { openDB, deleteDB } from '../js/db.js';
import { awardExp, recordAttempt, logSession, totalExp } from '../js/rewards.js';

test('等級：Lv2 需 100、Lv3 需 300，進度正確', () => {
  assert.equal(expForLevel(2), 100);
  assert.equal(expForLevel(3), 300);
  const a = levelInfo(0); assert.equal(a.level, 1); assert.equal(a.title, '見習冒險者');
  const b = levelInfo(150); assert.equal(b.level, 2); assert.equal(b.into, 50); assert.equal(b.need, 200);
  assert.equal(levelInfo(300).level, 3);
});

const T = new Date(2026, 10, 17, 10).getTime();
const att = (o) => ({ kind: 'lesson', correct: true, createdAt: T, ...o });

test('每日任務：依精神狀態調整份量，不會超過目標', () => {
  const attempts = Array.from({ length: 12 }, () => att({}));
  const low = dailyTasks({ mode: 'low', today: '2026-11-17', attempts, sessions: [], learnedCount: 8, gamesAvailable: true });
  assert.deepEqual(low.map((t) => t.id), ['correct', 'review']);
  assert.ok(low[0].done); assert.equal(low[0].current, 5);
  const ch = dailyTasks({ mode: 'challenge', today: '2026-11-17', attempts, sessions: [], learnedCount: 8, gamesAvailable: true });
  assert.deepEqual(ch.map((t) => t.id), ['correct', 'review', 'lesson', 'game']);
  assert.ok(!ch[0].done);
});

test('每日任務：還沒學單字就不出複習任務；昨天的作答不算', () => {
  const tasks = dailyTasks({ mode: 'normal', today: '2026-11-18', attempts: [att({})], sessions: [], learnedCount: 0, gamesAvailable: false });
  assert.deepEqual(tasks.map((t) => t.id), ['correct', 'lesson']);
  assert.equal(tasks[0].current, 0);
});

test('每日挑戰：每天輪換，達標才算完成', () => {
  const ids = new Set(['2026-11-17', '2026-11-18', '2026-11-19'].map((d) => dailyChallenge(d, []).id));
  assert.equal(ids.size, 3);
  const c = dailyChallenge('2026-11-17', []);
  const pass = { match: 1, speed: 10, spell: 4 }[c.game];
  assert.ok(dailyChallenge('2026-11-17', [{ day: '2026-11-17', type: 'game', gameId: c.game, score: pass }]).done);
  const fail = { match: 2, speed: 9, spell: 3 }[c.game];
  assert.ok(!dailyChallenge('2026-11-17', [{ day: '2026-11-17', type: 'game', gameId: c.game, score: fail }]).done);
});

test('成就：只回傳新達成的', () => {
  const stats = { diagnosisDone: true, lessonsCompleted: 1, totalLessons: 7, learnedCount: 8, familiarCount: 0, fixedMistakes: 0, gamesPlayed: 0, speedBest: 0, studyDays: 1, level: 1, perfectLesson: false };
  const ids = newAchievements(stats, new Set(['first-step'])).map((a) => a.id);
  assert.deepEqual(ids, ['first-lesson']);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
});

test('學習天數：累計不必連續', () => {
  const days = studyDays([att({ createdAt: T }), att({ createdAt: T + 86400000 * 5 }), { kind: 'diagnosis', createdAt: T + 86400000 * 9 }], []);
  assert.equal(days.size, 2, '診斷不算學習天');
});

const uniq = () => `mea-test-rw-${Date.now()}-${Math.random().toString(36).slice(2)}`;
test('經驗值：同一件事只給一次，升級會回報，經驗值只增不減', async () => {
  const n = uniq(); const db = await openDB({ name: n });
  const r1 = await awardExp(db, 'x', 90, 't'); assert.equal(r1.amount, 90); assert.equal(r1.levelUp, null);
  assert.equal(await awardExp(db, 'x', 90, 't'), null, '重複 key 不再給');
  const r2 = await awardExp(db, 'y', 20, 't'); assert.equal(r2.levelUp.level, 2);
  assert.equal(await totalExp(db), 110);
  assert.equal((await db.get('profile', 'me')).exp, 110);
  db.close(); await deleteDB(n);
});

test('作答：答對給經驗值，答錯與診斷題不給', async () => {
  const n = uniq(); const db = await openDB({ name: n });
  assert.ok(await recordAttempt(db, att({})));
  assert.equal(await recordAttempt(db, att({ correct: false })), null);
  assert.equal(await recordAttempt(db, att({ kind: 'diagnosis' })), null);
  assert.equal(await db.count('attempts'), 3);
  assert.equal(await totalExp(db), 2);
  const s = await logSession(db, { type: 'game', gameId: 'speed', score: 5 });
  assert.equal(s.amount, 5);
  db.close(); await deleteDB(n);
});
