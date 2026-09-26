// Small drawing helpers shared by the character and level renderers.

export function rrect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function shade(hex, f = 0.72) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

export function tint(hex, f = 1.25) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.round(Math.min(255, v * f));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

export function rgba(hex, a = 1) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function drawLaserSight(ctx, opts = {}) {
  const x = opts.x || 0;
  const y = opts.y || 0;
  const angle = opts.angle || 0;
  const length = opts.length || 180;
  const color = opts.color || '#ff2244';
  const width = opts.width || 1.2;
  const alpha = opts.alpha != null ? opts.alpha : 0.7;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const ex = x + cos * length;
  const ey = y + sin * length;

  ctx.save();
  // Bloom halo beam
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha * 0.25;
  ctx.lineWidth = width * 3.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // Intense core beam
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // Terminal target dot
  ctx.fillStyle = color;
  ctx.globalAlpha = Math.min(1, alpha * 1.3);
  ctx.beginPath();
  ctx.arc(ex, ey, width * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawSpallSparks(ctx, x, y, seed = 0, count = 6, color = '#ffd700') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < count; i++) {
    const pseudo = ((seed * 9301 + i * 49297 + 233280) % 233280) / 233280;
    const pseudo2 = ((seed * 12345 + i * 67891 + 104729) % 104729) / 104729;
    const a = pseudo * Math.PI * 2;
    const len = 4 + pseudo2 * 10;
    const sx = x + Math.cos(a) * (2 + pseudo2 * 2);
    const sy = y + Math.sin(a) * (2 + pseudo2 * 2);
    const ex = sx + Math.cos(a) * len;
    const ey = sy + Math.sin(a) * len;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.fillRect(ex - 0.7, ey - 0.7, 1.4, 1.4);
  }
  ctx.restore();
}
