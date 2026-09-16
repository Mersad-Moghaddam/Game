const TAU = Math.PI * 2;

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

function limb(ctx, x, y, a1, l1, a2, l2, w, color) {
  const x1 = x + Math.cos(a1) * l1, y1 = y + Math.sin(a1) * l1;
  const x2 = x1 + Math.cos(a2) * l2, y2 = y1 + Math.sin(a2) * l2;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  return { x: x2, y: y2 };
}

// Draws a chunky Hotline Miami-style humanoid facing +x in local space:
// big head, bold ink outline, flat saturated colours, readable limbs.
// Returns { hand, head } so callers can place a weapon and a mask.
export function drawHuman(ctx, o = {}) {
  const phase = o.phase || 0;
  const swing = Math.sin(phase);
  const bob = Math.cos(phase) * 0.8;
  const skin = o.skin || '#e8b48c';
  const shirt = o.shirt || '#2b6f78';
  const shirtDark = o.shirtDark || shade(shirt);
  const pants = o.pants || '#1b1d26';
  const pantsDark = o.pantsDark || shade(pants);
  const hair = o.hair || '#1a1420';
  const accent = o.accent || shirtDark;
  const outline = o.outline || '#0b0614';
  const bulk = o.bulk || 0;
  const slim = !!o.slim;
  const lw = (slim ? 6 : 7) + bulk * 0.6;
  const hipY = 3 + bulk * 0.5;
  const shY = 5 + bulk * 0.8;
  const rec = (o.recoil || 0) * 5;

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,.42)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 15 + bulk * 1.5, 8 + bulk, 0, 0, TAU);
  ctx.fill();

  // far side (behind): far leg + far arm
  limb(ctx, -2, -hipY, Math.PI / 2 - swing * 0.45, 7, Math.PI / 2 - swing * 0.45 + 0.1, 6, lw, pantsDark);
  const farArmA = o.pose === 'gun' ? 0.55 : Math.PI - swing * 0.5;
  limb(ctx, 0, -shY, farArmA, 6, farArmA + 0.25, 5, lw - 0.8, shirtDark);

  // torso: wide shoulders, bold outline
  const tw = 19 + bulk * 2, th = 15 + bulk * 1.5;
  ctx.fillStyle = shirt;
  rrect(ctx, -9 - bulk, -8 - bulk * 0.5 + bob, tw, th, 6);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.fillStyle = shirtDark;
  rrect(ctx, -9 - bulk, -8 - bulk * 0.5 + bob, tw, 4.5, 4);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(6 + bulk, -7 - bulk * 0.5 + bob, 2.4, th - 2);

  // near leg
  limb(ctx, -2, hipY, Math.PI / 2 + swing * 0.45, 7, Math.PI / 2 + swing * 0.45 - 0.1, 6, lw, pants);

  // near arm + hand
  let a1, a2;
  if (o.pose === 'gun') { a1 = 0.05; a2 = 0.28; }
  else if (o.pose === 'melee') { a1 = -0.55 + swing * 0.2; a2 = -0.2; }
  else { a1 = 0.8 + swing * 0.3; a2 = 1.2; }
  const hand = limb(ctx, -rec, shY, a1, 7, a2, 5.5, lw - 0.8, shirt);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 2.4, 0, TAU);
  ctx.fill();

  // head: big and bold
  const hx = 7.5 + bob * 0.4, hy = bob * 0.5, hr = 8.2 + bulk * 0.3;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // hair at the back
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(hx - hr * 0.35, hy, hr, 0, TAU);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hx + hr * 0.18, hy, hr * 0.82, 0, TAU);
  ctx.fill();
  // bold eyes
  if (o.face !== 'mask') {
    ctx.fillStyle = '#0b0614';
    ctx.beginPath();
    ctx.arc(hx + 2.6, hy - 2.4, 1.7, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx + 2.6, hy + 2.4, 1.7, 0, TAU);
    ctx.fill();
  }

  // headgear
  if (o.hat === 'cap') {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(hx + 0.5, hy, hr + 0.5, Math.PI * 0.98, Math.PI * 2.02);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(hx + 3, hy - 6.5, 8, 3.4);
  } else if (o.hat === 'hood') {
    ctx.fillStyle = shirtDark;
    ctx.beginPath();
    ctx.arc(hx - 0.5, hy, hr + 1.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(hx + 3, hy, hr * 0.62, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0b0614';
    ctx.beginPath();
    ctx.arc(hx + 4.4, hy, 1.5, 0, TAU);
    ctx.fill();
  } else if (o.hat === 'visor') {
    ctx.fillStyle = '#12101a';
    rrect(ctx, hx - hr, hy - hr * 0.7, hr * 2, hr * 1.4, 4);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = accent;
    rrect(ctx, hx + 1, hy - hr * 0.55, hr * 0.9, hr * 1.1, 3);
    ctx.fill();
  }

  return { hand, head: { x: hx, y: hy } };
}
