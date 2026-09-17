import { rand } from '../core/math.js';
import { rng } from '../core/rng.js';
import { compact } from '../core/Pool.js';
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const NEON = new Set(['#12e0ff', '#ff2e88', '#ff7a1a', '#c6ff2e', '#8b2bff', '#ff1e9c']);
const newParticle = () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: .5, size: 3, color: '#fff', glow: false });
const newCasing = () => ({ x: 0, y: 0, vx: 0, vy: 0, a: 0, spin: 0, life: 0 });
const newLimb = () => ({ x: 0, y: 0, vx: 0, vy: 0, a: 0, spin: 0, life: 0, kind: 'arm' });
export class FX {
  constructor() {
    this.p = []; this._pFree = [];
    this.decals = []; this.flashes = []; this.after = []; this.corpses = []; this.rings = [];
    this.casings = []; this._casingFree = [];
    this.limbs = []; this._limbFree = [];
    this._flashFree = []; this._afterFree = []; this._ringFree = [];
    this.bloodEnabled = true; this.quality = 1;
  }
  // Pooled particle: reuse a dead object, recycling the oldest only at the cap.
  _newP() { if (this.p.length >= 900) this._pFree.push(this.p.shift()); const t = this._pFree.pop() || newParticle(); this.p.push(t); return t; }
  _newCasing() { if (this.casings.length >= 140) this._casingFree.push(this.casings.shift()); const t = this._casingFree.pop() || newCasing(); this.casings.push(t); return t; }
  _newLimb() { if (this.limbs.length >= 90) this._limbFree.push(this.limbs.shift()); const t = this._limbFree.pop() || newLimb(); this.limbs.push(t); return t; }
  burst(x, y, count, color, speed = 150, life = .45, size = 3) { count = Math.max(1, Math.ceil(count * (.35 + .65 * this.quality))); for (let i = 0; i < count; i++) { const a = rng.random() * Math.PI * 2, s = rand(speed * .25, speed); const p = this._newP(); p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.life = rand(life * .5, life); p.max = life; p.size = rand(size * .5, size); p.color = color; p.glow = NEON.has(color); } }
  blood(x, y, amount = 10, angle = null) { if (!this.bloodEnabled) return; amount = Math.max(3, Math.ceil(amount * (.45 + .55 * this.quality))); for (let i = 0; i < amount; i++) { const a = angle == null ? rng.random() * Math.PI * 2 : angle + rand(-.9, .9), s = rand(40, 230); const p = this._newP(); p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.life = rand(.35, .85); p.max = .85; p.size = rand(2, 6); p.color = rng.chance(.35) ? '#c8102e' : '#ff0a3c'; p.glow = false; } if (rng.chance(.85)) this.pool(x + rand(-14, 14), y + rand(-14, 14), 1); if (angle != null) { const n = 3 + rng.int(3); for (let i = 0; i < n; i++) { const d = rand(16, 60); this.decals.push({ x: x + Math.cos(angle) * d + rand(-8, 8), y: y + Math.sin(angle) * d + rand(-8, 8), r: rand(5, 14), a: rand(.35, .65), painted: false }); } } this.trim(); }
  gib(x, y, angle, n = 10) { if (!this.bloodEnabled) return; for (let i = 0; i < n; i++) { const a = angle + rand(-1.1, 1.1), s = rand(60, 300); const p = this._newP(); p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.life = rand(.4, .9); p.max = .9; p.size = rand(3, 7); p.color = i % 3 ? '#8e0f22' : '#ff0a3c'; p.glow = false; } this.pool(x, y, 2); }
  pool(x, y, amount = 1) { for (let i = 0; i < Math.max(1, Math.round(amount * 4)); i++) this.decals.push({ x: x + rand(-24, 24), y: y + rand(-20, 20), r: rand(12, 32), a: rand(.5, .8), painted: false }); this.trim(); }
  addCorpse(x, y, a, kind = 'intact') { this.corpses.push({ x, y, a, kind, painted: false }); while (this.corpses.length > 60) this.corpses.shift(); }
  limb(x, y, angle, kind = 'arm') {
    if (!this.bloodEnabled) return;
    const a = angle + rand(-1.1, 1.1), s = rand(80, 240);
    const l = this._newLimb();
    l.x = x; l.y = y; l.vx = Math.cos(a) * s; l.vy = Math.sin(a) * s; l.a = rand(0, 6.283); l.spin = rand(-11, 11); l.life = rand(.6, 1.1); l.kind = kind;
    this.blood(x + rand(-6, 6), y + rand(-6, 6), 5, angle);
  }
  headPop(x, y, angle) { if (!this.bloodEnabled) return; this.limb(x, y, angle, 'head'); this.arterial(x, y, angle); }
  arterial(x, y, angle) {
    if (!this.bloodEnabled) return;
    for (let i = 0; i < 16; i++) { const a = angle + rand(-.5, .5), s = rand(150, 430); const p = this._newP(); p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.life = rand(.4, .9); p.max = .9; p.size = rand(2, 5); p.color = '#ff0a3c'; p.glow = false; }
    for (let i = 0; i < 5; i++) { const a = angle + rand(-.4, .4), s = rand(60, 150); const p = this._newP(); p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.life = rand(.5, 1); p.max = 1; p.size = rand(4, 8); p.color = '#8e0f22'; p.glow = false; }
    this.pool(x, y, 3);
  }
  trim() { while (this.decals.length > 420) this.decals.shift(); }
  markAllPainted() { for (const d of this.decals) d.painted = true; for (const c of this.corpses) c.painted = true; }
  unpaintedCount() { let n = 0; for (const d of this.decals) if (!d.painted) n++; for (const c of this.corpses) if (!c.painted) n++; return n; }
  flash(x, y, r, color = '#f6c37a', life = .07) { if (this.flashes.length >= 90) this._flashFree.push(this.flashes.shift()); const f = this._flashFree.pop() || { x: 0, y: 0, r: 0, color, life: 0, max: 0 }; f.x = x; f.y = y; f.r = r; f.color = color; f.life = life; f.max = life; this.flashes.push(f); }
  ring(x, y, color = '#ff2e88', max = 90, life = .34) { if (this.rings.length >= 40) this._ringFree.push(this.rings.shift()); const r = this._ringFree.pop() || { x: 0, y: 0, color, max: 0, life: 0, maxLife: 0 }; r.x = x; r.y = y; r.color = color; r.max = max; r.life = life; r.maxLife = life; this.rings.push(r); }
  ghost(x, y, a) { if (this.after.length >= 60) this._afterFree.push(this.after.shift()); const o = this._afterFree.pop() || { x: 0, y: 0, a: 0, life: 0 }; o.x = x; o.y = y; o.a = a; o.life = .18; this.after.push(o); }
  casing(x, y, a) { if (this.casings.length >= 140) this._casingFree.push(this.casings.shift()); const side = rng.chance(.5) ? 1 : -1, ea = a + Math.PI / 2 * side; const c = this._newCasing(); c.x = x; c.y = y; c.vx = Math.cos(a) * rand(20, 60) + Math.cos(ea) * rand(70, 140); c.vy = Math.sin(a) * rand(20, 60) + Math.sin(ea) * rand(70, 140); c.a = rand(0, 6.283); c.spin = rand(-16, 16); c.life = rand(.8, 1.4); }
  smoke(x, y, a) { const n = 2 + rng.int(2); for (let i = 0; i < n; i++) { const p = this._newP(); p.x = x; p.y = y; p.vx = Math.cos(a) * rand(25, 70) + rand(-18, 18); p.vy = Math.sin(a) * rand(25, 70) + rand(-18, 18); p.life = rand(.3, .6); p.max = .6; p.size = rand(2, 4.5); p.color = '#8a8a92'; p.glow = false; } }
  update(dt) {
    for (const p of this.p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(.1, dt); p.vy *= Math.pow(.1, dt); p.life -= dt; }
    compact(this.p, p => p.life > 0, this._pFree);
    for (const c of this.casings) { c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= Math.pow(.02, dt); c.vy *= Math.pow(.02, dt); c.a += c.spin * dt; c.life -= dt; }
    compact(this.casings, c => c.life > 0, this._casingFree);
    for (const l of this.limbs) { l.x += l.vx * dt; l.y += l.vy * dt; l.vx *= Math.pow(.05, dt); l.vy *= Math.pow(.05, dt); l.a += l.spin * dt; l.life -= dt; }
    compact(this.limbs, l => {
      if (l.life > 0) return true;
      this.decals.push({ x: l.x, y: l.y, r: rand(9, 17), a: .55, painted: false });
      this.trim();
      return false;
    }, this._limbFree);
    for (const f of this.flashes) f.life -= dt;
    compact(this.flashes, f => f.life > 0, this._flashFree);
    for (const a of this.after) a.life -= dt;
    compact(this.after, a => a.life > 0, this._afterFree);
    for (const r of this.rings) r.life -= dt;
    compact(this.rings, r => r.life > 0, this._ringFree);
  }
  drawDecals(ctx) { for (const d of this.decals) { ctx.globalAlpha = d.a; ctx.fillStyle = '#7a0018'; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * .65, 0, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
  draw(ctx) {
    for (const l of this.limbs) {
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.a);
      const head = l.kind === 'head';
      ctx.fillStyle = '#4a0010'; ctx.fillRect(-(head ? 5 : 7), -(head ? 5 : 3), (head ? 10 : 14), (head ? 10 : 6));
      if (head) { ctx.fillStyle = '#d8a07a'; ctx.fillRect(-4, -4, 8, 8); ctx.fillStyle = '#7a0018'; ctx.fillRect(-4, 2, 8, 3); }
      else { ctx.fillStyle = '#7a0018'; ctx.fillRect(-(head ? 4 : 6), -2, (head ? 8 : 12), 4); ctx.fillStyle = '#d8a07a'; ctx.fillRect(head ? 4 : 6, -2, 3, 4); }
      ctx.restore();
    }
    ctx.fillStyle = '#c9a24a'; for (const c of this.casings) { if (c.life < .2) continue; ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a); ctx.fillRect(-1.6, -1, 3.2, 2); ctx.restore(); } for (const a of this.after) { ctx.globalAlpha = a.life / .18 * .22; ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.a); ctx.fillStyle = '#12e0ff'; ctx.fillRect(-10, -7, 20, 14); ctx.restore(); } for (const p of this.p) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); } ctx.globalAlpha = 1;
  }
  drawGlow(ctx) {
    for (const f of this.flashes) {
      const a = Math.max(0, f.life / f.max);
      const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      grd.addColorStop(0, `rgba(255,255,255,${a})`);
      grd.addColorStop(0.4, hexA(f.color, a * 0.8));
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    }
    for (const p of this.p) { if (!p.glow) continue; const a = Math.max(0, p.life / p.max); ctx.fillStyle = hexA(p.color, a * .8); ctx.fillRect(p.x - p.size * .75, p.y - p.size * .75, p.size * 1.5, p.size * 1.5); }
    for (const r of this.rings) { const t = 1 - r.life / r.maxLife, a = Math.max(0, r.life / r.maxLife); ctx.strokeStyle = hexA(r.color, a * .9); ctx.lineWidth = 3 + 3 * (1 - t); ctx.beginPath(); ctx.arc(r.x, r.y, r.max * t, 0, Math.PI * 2); ctx.stroke(); }
  }
}
