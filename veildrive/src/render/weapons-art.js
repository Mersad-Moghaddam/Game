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
      // Metallic edge glint
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-6.5, -1.8, 15, 0.9);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(10, -1.8, 1.6, 1.2);
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
      // Bevel edge & metal glints
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(-2, 6.5); ctx.lineTo(9.5, 7.4); ctx.lineTo(12.8, 0); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-1, -7.4, 10, 1.2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(9, -7.5, 2, 1.2);
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
      // Stock & buttpad
      ctx.fillStyle = INK; ctx.fillRect(-16, -4, 16, 9);
      ctx.fillStyle = '#6d3718'; ctx.fillRect(-15, -3, 13, 7);
      ctx.fillStyle = '#8b4a24'; ctx.fillRect(-14, -2.4, 11, 5.8);
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(-16.5, -3.6, 2, 8.2);
      // Receiver
      ctx.fillStyle = DARK; ctx.fillRect(-3, -3.4, 7, 6.8);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-3, -3.4, 7, 6.8);
      ctx.fillStyle = '#0a0a0f'; ctx.fillRect(-1.5, -2.4, 4, 2);
      // Barrel & magazine tube
      ctx.fillStyle = c; ctx.fillRect(4, -2.4, 24, 4.8);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(4, -2.4, 24, 4.8);
      ctx.fillStyle = STEEL; ctx.fillRect(4, -2.2, 22, 1.4);
      ctx.fillStyle = '#2c3035'; ctx.fillRect(4, 0.6, 18, 2.4);
      // Wooden fore-end pump grip
      ctx.fillStyle = '#6d3718'; ctx.fillRect(6, 0.8, 12, 5.6);
      ctx.fillStyle = '#8b4a24'; ctx.fillRect(6.5, 1.2, 11, 4.8);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.0; ctx.strokeRect(6, 0.8, 12, 5.6);
      ctx.strokeStyle = '#4a2510'; ctx.lineWidth = 0.9;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(7.5 + i * 2.2, 1.2); ctx.lineTo(7.5 + i * 2.2, 6.0); ctx.stroke(); }
      ctx.fillStyle = '#a65e30'; ctx.fillRect(7, 1.4, 10, 0.9);
      // Front bead sight
      ctx.fillStyle = '#d4af37'; ctx.fillRect(26.5, -3.4, 1.5, 1.4);
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
      // Grip
      ctx.fillStyle = DARK; ctx.save(); ctx.translate(-5, 3.5); ctx.rotate(0.42); ctx.fillRect(-3, 0, 6.5, 12); ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.strokeRect(-3, 0, 6.5, 12); ctx.restore();
      // Frame top strap and underlug
      ctx.fillStyle = c; ctx.fillRect(-10, -4.2, 10, 1.8);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.0; ctx.strokeRect(-10, -4.2, 10, 1.8);
      // Hammer
      ctx.fillStyle = DARK; ctx.fillRect(-10.5, -4.5, 3, 3.5);
      // Barrel & underlug
      ctx.fillStyle = c; ctx.fillRect(0, -2.4, 18, 4.8);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(0, -2.4, 18, 4.8);
      ctx.fillStyle = STEEL; ctx.fillRect(8, -2.2, 8, 1.2);
      ctx.fillStyle = c; ctx.fillRect(0, 1.2, 15, 2.0);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.strokeRect(0, 1.2, 15, 2.0);
      // Front ramp sight
      ctx.fillStyle = DARK; ctx.fillRect(15, -3.6, 2.5, 1.4);
      // Fluted cylinder
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-5, 0, 5.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-5, 0, 4.4, 0, Math.PI * 2); ctx.fill();
      // Chambers
      ctx.fillStyle = DARK;
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.arc(-5 + Math.cos(a) * 2.4, Math.sin(a) * 2.4, 1.1, 0, Math.PI * 2); ctx.fill(); }
      // Flutes (indentations between chambers)
      ctx.fillStyle = '#1e1c18';
      for (let i = 0; i < 6; i++) {
        const a = (i + 0.5) / 6 * Math.PI * 2;
        ctx.beginPath(); ctx.arc(-5 + Math.cos(a) * 3.7, Math.sin(a) * 3.7, 0.95, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'suppressed': {
      ctx.fillStyle = INK; ctx.fillRect(-3, -4, 14, 8);
      ctx.fillStyle = c; ctx.fillRect(-2, -3.4, 12, 6.8);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-2, -3.4, 12, 6.8);
      // Slide serrations
      ctx.strokeStyle = '#1e241e'; ctx.lineWidth = 1.0;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-1.6 + i * 1.2, -3.0); ctx.lineTo(-1.6 + i * 1.2, 3.0); ctx.stroke(); }
      // Ejection port & slide lock
      ctx.fillStyle = '#141814'; ctx.fillRect(3.5, -3.2, 4.5, 2.2);
      ctx.fillStyle = '#b59432'; ctx.fillRect(4.2, -2.6, 2.4, 1.0);
      ctx.fillStyle = DARK; ctx.fillRect(1.8, 0.4, 2.6, 1.2);
      // Suppressed barrel / can
      ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(11, 0, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#242430'; ctx.beginPath(); ctx.arc(11, 0, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#161917'; ctx.fillRect(10, -3.6, 12, 7.2);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.strokeRect(10, -3.6, 12, 7.2);
      ctx.strokeStyle = '#272e29'; ctx.lineWidth = 0.9;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(12 + i * 2.6, -3.4); ctx.lineTo(12 + i * 2.6, 3.4); ctx.stroke(); }
      // Grip & trigger guard
      ctx.fillStyle = DARK; ctx.save(); ctx.translate(1, 3.4); ctx.rotate(0.34); ctx.fillRect(-2.5, 0, 5.5, 10); ctx.restore();
      ctx.strokeStyle = DARK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(4, 3.6, 3.2, -0.2, Math.PI * 0.9); ctx.stroke();
      break;
    }
    case 'katana': {
      // Tsuka (handle) & kashira (pommel cap)
      ctx.fillStyle = INK; ctx.fillRect(-14, -2.8, 13, 5.6);
      ctx.fillStyle = '#222228'; ctx.fillRect(-13, -2.2, 12, 4.4);
      ctx.fillStyle = '#d4af37'; ctx.fillRect(-14, -2.4, 2, 4.8);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.strokeRect(-14, -2.4, 2, 4.8);

      // Braided diamond tsuka wrap (samegawa diamonds and cross laces)
      ctx.fillStyle = '#e4ded4';
      for (let dx = -11; dx <= -3; dx += 2.6) {
        ctx.beginPath();
        ctx.moveTo(dx, -1.4); ctx.lineTo(dx + 1.1, 0); ctx.lineTo(dx, 1.4); ctx.lineTo(dx - 1.1, 0); ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = '#121216'; ctx.lineWidth = 0.8;
      for (let dx = -11; dx <= -3; dx += 2.6) {
        ctx.beginPath(); ctx.moveTo(dx - 1.3, -2.2); ctx.lineTo(dx + 1.3, 2.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dx - 1.3, 2.2); ctx.lineTo(dx + 1.3, -2.2); ctx.stroke();
      }

      // Oval Tsuba (handguard)
      ctx.fillStyle = '#1c1c22';
      ctx.beginPath();
      ctx.moveTo(-1, -5.5); ctx.lineTo(1, -5.5); ctx.lineTo(1.8, -2); ctx.lineTo(1.8, 2); ctx.lineTo(1, 5.5); ctx.lineTo(-1, 5.5); ctx.lineTo(-1.8, 2); ctx.lineTo(-1.8, -2); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.stroke();
      // Brass seppa spacer
      ctx.fillStyle = '#c99e32'; ctx.fillRect(0.6, -3, 0.8, 6);

      // Brass Habaki collar
      ctx.fillStyle = '#d4af37'; ctx.fillRect(1.4, -2.2, 2.8, 4.4);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.strokeRect(1.4, -2.2, 2.8, 4.4);

      // Curved single-edged blade with Sori curvature
      ctx.beginPath();
      ctx.moveTo(4, -1.8);
      ctx.lineTo(18, -2.4);
      ctx.lineTo(28, -3.2);
      ctx.lineTo(33, -4.0); // tip (kissaki)
      ctx.lineTo(28, -0.6); // fukura
      ctx.lineTo(18, 0.8);
      ctx.lineTo(4, 1.8);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();

      // Shinogi ridge highlight
      ctx.strokeStyle = STEEL; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(4, -1.0); ctx.lineTo(18, -1.6); ctx.lineTo(28, -2.4); ctx.lineTo(32, -3.5); ctx.stroke();

      // Frosted hamon temper line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(4, 0.8);
      for (let hx = 5; hx <= 29; hx += 3) {
        const hy = 0.3 - (hx - 4) * 0.12 + ((hx % 6 === 0) ? -0.8 : 0.4);
        ctx.lineTo(hx, hy);
      }
      ctx.lineTo(32, -3.2);
      ctx.stroke();

      // Blade tip glint
      ctx.fillStyle = '#ffffff'; ctx.fillRect(31.5, -3.8, 1.5, 1.0);
      break;
    }
    case 'rifle': {
      // Bullpup stock / rear receiver
      ctx.fillStyle = INK; ctx.fillRect(-17, -5, 18, 10);
      ctx.fillStyle = c; ctx.fillRect(-16, -4.2, 17, 8.4);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-16, -4.2, 17, 8.4);
      ctx.fillStyle = '#111116'; ctx.fillRect(-18, -4.8, 2.2, 9.6);

      // Rear magazine well & curved magazine (seated behind grip)
      ctx.fillStyle = DARK;
      ctx.save(); ctx.translate(-8, 4.2); ctx.rotate(0.2); ctx.fillRect(-2.8, 0, 5.6, 11); ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.strokeRect(-2.8, 0, 5.6, 11);
      ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 0.8;
      for (let mi = 2; mi < 10; mi += 2.2) { ctx.beginPath(); ctx.moveTo(-2.2, mi); ctx.lineTo(2.2, mi); ctx.stroke(); }
      ctx.restore();

      // Ejection port on stock (bullpup action)
      ctx.fillStyle = '#111116'; ctx.fillRect(-7, -4.4, 6, 2.2);
      ctx.fillStyle = '#b59432'; ctx.fillRect(-5.5, -3.8, 3, 1.2);

      // Pistol grip & trigger guard
      ctx.fillStyle = DARK; ctx.save(); ctx.translate(0, 3); ctx.rotate(0.28); ctx.fillRect(-3, 0, 6, 11); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-3, 0, 6, 11); ctx.restore();
      ctx.strokeStyle = DARK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(3, 4, 3.5, -0.2, Math.PI * 0.9); ctx.stroke();

      // Forward upper receiver & ribbed handguard
      ctx.fillStyle = INK; ctx.fillRect(0, -4.5, 21, 8);
      ctx.fillStyle = c; ctx.fillRect(1, -3.8, 19, 6.8);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(1, -3.8, 19, 6.8);

      // Ribbed handguard
      ctx.fillStyle = '#232936'; ctx.fillRect(5, -1, 14, 4.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.0; ctx.strokeRect(5, -1, 14, 4.5);
      ctx.strokeStyle = '#12161f'; ctx.lineWidth = 1.1;
      for (let rx = 7; rx < 18; rx += 2.2) { ctx.beginPath(); ctx.moveTo(rx, -0.6); ctx.lineTo(rx, 3.1); ctx.stroke(); }

      // Top sight carrying rail & optic hood
      ctx.fillStyle = DARK;
      ctx.beginPath();
      ctx.moveTo(-10, -4.5); ctx.lineTo(-7, -8); ctx.lineTo(13, -8); ctx.lineTo(15, -4.5);
      ctx.lineTo(12, -4.5); ctx.lineTo(10, -6.6); ctx.lineTo(-4, -6.6); ctx.lineTo(-7, -4.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.stroke();

      // Optic sight hood & lens glint
      ctx.fillStyle = '#2b3342'; ctx.fillRect(-2, -10.2, 9, 3);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.strokeRect(-2, -10.2, 9, 3);
      ctx.fillStyle = '#ff2b56'; ctx.fillRect(5.5, -9.4, 1.2, 1.6);
      ctx.strokeStyle = '#181e29'; ctx.lineWidth = 0.8;
      for (let sx = -6; sx <= 11; sx += 2.5) { ctx.beginPath(); ctx.moveTo(sx, -8.2); ctx.lineTo(sx, -7.2); ctx.stroke(); }

      // Barrel & slotted muzzle brake
      ctx.fillStyle = STEEL; ctx.fillRect(20, -2, 4.5, 3.2);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.0; ctx.strokeRect(20, -2, 4.5, 3.2);
      ctx.fillStyle = DARK; ctx.fillRect(24.5, -2.6, 4, 4.4);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.strokeRect(24.5, -2.6, 4, 4.4);
      ctx.fillStyle = STEEL;
      ctx.fillRect(25.5, -2.8, 1, 1); ctx.fillRect(27, -2.8, 1, 1);
      ctx.fillRect(25.5, 1.8, 1, 1); ctx.fillRect(27, 1.8, 1, 1);
      break;
    }
    case 'pistol': {
      ctx.fillStyle = INK; ctx.fillRect(-3.4, -4, 18, 8);
      ctx.fillStyle = c; ctx.fillRect(-2.6, -3.2, 17, 6.4);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-2.6, -3.2, 17, 6.4);
      ctx.fillStyle = STEEL; ctx.fillRect(-1.6, -2.8, 15, 1.6);
      // Realistic rear slide serrations
      ctx.strokeStyle = '#23232c'; ctx.lineWidth = 1.0;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-1.8 + i * 1.2, -3.0); ctx.lineTo(-1.8 + i * 1.2, 3.0); ctx.stroke(); }
      // Ejection port & casing
      ctx.fillStyle = '#181820'; ctx.fillRect(4.5, -3.2, 5.2, 2.2);
      ctx.fillStyle = '#b59432'; ctx.fillRect(5.2, -2.6, 3.0, 1.0);
      // Slide lock
      ctx.fillStyle = DARK; ctx.fillRect(2.8, 0.4, 2.8, 1.2);
      // Sights
      ctx.fillStyle = DARK; ctx.fillRect(-2.2, -3.8, 1.6, 0.9); ctx.fillRect(12.5, -3.8, 1.6, 0.9);
      ctx.fillStyle = DARK; ctx.fillRect(12, -3.4, 2.4, 2); ctx.fillRect(12, 1.4, 2.4, 2);
      ctx.fillStyle = INK; ctx.fillRect(13.4, -2, 3.4, 4);
      // Grip & trigger guard
      ctx.fillStyle = DARK; ctx.save(); ctx.translate(1, 3.4); ctx.rotate(0.34); ctx.fillRect(-3, 0, 6, 11); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-3, 0, 6, 11); ctx.restore();
      ctx.strokeStyle = DARK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(4, 3.6, 3.2, -0.2, Math.PI * 0.9); ctx.stroke();
      break;
    }
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
