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

export function tint(hex, f = 1.25) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.round(Math.min(255, v * f));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

// One limb, drawn with a consistent ink outline then the fill colour.
// Returns the foot/hand end point and the segment angle.
function limb(ctx, x, y, a1, l1, a2, l2, w, color, outline) {
  const x1 = x + Math.cos(a1) * l1, y1 = y + Math.sin(a1) * l1;
  const x2 = x1 + Math.cos(a2) * l2, y2 = y1 + Math.sin(a2) * l2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = outline;
  ctx.lineWidth = w + 2.2;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
  return { x: x2, y: y2, a: a2 };
}

function foot(ctx, p, color, outline, w) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);
  ctx.fillStyle = outline;
  ctx.fillRect(-3, -w * 0.5 - 1, w + 4, w + 2);
  ctx.fillStyle = color;
  ctx.fillRect(-2, -w * 0.5, w + 2, w);
  ctx.restore();
}

// Draws a chunky Hotline Miami-style humanoid facing +x in local space,
// with consistent outlines, shaded cloth and readable person details.
// Returns { hand, head } so callers can place a weapon and a mask.
export function drawHuman(ctx, o = {}) {
  const phase = o.phase || 0;
  const swing = Math.sin(phase);
  const bob = Math.cos(phase) * 0.8;
  const skin = o.skin || '#e8b48c';
  const skinDark = o.skinDark || shade(skin, 0.82);
  const shirt = o.shirt || '#2b6f78';
  const shirtDark = o.shirtDark || shade(shirt, 0.72);
  const shirtHi = tint(shirt, 1.18);
  const pants = o.pants || '#1b1d26';
  const pantsDark = o.pantsDark || shade(pants, 0.7);
  const shoe = o.shoe || shade(pants, 0.5);
  const hair = o.hair || '#1a1420';
  const accent = o.accent || shirtDark;
  const outline = o.outline || '#0b0614';
  const glove = o.glove || skin;
  const bulk = o.bulk || 0;
  const slim = !!o.slim;
  const lw = (slim ? 6 : 7) + bulk * 0.6;
  const hipY = 3 + bulk * 0.5;
  const shY = 5 + bulk * 0.8;
  const rec = (o.recoil || 0) * 5;
  const lean = swing * 0.7;

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // ground shadow
  ctx.fillStyle = 'rgba(0,0,0,.44)';
  ctx.beginPath();
  ctx.ellipse(lean, 6, 15 + bulk * 1.5, 8 + bulk, 0, 0, TAU);
  ctx.fill();

  // far side (behind): far leg + far arm
  const farLeg = limb(ctx, -2, -hipY, Math.PI / 2 - swing * 0.45, 7, Math.PI / 2 - swing * 0.45 + 0.1, 6, lw, pantsDark, outline);
  foot(ctx, farLeg, shoe, outline, lw - 1);
  const farArmA = o.pose === 'gun' ? 0.55 : Math.PI - swing * 0.5;
  limb(ctx, 0, -shY, farArmA, 6, farArmA + 0.25, 5, lw - 0.8, shirtDark, outline);

  // torso: wide shoulders, shaded cloth, bold outline
  const tx = -9 - bulk + lean, ty = -8 - bulk * 0.5 + bob;
  const tw = 19 + bulk * 2, th = 15 + bulk * 1.5;
  ctx.fillStyle = shirt;
  rrect(ctx, tx, ty, tw, th, 6);
  ctx.fill();
  ctx.fillStyle = shirtHi;
  rrect(ctx, tx + 1.5, ty + 1.5, tw - 3, 4, 3);
  ctx.fill();
  ctx.fillStyle = shirtDark;
  rrect(ctx, tx, ty + th - 4.5, tw, 4.5, 4);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.4;
  rrect(ctx, tx, ty, tw, th, 6);
  ctx.stroke();
  // collar + accent chest seam
  ctx.fillStyle = shirtDark;
  ctx.beginPath();
  ctx.moveTo(tx + tw - 6, ty + 1);
  ctx.lineTo(tx + tw - 1, ty + 1);
  ctx.lineTo(tx + tw * 0.62, ty + 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(tx + tw - 3.4, ty + 5, 2.2, th - 8);
  // belt
  ctx.fillStyle = outline;
  ctx.fillRect(tx + 1, ty + th - 3.6, tw - 2, 2);
  ctx.fillStyle = accent;
  ctx.fillRect(tx + tw - 6, ty + th - 4.2, 2.4, 3);

  // near leg
  const nearLeg = limb(ctx, -2, hipY, Math.PI / 2 + swing * 0.45, 7, Math.PI / 2 + swing * 0.45 - 0.1, 6, lw, pants, outline);
  foot(ctx, nearLeg, shoe, outline, lw - 1);

  // near arm + hand
  let a1, a2;
  if (o.pose === 'gun') { a1 = 0.05; a2 = 0.28; }
  else if (o.pose === 'melee') { a1 = -0.55 + swing * 0.2; a2 = -0.2; }
  else { a1 = 0.8 + swing * 0.3; a2 = 1.2; }
  const nearArm = limb(ctx, lean - rec, shY, a1, 7, a2, 5.5, lw - 0.8, shirt, outline);
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(nearArm.x, nearArm.y, 3.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = glove;
  ctx.beginPath();
  ctx.arc(nearArm.x, nearArm.y, 2.5, 0, TAU);
  ctx.fill();

  // head: big, bold, with a real face
  const hx = 7.5 + swing * 0.5, hy = bob * 0.5;
  const hr = 8.2 + bulk * 0.3;
  // back hair
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(hx - hr * 0.4, hy, hr + 0.4, 0, TAU);
  ctx.fill();
  // face
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(hx, hy, hr + 1.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, TAU);
  ctx.fill();
  // cheek/jaw shading
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.arc(hx + hr * 0.25, hy + hr * 0.35, hr * 0.62, 0, Math.PI);
  ctx.fill();
  // eyes (bold ovals with a glint), brow, nose, mouth
  ctx.fillStyle = '#0b0614';
  ctx.beginPath();
  ctx.ellipse(hx + 2.8, hy - 2.5, 1.9, 1.5, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx + 2.8, hy + 2.5, 1.9, 1.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.arc(hx + 3.4, hy - 2.9, 0.5, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx + 3.4, hy + 2.1, 0.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = hair;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(hx + 1.2, hy - 4.2);
  ctx.lineTo(hx + 4.6, hy - 3.8);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx + 1.2, hy + 4.2);
  ctx.lineTo(hx + 4.6, hy + 3.8);
  ctx.stroke();
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.moveTo(hx + 5.6, hy - 1);
  ctx.lineTo(hx + 7.2, hy);
  ctx.lineTo(hx + 5.6, hy + 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5a2a2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hx + 4.2, hy + 3.2);
  ctx.lineTo(hx + 6.4, hy + 3);
  ctx.stroke();
  // front hair fringe
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(hx - 1.6, hy - 2.6, hr * 0.72, Math.PI * 0.95, Math.PI * 2.1);
  ctx.fill();

  // headgear
  if (o.hat === 'cap') {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(hx + 0.5, hy, hr + 0.6, Math.PI * 1.0, Math.PI * 2.0);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(hx + 3, hy - 6.5, 8.5, 3.4);
    ctx.fillStyle = shade(accent, 0.7);
    ctx.fillRect(hx + 3, hy - 4.3, 8.5, 1.2);
  } else if (o.hat === 'hood') {
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.arc(hx - 0.5, hy, hr + 2.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = shirtDark;
    ctx.beginPath();
    ctx.arc(hx - 0.5, hy, hr + 1.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.arc(hx + 3.2, hy, hr * 0.7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(hx + 3.2, hy, hr * 0.58, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0b0614';
    ctx.beginPath();
    ctx.arc(hx + 4.6, hy, 1.5, 0, TAU);
    ctx.fill();
  } else if (o.hat === 'visor') {
    ctx.fillStyle = outline;
    rrect(ctx, hx - hr - 1, hy - hr * 0.75 - 1, hr * 2 + 2, hr * 1.5 + 2, 5);
    ctx.fill();
    ctx.fillStyle = '#12101a';
    rrect(ctx, hx - hr, hy - hr * 0.7, hr * 2, hr * 1.4, 4);
    ctx.fill();
    ctx.fillStyle = accent;
    rrect(ctx, hx + 1, hy - hr * 0.55, hr * 0.9, hr * 1.1, 3);
    ctx.fill();
  }

  return { hand: { x: nearArm.x, y: nearArm.y }, head: { x: hx, y: hy } };
}
