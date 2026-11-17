// 迷你測試框架（無外部程式庫）
const cases = [];

export function test(name, fn) { cases.push({ name, fn }); }

export const assert = {
  ok(v, msg = '應為真') { if (!v) throw new Error(msg); },
  equal(a, b, msg) { if (a !== b) throw new Error(msg || `預期 ${JSON.stringify(b)}，實際 ${JSON.stringify(a)}`); },
  deepEqual(a, b, msg) {
    const x = JSON.stringify(a); const y = JSON.stringify(b);
    if (x !== y) throw new Error(msg || `預期 ${y}，實際 ${x}`);
  },
  async rejects(promise, msg = '預期會失敗') {
    try { await promise; } catch { return; }
    throw new Error(msg);
  },
};

export async function run(outEl) {
  const results = [];
  for (const c of cases) {
    const t0 = performance.now();
    try {
      await c.fn();
      results.push({ name: c.name, pass: true, ms: performance.now() - t0 });
    } catch (err) {
      results.push({ name: c.name, pass: false, error: String(err && err.message || err) });
    }
  }
  const passed = results.filter((r) => r.pass).length;
  if (outEl) {
    outEl.innerHTML = `
      <p class="summary ${passed === results.length ? 'pass' : 'fail'}">通過 ${passed} / ${results.length}</p>
      <ul>${results.map((r) => `<li class="${r.pass ? 'pass' : 'fail'}">${r.pass ? '✅' : '❌'} ${r.name}${r.error ? `<br><small>${r.error}</small>` : ''}</li>`).join('')}</ul>`;
  }
  window.__testResults = { passed, total: results.length, results };
  return window.__testResults;
}
