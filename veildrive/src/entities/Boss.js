import { dist, norm, rand } from '../core/math.js';
import { rng } from '../core/rng.js';
import { makeWeapon } from '../combat/weapons.js';
import { COLORS } from '../data/config.js';
import { drawCharacter } from '../render/character.js';

export class Boss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 19;
    this.a = 0;
    this.hp = 16;
    this.maxHp = 16;
    this.dead = false;
    this.cool = 1;
    this.mode = 'gun';
    this.telegraph = 0;
    this.chargeT = 0;
    this.stun = 0;
    this.weapon = makeWeapon('revolver');
    this.name = 'THE PORTER';
    this.burst = 0;
  }

  get phase() {
    return this.hp > 10 ? 1 : this.hp > 5 ? 2 : 3;
  }

  update(dt, g) {
    if (this.dead || g.player.dead) return;
    if (!Number.isFinite(this.cool)) this.cool = 0;
    if (!Number.isFinite(this.stun) || this.stun < 0) this.stun = 0;
    if (!Number.isFinite(this.telegraph) || this.telegraph < 0) this.telegraph = 0;
    if (!Number.isFinite(this.chargeT) || this.chargeT < 0) this.chargeT = 0;
    if (!Number.isFinite(this.a)) this.a = 0;
    const p = g.player, d = dist(this, p);
    this.cool -= dt;

    if (this.phase >= 2) this.burst = 0;

    if (this.stun > 0) {
      this.stun -= dt;
      if (g.fx && typeof g.fx.smoke === 'function') {
        g.fx.smoke(this.x + rand(-6, 6), this.y + rand(-6, 6), rand(0, Math.PI * 2));
      }
      if (this.stun <= 0) this.mode = 'gun';
      return;
    }

    if (this.phase >= 2 && this.mode === 'telegraph_debris') {
      this.mode = 'gun';
    }

    if (this.phase === 1) {
      const n = norm(p.x - this.x, p.y - this.y);
      this.a = Math.atan2(n.y, n.x);
      const ideal = 300;
      if (d > ideal + 40) g.level.moveCircle(this, n.x * 85 * dt, n.y * 85 * dt, this.r);
      else if (d < ideal - 55) g.level.moveCircle(this, -n.x * 70 * dt, -n.y * 70 * dt, this.r);

      if (this.mode === 'gun') {
        if (this.cool <= 0) {
          if (rng.chance(0.42)) {
            this.mode = 'telegraph_debris';
            this.telegraph = 0.45;
            this.cool = 1.6;
          } else {
            this.burst = 3;
            this.cool = 1.35;
          }
        }
        if (this.burst > 0 && this.cool < (1.35 - (4 - this.burst) * 0.16)) {
          g.enemyShoot(this, this.weapon, this.a + rand(-0.04, 0.04));
          this.burst--;
        }
      } else if (this.mode === 'telegraph_debris') {
        this.telegraph -= dt;
        this.a = Math.atan2(p.y - this.y, p.x - this.x);
        if (this.telegraph <= 0) {
          g.spawnHazard(this.x, this.y, this.a);
          g.audio?.play?.('shotgun');
          this.mode = 'gun';
        }
      } else {
        this.mode = 'gun';
      }
    } else if (this.phase === 2) {
      const n = norm(p.x - this.x, p.y - this.y);
      if (this.mode === 'gun') {
        this.a = Math.atan2(n.y, n.x);
        const ideal = 230;
        if (d > ideal + 35) g.level.moveCircle(this, n.x * 105 * dt, n.y * 105 * dt, this.r);
        else if (d < ideal - 45) g.level.moveCircle(this, -n.x * 80 * dt, -n.y * 80 * dt, this.r);

        if (this.cool <= 0) {
          if (d < 95 && rng.chance(0.5)) {
            g.fx?.ring?.(this.x, this.y, '#ff7a1a', 100, 0.4);
            g.fx?.ring?.(this.x, this.y, COLORS.orange, 70, 0.3);
            g.fx?.burst?.(this.x, this.y, 14, '#e0b258', 160, 0.45, 3);
            g.shake?.(6);
            g.audio?.play?.('boss');
            if (d < 90) p.damage(1, g, Math.atan2(p.y - this.y, p.x - this.x));
            this.cool = 1.2;
          } else {
            this.mode = 'telegraph';
            this.telegraph = 0.65;
            this.a = Math.atan2(p.y - this.y, p.x - this.x);
            this.cool = 1.6;
            g.audio?.play?.('boss');
            g.fx?.smoke?.(this.x, this.y, this.a + Math.PI);
          }
        }
      } else if (this.mode === 'telegraph') {
        this.telegraph -= dt;
        if (this.telegraph <= 0) {
          this.mode = 'charge';
          this.chargeT = 0.65;
        }
      } else if (this.mode === 'charge') {
        this.chargeT -= dt;
        const ox = this.x, oy = this.y;
        g.level.moveCircle(this, Math.cos(this.a) * 440 * dt, Math.sin(this.a) * 440 * dt, this.r);
        if (g.fx?.decals) {
          g.fx.decals.push({ x: this.x, y: this.y, r: 10, a: 0.5, color: '#1a1018', painted: false });
          g.fx.trim?.();
        }
        if (rng.chance(0.4)) g.fx?.smoke?.(this.x, this.y, this.a + Math.PI);
        if (dist(this, p) < this.r + p.r + 3) p.damage(1, g, this.a);
        const moved = Math.hypot(this.x - ox, this.y - oy);
        if (moved < 4 || this.chargeT <= 0) {
          this.mode = 'stunned';
          this.stun = 1.4;
          this.cool = 1.4;
          g.shake?.(8);
          if (moved < 4) {
            if (g.fx?.decals) {
              g.fx.decals.push({ x: this.x, y: this.y, r: 14, a: 0.7, color: '#1a1018', painted: false });
              g.fx.trim?.();
            }
            g.fx?.ring?.(this.x, this.y, '#ff7a1a', 140, 0.45);
            g.fx?.burst?.(this.x, this.y, 16, '#e0b258', 200, 0.55, 4);
            g.fx?.burst?.(this.x, this.y, 10, '#8c6c52', 140, 0.4, 3);
          } else {
            g.fx?.burst?.(this.x, this.y, 10, '#e0b258', 140, 0.45, 3);
          }
        }
      } else {
        this.mode = 'gun';
      }
    } else {
      if (this.mode === 'gun') {
        const n = norm(p.x - this.x, p.y - this.y);
        this.a = Math.atan2(n.y, n.x);
        if (d > 180) g.level.moveCircle(this, n.x * 125 * dt, n.y * 125 * dt, this.r);

        if (this.cool <= 0) {
          for (let i = 0; i < 6; i++) {
            g.enemyShoot(this, this.weapon, (i / 6) * Math.PI * 2 + this.a);
          }
          this.mode = 'telegraph';
          this.telegraph = 0.55;
          this.cool = 1.5;
          g.audio?.play?.('boss');
        }
      } else if (this.mode === 'telegraph') {
        this.telegraph -= dt;
        if (this.telegraph <= 0) {
          this.mode = 'charge';
          this.chargeT = 0.65;
        }
      } else if (this.mode === 'charge') {
        this.chargeT -= dt;
        const ox = this.x, oy = this.y;
        g.level.moveCircle(this, Math.cos(this.a) * 480 * dt, Math.sin(this.a) * 480 * dt, this.r);
        if (g.fx?.decals) {
          g.fx.decals.push({ x: this.x, y: this.y, r: 12, a: 0.6, color: '#1a1018', painted: false });
          g.fx.trim?.();
        }
        g.fx?.burst?.(this.x, this.y, 2, '#ff2e88', 90, 0.2, 2);
        g.fx?.smoke?.(this.x, this.y, this.a + Math.PI);
        if (dist(this, p) < this.r + p.r + 3) p.damage(1, g, this.a);
        const moved = Math.hypot(this.x - ox, this.y - oy);
        if (moved < 4 || this.chargeT <= 0) {
          this.mode = 'stunned';
          this.stun = 1.3;
          this.cool = 1.3;
          g.shake?.(9);
          if (moved < 4) {
            if (g.fx?.decals) {
              g.fx.decals.push({ x: this.x, y: this.y, r: 16, a: 0.75, color: '#1a1018', painted: false });
              g.fx.trim?.();
            }
            g.fx?.ring?.(this.x, this.y, COLORS.blood, 150, 0.45);
            g.fx?.burst?.(this.x, this.y, 18, '#ff2e88', 210, 0.6, 4);
            g.fx?.burst?.(this.x, this.y, 12, '#e0b258', 170, 0.5, 3);
          } else {
            g.fx?.burst?.(this.x, this.y, 10, '#ff2e88', 140, 0.4, 3);
          }
        }
      } else {
        this.mode = 'gun';
      }
    }
  }

  damage(n, g, angle = 0) {
    if (this.dead) return;
    const charging = this.mode === 'charge';
    const vulnerable = this.stun > 0 || (!charging && this.phase < 3);
    this.hp -= vulnerable ? n : Math.max(0.25, n * 0.35);
    g.fx?.blood?.(this.x, this.y, 6, angle);
    g.shake?.(3);
    if (this.hp <= 0) {
      this.dead = true;
      g.onBossKilled?.(this);
    }
  }

  accent() {
    return this.phase === 3 ? COLORS.blood : this.phase === 2 ? COLORS.orange : COLORS.violet;
  }

  draw(ctx) {
    if (this.dead) return;
    const flip = Math.cos(this.a) < 0;
    const dir = flip ? -1 : 1;
    const flash = this.stun > 0;
    const pose = this.stun > 0 ? 'hurt' : (this.mode === 'charge' ? 'run' : 'aim');
    const hpFrac = Math.max(0, this.hp / this.maxHp);
    const wardrobe = this.phase === 3 ? { shirt: '#3a1030', shirtDark: '#180f2c' } : {};
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (this.phase === 3 && this.mode === 'charge') {
      ctx.save();
      const c = Math.cos(this.a), s = Math.sin(this.a);
      ctx.strokeStyle = 'rgba(255, 46, 136, 0.7)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.x - c * 24 - s * 6, this.y - s * 24 + c * 6);
      ctx.lineTo(this.x - c * 6 - s * 6, this.y - s * 6 + c * 6);
      ctx.moveTo(this.x - c * 24 + s * 6, this.y - s * 24 - c * 6);
      ctx.lineTo(this.x - c * 6 + s * 6, this.y - s * 6 - c * 6);
      ctx.stroke();
      ctx.strokeStyle = '#ff7a1a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    drawCharacter(ctx, {
      x: this.x,
      y: this.y,
      facing: this.a,
      archetype: 'porter',
      palette: { ...wardrobe, accent: this.accent() },
      gear: { apron: true, mask: 'keyhole', shoulderPads: true },
      pose,
      phase: (now / 110) % 6.283,
      weapon: this.weapon,
      weaponScale: 1.3,
      hitFlash: flash,
      recoil: this.burst > 0 ? 1 : 0,
      hpFrac,
      seed: 0xB055
    });

    if (this.phase >= 2) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(dir, 1);
      ctx.fillStyle = '#1c1d24';
      ctx.fillRect(-8, -18, 16, 8);
      ctx.strokeStyle = '#3a3d4a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-8, -18, 16, 8);

      ctx.fillStyle = '#474b56';
      ctx.fillRect(-4, -26, 12, 9);
      ctx.fillStyle = '#c5cad6';
      ctx.fillRect(8, -24, 7, 5);

      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -14);
      if (ctx.bezierCurveTo) {
        ctx.bezierCurveTo(-12, -22, 2, -30, 8, -25);
      } else {
        ctx.lineTo(-4, -22);
        ctx.lineTo(8, -25);
      }
      ctx.stroke();

      ctx.fillStyle = '#111216';
      ctx.fillRect(-2, -28, 4, 3);
      ctx.fillRect(4, -28, 4, 3);
      if (this.stun > 0 || this.mode === 'charge') {
        ctx.fillStyle = 'rgba(230,240,255,0.6)';
        ctx.beginPath();
        ctx.arc(0, -32, 3, 0, Math.PI * 2);
        ctx.arc(6, -34, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.phase === 3) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(dir, 1);
      const pulse = 0.5 + 0.5 * Math.sin(now / 90);

      ctx.strokeStyle = `rgba(255, 30, 60, ${0.7 + 0.3 * pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, 4);
      ctx.lineTo(2, 6);
      ctx.lineTo(6, -14);
      ctx.moveTo(-6, -6);
      ctx.lineTo(8, -20);
      ctx.stroke();
      ctx.fillStyle = '#ff2e88';
      ctx.fillRect(-11, 3, 3, 3);
      ctx.fillRect(5, -15, 3, 3);

      const hx = 10, hy = -2;
      ctx.strokeStyle = '#0c0912';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hx - 2, hy - 6);
      ctx.lineTo(hx + 3, hy - 1);
      ctx.lineTo(hx + 7, hy - 4);
      ctx.moveTo(hx + 3, hy - 1);
      ctx.lineTo(hx + 4, hy + 5);
      ctx.stroke();

      ctx.strokeStyle = '#ff2e88';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx, hy - 4);
      ctx.lineTo(hx + 6, hy - 2);
      ctx.moveTo(hx + 1, hy - 1);
      ctx.lineTo(hx + 5, hy + 4);
      ctx.moveTo(hx + 1, hy - 3); ctx.lineTo(hx + 2, hy + 2);
      ctx.moveTo(hx + 4, hy - 4); ctx.lineTo(hx + 5, hy + 1);
      ctx.stroke();

      ctx.fillStyle = pulse > 0.5 ? '#ff2e88' : '#ffffff';
      ctx.fillRect(hx + 2, hy - 2, 3, 3);
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillRect(this.x - 34, this.y - 32, 68, 6);
    ctx.fillStyle = COLORS.hotPink;
    ctx.fillRect(this.x - 33, this.y - 31, 66 * (this.hp / this.maxHp), 4);
  }

  drawGlow(ctx) {
    if (this.dead) return;
    const c = Math.cos(this.a), s = Math.sin(this.a);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const pulse = 0.75 + 0.25 * Math.sin(now / (this.phase === 3 ? 90 : 150));
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = this.accent();
    ctx.fillRect(this.x + c * 10 - 4, this.y + s * 10 - 4, 8, 8);
    if (this.phase >= 2) {
      ctx.fillRect(this.x - s * 12 - 3, this.y + c * 12 - 3, 6, 6);
    }
    ctx.restore();

    if (this.phase === 1 && this.mode === 'telegraph_debris') {
      ctx.save();
      ctx.strokeStyle = 'rgba(180, 80, 255, 0.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash?.([6, 6]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + c * 260, this.y + s * 260);
      ctx.stroke();
      ctx.setLineDash?.([]);
      ctx.restore();
    }

    if (this.phase === 2 && this.mode === 'telegraph') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 122, 26, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash?.([8, 6]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + c * 380, this.y + s * 380);
      ctx.stroke();
      ctx.setLineDash?.([]);
      ctx.restore();
    }

    if (this.phase === 3 && this.mode === 'telegraph') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 46, 136, 0.9)';
      ctx.lineWidth = 3;
      ctx.setLineDash?.([9, 7]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + c * 430, this.y + s * 430);
      ctx.stroke();
      ctx.setLineDash?.([]);
      ctx.restore();
    }
  }
}

