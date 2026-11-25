// 精緻動畫特效：粒子、飄字、彩帶、橫幅、數字跑動、畫面發光、震動
// 使用者在系統開了「減少動態效果」就全部略過（只保留最後結果）。
export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const COLORS = ['#E2B865', '#C9A27E', '#F3D9A4', '#8A5D3D', '#7FB07A', '#F0C6CF'];

function layer() {
  let el = document.querySelector('.fx-layer');
  if (!el) {
    el = document.createElement('div');
    el.className = 'fx-layer';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  return el;
}

function centerOf(target) {
  if (!target?.getBoundingClientRect) return { x: innerWidth / 2, y: innerHeight / 2 };
  const r = target.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// 從某個元素中心炸開小圓點
export function burst(target, { count = 14, colors = COLORS, spread = 90 } = {}) {
  if (reducedMotion()) return;
  const { x, y } = centerOf(target);
  const L = layer();
  for (let i = 0; i < count; i++) {
    const d = document.createElement('span');
    d.className = 'fx-dot';
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = spread * (0.6 + Math.random() * 0.6);
    const size = 5 + Math.random() * 6;
    Object.assign(d.style, {
      left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px`,
      background: colors[i % colors.length], animationDelay: `${Math.random() * 60}ms`,
    });
    d.style.setProperty('--dx', `${Math.cos(a) * dist}px`);
    d.style.setProperty('--dy', `${Math.sin(a) * dist}px`);
    L.appendChild(d);
    setTimeout(() => d.remove(), 950);
  }
}

// 在元素上方飄出文字（例如 +10 EXP）
export function floatText(target, text) {
  if (reducedMotion()) return;
  const { x, y } = centerOf(target);
  const f = document.createElement('span');
  f.className = 'fx-float';
  f.textContent = text;
  Object.assign(f.style, { left: `${x}px`, top: `${y - 20}px` });
  layer().appendChild(f);
  setTimeout(() => f.remove(), 1300);
}

// 畫面中央的短暫橫幅（連對、完美）
export function banner(title, sub = '') {
  if (reducedMotion()) return;
  document.querySelectorAll('.fx-banner').forEach((b) => b.remove());
  const b = document.createElement('div');
  b.className = 'fx-banner';
  b.setAttribute('aria-hidden', 'true');
  b.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1700);
}

// 畫面邊緣發光
export function glow(kind = 'good') {
  if (reducedMotion()) return;
  const g = document.createElement('div');
  g.className = `screen-glow${kind === 'gold' ? ' screen-glow--gold' : ''}`;
  g.setAttribute('aria-hidden', 'true');
  document.body.appendChild(g);
  setTimeout(() => g.remove(), 1000);
}

// 彩帶（canvas）：完成課程、升級時
export function confetti({ count = 120, duration = 2600 } = {}) {
  if (reducedMotion()) return;
  const c = document.createElement('canvas');
  c.className = 'fx-canvas';
  c.setAttribute('aria-hidden', 'true');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  document.body.appendChild(c);
  const g = c.getContext('2d');
  if (!g) { c.remove(); return; }
  g.scale(dpr, dpr);
  const parts = Array.from({ length: count }, (_, i) => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80,
    y: innerHeight * 0.32,
    vx: (Math.random() - 0.5) * 11,
    vy: -6 - Math.random() * 9,
    w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    color: COLORS[i % COLORS.length],
  }));
  const start = performance.now();
  function frame(t) {
    const p = (t - start) / duration;
    g.clearRect(0, 0, innerWidth, innerHeight);
    for (const q of parts) {
      q.vy += 0.28; q.vx *= 0.99; q.x += q.vx; q.y += q.vy; q.r += q.vr;
      g.save(); g.globalAlpha = Math.max(0, 1 - Math.max(0, p - 0.6) / 0.4);
      g.translate(q.x, q.y); g.rotate(q.r); g.fillStyle = q.color;
      g.fillRect(-q.w / 2, -q.h / 2, q.w, Math.abs(Math.cos(q.r * 2)) * q.h + 1);
      g.restore();
    }
    if (p < 1) requestAnimationFrame(frame); else c.remove();
  }
  requestAnimationFrame(frame);
}

// 數字從 0 跑到目標值
export function countUp(el, to, { duration = 900, suffix = '' } = {}) {
  if (!el) return;
  if (reducedMotion() || !to) { el.textContent = `${to}${suffix}`; return; }
  const start = performance.now();
  function frame(t) {
    const p = Math.min(1, (t - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = `${Math.round(to * eased)}${suffix}`;
    if (p < 1) requestAnimationFrame(frame);
  }
  el.textContent = `0${suffix}`;
  requestAnimationFrame(frame);
}

// 手機震動（支援的裝置才會有；iPhone 的網頁不支援就略過）
export function haptic(pattern = 12) {
  try { navigator.vibrate?.(pattern); } catch { /* 不支援 */ }
}
