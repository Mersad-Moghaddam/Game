import { COLORS } from '../data/config.js';

const INK = COLORS.ink;
const STEEL = '#cfd3d6';
const DARK = '#171720';

// Draws a recognizable silhouette for a weapon, centred on the grip and
// pointing toward +x, so held weapons, thrown weapons, floor pickups and the
// HUD icon all read by type at a glance.
export function drawWeaponArt(ctx, w, s = 1, skin = '#e0a97f') {
  if (!w) return;
  ctx.save();
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const c = w.color || '#b9b7ae';
  const outline = (x, y, ww, hh) => { ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, ww, hh); };

  switch (w.id) {
    case 'fists': {
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = skin;
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-1.5 + i * 1.4, -3.4, 0.8, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'baton': {
      ctx.fillStyle = INK; ctx.fillRect(-14, -3.2, 27, 6.4);
      ctx.fillStyle = DARK; ctx.fillRect(-13, -2.5, 6, 5);
      ctx.fillStyle = c; ctx.fillRect(-7, -2, 19, 4);
      ctx.fillStyle = STEEL; ctx.fillRect(9.5, -2.2, 2.5, 4.4);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-12.5 + i * 2, -2.5); ctx.lineTo(-12.5 + i * 2, 2.5); ctx.stroke(); }
      break;
    }
    case 'cleaver': {
      ctx.fillStyle = INK; ctx.fillRect(-12, -3, 10, 6);
      ctx.fillStyle = DARK; ctx.fillRect(-11.5, -2.2, 9, 4.4);
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(-3, -7); ctx.lineTo(10, -8); ctx.lineTo(13.5, 0); ctx.lineTo(10, 8); ctx.lineTo(-3, 7); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-1, -6, 10, 2);
      ctx.fillStyle = INK;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-1.4, -4 + i * 4, 0.9, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'bottle': {
      ctx.fillStyle = '#0d1f18'; ctx.fillRect(-8, -5, 13, 11);
      ctx.fillStyle = c; ctx.fillRect(-7, -4, 11, 9);
      ctx.fillStyle = c; ctx.fillRect(3, -2, 8, 4);
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(-5, -3, 2.2, 7);
      ctx.fillStyle = '#f6f2e6'; ctx.fillRect(-6, -2, 8, 4);
      ctx.fillStyle = DARK; ctx.fillRect(10, -2, 3, 4);
      break;
    }
    case 'shotgun': {
      ctx.fillStyle = INK; ctx.fillRect(-16, -4, 16, 9);
      ctx.fillStyle = DARK; ctx.fillRect(-15, -3, 13, 7);
      ctx.fillStyle = c; ctx.fillRect(-3, -2.4, 31, 4.8);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-3, -2.4, 31, 4.8);
      ctx.fillStyle = STEEL; ctx.fillRect(-2, -2.2, 27, 1.4);
      ctx.fillStyle = DARK; ctx.fillRect(5, 1.4, 11, 5.4);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.9;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(6 + i * 2.6, 1.6); ctx.lineTo(6 + i * 2.6, 6.6); ctx.stroke(); }
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(20, -3, 8, 6);
      break;
    }
    case 'smg': {
      ctx.fillStyle = INK; ctx.fillRect(-14, -3, 11, 6);
      ctx.fillStyle = DARK; ctx.fillRect(-13, -2, 9, 4);
      ctx.fillStyle = c; ctx.fillRect(-4, -4, 20, 8);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-4, -4, 20, 8);
      ctx.fillStyle = STEEL; ctx.fillRect(-3, -3.6, 18, 1.6);
      ctx.fillStyle = DARK; ctx.fillRect(0, 3.4, 6, 10);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.strokeRect(0, 3.4, 6, 10);
      ctx.fillStyle = c; ctx.fillRect(15, -2, 7, 3.6);
      break;
    }
    case 'revolver': {
      ctx.fillStyle = DARK; ctx.save(); ctx.translate(-5, 3.5); ctx.rotate(0.42); ctx.fillRect(-3, 0, 6.5, 12); ctx.strokeRect(-3, 0, 6.5, 12); ctx.restore();
      ctx.fillStyle = c; ctx.fillRect(0, -2.4, 18, 4.8);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(0, -2.4, 18, 4.8);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-5, 0, 5.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-5, 0, 4.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = DARK;
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.arc(-5 + Math.cos(a) * 2.4, Math.sin(a) * 2.4, 1.1, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = STEEL; ctx.fillRect(8, -2.2, 8, 1.2);
      ctx.fillStyle = DARK; ctx.fillRect(-9, -4, 4, 3);
      break;
    }
    case 'suppressed': {
      ctx.fillStyle = INK; ctx.fillRect(-3, -4, 14, 8);
      ctx.fillStyle = c; ctx.fillRect(-2, -3.4, 12, 6.8);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-2, -3.4, 12, 6.8);
      ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(11, 0, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#242430'; ctx.beginPath(); ctx.arc(11, 0, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0d0d12'; ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(8 + i * 2.2, -3.4); ctx.lineTo(8 + i * 2.2, 3.4); ctx.stroke(); }
      ctx.fillStyle = DARK; ctx.save(); ctx.translate(1, 3.4); ctx.rotate(0.34); ctx.fillRect(-2.5, 0, 5.5, 10); ctx.restore();
      ctx.strokeStyle = DARK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(4, 3.6, 3.2, -0.2, Math.PI * 0.9); ctx.stroke();
      break;
    }
    case 'pistol':
    default: {
      ctx.fillStyle = INK; ctx.fillRect(-3.4, -4, 18, 8);
      ctx.fillStyle = c; ctx.fillRect(-2.6, -3.2, 17, 6.4);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-2.6, -3.2, 17, 6.4);
      ctx.fillStyle = STEEL; ctx.fillRect(-1.6, -2.8, 15, 1.6);
      ctx.strokeStyle = DARK; ctx.lineWidth = 0.9;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0 + i * 2.4, -3); ctx.lineTo(0 + i * 2.4, 3); ctx.stroke(); }
      ctx.fillStyle = DARK; ctx.fillRect(12, -3.4, 2.4, 2); ctx.fillRect(12, 1.4, 2.4, 2);
      ctx.fillStyle = INK; ctx.fillRect(13.4, -2, 3.4, 4);
      ctx.fillStyle = DARK; ctx.save(); ctx.translate(1, 3.4); ctx.rotate(0.34); ctx.fillRect(-3, 0, 6, 11); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-3, 0, 6, 11); ctx.restore();
      ctx.strokeStyle = DARK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(4, 3.6, 3.2, -0.2, Math.PI * 0.9); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}
