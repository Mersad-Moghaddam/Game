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
import { rrect, shade, tint, drawLaserSight, drawSpallSparks } from './humanoid.js';
import { drawWeaponArt } from './weapons-art.js';

export { drawLaserSight };

const TAU = Math.PI * 2;
const hash1 = n => { let h = Math.imul((n | 0) ^ 61, 0x27d4eb2d); h ^= h >>> 15; h = Math.imul(h, 0x2545f491); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };

export const CHARACTERS = {
  moth0: {
    build: { bulk: 0, height: 1.0, slender: true },
    palette: { skin: '#e0a97f', skinDark: '#bd8259', hair: '#1a1524', shirt: '#0e7a78', shirtDark: '#0a5c5a', pants: '#161a24', pantsDark: '#10131a', accent: COLORS.hotPink, shoe: '#0b0d12', glove: '#1a1524' },
    gear: { mask: 'moth', straps: true, bomber: true }
  },
  guard: {
    build: { bulk: 0.5, height: 1.0 },
    palette: { skin: '#e0a97f', skinDark: '#bd8259', hair: '#241a16', shirt: '#c33b5a', shirtDark: '#7f2438', pants: '#1b2030', pantsDark: '#12161f', accent: '#ff2e88', shoe: '#0b0d12', glove: '#2a1a20' },
    gear: { hat: 'cap', radio: true, straps: true }
  },
  brawler: {
    build: { bulk: 1.6, height: 1.02, hunched: true },
    palette: { skin: '#d79a70', skinDark: '#ab7350', hair: '#3a2a1e', shirt: '#e07a2b', shirtDark: '#9c5018', pants: '#20222c', pantsDark: '#141620', accent: '#ffb347', shoe: '#0b0d12', glove: '#d79a70' },
    gear: { bandana: '#ffb347', fists: true, wraps: true, knuckles: true }
  },
  shotgunner: {
    build: { bulk: 1.2, height: 1.0 },
    palette: { skin: '#dfa87c', skinDark: '#b27f57', hair: '#2a2118', shirt: '#9bbf2e', shirtDark: '#63791c', pants: '#1a2416', pantsDark: '#10170d', accent: '#d6ff4a', shoe: '#0b0d12', glove: '#3a3a2a' },
    gear: { bandana: '#d6ff4a', vest: true, bandolier: true, straps: true }
  },
  hunter: {
    build: { bulk: 0.1, height: 1.06, slender: true },
    palette: { skin: '#e0a97f', skinDark: '#bd8259', hair: '#1a1018', shirt: '#2f9fb5', shirtDark: '#1c6675', pants: '#141824', pantsDark: '#0d1018', accent: '#12e0ff', shoe: '#0b0d12', glove: '#141824' },
    gear: { hat: 'hood', cowl: true, optic: true, laserSight: true, straps: true }
  },
  elite: {
    build: { bulk: 1.0, height: 1.12 },
    palette: { skin: '#dcae82', skinDark: '#b5825a', hair: '#141018', shirt: '#7a3bff', shirtDark: '#4a1f9e', pants: '#141018', pantsDark: '#0c0912', accent: '#b06bff', shoe: '#0b0d12', glove: '#2a1a3a' },
    gear: { coat: true, visor: true, shoulderPads: true, exoPlates: true }
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
  const hunched = !!build.hunched;
  const swing = Math.sin(phase);
  const hunchChest = hunched ? 0.18 : 0;
  const hunchLean = hunched ? 0.16 : 0;
  const base = {
    chest: hunchChest, lean: hunchLean, bob: 0,
    legNearH: Math.PI / 2 + (hunched ? 0.12 : 0), legNearK: hunched ? 0.22 : 0.06,
    legFarH: Math.PI / 2 - (hunched ? 0.1 : 0), legFarK: hunched ? 0.22 : 0.06,
    armMode: hunched ? 'melee' : 'idle'
  };
  switch (pose) {
    case 'walk': return { ...base,
      chest: 0.06 + hunchChest, lean: 0.06 + hunchLean, bob: Math.abs(swing) * 1.1 * (slim ? 0.8 : 1),
      legNearH: Math.PI / 2 + swing * 0.42 + (hunched ? 0.1 : 0), legNearK: 0.5 * Math.max(0, -swing) + (hunched ? 0.2 : 0.08),
      legFarH: Math.PI / 2 - swing * 0.42, legFarK: 0.5 * Math.max(0, swing) + (hunched ? 0.2 : 0.08),
      armMode: hunched ? 'melee' : 'swing' };
    case 'run': return { ...base,
      chest: 0.16 + hunchChest, lean: 0.16 + hunchLean, bob: Math.abs(swing) * 1.7,
      legNearH: Math.PI / 2 + swing * 0.72 + (hunched ? 0.1 : 0), legNearK: 0.95 * Math.max(0, -swing) + (hunched ? 0.22 : 0.12),
      legFarH: Math.PI / 2 - swing * 0.72, legFarK: 0.95 * Math.max(0, swing) + (hunched ? 0.22 : 0.12),
      armMode: hunched ? 'melee' : 'swing' };
    case 'aim': return { ...base,
      chest: 0.05 + hunchChest, lean: 0.05 + hunchLean, bob: Math.sin(phase * 2) * 0.3,
      legNearH: Math.PI / 2 + 0.24, legNearK: 0.12 + (hunched ? 0.14 : 0),
      legFarH: Math.PI / 2 - 0.2, legFarK: 0.2,
      armMode: 'aim' };
    case 'melee': return { ...base,
      chest: -0.05 + swing * 0.2 + hunchChest, lean: -0.05 + swing * 0.2 + hunchLean, bob: 0,
      legNearH: Math.PI / 2 + 0.3, legNearK: 0.1,
      legFarH: Math.PI / 2 - 0.25, legFarK: 0.16,
      armMode: 'melee' };
    case 'reload': return { ...base, chest: 0.08 + hunchChest, lean: 0.08 + hunchLean, bob: Math.sin(phase * 1.2) * 0.5, armMode: 'reload' };
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
  const { hx, hy, hr, pal, gear, flash, outline, u, phase = 0 } = o;
  // back hair / hood mass
  if (gear.hat === 'hood') {
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(hx - hr * 0.15, hy, hr + 2.5 * u, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.shirtDark;
    ctx.beginPath(); ctx.arc(hx - hr * 0.15, hy, hr + 1.5 * u, 0, TAU); ctx.fill();
    if (gear.cowl) {
      // Sleek tactical cowl draping around the neck and chin
      ctx.fillStyle = outline;
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.8, hy + hr * 0.2);
      ctx.lineTo(hx + hr * 0.8, hy + hr * 0.4);
      ctx.lineTo(hx + hr * 0.4, hy + hr * 1.15);
      ctx.lineTo(hx - hr * 0.9, hy + hr * 0.9);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(pal.shirtDark, 0.7);
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.7, hy + hr * 0.3);
      ctx.lineTo(hx + hr * 0.7, hy + hr * 0.45);
      ctx.lineTo(hx + hr * 0.35, hy + hr * 1.05);
      ctx.lineTo(hx - hr * 0.8, hy + hr * 0.85);
      ctx.closePath(); ctx.fill();
    }
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

    // Dual glowing eye-slit aperture and faint pulse luminescence
    const pulse = 0.65 + Math.sin(phase * 3.5) * 0.35;
    ctx.save();
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.25 * pulse;
    rrect(ctx, hx + hr * 0.05, hy - hr * 0.6, hr * 0.85, hr * 0.28, 1.5 * u); ctx.fill();
    rrect(ctx, hx + hr * 0.1, hy + hr * 0.22, hr * 0.8, hr * 0.28, 1.5 * u); ctx.fill();

    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.8, hy - hr * 0.4);
    ctx.lineTo(hx + hr * 2.2, hy - hr * 0.6);
    ctx.lineTo(hx + hr * 2.2, hy + hr * 0.6);
    ctx.lineTo(hx + hr * 0.8, hy + hr * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.fillStyle = flash ? '#ffffff' : pal.accent;
    rrect(ctx, hx + hr * 0.1, hy - hr * 0.55, hr * 0.75, hr * 0.2, 1 * u); ctx.fill();
    rrect(ctx, hx + hr * 0.15, hy + hr * 0.26, hr * 0.7, hr * 0.2, 1 * u); ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(hx + hr * 0.22, hy - hr * 0.51, hr * 0.48, hr * 0.08);
    ctx.fillRect(hx + hr * 0.26, hy + hr * 0.3, hr * 0.44, hr * 0.08);

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

  // Cybernetic targeting optic on hunter
  if (gear.optic) {
    ctx.fillStyle = '#1c2230';
    ctx.fillRect(hx + hr * 0.2, hy - hr * 0.26, hr * 0.35, hr * 0.12);
    ctx.strokeStyle = outline; ctx.lineWidth = 1 * u;
    ctx.strokeRect(hx + hr * 0.2, hy - hr * 0.26, hr * 0.35, hr * 0.12);

    ctx.fillStyle = '#2a3547';
    ctx.beginPath(); ctx.arc(hx + hr * 0.48, hy - hr * 0.2, hr * 0.22, 0, TAU); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = 1.2 * u; ctx.stroke();

    const opticPulse = 0.7 + Math.sin(phase * 4) * 0.3;
    ctx.save();
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.3 * opticPulse;
    ctx.beginPath(); ctx.arc(hx + hr * 0.48, hy - hr * 0.2, hr * 0.38, 0, TAU); ctx.fill();
    ctx.restore();

    ctx.fillStyle = flash ? '#ffffff' : pal.accent;
    ctx.beginPath(); ctx.arc(hx + hr * 0.48, hy - hr * 0.2, hr * 0.15, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8 * u;
    ctx.beginPath(); ctx.arc(hx + hr * 0.48, hy - hr * 0.2, hr * 0.08, 0, TAU); ctx.stroke();
    ctx.fillRect(hx + hr * 0.46, hy - hr * 0.22, 0.04 * hr, 0.04 * hr);
  }

  if (gear.hat === 'cap') {
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(hx + hr * 0.05, hy - hr * 0.15, hr + 1.2 * u, Math.PI * 0.95, TAU * 1.02); ctx.fill();
    ctx.fillStyle = pal.shirtDark;
    ctx.beginPath(); ctx.arc(hx + hr * 0.08, hy - hr * 0.15, hr + 0.6 * u, Math.PI, TAU); ctx.fill();

    ctx.fillStyle = pal.accent;
    ctx.fillRect(hx - hr * 0.3, hy - hr * 0.42, hr * 1.4, hr * 0.22);

    ctx.fillStyle = '#0f0e14';
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.2, hy - hr * 0.22);
    ctx.lineTo(hx + hr * 1.35, hy - hr * 0.12);
    ctx.lineTo(hx + hr * 1.3, hy + hr * 0.02);
    ctx.lineTo(hx + hr * 0.2, hy - hr * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(hx + hr * 0.5, hy - hr * 0.18, hr * 0.6, hr * 0.08);

    // Metal insignia on front of cap
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.45, hy - hr * 0.54);
    ctx.lineTo(hx + hr * 0.62, hy - hr * 0.44);
    ctx.lineTo(hx + hr * 0.45, hy - hr * 0.34);
    ctx.lineTo(hx + hr * 0.28, hy - hr * 0.44);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fffbe0';
    ctx.fillRect(hx + hr * 0.41, hy - hr * 0.46, hr * 0.08, hr * 0.08);
  } else if (gear.visor) {
    ctx.fillStyle = outline;
    rrect(ctx, hx - hr * 1.05, hy - hr * 0.72, hr * 2.1, hr * 1.35, 3 * u); ctx.fill();
    ctx.fillStyle = '#12101a';
    rrect(ctx, hx - hr * 0.95, hy - hr * 0.62, hr * 1.9, hr * 1.15, 2.5 * u); ctx.fill();

    // Ultraviolet visor glass
    const uvColor = pal.accent || '#b06bff';
    ctx.fillStyle = flash ? '#ffffff' : uvColor;
    rrect(ctx, hx + hr * 0.05, hy - hr * 0.48, hr * 0.92, hr * 0.92, 2 * u); ctx.fill();

    // Visor glint / reflection sweep
    const glintT = Math.sin(phase * 2.2);
    const glintX = hx + hr * (0.3 + glintT * 0.25);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.moveTo(glintX, hy - hr * 0.45);
    ctx.lineTo(glintX + hr * 0.18, hy - hr * 0.45);
    ctx.lineTo(glintX + hr * 0.08, hy + hr * 0.4);
    ctx.lineTo(glintX - hr * 0.02, hy + hr * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#e0b8ff';
    ctx.lineWidth = 1 * u;
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.1, hy - hr * 0.46);
    ctx.lineTo(hx + hr * 0.95, hy - hr * 0.46);
    ctx.stroke();
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
  if (gear.wraps) {
    ctx.fillStyle = '#e2dbcf';
    ctx.beginPath(); ctx.arc(farArm.x - 0.03 * S, farArm.y, 0.055 * S, 0, TAU); ctx.fill();
  }

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

  // Bomber jacket hem flutter and dynamic collar (MOTH-0)
  if (gear.bomber || spec.archetype === 'moth0') {
    const flutterPhase = phase * 4;
    const wave1 = Math.sin(flutterPhase) * 2.5 * u;
    const wave2 = Math.cos(flutterPhase * 1.3) * 1.8 * u;

    // Fluttering back hem
    ctx.fillStyle = flash ? '#ffffff' : pal.shirtDark;
    ctx.beginPath();
    ctx.moveTo(tx + 0.04 * S, ty + th - 0.04 * S);
    ctx.lineTo(tx - 0.08 * S + wave1, ty + th + 0.02 * S + wave2);
    ctx.lineTo(tx - 0.12 * S + wave1 * 1.2, ty + th + 0.06 * S + wave2);
    ctx.lineTo(tx - 0.04 * S + wave1 * 0.8, ty + th + 0.09 * S);
    ctx.lineTo(tx + 0.02 * S, ty + th + 0.02 * S);
    ctx.lineTo(tx + 0.08 * S, ty + th);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2 * u;
    ctx.stroke();

    // Fluttering collar lapel
    const collarWave = Math.sin(flutterPhase * 0.8) * 1.4 * u;
    ctx.fillStyle = flash ? '#ffffff' : tint(pal.shirt, 1.22);
    ctx.beginPath();
    ctx.moveTo(tx + 0.02 * S, ty);
    ctx.lineTo(tx - 0.06 * S + collarWave, ty - 0.04 * S);
    ctx.lineTo(tx + 0.06 * S, ty - 0.02 * S);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1 * u;
    ctx.stroke();
  }

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

  // gear: coat / apron / vest / bandolier / straps / radio / shoulder pads / exoPlates
  if (gear.vest) {
    const vx = tx + torsoW * 0.06, vy = ty + 0.03 * S, vw = torsoW * 0.88, vh = th * 0.68;
    ctx.fillStyle = outline;
    rrect(ctx, vx - 1 * u, vy - 1 * u, vw + 2 * u, vh + 2 * u, 0.07 * S); ctx.fill();
    ctx.fillStyle = '#1a1f16';
    rrect(ctx, vx, vy, vw, vh, 0.06 * S); ctx.fill();

    // Segmented ballistic plates
    ctx.fillStyle = '#2d3824';
    rrect(ctx, vx + 2 * u, vy + 2 * u, vw - 4 * u, vh * 0.44, 0.04 * S); ctx.fill();
    ctx.fillStyle = '#222b1b';
    rrect(ctx, vx + 2 * u, vy + vh * 0.5, vw - 4 * u, vh * 0.44, 0.04 * S); ctx.fill();

    // Neon hazard accents: hazard stripes across vest
    const hzX = vx + 2 * u, hzY = vy + 2 * u, hzW = vw - 4 * u, hzH = 0.05 * S;
    ctx.fillStyle = pal.accent;
    ctx.fillRect(hzX, hzY, hzW, hzH);
    ctx.fillStyle = '#14180d';
    for (let hx = hzX; hx < hzX + hzW; hx += 0.06 * S) {
      const sw = Math.min(0.03 * S, hzX + hzW - hx);
      ctx.fillRect(hx, hzY, sw, hzH);
    }
  }
  if (gear.bandolier) {
    ctx.save();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 0.08 * S;
    ctx.beginPath();
    ctx.moveTo(tx + torsoW * 0.85, ty + 0.02 * S);
    ctx.lineTo(tx + torsoW * 0.12, ty + th * 0.88);
    ctx.stroke();

    ctx.strokeStyle = '#4a3520';
    ctx.lineWidth = 0.06 * S;
    ctx.beginPath();
    ctx.moveTo(tx + torsoW * 0.85, ty + 0.02 * S);
    ctx.lineTo(tx + torsoW * 0.12, ty + th * 0.88);
    ctx.stroke();

    const shellCount = 4;
    for (let i = 0; i < shellCount; i++) {
      const t = 0.18 + (i / (shellCount - 1)) * 0.64;
      const sx = (tx + torsoW * 0.85) * (1 - t) + (tx + torsoW * 0.12) * t;
      const sy = (ty + 0.02 * S) * (1 - t) + (ty + th * 0.88) * t;
      ctx.fillStyle = '#d62211';
      ctx.fillRect(sx - 0.03 * S, sy - 0.02 * S, 0.06 * S, 0.04 * S);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(sx + 0.015 * S, sy - 0.02 * S, 0.015 * S, 0.04 * S);
      ctx.fillStyle = '#111111';
      ctx.fillRect(sx + 0.025 * S, sy - 0.008 * S, 0.005 * S, 0.016 * S);
    }
    ctx.restore();
  }
  if (gear.exoPlates) {
    const epx = tx + 0.02 * S, epy = ty + 0.02 * S, epw = torsoW - 0.04 * S, eph = th * 0.72;
    ctx.fillStyle = outline;
    rrect(ctx, epx - 1 * u, epy - 1 * u, epw + 2 * u, eph + 2 * u, 0.08 * S); ctx.fill();
    ctx.fillStyle = '#261b3d';
    rrect(ctx, epx, epy, epw, eph, 0.06 * S); ctx.fill();

    ctx.fillStyle = '#3d2b63';
    rrect(ctx, epx + 0.02 * S, epy + 0.03 * S, epw - 0.04 * S, eph * 0.42, 0.04 * S); ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.4 * u;
    ctx.beginPath();
    ctx.moveTo(epx + 0.04 * S, epy + 0.04 * S);
    ctx.lineTo(epx + epw - 0.04 * S, epy + 0.04 * S);
    ctx.stroke();

    ctx.fillStyle = '#312250';
    rrect(ctx, epx + 0.02 * S, epy + eph * 0.52, epw - 0.04 * S, eph * 0.42, 0.04 * S); ctx.fill();
    ctx.strokeStyle = 'rgba(200,180,255,0.35)';
    ctx.lineWidth = 1 * u;
    ctx.beginPath();
    ctx.moveTo(epx + 0.04 * S, epy + eph * 0.54);
    ctx.lineTo(epx + epw - 0.04 * S, epy + eph * 0.54);
    ctx.stroke();

    ctx.fillStyle = pal.accent;
    ctx.fillRect(epx + epw * 0.5 - 1 * u, epy + 0.04 * S, 2 * u, eph * 0.85);
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
    const rx = tx + torsoW * 0.7;
    const ry = ty + 0.04 * S;
    const rw = 0.14 * S;
    const rh = 0.18 * S;

    ctx.fillStyle = outline;
    rrect(ctx, rx - 1 * u, ry - 1 * u, rw + 2 * u, rh + 2 * u, 2 * u); ctx.fill();
    ctx.fillStyle = '#22232a';
    rrect(ctx, rx, ry, rw, rh, 1.5 * u); ctx.fill();

    ctx.fillStyle = '#18191f';
    ctx.fillRect(rx + rw * 0.2, ry - 0.12 * S, 0.03 * S, 0.12 * S);
    ctx.fillStyle = '#3a3b45';
    ctx.beginPath(); ctx.arc(rx + rw * 0.2 + 0.015 * S, ry - 0.12 * S, 0.02 * S, 0, TAU); ctx.fill();

    ctx.fillStyle = '#121318';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(rx + 0.02 * S, ry + 0.06 * S + i * 0.03 * S, rw * 0.55, 0.015 * S);
    }

    const isCombat = spec.combat || pose === 'aim' || spec.radioState === 'alert';
    const blink = Math.floor(phase * (isCombat ? 6 : 2)) % 2 === 0;
    const ledColor = isCombat ? (blink ? '#ff1e38' : '#600510') : (blink ? '#ffcc00' : '#4a3a00');

    ctx.save();
    ctx.fillStyle = ledColor;
    if (blink) {
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(rx + rw * 0.78, ry + 0.045 * S, 0.04 * S, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.arc(rx + rw * 0.78, ry + 0.045 * S, 0.022 * S, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  if (gear.shoulderPads) {
    ctx.fillStyle = outline;
    for (const sx of [-0.02 * S, torsoW - 0.16 * S]) { rrect(ctx, tx + sx, ty - 0.04 * S, 0.2 * S, 0.14 * S, 0.05 * S); ctx.fill(); }
    ctx.fillStyle = pal.accent;
    for (const sx of [-0.02 * S, torsoW - 0.16 * S]) { rrect(ctx, tx + sx + 1.2 * u, ty - 0.03 * S, 0.18 * S, 0.11 * S, 0.04 * S); ctx.fill(); }
  }

  // Damage spall sparks on hurt (Elite exo-plates or heavy armor)
  if ((pose === 'hurt' || flash) && (gear.exoPlates || spec.archetype === 'elite')) {
    drawSpallSparks(ctx, tx + torsoW * 0.5, ty + th * 0.4, (spec.seed || 1) + Math.floor(phase * 10), 7, '#ffd700');
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

  // Forearm wraps (brawler)
  if (gear.wraps) {
    ctx.fillStyle = '#e5ded2';
    ctx.beginPath(); ctx.arc(hand.x - 0.04 * S, hand.y, 0.065 * S, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#9c9284'; ctx.lineWidth = 1 * u;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(hand.x - 0.08 * S + i * 2 * u, hand.y - 0.05 * S);
      ctx.lineTo(hand.x - 0.02 * S + i * 2 * u, hand.y + 0.05 * S);
      ctx.stroke();
    }
  }

  // Brass knuckles (brawler)
  if (gear.knuckles) {
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(hand.x + 0.03 * S, hand.y - 0.06 * S, 0.04 * S, 0.12 * S);
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(hand.x + 0.045 * S, hand.y - 0.05 * S, 0.015 * S, 0.1 * S);
    ctx.fillStyle = outline;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(hand.x + 0.04 * S, hand.y - 0.045 * S + k * 0.03 * S, 0.012 * S, 0, TAU);
      ctx.fill();
    }
  }

  // weapon at the hand, pointing along the aim
  const weaponAngle = (J.armMode === 'melee') ? (hand.a) : localAim;
  if (spec.weapon) {
    ctx.save();
    const kickSlide = recoil > 0 ? recoil * 3.8 * u : 0;
    const kickPitch = recoil > 0 ? -recoil * 0.12 : 0;
    ctx.translate(hand.x, hand.y);
    ctx.rotate(weaponAngle + kickPitch);
    ctx.translate(-kickSlide, 0);
    drawWeaponArt(ctx, spec.weapon, (spec.weaponScale || 1) * u, pal.skin);
    if (recoil > 0.05 && spec.weapon.kind === 'gun') {
      const s = (spec.weaponScale || 1) * u;
      ctx.fillStyle = '#111116';
      ctx.fillRect(1 * s, -3.2 * s, 4 * s, 1.8 * s);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(2 * s, -2.6 * s, 2 * s, 1.0 * s);
    }
    ctx.restore();
  } else if (J.armMode === 'aim') {
    const col = spec.weaponColor || '#b9b7ae';
    const kickSlide = recoil > 0 ? recoil * 3.8 * u : 0;
    ctx.fillStyle = col;
    ctx.fillRect(hand.x - kickSlide, hand.y - 1.6 * u, 0.42 * S, 3.2 * u);
  }

  // Visible laser sight telegraph beam projection when aiming
  if (gear.laserSight && (pose === 'aim' || spec.laserSight)) {
    const laserOriginX = hand.x + Math.cos(weaponAngle) * 0.35 * S;
    const laserOriginY = hand.y + Math.sin(weaponAngle) * 0.35 * S;
    drawLaserSight(ctx, {
      x: laserOriginX,
      y: laserOriginY,
      angle: weaponAngle,
      length: spec.laserLength || 220 * u,
      color: spec.laserColor || pal.accent || '#12e0ff',
      alpha: 0.75,
      width: 1.2 * u
    });
  }

  // ---- head ----
  drawHead(ctx, { hx: 0.06 * S + leanX + pitch * 0.5 * u, hy: headY + J.bob * 0.2, hr: headR, pal, gear, flash, outline, u, phase });

  ctx.restore();

  // world sockets
  const handWorld = W(hand.x, hand.y);
  const headWorld = W(0.06 * S + leanX + pitch * 0.5 * u, headY + J.bob * 0.2);
  const muzzle = { x: handWorld.x + Math.cos(facing) * 0.42 * S, y: handWorld.y + Math.sin(facing) * 0.42 * S };
  const offhand = { x: W(-0.06 * S, farArm.y).x, y: W(-0.06 * S, farArm.y).y };
  return { hand: handWorld, offhand, head: headWorld, muzzle };
}
