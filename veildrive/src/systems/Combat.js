// Combat: firing, projectiles, melee, thrown weapons, hazards, explosions and
// the kill/death orchestration.
import { COLORS } from '../data/config.js';
import { dist, angleDiff, pointSegDist, rand } from '../core/math.js';
import { rng } from '../core/rng.js';
import { makeWeapon } from '../combat/weapons.js';

export const CombatSystem = {
  fireWeapon(shooter, w, a) {
    const enemy = shooter !== this.player;
    const count = w.pellets || 1;
    if (!enemy) { this.shots += count; this.weaponKinds.add(w.id); }
    const spread = enemy ? (w.spread || 0) * 1.3 : ((w.spread || 0) + (this.player.bloom || 0)) * (this.player.spreadMul || 1);
    for (let n = 0; n < count; n++) {
      const aa = a + rand(-spread, spread);
      const speed = w.id === 'shotgun' ? 780 : 980;
      this.projectiles.push({ x: shooter.x + Math.cos(aa) * 22, y: shooter.y + Math.sin(aa) * 22, px: shooter.x, py: shooter.y, vx: Math.cos(aa) * speed, vy: Math.sin(aa) * speed, damage: enemy ? w.damage : w.damage * (this.player.damageMul || 1), owner: enemy ? 'enemy' : 'player', life: (w.range || 800) / speed, color: enemy ? '#ee8d55' : '#f4cf7a', ricochet: !enemy && this.player.ricochet ? 1 : 0, pierce: enemy ? 0 : ((this.player.pierce || 0) + (w.pen || 0)), hitSet: enemy ? null : [] });
    }
    const fs = w.flash || 1, sx = shooter.x + Math.cos(a) * 25, sy = shooter.y + Math.sin(a) * 25;
    this.fx.flash(sx, sy, (w.id === 'shotgun' ? 95 : 55) * fs, '#ffd28c', .07);
    this.fx.burst(sx, sy, w.id === 'shotgun' ? 14 : 6, '#e5b86e', 120, .22, 2);
    if (!enemy) { this.fx.smoke(sx, sy, a); if (w.casing) this.fx.casing(shooter.x, shooter.y, a); }
    this.emitNoise(shooter.x, shooter.y, w.noise, 'gunshot');
    this.shake(enemy ? (dist(shooter, this.player) < 420 ? 1.6 : 0) : (w.id === 'shotgun' ? 9 : w.id === 'revolver' ? 6 : 3.5));
    this.audio.play(w.id === 'shotgun' ? 'shotgun' : w.id === 'suppressed' ? 'suppressed' : 'shot');
  },
  enemyShoot(e, w, a) { this.fireWeapon(e, w, a); },
  enemyMelee(e, p) { this.fx.burst(p.x, p.y, 7, '#d0c9ac', 110, .25, 3); if (!this.invincible) p.damage(1, this, e.a); this.shake(6); this.audio.play('melee'); },
  meleeAttack(attacker, w, a) {
    this.weaponKinds.add(w.id); let hit = false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = dist(attacker, e), da = Math.abs(angleDiff(a, Math.atan2(e.y - attacker.y, e.x - attacker.x)));
      if (d < w.range + e.r && da < w.arc * .5) { e.damage(w.damage * this.player.meleeMul, this, a, w.knock); hit = true; }
    }
    if (this.boss && !this.boss.dead && dist(attacker, this.boss) < w.range + this.boss.r) this.boss.damage(w.damage * this.player.meleeMul, this, a);
    for (const p of this.level.props) {
      if (!p.broken && dist(attacker, { x: p.x + p.w / 2, y: p.y + p.h / 2 }) < w.range + 20) {
        if (this.level.damageProp(p, 1)) {
          this.fx.burst(p.x + p.w / 2, p.y + p.h / 2, 12, p.type === 'glass' ? '#7fdad8' : '#8b7663', 170, .45, 3);
          if (p.type === 'glass') { this.audio.play('glass'); this.emitNoise(p.x, p.y, 260, 'glass'); }
          if (p.type === 'barrel') this.explodeAt(p.x + p.w / 2, p.y + p.h / 2);
        }
      }
    }
    this.fx.burst(attacker.x + Math.cos(a) * 34, attacker.y + Math.sin(a) * 34, hit ? 16 : 7, hit ? '#d4b169' : '#88858c', 140, .3, 3);
    if (hit) this.fx.ring(attacker.x + Math.cos(a) * 30, attacker.y + Math.sin(a) * 30, COLORS.orange, 70, .26);
    this.shake(hit ? 8 : 3); this.audio.play('melee'); if (hit) this.hitStop(.04);
  },
  throwWeapon(attacker, w, a) { this.weaponKinds.add(w.id); this.thrown.push({ x: attacker.x, y: attacker.y, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, a, spin: 8, weapon: { ...w }, life: 1.3 }); this.emitNoise(attacker.x, attacker.y, 65, 'throw'); },
  updateThrown(dt) {
    for (const t of this.thrown) {
      const ox = t.x, oy = t.y; t.x += t.vx * dt; t.y += t.vy * dt; t.a += t.spin * dt; t.life -= dt; t.vx *= Math.pow(.45, dt); t.vy *= Math.pow(.45, dt);
      const wall = this.level.bulletHit(ox, oy, t.x, t.y);
      if (wall) { t.x = ox; t.y = oy; t.life = 0; this.fx.burst(t.x, t.y, 7, '#aaa', 100, .3, 2); }
      for (const e of this.enemies) {
        if (!e.dead && dist(t, e) < e.r + 8) {
          if (t.weapon.kind === 'melee') e.damage((t.weapon.damage >= 2 ? 2 : 1) + this.player.thrownBonus, this, Math.atan2(t.vy, t.vx), 200);
          else if (this.player.thrownBonus) e.damage(this.player.thrownBonus, this, Math.atan2(t.vy, t.vx), 180);
          else e.stunHit(this, Math.atan2(t.vy, t.vx), 190);
          t.life = 0; break;
        }
      }
      if (t.life <= 0 && !t.dropped) { t.dropped = true; this.level.pickups.push({ x: t.x, y: t.y, weapon: makeWeapon(t.weapon.id) }); }
    }
    this.thrown = this.thrown.filter(t => t.life > 0);
  },
  spawnHazard(x, y, a) { this.hazards.push({ x, y, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, r: 10, life: 1.5 }); this.emitNoise(x, y, 220, 'debris'); },
  updateHazards(dt) {
    for (const h of this.hazards) {
      h.x += h.vx * dt; h.y += h.vy * dt; h.a = (h.a || 0) + dt * 7; h.life -= dt;
      if (this.level.blocked(h.x, h.y, h.r)) { h.life = 0; this.fx.burst(h.x, h.y, 9, '#8c6c52', 130, .35, 3); }
      if (dist(h, this.player) < h.r + this.player.r) { if (!this.invincible) this.player.damage(1, this, Math.atan2(h.vy, h.vx)); h.life = 0; }
    }
    this.hazards = this.hazards.filter(h => h.life > 0);
  },
  explodeAt(x, y) {
    this.renderer?.glitch?.(1); this.fx.flash(x, y, 150, '#f2a54f', .14); this.fx.burst(x, y, 36, '#d27d43', 300, .7, 6); this.fx.ring(x, y, COLORS.orange, 170, .5);
    this.emitNoise(x, y, 780, 'explosion'); this.shake(15); this.hitStop(.05); this.audio.play('shotgun');
    for (const e of this.enemies) { if (!e.dead && dist(e, { x, y }) < 92) e.damage(3, this, Math.atan2(e.y - y, e.x - x), 320); }
    if (this.boss && !this.boss.dead && dist(this.boss, { x, y }) < 100) this.boss.damage(3, this, 0);
    if (!this.player.dead && dist(this.player, { x, y }) < 84 && !this.invincible) this.player.damage(1, this, Math.atan2(this.player.y - y, this.player.x - x));
  },
  updateProjectiles(dt) {
    for (const b of this.projectiles) {
      const ox = b.x, oy = b.y; b.px = ox; b.py = oy; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      const wall = this.level.bulletHit(ox, oy, b.x, b.y);
      if (wall) {
        if ('hp' in wall && this.level.damageProp(wall, b.damage)) {
          this.fx.burst(b.x, b.y, 10, wall.type === 'glass' ? '#71d4d2' : '#9b745a', 150, .35, 3);
          if (wall.type === 'glass') { this.audio.play('glass'); this.emitNoise(b.x, b.y, 260, 'glass'); }
          if (wall.type === 'barrel') this.explodeAt(wall.x + wall.w / 2, wall.y + wall.h / 2);
        }
        if (b.ricochet > 0) { b.ricochet--; if (Math.abs(b.vx) > Math.abs(b.vy)) b.vx *= -1; else b.vy *= -1; b.x = ox; b.y = oy; this.fx.burst(ox, oy, 6, '#f0c66d', 100, .2, 2); }
        else b.life = 0;
      }
      if (b.life <= 0) continue;
      if (b.owner === 'player') {
        for (const e of this.enemies) {
          if (e.dead || (b.hitSet && b.hitSet.includes(e))) continue;
          if (pointSegDist(e.x, e.y, ox, oy, b.x, b.y) < e.r) {
            e.damage(b.damage, this, Math.atan2(b.vy, b.vx), 90); this.hits++;
            if (b.pierce > 0) { b.pierce--; b.hitSet.push(e); } else { b.life = 0; break; }
          }
        }
        if (b.life > 0 && this.boss && !this.boss.dead && pointSegDist(this.boss.x, this.boss.y, ox, oy, b.x, b.y) < this.boss.r) {
          this.boss.damage(b.damage, this, Math.atan2(b.vy, b.vx)); this.hits++; b.life = 0;
        }
      } else if (!this.player.dead && pointSegDist(this.player.x, this.player.y, ox, oy, b.x, b.y) < this.player.r) {
        if (!this.invincible) this.player.damage(b.damage, this, Math.atan2(b.vy, b.vx));
        b.life = 0;
      }
    }
    this.projectiles = this.projectiles.filter(b => b.life > 0);
  },
  onEnemyKilled(e, angle, overkill = 1) {
    this.killCount++; const wasStealth = e.state !== 'COMBAT'; if (wasStealth) this.stealthKills++;
    this.fx.blood(e.x, e.y, 26, angle); this.fx.gib(e.x, e.y, angle, 12); this.fx.burst(e.x, e.y, 14, '#ff7a1a', 140, .32, 3); this.fx.ring(e.x, e.y, COLORS.hotPink, 96, .32);
    if (overkill >= 99 || overkill >= 3) { this.fx.limb(e.x, e.y, angle, 'arm'); this.fx.limb(e.x, e.y, angle, 'leg'); this.fx.headPop(e.x, e.y, angle); this.fx.addCorpse(e.x, e.y, angle, 'opened'); }
    else if (overkill >= 2 || e.type === 'elite') { this.fx.headPop(e.x, e.y, angle); this.fx.limb(e.x, e.y, angle, 'arm'); this.fx.addCorpse(e.x, e.y, angle, 'decap'); }
    else this.fx.addCorpse(e.x, e.y, angle, 'intact');
    this.fx.pool(e.x, e.y, 2.5); this.audio.play('kill'); this.shake(overkill >= 3 ? 11 : 9); this.hitStop(.06); this.addCombo(wasStealth ? 175 : 120);
    if (rng.chance(.48) && e.weapon) this.level.pickups.push({ x: e.x, y: e.y, weapon: makeWeapon(e.weapon.id) });
  },
  onBossKilled(b) {
    this.fx.blood(b.x, b.y, 28, this.player.a); this.fx.limb(b.x, b.y, this.player.a, 'arm'); this.fx.limb(b.x, b.y, this.player.a, 'leg'); this.fx.headPop(b.x, b.y, this.player.a); this.fx.addCorpse(b.x, b.y, this.player.a, 'opened');
    this.fx.burst(b.x, b.y, 24, '#d4b46a', 230, .7, 5); this.fx.ring(b.x, b.y, COLORS.cyan, 240, .6);
    this.score += 1800; this.addCombo(500); this.shake(16); this.hitStop(.08); this.renderer?.glitch?.(1);
  }
};
