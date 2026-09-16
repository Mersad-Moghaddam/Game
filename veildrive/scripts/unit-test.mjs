import assert from 'node:assert/strict';
import { clamp, lerp, dist, norm, angleDiff, pointSegDist, circleRect, segRect } from '../src/core/math.js';
import { WEAPONS, makeWeapon } from '../src/combat/weapons.js';
import { COLORS, DEFAULT_SETTINGS, UPGRADES, MASKS } from '../src/data/config.js';
import { MOODS, MOOD_IDS, moodColor } from '../src/render/mood.js';
import { MISSIONS, MISSION_COUNT } from '../src/data/missions.js';
import { Level } from '../src/world/Level.js';
import { FX } from '../src/systems/FX.js';
import { Player } from '../src/entities/Player.js';
import { Enemy } from '../src/entities/Enemy.js';
import { Boss } from '../src/entities/Boss.js';
import { loadSave, storeSave } from '../src/core/Save.js';

let passed = 0; const failures = [];
function test(name, fn) { try { fn(); passed++; } catch (e) { failures.push(`${name} :: ${e.message}`); } }
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// ---------------------------------------------------------------- math
test('math: clamp bounds', () => { assert.equal(clamp(5, 0, 3), 3); assert.equal(clamp(-1, 0, 3), 0); assert.equal(clamp(2, 0, 3), 2); });
test('math: lerp', () => { assert.equal(lerp(0, 10, 0.5), 5); assert.equal(lerp(10, 0, 1), 0); });
test('math: dist', () => { assert.equal(dist({ x: 0, y: 0 }, { x: 3, y: 4 }), 5); });
test('math: norm', () => { assert.deepEqual(norm(3, 4), { x: 0.6, y: 0.8 }); });
test('math: norm of zero vector is safe', () => { const n = norm(0, 0); assert(Number.isFinite(n.x) && Number.isFinite(n.y)); });
test('math: angleDiff wraps to shortest arc', () => { assert(near(angleDiff(0.1, -0.1), -0.2, 1e-9)); assert(near(angleDiff(3.0, -3.0), 0.2831853, 1e-6)); });
test('math: pointSegDist on segment and perpendicular', () => {
  assert(near(pointSegDist(5, 0, 0, 0, 10, 0), 0));
  assert(near(pointSegDist(5, 3, 0, 0, 10, 0), 3));
});
test('math: circleRect hit and miss', () => {
  const r = { x: 0, y: 0, w: 20, h: 20 };
  assert.equal(circleRect(25, 10, 6, r), true);
  assert.equal(circleRect(40, 10, 6, r), false);
});
test('math: segRect detects a thin wall between samples', () => {
  // A 4px-thick wall offset between the old fixed sampling steps must still
  // register, otherwise bullets and line-of-sight leak through walls.
  assert.equal(segRect(0, 0, 1000, 0, { x: 503, y: -50, w: 4, h: 100 }), true, 'thin wall was missed');
  assert.equal(segRect(13, 7, 997, 631, { x: 500, y: 300, w: 6, h: 20 }), true, 'diagonal segment missed a thin wall');
});
test('math: segRect clear when no intersection', () => {
  assert.equal(segRect(0, 0, 100, 0, { x: 0, y: 50, w: 100, h: 10 }), false);
});

// ------------------------------------------------------------- weapons
test('weapons: every weapon has required fields', () => {
  for (const [id, w] of Object.entries(WEAPONS)) {
    assert.equal(w.id, id, `${id} id mismatch`);
    assert(['gun', 'melee'].includes(w.kind), `${id} kind`);
    assert(w.damage > 0 && w.rate > 0, `${id} damage/rate`);
    assert(typeof w.name === 'string' && w.color, `${id} name/color`);
  }
});
test('weapons: makeWeapon ammo + reserve (x2) and melee nulls', () => {
  for (const [id, d] of Object.entries(WEAPONS)) {
    const w = makeWeapon(id);
    if (d.kind === 'gun') { assert.equal(w.ammo, d.mag); assert.equal(w.reserve, d.mag * 2); }
    else { assert.equal(w.ammo, null); assert.equal(w.reserve, null); }
  }
});

// --------------------------------------------------------------- config
test('config: palette has every required key', () => {
  for (const key of ['void', 'ground', 'ground2', 'wall', 'wallHi', 'hotPink', 'magenta', 'cyan', 'blue', 'violet', 'orange', 'lime', 'bone', 'ink', 'blood', 'bloodDark']) {
    assert(/^#[0-9a-f]{6}$/i.test(COLORS[key]), `palette key ${key}`);
  }
});
test('config: default settings shape', () => {
  for (const k of ['master', 'music', 'sfx', 'shake', 'blood', 'quality', 'post', 'flashes', 'highContrastCursor']) {
    assert(k in DEFAULT_SETTINGS, `settings ${k}`);
  }
  assert.equal(typeof DEFAULT_SETTINGS.blood, 'boolean');
});
test('config: upgrades are unique and safely applicable', () => {
  const ids = UPGRADES.map(u => u.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate upgrade ids');
  assert(ids.includes('power') && ids.includes('trigger') && ids.includes('extmag') && ids.includes('pierce'), 'gun mods present');
  const p = new Player(0, 0);
  for (const u of UPGRADES) { assert(typeof u.apply === 'function', `${u.id} apply`); u.apply(p); }
});
test('config: masks are unique', () => { assert.equal(new Set(MASKS.map(m => m.id)).size, MASKS.length); });

// ----------------------------------------------------------------- save
const memStore = {};
globalThis.localStorage = { getItem: k => (k in memStore ? memStore[k] : null), setItem: (k, v) => { memStore[k] = String(v); }, removeItem: k => { delete memStore[k]; } };
test('save: round-trips a valid save', () => {
  storeSave({ version: 1, highScore: 1234, bestRank: 'A', runs: 7, unlockedMasks: ['MOTH-0', 'RAM-7'], selectedMask: 'RAM-7', settings: { ...DEFAULT_SETTINGS, master: 0.5 } });
  const s = loadSave();
  assert.equal(s.highScore, 1234); assert.equal(s.bestRank, 'A'); assert.equal(s.runs, 7);
  assert.equal(s.selectedMask, 'RAM-7'); assert.equal(s.settings.master, 0.5);
  assert.equal(s.settings.blood, DEFAULT_SETTINGS.blood);
});
test('save: corrupted JSON falls back to defaults', () => {
  memStore['veildrive-save-v1'] = '{broken';
  const s = loadSave();
  assert.equal(s.highScore, 0); assert.equal(s.selectedMask, 'MOTH-0'); assert.deepEqual(s.unlockedMasks, ['MOTH-0']);
});
test('save: wrong version falls back to defaults', () => {
  memStore['veildrive-save-v1'] = JSON.stringify({ version: 99, highScore: 5 });
  assert.equal(loadSave().highScore, 0);
});
test('save: missing fields are repaired', () => {
  memStore['veildrive-save-v1'] = JSON.stringify({ version: 1 });
  const s = loadSave();
  assert.equal(s.selectedMask, 'MOTH-0'); assert(Array.isArray(s.unlockedMasks)); assert(s.settings);
});

// ----------------------------------------------------------------- mood
test('mood: ids and valid colors', () => {
  assert.deepEqual(Object.keys(MOODS).sort(), ['blood', 'sunset', 'toxic', 'violet']);
  assert.deepEqual([...MOOD_IDS].sort(), ['blood', 'sunset', 'toxic', 'violet']);
  for (const id of Object.keys(MOODS)) for (const key of ['ground', 'ground2', 'wall', 'wallHi', 'glow', 'accent']) assert(/^#[0-9a-f]{6}$/i.test(moodColor(id, key, 0.5)));
});
test('mood: deterministic and pulse brightens', () => {
  assert.equal(moodColor('sunset', 'glow', 0), moodColor('sunset', 'glow', 0));
  assert.notEqual(moodColor('sunset', 'glow', 0), moodColor('sunset', 'glow', 1));
});
test('mood: unknown mood falls back', () => { assert(/^#[0-9a-f]{6}$/i.test(moodColor('nope', 'glow', 0))); });

// ---------------------------------------------------------------- level
test('level: mission 1 is the room-to-room motel', () => {
  assert.equal(MISSIONS[0].id, 'motel'); assert.equal(MISSIONS[0].w, 1800); assert.equal(MISSIONS[0].h, 1100);
});
test('level: mission structural invariants', () => {
  assert(MISSION_COUNT >= 5);
  for (const m of MISSIONS) {
    assert(m.w > 400 && m.h > 400, `${m.id} size`);
    assert(m.spawn && m.exit && m.goal && m.goal.type, `${m.id} spawn/exit/goal`);
    assert(['sunset', 'violet', 'toxic', 'blood'].includes(m.mood), `${m.id} mood`);
    assert(typeof m.entryLabel === 'string' && typeof m.entryKind === 'string', `${m.id} entry metadata`);
    assert(m.walls.length > 3 && m.enemies.length >= 4, `${m.id} walls/enemies`);
    for (const w of m.walls) assert(w.x >= 0 && w.y >= 0 && w.x + w.w <= m.w && w.y + w.h <= m.h, `${m.id} wall bounds`);
    for (const p of m.props) assert(p.x >= 0 && p.y >= 0 && p.x + p.w <= m.w && p.y + p.h <= m.h, `${m.id} prop bounds`);
    for (const e of [...m.enemies, ...(m.boss ? [m.boss] : [])]) assert(e.x >= 0 && e.y >= 0 && e.x <= m.w && e.y <= m.h, `${m.id} entity bounds`);
  }
});
test('level: entry rooms stay empty of items and enemies', () => {
  for (const m of MISSIONS) {
    for (const p of m.pickups) {
      assert(Math.hypot(p.x - m.spawn.x, p.y - m.spawn.y) > 80, `${m.id} pickup sits in the entry room`);
    }
  }
});
test('level: no pickup shadows a door (interaction priority)', () => {
  for (const m of MISSIONS) {
    for (const d of m.doors) {
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
      for (const p of m.pickups) {
        assert(Math.hypot(p.x - cx, p.y - cy) > 48, `${m.id} pickup shadows a door`);
      }
    }
  }
});
test('level: authored enemy, waypoint, exit and goal positions are in open space', () => {
  const bad = [];
  for (const m of MISSIONS) {
    const L = new Level(m);
    for (const e of m.enemies) {
      if (L.blocked(e.x, e.y, 12)) bad.push(`${m.id} enemy ${e.x},${e.y}`);
      for (const w of e.waypoints) if (L.blocked(w.x, w.y, 12)) bad.push(`${m.id} wp ${w.x},${w.y}`);
    }
    if (L.blocked(m.exit.x, m.exit.y, 14)) bad.push(`${m.id} exit ${m.exit.x},${m.exit.y}`);
    if (m.goal.x != null && L.blocked(m.goal.x, m.goal.y, 14)) bad.push(`${m.id} goal ${m.goal.x},${m.goal.y}`);
    if (m.boss && L.blocked(m.boss.x, m.boss.y, 19)) bad.push(`${m.id} boss`);
  }
  assert.equal(bad.length, 0, `authored positions inside geometry: ${bad.join(' | ')}`);
});
test('level: every mission opens in a clear empty entry room with a door out', () => {
  for (const m of MISSIONS) {
    const L = new Level(m);
    assert.equal(L.blocked(m.spawn.x, m.spawn.y, 14), false, `${m.id} spawn blocked`);
    assert(L.doors.length >= 1, `${m.id} no door`);
    const nearest = Math.min(...m.enemies.map(e => Math.hypot(e.x - m.spawn.x, e.y - m.spawn.y)));
    assert(nearest > 120, `${m.id} enemy too close to spawn (${nearest.toFixed(0)})`);
    let dd = Infinity; for (const d of L.doors) dd = Math.min(dd, Math.hypot(d.x + d.w / 2 - m.spawn.x, d.y + d.h / 2 - m.spawn.y));
    assert(dd < 200, `${m.id} no nearby door (${dd.toFixed(0)})`);
    assert.equal(L.exit.active, false, `${m.id} exit starts inactive`);
  }
});
test('level: collision, line of sight and bullet hit', () => {
  const L = new Level(MISSIONS[0]);
  const w = L.walls[0];
  const cy = w.y + w.h / 2;
  const c = { x: w.x - 30, y: cy, r: 12 };
  L.moveCircle(c, 40, 0);
  assert.equal(c.x, w.x - 30, 'circle should stop before the wall');
  assert.equal(L.lineBlocked({ x: w.x - 30, y: cy }, { x: w.x + 30, y: cy }), true, 'LOS should be blocked');
  const hit = L.bulletHit(w.x - 30, cy, w.x + 30, cy);
  assert(hit && typeof hit.w === 'number', 'bullet should hit the wall');
});
test('level: findOpen never returns a blocked point', () => {
  const L = new Level(MISSIONS[0]);
  const w = L.walls[0];
  const p = L.findOpen(w.x + w.w / 2, w.y + w.h / 2, 12);
  assert.equal(L.blocked(p.x, p.y, 12), false);
});
test('level: doors block when closed and clear when open', () => {
  const L = new Level(MISSIONS[0]);
  for (const d of L.doors) {
    const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
    assert(L.blocked(cx, cy, 5), 'closed door blocks');
    L.openDoor(d, false);
    assert(!L.blocked(cx, cy, 5), 'open door clears');
  }
});
test('level: breaking a prop removes it from blockers and marks dirty', () => {
  const L = new Level(MISSIONS[0]);
  const p = L.props.find(o => o.solid && o.hp);
  L.dirty = false;
  assert.equal(L.damageProp(p, p.hp), true);
  assert.equal(p.broken, true); assert.equal(p.solid, false); assert.equal(L.dirty, true);
  assert(!L.blockers().includes(p));
});

// --------------------------------------------------------------- player
test('player: starts armed with the pistol', () => {
  const p = new Player(0, 0);
  assert.equal(p.current.id, 'pistol'); assert.equal(p.current.kind, 'gun');
  assert.equal(p.hp, 3); assert.equal(p.maxHp, 3); assert.equal(p.magOf(p.current), p.current.mag);
});
test('player: gun mods stack', () => {
  const p = new Player(0, 0);
  const base = p.magOf(p.current);
  UPGRADES.find(u => u.id === 'power').apply(p);
  UPGRADES.find(u => u.id === 'extmag').apply(p);
  UPGRADES.find(u => u.id === 'pierce').apply(p);
  assert(p.damageMul > 1); assert.equal(p.magOf(p.current), base + 3); assert.equal(p.pierce, 1);
});
const stubInput = { down: () => false, tap: () => false, mouse: { x: 0, y: 0, left: false, right: false, leftPressed: false, rightPressed: false } };
function stubGame(player) {
  return { input: stubInput, screenToWorld: (x, y) => ({ x, y }), level: { moveCircle() {}, blocked: () => false }, fx: { blood() {}, ghost() {} }, emitNoise() {}, audio: { play() {} }, interact() {}, fireWeapon() {}, meleeAttack() {}, throwWeapon() {}, shake() {}, player, renderer: null };
}
test('player: reload completes into the right weapon', () => {
  const p = new Player(0, 0); const g = stubGame(p);
  p.current.ammo = 0; p.reload(g);
  assert(p.reloadT > 0 && p.reloadWeapon === p.current);
  p.reloadT = 0.001; p.update(0.01, g);
  assert.equal(p.current.ammo, p.current.mag, 'magazine should refill');
});
test('player: swapping cancels a reload and never refills the wrong gun', () => {
  const p = new Player(0, 0); const g = stubGame(p);
  p.equip(makeWeapon('smg'), g);           // current = smg, previous = pistol
  p.current.ammo = 0; p.reload(g);
  p.swap(g);                                // switch to pistol mid-reload
  assert.equal(p.reloadT, 0); assert.equal(p.reloadWeapon, null);
  p.reloadT = 0.001; p.update(0.01, g);
  assert.equal(p.current.id, 'pistol');
  assert.equal(p.previous.ammo, 0, 'the smg must not be silently refilled');
});
test('player: throw uses the previous weapon then fists', () => {
  const p = new Player(0, 0); const g = stubGame(p);
  p.throwCurrent(g);
  assert.equal(p.current.id, 'fists', 'throwing the only gun leaves fists');
});
test('player: damage respects invulnerability and kills', () => {
  const p = new Player(0, 0); let died = false;
  const g = stubGame(p); g.onPlayerDeath = () => { died = true; };
  p.damage(1, g, 0); assert.equal(p.hp, 2); assert(p.invuln > 0);
  p.damage(1, g, 0); assert.equal(p.hp, 2, 'invulnerable while i-frames active');
  p.invuln = 0; p.damage(5, g, 0);
  assert.equal(p.dead, true); assert.equal(died, true);
});
test('player: dash sets cooldown and i-frames', () => {
  const p = new Player(0, 0); const g = stubGame(p);
  p.startDash({ x: 1, y: 0 }, g);
  assert(p.dashTimer > 0 && p.dashCd > 0 && p.invuln > 0);
  const cd = p.dashCd; p.startDash({ x: 1, y: 0 }, g); assert.equal(p.dashCd, cd, 'cannot dash during cooldown');
});

// --------------------------------------------------------------- enemy
const enemyG = { level: { blocked: () => false, moveCircle: (e, dx, dy) => { e.x += dx; e.y += dy; }, lineBlocked: () => false }, player: { x: 0, y: 0, dead: false, vx: 0, vy: 0, detectionMul: 1 }, enemies: [], aiStep: 0.1, enemyShoot() {}, alertNearby() {}, fx: {}, audio: {} };
test('enemy: archetypes and hp', () => {
  for (const t of ['guard', 'brawler', 'shotgunner', 'hunter', 'elite']) assert(new Enemy(0, 0, t, []).hp >= 1, t);
  assert.equal(new Enemy(0, 0, 'guard', []).hp, 1);
  assert.equal(new Enemy(0, 0, 'elite', []).hp, 2);
});
test('enemy: idle enemies do not animate; moving enemies do', () => {
  const idle = new Enemy(0, 0, 'guard', []);
  for (let i = 0; i < 8; i++) idle.update(0.1, enemyG);
  assert.equal(idle.animT, 0, 'idle enemy animated in place');
  const walk = new Enemy(0, 0, 'guard', [{ x: 200, y: 0 }]);
  for (let i = 0; i < 8; i++) walk.update(0.1, enemyG);
  assert(walk.animT > 0, 'walking enemy did not animate');
});
test('enemy: perceives a visible player into COMBAT', () => {
  const e = new Enemy(0, 0, 'guard', []); e.a = 0;
  const g = { ...enemyG, player: { x: 100, y: 0, dead: false, vx: 0, vy: 0, detectionMul: 1 }, level: { lineBlocked: () => false } };
  for (let i = 0; i < 6; i++) e.perceive(g);
  assert.equal(e.state, 'COMBAT');
});
test('enemy: loses the player to SEARCH then PATROL', () => {
  const e = new Enemy(0, 0, 'guard', []); e.a = 0; e.state = 'COMBAT'; e.alertT = 0.2;
  const g = { ...enemyG, player: { x: 100, y: 0, dead: false, vx: 0, vy: 0, detectionMul: 1 }, level: { lineBlocked: () => true } };
  for (let i = 0; i < 5; i++) e.perceive(g);
  assert.equal(e.state, 'SEARCH');
});
test('enemy: hears noise and investigates', () => {
  const e = new Enemy(0, 0, 'guard', []);
  e.hearNoise({ x: 40, y: 0, radius: 400 }, enemyG);
  assert.equal(e.state, 'INVESTIGATE'); assert(e.lastKnown);
});
test('enemy: dies and reports the kill', () => {
  const e = new Enemy(0, 0, 'guard', []); let killed = false;
  const g = { ...enemyG, fx: { blood() {} }, shake() {}, onEnemyKilled: () => { killed = true; } };
  e.damage(5, g, 0);
  assert.equal(e.dead, true); assert.equal(killed, true);
});
test('enemy: stun applies knockback and stun timer', () => {
  const e = new Enemy(0, 0, 'guard', []); const g = { ...enemyG, fx: { burst() {} } };
  e.stunHit(g, 0, 200);
  assert(e.stun > 0 && e.knockX > 0);
});
test('enemy: steering commits to an avoidance side instead of jittering', () => {
  const e = new Enemy(0, 0, 'guard', []);
  const g = { ...enemyG, level: { blocked: (x, y) => x > 5, moveCircle: (o, dx, dy) => { o.x += dx; o.y += dy; } } };
  e.moveToward({ x: 200, y: 0 }, 0.1, g, 1);
  assert(e.avoidDir !== null && e.avoidT > 0, 'should pick an avoidance side');
  const dir = e.avoidDir;
  e.moveToward({ x: 200, y: 0 }, 0.1, g, 1);
  assert.equal(e.avoidDir, dir, 'avoidance side should be stable between frames');
});
test('enemy: elite fires a burst', () => {
  const e = new Enemy(0, 0, 'elite', []); e.a = 0; e.state = 'COMBAT'; e.attackCd = 0;
  let shots = 0;
  const g = { ...enemyG, player: { x: 200, y: 0, dead: false, vx: 0, vy: 0, detectionMul: 1 }, level: { lineBlocked: () => false, blocked: () => false, moveCircle() {} }, enemyShoot: () => { shots++; } };
  e.combat(0.016, g, g.player);
  assert(e.burst > 0, 'elite should queue a burst');
  for (let i = 0; i < 6; i++) e.updateBurst(0.2, g, g.player);
  assert(shots >= 2, 'burst should fire follow-up shots');
});
test('enemy: closes distance when line of sight is blocked', () => {
  const e = new Enemy(0, 0, 'guard', []); e.state = 'COMBAT'; e.attackCd = 1;
  let moved = 0;
  const g = { ...enemyG, player: { x: 300, y: 0, dead: false, vx: 0, vy: 0, detectionMul: 1 }, level: { lineBlocked: () => true, moveCircle: (o, dx, dy) => { moved += Math.hypot(dx, dy); } } };
  e.combat(0.1, g, g.player);
  assert(moved > 0, 'should advance to regain LOS');
});

// ---------------------------------------------------------------- boss
const bossG = { fx: { blood() {}, burst() {} }, shake() {}, level: { moveCircle() {} }, player: { x: 0, y: 0, dead: false, r: 13 }, enemyShoot() {}, spawnHazard() {}, audio: { play() {} }, onBossKilled() {} };
test('boss: hp and phase thresholds', () => {
  const b = new Boss(0, 0);
  assert.equal(b.maxHp, 16);
  b.hp = 12; b.update(0.016, bossG); assert.equal(b.phase, 1);
  b.hp = 8; b.update(0.016, bossG); assert.equal(b.phase, 2);
  b.hp = 4; b.update(0.016, bossG); assert.equal(b.phase, 3);
});
test('boss: phases 1-2 take full damage, phase 3 resists unless stunned', () => {
  const b = new Boss(0, 0); b.hp = 8; b.damage(2, bossG, 0); assert.equal(b.hp, 6);
  const b3 = new Boss(0, 0); b3.hp = 4; b3.stun = 0; b3.damage(2, bossG, 0);
  assert(b3.hp > 2, 'phase 3 should resist while not vulnerable');
  b3.stun = 1; b3.damage(2, bossG, 0); assert(near(b3.hp, 1.3, 1e-9), 'stunned phase 3 takes full damage');
});
test('boss: death reports the kill', () => {
  const b = new Boss(0, 0); let killed = false;
  b.damage(99, { ...bossG, onBossKilled: () => { killed = true; } }, 0);
  assert.equal(b.dead, true); assert.equal(killed, true);
});

// ------------------------------------------------------------------ fx
test('fx: decal and corpse caps with shift-safe painting', () => {
  const fx = new FX();
  while (fx.decals.length < 420) fx.decals.push({ x: 0, y: 0, r: 5, a: 0.5, painted: false });
  fx.markAllPainted();
  assert.equal(fx.unpaintedCount(), 0);
  fx.pool(0, 0, 1);
  assert(fx.unpaintedCount() > 0, 'new gore must remain paintable after the cap');
  for (let i = 0; i < 500; i++) fx.pool(i % 100, i % 100, 3);
  assert.equal(fx.decals.length, 420);
  for (let i = 0; i < 120; i++) fx.addCorpse(i, 0, 0);
  assert.equal(fx.corpses.length, 60);
});
test('fx: blood toggle and particle quality scaling', () => {
  const fx = new FX(); fx.bloodEnabled = false; fx.blood(0, 0, 20); assert.equal(fx.p.length, 0);
  const fx2 = new FX(); fx2.bloodEnabled = true; fx2.blood(0, 0, 20); assert(fx2.p.length > 0);
  const lo = new FX(); lo.quality = 0; lo.burst(0, 0, 40, '#fff');
  const hi = new FX(); hi.quality = 1; hi.burst(0, 0, 40, '#fff');
  assert(hi.p.length >= lo.p.length, 'higher quality should emit at least as many particles');
});
test('fx: rings are capped and expire', () => {
  const fx = new FX();
  for (let i = 0; i < 80; i++) fx.ring(0, 0);
  assert(fx.rings.length <= 40);
  fx.update(10);
  assert.equal(fx.rings.length, 0);
});

// ------------------------------------------------- weapon art & chars
import { drawWeaponArt } from '../src/render/weapons-art.js';
import { drawHuman } from '../src/render/humanoid.js';
function recordingCtx() {
  const calls = [];
  const noop = name => (...a) => { calls.push(name); };
  return { calls, save: noop('save'), restore: noop('restore'), scale: noop('scale'), translate: noop('translate'), rotate: noop('rotate'),
    fillRect: noop('fillRect'), strokeRect: noop('strokeRect'), beginPath: noop('beginPath'), moveTo: noop('moveTo'), lineTo: noop('lineTo'),
    arc: noop('arc'), arcTo: noop('arcTo'), ellipse: noop('ellipse'), closePath: noop('closePath'), stroke: noop('stroke'), fill: noop('fill'),
    globalAlpha: 1, lineWidth: 1 };
}
test('art: every weapon draws a distinct silhouette without throwing', () => {
  for (const id of ['fists', 'baton', 'cleaver', 'bottle', 'pistol', 'suppressed', 'shotgun', 'smg', 'revolver']) {
    const ctx = recordingCtx();
    drawWeaponArt(ctx, makeWeapon(id), 1, '#e0a97f');
    assert(ctx.calls.length > 0, `${id} drew nothing`);
  }
});
test('art: unknown weapon falls back without throwing', () => {
  const ctx = recordingCtx();
  drawWeaponArt(ctx, { id: 'mystery', color: '#fff' }, 1);
  assert(ctx.calls.length > 0);
});
test('art: humanoid draws with archetype options and returns anchors', () => {
  for (const opts of [{}, { hat: 'cap' }, { hat: 'hood' }, { hat: 'visor' }, { coat: true, bulk: 2 }, { slim: true, pose: 'melee' }]) {
    const ctx = recordingCtx();
    const r = drawHuman(ctx, { phase: 1.2, ...opts });
    assert(r && r.hand && r.head, 'should return hand and head anchors');
    assert(Number.isFinite(r.hand.x) && Number.isFinite(r.head.y));
  }
});

test('art: weapon silhouettes are distinct per type', () => {
  const counts = new Set();
  for (const id of ['fists', 'baton', 'cleaver', 'bottle', 'pistol', 'suppressed', 'shotgun', 'smg', 'revolver']) {
    const ctx = recordingCtx(); drawWeaponArt(ctx, makeWeapon(id), 1); counts.add(ctx.calls.length);
  }
  assert(counts.size >= 5, `weapons should not share silhouettes (distinct call counts: ${counts.size})`);
});
test('art: the humanoid coat option changes the silhouette', () => {
  const plain = recordingCtx(); drawHuman(plain, {});
  const coat = recordingCtx(); drawHuman(coat, { coat: true });
  assert(coat.calls.length > plain.calls.length, 'coat should add drawing work');
});
test('missions: entry metadata is well formed', () => {
  for (const m of MISSIONS) {
    assert(['door', 'stairs', 'elevator'].includes(m.entryKind), `${m.id} entry kind ${m.entryKind}`);
    assert(typeof m.entryLabel === 'string' && m.entryLabel.length > 0, `${m.id} entry label`);
    assert(m.sub && m.sub.length > 0, `${m.id} briefing`);
  }
});
test('weapons: ammo invariants for every gun and melee', () => {
  for (const [id, d] of Object.entries(WEAPONS)) {
    const w = makeWeapon(id);
    if (d.kind === 'gun') { assert(w.mag > 0 && w.reserve > 0 && w.ammo === w.mag, `${id} ammo`); }
    else { assert.equal(w.mag, undefined, `${id} should have no magazine`); }
  }
});

// --------------------------------------------------- spawn / violence
test('level: entryFacing points from the spawn toward the nearest door', () => {
  for (const m of MISSIONS) {
    const L = new Level(m);
    const a = L.entryFacing();
    assert(Number.isFinite(a), `${m.id} facing not finite`);
    let best = null, bd = Infinity;
    for (const d of L.doors) { const dd = Math.hypot(d.x + d.w / 2 - m.spawn.x, d.y + d.h / 2 - m.spawn.y); if (dd < bd) { bd = dd; best = d; } }
    const want = Math.atan2(best.y + best.h / 2 - m.spawn.y, best.x + best.w / 2 - m.spawn.x);
    assert(Math.abs(Math.atan2(Math.sin(a - want), Math.cos(a - want))) < 1e-6, `${m.id} facing wrong`);
  }
});
test('fx: gibs add particles and blood, and blood pools', () => {
  const fx = new FX();
  fx.gib(0, 0, 0, 12);
  assert(fx.p.length >= 12, 'gib should emit particles');
  assert(fx.decals.length > 0, 'gib should leave a pool');
  const before = fx.decals.length;
  fx.blood(0, 0, 20, 0);
  assert(fx.decals.length > before, 'blood should add decals');
});
test('fx: blood can be disabled', () => {
  const fx = new FX(); fx.bloodEnabled = false; fx.blood(0, 0, 20); fx.gib(0, 0, 0, 10);
  assert.equal(fx.p.length, 0); assert.equal(fx.decals.length, 0);
});

// --------------------------------------------- reachability & objectives
function gridReachable(L, from, to, cell = 10, r = 11) {
  const blockers = [...L.walls, ...L.props.filter(p => p.solid && !p.broken)];
  const free = (x, y) => !(x - r < 0 || y - r < 0 || x + r > L.w || y + r > L.h || blockers.some(o => circleRect(x, y, r, o)));
  const cols = Math.ceil(L.w / cell) + 1, rows = Math.ceil(L.h / cell) + 1;
  const idx = (i, j) => j * cols + i;
  const seen = new Uint8Array(cols * rows);
  const si = Math.round(from.x / cell), sj = Math.round(from.y / cell);
  const ti = Math.round(to.x / cell), tj = Math.round(to.y / cell);
  const q = [[si, sj]]; seen[idx(si, sj)] = 1;
  while (q.length) {
    const [i, j] = q.pop();
    if (i === ti && j === tj) return true;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      const k = idx(ni, nj);
      if (seen[k]) continue;
      if (!free(ni * cell, nj * cell)) continue;
      seen[k] = 1; q.push([ni, nj]);
    }
  }
  // Treat a target as reachable if any free cell near it was reached (pickups
  // and exits can sit on top of a prop; the player only needs to get close).
  const R = 4;
  for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
    const i = ti + di, j = tj + dj;
    if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
    if (seen[idx(i, j)]) return true;
  }
  return false;
}
test('level: every enemy, pickup, exit, objective and boss is reachable (doors openable)', () => {
  const bad = [];
  for (const m of MISSIONS) {
    const L = new Level(m);
    const targets = [...m.enemies.map(e => ['enemy', e]), ...m.pickups.map(p => ['pickup', p]), ['exit', m.exit]];
    if (m.goal.x != null) targets.push(['goal', m.goal]);
    if (m.boss) targets.push(['boss', m.boss]);
    for (const [kind, t] of targets) if (!gridReachable(L, m.spawn, t, 8, 13)) bad.push(`${m.id} ${kind} @${t.x},${t.y}`);
  }
  assert.equal(bad.length, 0, `unreachable: ${bad.join(' | ')}`);
});
test('level: target missions mark a reachable enemy at the goal', () => {
  for (const m of MISSIONS) {
    if (m.goal.type !== 'target') continue;
    const hit = m.enemies.find(e => Math.abs(e.x - m.goal.x) < 10 && Math.abs(e.y - m.goal.y) < 10);
    assert(hit, `${m.id} has no enemy at the marked goal`);
  }
});
test('player: reload takes at most the ammo left in reserve', () => {
  const p = new Player(0, 0); const g = stubGame(p);
  p.current.ammo = 0; p.current.reserve = 1; p.reload(g); p.reloadT = 0.001; p.update(0.01, g);
  assert.equal(p.current.ammo, 1); assert.equal(p.current.reserve, 0);
});

// --------------------------------------------------------------- report
if (failures.length) {
  console.log(`unit: ${passed} passed, ${failures.length} FAILED`);
  for (const f of failures) console.log('  x', f);
  process.exit(1);
}
console.log(`VEIL//DRIVE unit checks passed (${passed} tests).`);
