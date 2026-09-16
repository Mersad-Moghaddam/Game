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

// Draws a top-down/three-quarter humanoid facing +x in local space.
// Returns { hand, head } so callers can place a weapon and a mask.
export function drawHuman(ctx, o = {}) {
  const phase = o.phase || 0;
  const swing = Math.sin(phase);
  const bob = Math.cos(phase) * 0.9;
  const skin = o.skin || '#e8b48c';
  const skinDark = o.skinDark || '#bd8259';
  const shirt = o.shirt || '#2b6f78';
  const shirtDark = o.shirtDark || shade(shirt);
  const pants = o.pants || '#1b1d26';
  const pantsDark = o.pantsDark || shade(pants);
  const hair = o.hair || '#241a2e';
  const accent = o.accent || shirtDark;
  const bulk = o.bulk || 0;
  const slim = !!o.slim;
  const lw = slim ? 4.8 : 5.8;
  const hipY = 2.5 + bulk * 0.4;
  const shY = 4.6 + bulk * 0.7;
  const rec = (o.recoil || 0) * 5;

  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,.42)';
  ctx.beginPath();
  ctx.ellipse(0, 5, 15 + bulk, 9 + bulk * 0.6, 0, 0, TAU);
  ctx.fill();

  // far side (behind): far leg + far arm
  limb(ctx, -2, -hipY, Math.PI / 2 - swing * 0.5, 8, Math.PI / 2 - swing * 0.5 + 0.1, 7, lw, pantsDark);
  const farArmA = o.pose === 'gun' ? 0.5 : Math.PI - swing * 0.55;
  limb(ctx, 1, -shY, farArmA, 7, farArmA + 0.2, 6, lw - 0.6, shirtDark);

  // torso
  const tw = 15 + bulk * 2, th = 14 + bulk * 2;
  ctx.fillStyle = shirt;
  rrect(ctx, -7 - bulk, -7 - bulk + bob, tw, th, 5);
  ctx.fill();
  ctx.fillStyle = shirtDark;
  rrect(ctx, -7 - bulk, -7 - bulk + bob, tw, 4, 4);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(6 + bulk, -6 - bulk + bob, 2, 12 + bulk * 2);

  // near leg
  limb(ctx, -2, hipY, Math.PI / 2 + swing * 0.5, 8, Math.PI / 2 + swing * 0.5 - 0.1, 7, lw, pants);

  // near arm + hand
  let a1, a2;
  if (o.pose === 'gun') { a1 = 0.02; a2 = 0.22; }
  else if (o.pose === 'melee') { a1 = -0.5 + swing * 0.2; a2 = -0.15; }
  else { a1 = 0.85 + swing * 0.35; a2 = 1.25; }
  const hand = limb(ctx, 1 - rec, shY, a1, 8, a2, 6, lw - 0.6, shirt);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 2.2, 0, TAU);
  ctx.fill();

  // head
  const hx = 9 + bob * 0.4, hy = bob * 0.5;
  ctx.strokeStyle = skinDark;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(4, hy);
  ctx.lineTo(hx - 3, hy);
  ctx.stroke();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(hx - 1, hy, 7.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hx + 1.2, hy, 5.8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.arc(hx + 2, hy + 2.2, 3.4, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#1a1420';
  ctx.beginPath();
  ctx.arc(hx + 3, hy - 2.2, 1.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx + 3, hy + 2.2, 1.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hair;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(hx + 1.4, hy - 3.5);
  ctx.lineTo(hx + 4.8, hy - 3.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx + 1.4, hy + 3.5);
  ctx.lineTo(hx + 4.8, hy + 3.1);
  ctx.stroke();

  // headgear
  if (o.hat === 'cap') {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(hx - 1, hy, 7.4, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    ctx.fillRect(hx + 1, hy - 6, 7, 3);
  } else if (o.hat === 'hood') {
    ctx.fillStyle = shirtDark;
    ctx.beginPath();
    ctx.moveTo(hx - 8, hy - 7);
    ctx.lineTo(hx + 9, hy - 8);
    ctx.lineTo(hx + 12, hy);
    ctx.lineTo(hx + 8, hy + 8);
    ctx.lineTo(hx - 8, hy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(hx + 2.5, hy, 4.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a1420';
    ctx.beginPath();
    ctx.arc(hx + 4, hy - 1.6, 1.2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx + 4, hy + 1.6, 1.2, 0, TAU);
    ctx.fill();
  } else if (o.hat === 'visor') {
    ctx.fillStyle = '#12101a';
    rrect(ctx, hx - 7, hy - 6, 15, 12, 4);
    ctx.fill();
    ctx.fillStyle = accent;
    rrect(ctx, hx + 1, hy - 4.5, 7, 9, 3);
    ctx.fill();
  }

  return { hand, head: { x: hx, y: hy } };
}
