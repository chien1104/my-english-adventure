import { test, assert } from './runner.js';
import { createSettings, sanitize, defaultSettings, todayKey, SETTINGS_KEY } from '../js/settings.js';

function memStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
}

test('預設值：普通模式、5/15/30/60 分鐘', () => {
  const d = defaultSettings();
  assert.equal(d.defaultMode, 'normal');
  assert.deepEqual(d.modeMinutes, { low: 5, normal: 15, focus: 30, challenge: 60 });
});

test('損毀的 JSON 會回到預設值', () => {
  const s = createSettings(memStorage({ [SETTINGS_KEY]: '{壞掉' }));
  assert.equal(s.get().defaultMode, 'normal');
});

test('暱稱去除空白並限制 20 字', () => {
  const out = sanitize({ nickname: '   ' + '芊'.repeat(30) + '  ' });
  assert.equal(Array.from(out.nickname).length, 20);
});

test('模式時間超出範圍會被限制', () => {
  const out = sanitize({ modeMinutes: { low: 999, normal: 1, focus: 'abc', challenge: 45 } });
  assert.deepEqual(out.modeMinutes, { low: 15, normal: 5, focus: 30, challenge: 45 });
});

test('更新後寫入儲存空間，重新建立仍讀得到', () => {
  const store = memStorage();
  const a = createSettings(store);
  assert.ok(a.update({ nickname: '芊芊', defaultMode: 'focus' }).ok);
  const b = createSettings(store);
  assert.equal(b.get().nickname, '芊芊');
  assert.equal(b.get().defaultMode, 'focus');
});

test('今日模式只在當天有效，隔天回到預設', () => {
  const s = createSettings(memStorage());
  const day1 = new Date(2026, 10, 17, 9);
  const day2 = new Date(2026, 10, 18, 9);
  s.setTodayMode('low', day1);
  assert.deepEqual(s.getTodayMode(day1), { mode: 'low', chosen: true });
  assert.deepEqual(s.getTodayMode(day2), { mode: 'normal', chosen: false });
});

test('未知模式會被拒絕', () => {
  const s = createSettings(memStorage());
  assert.equal(s.setTodayMode('sleep').ok, false);
});

test('儲存失敗時回報錯誤，不會丟例外', () => {
  const broken = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); } };
  const s = createSettings(broken);
  const res = s.update({ nickname: 'A' });
  assert.equal(res.ok, false);
  assert.ok(res.error.length > 0);
});

test('todayKey 使用本地日期格式', () => {
  assert.equal(todayKey(new Date(2026, 0, 5)), '2026-01-05');
});
