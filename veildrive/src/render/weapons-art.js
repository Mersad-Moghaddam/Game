import { COLORS } from '../data/config.js';

const INK = COLORS.ink;
const STEEL = '#cfd3d6';
const DARK = '#171720';

// Draws a recognizable silhouette for a weapon, centred on the grip and
// pointing toward +x, so pickups and held weapons read by type at a glance.
export function drawWeaponArt(ctx, w, s = 1, skin = '#e0a97f') {
  if (!w) return;
  ctx.save();
  ctx.scale(s, s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const c = w.color || '#b9b7ae';

  switch (w.id) {
    case 'fists': {
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.strokeStyle = shadeSkin(skin);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2, -3);
      ctx.lineTo(-2, 3);
      ctx.stroke();
      break;
    }
    case 'baton': {
      ctx.fillStyle = c;
      ctx.fillRect(-9, -2, 21, 4);
      ctx.fillStyle = DARK;
      ctx.fillRect(-13, -2.5, 6, 5);
      ctx.fillStyle = STEEL;
      ctx.fillRect(11, -2.5, 2, 5);
      break;
    }
    case 'cleaver': {
      ctx.fillStyle = DARK;
      ctx.fillRect(-11, -2, 9, 4);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(-2, -6);
      ctx.lineTo(10, -7);
      ctx.lineTo(13, 0);
      ctx.lineTo(10, 7);
      ctx.lineTo(-2, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(0, -5, 10, 2);
      break;
    }
    case 'bottle': {
      ctx.fillStyle = c;
      ctx.fillRect(-7, -4, 11, 9);
      ctx.fillRect(3, -2, 8, 4);
      ctx.fillStyle = DARK;
      ctx.fillRect(10, -2, 3, 4);
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.fillRect(-5, -3, 2, 7);
      break;
    }
    case 'shotgun': {
      ctx.fillStyle = DARK;
      ctx.fillRect(-15, -3, 13, 7);
      ctx.fillStyle = c;
      ctx.fillRect(-3, -2, 29, 4);
      ctx.fillStyle = DARK;
      ctx.fillRect(5, 1, 10, 5);
      ctx.fillStyle = STEEL;
      ctx.fillRect(-2, -2, 26, 1.4);
      ctx.fillRect(22, -2.5, 3, 5);
      break;
    }
    case 'smg': {
      ctx.fillStyle = DARK;
      ctx.fillRect(-13, -2, 9, 5);
      ctx.fillStyle = c;
      ctx.fillRect(-5, -3.5, 19, 7);
      ctx.fillStyle = DARK;
      ctx.fillRect(-1, 2.5, 5, 9);
      ctx.fillRect(13, -1.5, 7, 3);
      ctx.fillStyle = STEEL;
      ctx.fillRect(-4, -3, 17, 1.4);
      break;
    }
    case 'revolver': {
      ctx.fillStyle = DARK;
      ctx.save();
      ctx.translate(-4, 3);
      ctx.rotate(0.42);
      ctx.fillRect(-3, 0, 6, 11);
      ctx.restore();
      ctx.fillStyle = c;
      ctx.fillRect(-1, -2, 17, 4);
      ctx.beginPath();
      ctx.arc(-4, 0, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = DARK;
      ctx.beginPath();
      ctx.arc(-4, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'pistol':
    case 'suppressed':
    default: {
      if (w.id === 'suppressed') {
        ctx.fillStyle = DARK;
        ctx.fillRect(-2, -3, 12, 6);
        ctx.fillStyle = c;
        ctx.fillRect(9, -3, 12, 6);
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(10, -2, 10, 1.4);
        ctx.fillStyle = '#0d0d12';
        ctx.fillRect(18, -3.4, 1.6, 6.8);
      } else {
        ctx.fillStyle = c;
        ctx.fillRect(-2, -3, 18, 6);
        ctx.fillStyle = STEEL;
        ctx.fillRect(-1, -2.4, 15, 1.6);
        ctx.fillStyle = DARK;
        ctx.fillRect(15, -2, 3, 4);
      }
      ctx.fillStyle = DARK;
      ctx.save();
      ctx.translate(1, 3);
      ctx.rotate(0.34);
      ctx.fillRect(-2.5, 0, 5.5, 10);
      ctx.restore();
      ctx.strokeStyle = DARK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(4, 3.5, 3.2, -0.2, Math.PI * 0.9);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function shadeSkin(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.round(((n >> 16) & 255) * 0.75)},${Math.round(((n >> 8) & 255) * 0.75)},${Math.round((n & 255) * 0.75)})`;
}
