// 獎勵提示：經驗值、升級、成就
import { toast } from './toast.js';
import { loadContext } from '../learning.js';
import { settleRewards } from '../rewards.js';

export function celebrate(results) {
  const list = results.filter(Boolean);
  const exp = list.reduce((n, r) => n + (r.amount || 0), 0);
  const achievements = list.filter((r) => r.achievement).map((r) => r.achievement.name);
  const levelUp = list.map((r) => r.levelUp).filter(Boolean).pop();
  // 合併成一則提示，避免一次跳出很多則蓋住畫面
  const parts = [];
  if (exp > 0) parts.push(`✨ +${exp} EXP`);
  if (achievements.length) parts.push(`🏅 解鎖成就：${achievements[0]}${achievements.length > 1 ? ` 等 ${achievements.length} 個` : ''}`);
  if (parts.length) toast(parts.join('・'), { type: 'success', duration: 3200 });
  if (levelUp) setTimeout(() => toast(`🎉 升級！Lv ${levelUp.level}「${levelUp.title}」`, { type: 'success', duration: 3500 }), 600);
}

// 活動結束後：結算每日任務、挑戰、成就，再一起提示
export async function afterActivity({ db, settings, earned = [] }) {
  try {
    const ctx = await loadContext(db);
    const { results } = await settleRewards(db, ctx, settings.getTodayMode().mode);
    celebrate([...earned, ...results]);
    return results;
  } catch (err) {
    console.error(err);
    celebrate(earned);
    return [];
  }
}
