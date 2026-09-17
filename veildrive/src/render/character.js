// Shared character renderer. Figures are drawn UPRIGHT in the world frame (the
// context is only translated, never rotated to the facing angle), so a
// character facing left is mirrored, never inverted. Body orientation comes
// from the facing quadrant; the weapon and arms follow the true aim angle in
// body space, so aiming up/down/left/right always points the gun correctly.
//
// `drawCharacter(ctx, spec)` returns world-space sockets
// `{ hand, offhand, head, muzzle }` used for effects and weapon glow.
import { COLORS } from '../data/config.js';
import { clamp } from '../core/math.js';
import { rrect, shade, tint } from './humanoid.js';
import { drawWeaponArt } from './weapons-art.js';

const TAU = Math.PI * 2;
const hash1 = n => { let h = Math.imul((n | 0) ^ 61, 0x27d4eb2d); h ^= h >>> 15; h = Math.imul(h, 0x2545f491); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };

export const CHARACTERS = {
  moth0: {
    build: { bulk: 0, height: 1.0, slender: true },
    palette: { skin: '#e0a97f', skinDark: '#bd8259', hair: '#1a1524', shirt: '#0e7a78', shirtDark: '#0a5c5a', pants: '#161a24', pantsDark: '#10131a', accent: COLORS.hotPink, shoe: '#0b0d12', glove: '#1a1524' },
    gear: { mask: 'moth', straps: true }
  },
  guard: {
    build: { bulk: 0.5, height: 1.0 },
    palette: { skin: '#e0a97f', skinDark: '#bd8259', hair: '#241a16', shirt: '#c33b5a', shirtDark: '#7f2438', pants: '#1b2030', pantsDark: '#12161f', accent: '#ff2e88', shoe: '#0b0d12', glove: '#2a1a20' },
    gear: { hat: 'cap', radio: true, straps: true }
  },
  brawler: {
    build: { bulk: 1.6, height: 1.02 },
    palette: { skin: '#d79a70', skinDark: '#ab7350', hair: '#3a2a1e', shirt: '#e07a2b', shirtDark: '#9c5018', pants: '#20222c', pantsDark: '#141620', accent: '#ffb347', shoe: '#0b0d12', glove: '#d79a70' },
    gear: { bandana: '#ffb347', fists: true }
  },
  shotgunner: {
    build: { bulk: 1.2, height: 1.0 },
    palette: { skin: '#dfa87c', skinDark: '#b27f57', hair: '#2a2118', shirt: '#9bbf2e', shirtDark: '#63791c', pants: '#1a2416', pantsDark: '#10170d', accent: '#d6ff4a', shoe: '#0b0d12', glove: '#3a3a2a' },
    gear: { bandana: '#d6ff4a', vest: true, straps: true }
  },
  hunter: {
    build: { bulk: 0.1, height: 1.06, slender: true },
    palette: { skin: '#e0a97f', skinDark: '#bd8259', hair: '#1a1018', shirt: '#2f9fb5', shirtDark: '#1c6675', pants: '#141824', pantsDark: '#0d1018', accent: '#12e0ff', shoe: '#0b0d12', glove: '#141824' },
    gear: { hat: 'hood', straps: true }
  },
  elite: {
    build: { bulk: 1.0, height: 1.12 },
    palette: { skin: '#dcae82', skinDark: '#b5825a', hair: '#141018', shirt: '#7a3bff', shirtDark: '#4a1f9e', pants: '#141018', pantsDark: '#0c0912', accent: '#b06bff', shoe: '#0b0d12', glove: '#2a1a3a' },
    gear: { coat: true, visor: true, shoulderPads: true }
  },
  porter: {
    build: { bulk: 2.2, height: 1.2 },
    palette: { skin: '#dcae82', skinDark: '#b5825a', hair: '#141018', shirt: '#2a1a44', shirtDark: '#180f2c', pants: '#141018', pantsDark: '#0c0912', accent: '#8b2bff', shoe: '#0b0d12', glove: '#1a1020' },
    gear: { apron: true, mask: 'keyhole', shoulderPads: true }
  }
};

// Facing -> view. `flip` mirrors the body for the left half; `localAim` is the
// aim angle expressed in body space (always within +/- PI/2, so the weapon
// reads as pointing "forward" after the mirror). `pitch` is the raw vertical
// component, used to raise/lower the weapon and head.
export function facingView(a) {
  const c = Math.cos(a), s = Math.sin(a);
  const flip = c < 0;
  const dir = flip ? -1 : 1;
  const localAim = Math.atan2(s, Math.abs(c) || 1e-6);
  return { view: 'side', flip, dir, localAim, pitch: s };
}

// Pose -> joint directives. `chest` is the torso lean (kept as a distinct
// field for tests/inspection). Leg angles use y-down space (PI/2 = straight
// down). `armMode` tells drawCharacter how to orient the arms/weapon.
export function poseJoints(pose, phase = 0, view = 'side', build = {}) {
  const slim = !!build.slender;
  const swing = Math.sin(phase);
  const base = {
    chest: 0, lean: 0, bob: 0,
    legNearH: Math.PI / 2, legNearK: 0.06,
    legFarH: Math.PI / 2, legFarK: 0.06,
    armMode: 'idle'
  };
  switch (pose) {
    case 'walk': return { ...base,
      chest: 0.06, lean: 0.06, bob: Math.abs(swing) * 1.1 * (slim ? 0.8 : 1),
      legNearH: Math.PI / 2 + swing * 0.42, legNearK: 0.5 * Math.max(0, -swing) + 0.08,
      legFarH: Math.PI / 2 - swing * 0.42, legFarK: 0.5 * Math.max(0, swing) + 0.08,
      armMode: 'swing' };
    case 'run': return { ...base,
      chest: 0.16, lean: 0.16, bob: Math.abs(swing) * 1.7,
      legNearH: Math.PI / 2 + swing * 0.72, legNearK: 0.95 * Math.max(0, -swing) + 0.12,
      legFarH: Math.PI / 2 - swing * 0.72, legFarK: 0.95 * Math.max(0, swing) + 0.12,
      armMode: 'swing' };
    case 'aim': return { ...base,
      chest: 0.05, lean: 0.05, bob: Math.sin(phase * 2) * 0.3,
      legNearH: Math.PI / 2 + 0.24, legNearK: 0.12,
      legFarH: Math.PI / 2 - 0.2, legFarK: 0.2,
      armMode: 'aim' };
    case 'melee': return { ...base,
      chest: -0.05 + swing * 0.2, lean: -0.05 + swing * 0.2, bob: 0,
      legNearH: Math.PI / 2 + 0.3, legNearK: 0.1,
      legFarH: Math.PI / 2 - 0.25, legFarK: 0.16,
      armMode: 'melee' };
    case 'reload': return { ...base, chest: 0.08, lean: 0.08, bob: Math.sin(phase * 1.2) * 0.5, armMode: 'reload' };
    case 'hurt': return { ...base, chest: -0.28, lean: -0.28, bob: -0.5, legNearH: Math.PI / 2 + 0.15, armMode: 'flail' };
    case 'stunned': return { ...base, chest: Math.sin(phase * 4) * 0.22, lean: Math.sin(phase * 4) * 0.22, bob: Math.sin(phase * 3) * 0.8, armMode: 'flail' };
    case 'dead': return { ...base, armMode: 'stiff' };
    default: return { ...base, bob: Math.sin(phase) * 0.5 };
  }
}

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
  ctx.lineWidth = w + 2;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
  return { x: x2, y: y2, a: a2 };
}

function foot(ctx, p, shoe, outline, s) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);
  ctx.fillStyle = outline;
  ctx.fillRect(-3 * s, -3.4 * s, 8 * s, 6.8 * s);
  ctx.fillStyle = shoe;
  ctx.fillRect(-2 * s, -2.6 * s, 7 * s, 5.2 * s);
  ctx.restore();
}

function drawHead(ctx, o) {
  const { hx, hy, hr, pal, gear, flash, outline, u } = o;
  // back hair / hood mass
  if (gear.hat === 'hood') {
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(hx - hr * 0.15, hy, hr + 2.4 * u, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.shirtDark;
    ctx.beginPath(); ctx.arc(hx - hr * 0.15, hy, hr + 1.4 * u, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = pal.hair || outline;
    ctx.beginPath(); ctx.arc(hx - hr * 0.35, hy, hr + 0.5 * u, 0, TAU); ctx.fill();
  }
  // face
  ctx.fillStyle = outline;
  ctx.beginPath(); ctx.arc(hx, hy, hr + 1.1 * u, 0, TAU); ctx.fill();
  ctx.fillStyle = flash ? '#ffffff' : pal.skin;
  ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
  ctx.fillStyle = flash ? '#ffffff' : pal.skinDark;
  ctx.beginPath(); ctx.arc(hx + hr * 0.28, hy + hr * 0.34, hr * 0.6, 0, Math.PI); ctx.fill();

  if (gear.mask === 'moth') {
    ctx.fillStyle = flash ? '#ffffff' : COLORS.bone;
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.5, hy - hr * 0.75);
    ctx.lineTo(hx + hr * 0.75, hy - hr * 0.95);
    ctx.lineTo(hx + hr * 1.15, hy);
    ctx.lineTo(hx + hr * 0.7, hy + hr * 0.85);
    ctx.lineTo(hx - hr * 0.55, hy + hr * 0.75);
    ctx.lineTo(hx - hr * 0.95, hy);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.fillRect(hx + hr * 0.1, hy - hr * 0.55, hr * 0.75, hr * 0.22);
    ctx.fillRect(hx + hr * 0.15, hy + hr * 0.28, hr * 0.7, hr * 0.22);
    ctx.fillStyle = COLORS.ink;
    ctx.fillRect(hx - hr * 0.2, hy - hr * 0.12, hr * 0.5, hr * 0.3);
    return;
  }
  if (gear.mask === 'keyhole') {
    ctx.fillStyle = flash ? '#ffffff' : COLORS.bone;
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.85, hy - hr * 0.8);
    ctx.lineTo(hx + hr * 0.7, hy - hr * 1.0);
    ctx.lineTo(hx + hr * 1.2, hy - hr * 0.1);
    ctx.lineTo(hx + hr * 0.8, hy + hr * 0.9);
    ctx.lineTo(hx - hr * 0.8, hy + hr * 0.85);
    ctx.lineTo(hx - hr * 1.1, hy);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath(); ctx.arc(hx + hr * 0.2, hy - hr * 0.15, hr * 0.34, 0, TAU); ctx.fill();
    ctx.fillRect(hx + hr * 0.05, hy - hr * 0.05, hr * 0.3, hr * 0.72);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(hx + hr * 0.75, hy - hr * 0.6, hr * 0.2, hr * 0.5);
    return;
  }
  if (gear.mask === 'ram') {
    ctx.fillStyle = flash ? '#ffffff' : COLORS.bone;
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.7, hy - hr * 0.7);
    ctx.lineTo(hx + hr * 0.6, hy - hr * 0.8);
    ctx.lineTo(hx + hr * 1.2, hy - hr * 0.15);
    ctx.lineTo(hx + hr * 0.85, hy + hr * 0.85);
    ctx.lineTo(hx - hr * 0.2, hy + hr * 0.8);
    ctx.lineTo(hx - hr * 0.9, hy + hr * 0.1);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 2.2 * u;
    ctx.beginPath(); ctx.arc(hx + hr * 0.1, hy - hr * 0.1, hr * 0.8, -0.6, 0.9); ctx.stroke();
    ctx.fillStyle = COLORS.ink; ctx.fillRect(hx + hr * 0.2, hy - hr * 0.2, hr * 0.55, hr * 0.3);
    return;
  }
  if (gear.mask === 'fox') {
    ctx.fillStyle = flash ? '#ffffff' : COLORS.bone;
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.7, hy - hr * 0.6);
    ctx.lineTo(hx + hr * 0.75, hy - hr * 0.7);
    ctx.lineTo(hx + hr * 1.25, hy);
    ctx.lineTo(hx + hr * 0.45, hy + hr * 0.8);
    ctx.lineTo(hx - hr * 0.8, hy + hr * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.accent; ctx.fillRect(hx + hr * 0.6, hy - hr * 0.5, hr * 0.28, hr * 1.0);
    ctx.fillStyle = COLORS.ink; ctx.fillRect(hx, hy - hr * 0.1, hr * 0.7, hr * 0.2);
    return;
  }
  if (gear.mask === 'raven') {
    ctx.fillStyle = flash ? '#ffffff' : COLORS.bone;
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.7, hy - hr * 0.5);
    ctx.lineTo(hx + hr * 0.9, hy - hr * 0.3);
    ctx.lineTo(hx + hr * 1.7, hy);
    ctx.lineTo(hx + hr * 0.9, hy + hr * 0.3);
    ctx.lineTo(hx - hr * 0.7, hy + hr * 0.6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.accent; ctx.fillRect(hx + hr * 0.6, hy - hr * 0.2, hr * 1.0, hr * 0.3);
    ctx.fillStyle = COLORS.ink; ctx.fillRect(hx, hy - hr * 0.2, hr * 0.6, hr * 0.3);
    return;
  }
  // uncovered face: eyes, brow, nose, mouth
  ctx.fillStyle = COLORS.ink;
  ctx.beginPath(); ctx.ellipse(hx + hr * 0.5, hy - hr * 0.22, hr * 0.16, hr * 0.2, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx + hr * 0.5, hy + hr * 0.22, hr * 0.16, hr * 0.2, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath(); ctx.arc(hx + hr * 0.56, hy - hr * 0.28, hr * 0.05, 0, TAU); ctx.fill();
  ctx.strokeStyle = pal.hair || COLORS.ink; ctx.lineWidth = 1.1 * u;
  ctx.beginPath(); ctx.moveTo(hx + hr * 0.25, hy - hr * 0.5); ctx.lineTo(hx + hr * 0.72, hy - hr * 0.44); ctx.stroke();
  ctx.strokeStyle = '#5a2a2a'; ctx.lineWidth = 0.9 * u;
  ctx.beginPath(); ctx.moveTo(hx + hr * 0.55, hy + hr * 0.56); ctx.lineTo(hx + hr * 0.85, hy + hr * 0.5); ctx.stroke();

  if (gear.hat === 'cap') {
    ctx.fillStyle = pal.shirtDark;
    ctx.beginPath(); ctx.arc(hx + hr * 0.1, hy - hr * 0.15, hr + 0.7 * u, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.fillRect(hx + hr * 0.2, hy - hr * 0.7, hr * 1.15, hr * 0.42);
    ctx.fillStyle = shade(pal.accent, 0.7);
    ctx.fillRect(hx + hr * 0.2, hy - hr * 0.38, hr * 1.15, hr * 0.16);
  } else if (gear.visor) {
    ctx.fillStyle = outline;
    rrect(ctx, hx - hr * 1.05, hy - hr * 0.72, hr * 2.1, hr * 1.35, 3 * u); ctx.fill();
    ctx.fillStyle = '#12101a';
    rrect(ctx, hx - hr * 0.95, hy - hr * 0.62, hr * 1.9, hr * 1.15, 2.5 * u); ctx.fill();
    ctx.fillStyle = flash ? '#ffffff' : pal.accent;
    rrect(ctx, hx + hr * 0.1, hy - hr * 0.45, hr * 0.85, hr * 0.9, 2 * u); ctx.fill();
  } else if (gear.bandana) {
    ctx.fillStyle = gear.bandana;
    ctx.fillRect(hx - hr * 0.9, hy - hr * 0.95, hr * 1.9, hr * 0.42);
    ctx.fillStyle = shade(gear.bandana, 0.72);
    ctx.fillRect(hx - hr * 0.9, hy - hr * 0.62, hr * 1.9, hr * 0.14);
  }
}

export function drawCharacter(ctx, spec = {}) {
  const arch = CHARACTERS[spec.archetype] || CHARACTERS.guard;
  const build = { ...arch.build, ...(spec.build || {}) };
  const pal = { ...arch.palette, ...(spec.palette || {}) };
  const gear = { ...arch.gear, ...(spec.gear || {}) };
  const pose = spec.pose || 'idle';
  const phase = spec.phase || 0;
  const facing = Number.isFinite(spec.facing) ? spec.facing : 0;
  const { dir, localAim, pitch } = facingView(facing);
  const hpFrac = spec.hpFrac == null ? 1 : clamp(spec.hpFrac, 0, 1);
  const deathT = spec.deathT || 0;
  const flash = !!spec.hitFlash;
  const S = 34 * (build.height || 1);
  const u = S / 34;
  const bulk = build.bulk || 0;
  const outline = pal.outline || '#0b0614';
  const J = poseJoints(pose, phase, 'side', build);
  const recoil = spec.recoil || 0;

  const hipY = -0.44 * S + J.bob;
  const chestY = -0.68 * S + J.bob;
  const shoulderY = -0.72 * S + J.bob;
  const headY = -0.86 * S + J.bob;
  const headR = 0.15 * S;
  const legU = 0.24 * S, legL = 0.24 * S;
  const armU = 0.2 * S, armL = 0.18 * S;
  const hipX = -0.04 * S;
  const torsoW = 0.36 * S * (1 + bulk * 0.1);
  const leanX = J.lean * 10 * u;

  // world socket mapping: local (lx,ly) -> world (x + dir*lx, y + ly)
  const W = (lx, ly) => ({ x: spec.x + dir * lx, y: spec.y + ly });

  // ground shadow (unmirrored)
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.42)';
  ctx.beginPath();
  ctx.ellipse(spec.x, spec.y + 1.5 * u, 0.44 * S + bulk * 1.2, 0.2 * S, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(spec.x, spec.y);
  if (pose === 'dead') ctx.rotate((spec.fallDir || 1) * deathT * 1.4);
  ctx.scale(dir, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // ---- far limbs (behind) ----
  const farLeg = limb(ctx, hipX - 0.02 * S, hipY, J.legFarH, legU, J.legFarH + J.legFarK, legL, 0.12 * S, pal.pantsDark, outline);
  foot(ctx, farLeg, pal.shoe, outline, u);
  let farArm;
  if (J.armMode === 'aim') farArm = limb(ctx, -0.06 * S, shoulderY, localAim - dir * 0.02, armU, localAim + 0.22, armL, 0.1 * S, pal.shirtDark, outline);
  else farArm = limb(ctx, -0.06 * S, shoulderY, Math.PI - Math.sin(phase) * 0.5, armU, Math.PI - 0.2, armL, 0.1 * S, pal.shirtDark, outline);

  // ---- torso ----
  const tx = -torsoW / 2 + leanX, ty = chestY, th = hipY - chestY;
  ctx.fillStyle = flash ? '#ffffff' : pal.shirt;
  rrect(ctx, tx, ty, torsoW, th, 0.2 * S);
  ctx.fill();
  ctx.fillStyle = flash ? '#ffffff' : tint(pal.shirt, 1.16);
  rrect(ctx, tx + 1.2 * u, ty + 1.2 * u, torsoW - 2.4 * u, 0.12 * S, 0.05 * S);
  ctx.fill();
  ctx.fillStyle = flash ? '#ffffff' : pal.shirtDark;
  rrect(ctx, tx, ty + th - 0.12 * S, torsoW, 0.12 * S, 0.05 * S);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.1 * u;
  rrect(ctx, tx, ty, torsoW, th, 0.2 * S);
  ctx.stroke();
  // chest seam / collar accent
  ctx.fillStyle = pal.accent;
  ctx.fillRect(tx + torsoW - 0.1 * S, ty + 0.08 * S, 0.06 * S, th - 0.16 * S);
  ctx.fillStyle = pal.shirtDark;
  ctx.beginPath();
  ctx.moveTo(tx + torsoW - 0.24 * S, ty + 0.02 * S);
  ctx.lineTo(tx + torsoW, ty + 0.02 * S);
  ctx.lineTo(tx + torsoW * 0.6, ty + 0.16 * S);
  ctx.closePath(); ctx.fill();
  // belt
  ctx.fillStyle = outline;
  ctx.fillRect(tx + 0.02 * S, ty + th - 0.08 * S, torsoW - 0.04 * S, 0.05 * S);
  ctx.fillStyle = pal.accent;
  ctx.fillRect(tx + torsoW - 0.16 * S, ty + th - 0.1 * S, 0.07 * S, 0.09 * S);

  // gear: coat / apron / vest / straps / shoulder pads
  if (gear.vest) {
    ctx.fillStyle = shade(pal.shirtDark, 0.85);
    rrect(ctx, tx + torsoW * 0.08, ty + 0.04 * S, torsoW * 0.84, th * 0.6, 0.06 * S); ctx.fill();
    ctx.fillStyle = pal.accent;
    for (let i = 0; i < 3; i++) ctx.fillRect(tx + torsoW * 0.2, ty + 0.1 * S + i * 0.09 * S, 0.05 * S, 0.06 * S);
  }
  if (gear.apron) {
    ctx.fillStyle = '#8a1f2a';
    rrect(ctx, tx - 0.03 * S, ty + th * 0.15, torsoW + 0.06 * S, th + 0.2 * S, 0.05 * S); ctx.fill();
    ctx.strokeStyle = '#5a1219'; ctx.lineWidth = 1.2 * u; ctx.stroke();
    // accumulating blood on the apron
    const bloodN = Math.round((1 - hpFrac) * 6);
    for (let i = 0; i < bloodN; i++) {
      ctx.fillStyle = i % 2 ? '#7a0018' : '#c8102e';
      ctx.fillRect(tx + hash1(i * 17 + (spec.seed || 3)) * torsoW, ty + th * 0.3 + hash1(i * 29 + 1) * th * 0.7, 0.08 * S, 0.08 * S);
    }
  }
  if (gear.coat) {
    ctx.fillStyle = outline;
    rrect(ctx, tx - 0.04 * S, ty + th - 0.12 * S, torsoW + 0.08 * S, 0.6 * S, 0.12 * S); ctx.fill();
    ctx.fillStyle = pal.shirtDark;
    rrect(ctx, tx - 0.02 * S, ty + th - 0.1 * S, torsoW + 0.04 * S, 0.55 * S, 0.1 * S); ctx.fill();
  }
  if (gear.straps) {
    ctx.fillStyle = '#1a1520';
    ctx.fillRect(tx + torsoW * 0.2, ty + 0.02 * S, 0.09 * S, th * 0.8);
  }
  if (gear.radio) {
    ctx.fillStyle = '#2a2a33';
    ctx.fillRect(tx + torsoW * 0.72, ty + 0.06 * S, 0.12 * S, 0.16 * S);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(tx + torsoW * 0.82, ty + 0.04 * S, 0.03 * S, 0.1 * S);
  }
  if (gear.shoulderPads) {
    ctx.fillStyle = outline;
    for (const sx of [-0.02 * S, torsoW - 0.16 * S]) { rrect(ctx, tx + sx, ty - 0.04 * S, 0.2 * S, 0.14 * S, 0.05 * S); ctx.fill(); }
    ctx.fillStyle = pal.accent;
    for (const sx of [-0.02 * S, torsoW - 0.16 * S]) { rrect(ctx, tx + sx + 1.2 * u, ty - 0.03 * S, 0.18 * S, 0.11 * S, 0.04 * S); ctx.fill(); }
  }

  // blood wear on the torso as HP drops
  if (hpFrac < 1 && !flash) {
    const n = Math.round((1 - hpFrac) * 7);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#7a0018' : '#c8102e';
      ctx.fillRect(tx + hash1(i * 31 + (spec.seed || 7)) * torsoW, ty + hash1(i * 53 + 2) * th, 0.07 * S, 0.07 * S);
    }
  }

  // ---- near leg ----
  let legNearK = J.legNearK;
  if (spec.limp && (pose === 'walk' || pose === 'run')) legNearK += 0.35 * (1 - hpFrac);
  const nearLeg = limb(ctx, hipX, hipY, J.legNearH, legU, J.legNearH + legNearK, legL, 0.13 * S, pal.pants, outline);
  foot(ctx, nearLeg, pal.shoe, outline, u);

  // ---- near arm + weapon ----
  const shoulder = { x: 0.02 * S + leanX, y: shoulderY };
  let hand;
  if (J.armMode === 'aim') {
    const kick = recoil * 0.12;
    hand = limb(ctx, shoulder.x - Math.cos(localAim) * kick * S, shoulder.y - Math.sin(localAim) * kick * S, localAim, armU, localAim + 0.14, armL, 0.12 * S, pal.shirt, outline);
  } else if (J.armMode === 'melee') {
    const sw = Math.sin(phase);
    const a1 = -0.7 + sw * 1.5;
    hand = limb(ctx, shoulder.x, shoulder.y, a1, armU, a1 + 0.5, armL, 0.12 * S, pal.shirt, outline);
  } else if (J.armMode === 'reload') {
    const dip = 0.7 + Math.sin(phase * 1.2) * 0.15;
    hand = limb(ctx, shoulder.x, shoulder.y, dip, armU, dip + 0.7, armL, 0.12 * S, pal.shirt, outline);
  } else if (J.armMode === 'flail') {
    hand = limb(ctx, shoulder.x, shoulder.y, -0.4 + Math.sin(phase * 5) * 0.5, armU, -0.1, armL, 0.12 * S, pal.shirt, outline);
  } else if (J.armMode === 'swing') {
    const sw = -Math.sin(phase) * 0.6;
    hand = limb(ctx, shoulder.x, shoulder.y, Math.PI - 0.5 + sw, armU, Math.PI - 0.15, armL, 0.12 * S, pal.shirt, outline);
  } else {
    hand = limb(ctx, shoulder.x, shoulder.y, 0.85 + Math.sin(phase) * 0.1, armU, 1.15, armL, 0.12 * S, pal.shirt, outline);
  }
  // glove/hand
  ctx.fillStyle = outline;
  ctx.beginPath(); ctx.arc(hand.x, hand.y, 0.1 * S, 0, TAU); ctx.fill();
  ctx.fillStyle = flash ? '#ffffff' : (gear.fists ? pal.skin : pal.glove);
  ctx.beginPath(); ctx.arc(hand.x, hand.y, 0.075 * S, 0, TAU); ctx.fill();

  // weapon at the hand, pointing along the aim
  const weaponAngle = (J.armMode === 'melee') ? (hand.a) : localAim;
  if (spec.weapon) {
    ctx.save();
    ctx.translate(hand.x, hand.y);
    ctx.rotate(weaponAngle);
    drawWeaponArt(ctx, spec.weapon, (spec.weaponScale || 1) * u, pal.skin);
    ctx.restore();
  } else if (J.armMode === 'aim') {
    const col = spec.weaponColor || '#b9b7ae';
    ctx.fillStyle = col;
    ctx.fillRect(hand.x, hand.y - 1.6 * u, 0.42 * S, 3.2 * u);
  }

  // ---- head ----
  drawHead(ctx, { hx: 0.06 * S + leanX + pitch * 0.5 * u, hy: headY + J.bob * 0.2, hr: headR, pal, gear, flash, outline, u });

  ctx.restore();

  // world sockets
  const handWorld = W(hand.x, hand.y);
  const headWorld = W(0.06 * S + leanX + pitch * 0.5 * u, headY + J.bob * 0.2);
  const muzzle = { x: handWorld.x + Math.cos(facing) * 0.42 * S, y: handWorld.y + Math.sin(facing) * 0.42 * S };
  const offhand = { x: W(-0.06 * S, farArm.y).x, y: W(-0.06 * S, farArm.y).y };
  return { hand: handWorld, offhand, head: headWorld, muzzle };
}
