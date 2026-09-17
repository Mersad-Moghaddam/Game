// World: static-world bake/dirty handling, decal/corpse painting, lighting
// buffer assembly and player-world interaction (doors, pickups, executions).
import { clamp, dist } from '../core/math.js';
import { NavGrid } from '../core/NavGrid.js';
import { LightBuffer } from '../render/LightBuffer.js';

export const WorldSystem = {
  ensureWorld() {
    if (!this.worldCanvas) {
      this.worldCanvas = document.createElement('canvas');
      this.worldCanvas.width = this.level.w; this.worldCanvas.height = this.level.h;
      this.worldCtx = this.worldCanvas.getContext('2d'); this.worldCtx.imageSmoothingEnabled = false;
      this.level.markDirty();
    }
    if (this.level.dirty) {
      this.rebakeWorld(); this.level.dirty = false;
      if (this.nav) this.nav = new NavGrid(this.level);
    }
    this.drainDecalsAndCorpses();
  },
  rebakeWorld() {
    this.level.bake(this.worldCtx);
    for (const d of this.fx.decals) this.level.paintDecal(this.worldCtx, d);
    for (const c of this.fx.corpses) this.level.paintCorpse(this.worldCtx, c);
    this.fx.markAllPainted();
  },
  drainDecalsAndCorpses() {
    for (const d of this.fx.decals) { if (d.painted) continue; this.level.paintDecal(this.worldCtx, d); d.painted = true; }
    for (const c of this.fx.corpses) { if (c.painted) continue; this.level.paintCorpse(this.worldCtx, c); c.painted = true; }
  },
  interact(kick) {
    if (this.player.dead) return;
    for (const e of this.enemies) {
      if (!e.dead && e.stun > 0 && dist(this.player, e) < 42 && kick) {
        e.damage(99, this, this.player.a, 260); this.score += 250;
        if (this.player.execRestoresDash) this.player.dashCd = 0;
        this.hitStop(.055); return;
      }
    }
    if (this.goalDone && this.level.exit.active && dist(this.player, this.level.exit) < 52) { this.missionComplete(); return; }
    if (!this.goalDone && this.mission.goal.type === 'retrieve' && this.level.objective && !this.level.objective.taken && dist(this.player, this.level.objective) < 55) {
      this.level.objective.taken = true; this.completeGoal(); return;
    }
    if (!kick) {
      let best = null, bd = 48;
      for (const p of this.level.pickups) { if (p.taken) continue; const d = dist(this.player, p); if (d < bd) { best = p; bd = d; } }
      if (best) { best.taken = true; this.player.equip(best.weapon, this); return; }
    }
    const d = this.level.nearestDoor(this.player, 58);
    if (d) {
      this.level.openDoor(d, kick); this.audio.play('door');
      this.emitNoise(d.x, d.y, kick ? 340 : 80, kick ? 'breach' : 'door');
      if (kick) {
        this.shake(8);
        for (const e of this.enemies) { const c = { x: d.x + d.w / 2, y: d.y + d.h / 2 }; if (!e.dead && dist(e, c) < 62) e.damage(2 + this.player.breachBonus, this, this.player.a, 280 + this.player.breachBonus * 70); }
      }
    }
  },
  pushLights() {
    if (!this.renderer || !this.renderer.available || !this.level) return;
    const pulse = this.beatPulse(), k = 1 + .45 * clamp(pulse, 0, 1);
    const buf = this._lights || (this._lights = new LightBuffer());
    buf.begin();
    for (const l of this.level.lights) { const mood = l.mood || this.level.mood; buf.pushMood(l.x - this.cam.x + this.shakeX, l.y - this.cam.y + this.shakeY, l.r, .62, mood, k); }
    for (const f of this.fx.flashes) { buf.pushHex(f.x - this.cam.x + this.shakeX, f.y - this.cam.y + this.shakeY, f.r * 2.2, 1.2, f.color); }
    this.renderer.setLights({ lights: buf.list, ambient: .5, pulse, flashPos: null, flashArc: .6 });
  }
};
