import assert from 'node:assert/strict';
import { clamp, lerp, dist, norm, angleDiff, pointSegDist, circleRect, segRect, segRectEntry, advance } from '../src/core/math.js';
import { Rng, mulberry32 } from '../src/core/rng.js';
import { SpatialHash } from '../src/core/SpatialHash.js';
import { LightBuffer } from '../src/render/LightBuffer.js';
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
test('math: segRectEntry returns the nearest entry parameter', () => {
  const near = { x: 80, y: 80, w: 12, h: 24 }, far = { x: 180, y: 80, w: 24, h: 24 };
  const tn = segRectEntry(0, 92, 400, 92, near), tf = segRectEntry(0, 92, 400, 92, far);
  assert(tn !== null && tf !== null && tn < tf, 'near object must have the smaller entry t');
  assert.equal(segRectEntry(0, 0, 10, 0, { x: 50, y: 50, w: 10, h: 10 }), null);
});

// ------------------------------------------------------------------ rng
test('rng: same seed yields the same sequence, different seeds differ', () => {
  const seq = r => Array.from({ length: 8 }, () => r.random());
  assert.deepEqual(seq(new Rng(42)), seq(new Rng(42)));
  assert.notDeepEqual(seq(new Rng(42)), seq(new Rng(43)));
});
test('rng: integer/range stay in bounds and mulberry32 is stable', () => {
  const r = new Rng(7);
  for (let i = 0; i < 200; i++) {
    const v = r.range(-3, 5); assert(v >= -3 && v < 5);
    const n = r.int(6); assert(Number.isInteger(n) && n >= 0 && n < 6);
    assert.equal(typeof r.chance(0.5), 'boolean');
    assert(r.pick([1, 2, 3]) >= 1);
  }
  assert.equal(mulberry32(123)(), mulberry32(123)());
});
test('timestep: accumulator yields deterministic step counts and never runs away', () => {
  let acc = 0; const counts = [];
  for (const dt of [0.016, 0.016, 0.05, 0.016]) { const r = advance(acc, dt, 1 / 60, 5); acc = r.acc; counts.push(r.steps); }
  assert.deepEqual(counts, [0, 1, 3, 1]);
  assert.equal(advance(0, 10, 1 / 60, 5).steps, 5, 'catch-up is capped');
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
  for (const key of ['void', 'wall', 'hotPink', 'magenta', 'cyan', 'blue', 'violet', 'orange', 'bone', 'ink', 'blood', 'bloodDark']) {
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
test('spatial: query never misses an overlapping object', () => {
  const r = new Rng(9), items = [];
  for (let i = 0; i < 240; i++) items.push({ x: r.range(0, 500), y: r.range(0, 300), w: r.range(4, 30), h: r.range(4, 30) });
  const h = new SpatialHash(64).rebuild(items);
  for (let k = 0; k < 240; k++) {
    const x = r.range(0, 500), y = r.range(0, 300), rad = r.range(1, 40);
    const got = new Set(h.query(x, y, rad));
    for (const o of items) if (circleRect(x, y, rad, o)) assert(got.has(o), 'hash missed an overlapping object');
  }
});
test('lights: buffer reuses its array and objects across frames', () => {
  const b = new LightBuffer();
  b.begin(); b.pushMood(10, 20, 100, 0.62, 'violet', 1); b.pushHex(5, 5, 50, 1.2, '#ff2e88');
  const list = b.list, o0 = b.list[0], o1 = b.list[1];
  b.begin(); b.pushMood(10, 20, 100, 0.62, 'violet', 1.2); b.pushHex(5, 5, 50, 1.2, '#ff2e88');
  assert.equal(b.list, list, 'list array reused');
  assert.equal(b.list[0], o0, 'mood light object reused');
  assert.equal(b.list[1], o1, 'hex light object reused');
  assert(b.list[0].color[0] >= 0 && b.list[0].color[0] <= 1);
});
test('spatial: level blocked matches brute force on every mission', () => {
  const r = new Rng(11);
  for (const m of MISSIONS) {
    const L = new Level(m), bs = L.blockers();
    for (let i = 0; i < 400; i++) {
      const x = r.range(0, L.w), y = r.range(0, L.h), rad = r.range(8, 16);
      const oob = (x - rad < 0 || y - rad < 0 || x + rad > L.w || y + rad > L.h);
      const brute = oob || bs.some(o => circleRect(x, y, rad, o));
      assert.equal(L.blocked(x, y, rad), brute, `${m.id} @ ${x | 0},${y | 0}`);
    }
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
test('level: bulletHit picks the nearest prop, not array order', () => {
  const def = {
    id: 't', name: 'T', sub: 'x', entryLabel: 'X', entryKind: 'door', mood: 'violet', w: 400, h: 200,
    spawn: { x: 20, y: 20 }, exit: { x: 20, y: 20 }, goal: { type: 'eliminate' },
    walls: [], doors: [], lights: [], pickups: [], enemies: [],
    props: [{ x: 180, y: 80, w: 24, h: 24, type: 'barrel', solid: true, hp: 1 },
            { x: 80, y: 80, w: 12, h: 24, type: 'glass', solid: false, hp: 1 }]
  };
  const L = new Level(def);
  const hit = L.bulletHit(0, 92, 400, 92);
  assert.equal(hit.type, 'glass', `nearest prop should win, got ${hit && hit.type}`);
});

// --------------------------------------------------------------- player
test('player: starts armed with the pistol', () => {
  const p = new Player(0, 0);
  assert.equal(p.current.id, 'pistol'); assert.equal(p.current.kind, 'gun');
  assert.equal(p.hp, 5); assert.equal(p.maxHp, 5); assert.equal(p.magOf(p.current), p.current.mag);
});
test('player: gun mods stack', () => {
  const p = new Player(0, 0);
  const base = p.magOf(p.current);
  UPGRADES.find(u => u.id === 'power').apply(p);
  UPGRADES.find(u => u.id === 'extmag').apply(p);
  UPGRADES.find(u => u.id === 'pierce').apply(p);
  assert(p.damageMul > 1); assert.equal(p.magOf(p.current), base + 3); assert.equal(p.pierce, 1);
});
function stubGame(player, left = false) {
  return { input: { down: () => false, tap: () => false, mouse: { x: 0, y: 0, left, right: false, leftPressed: false, rightPressed: false } }, screenToWorld: (x, y) => ({ x, y }), level: { moveCircle() {}, blocked: () => false }, fx: { blood() {}, ghost() {} }, emitNoise() {}, audio: { play() {} }, interact() {}, fireWeapon() {}, meleeAttack() {}, throwWeapon() {}, shake() {}, player, renderer: null };
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
  p.damage(1, g, 0); assert.equal(p.hp, 4); assert(p.invuln > 0);
  p.damage(1, g, 0); assert.equal(p.hp, 4, 'invulnerable while i-frames active');
  p.invuln = 0; p.damage(5, g, 0);
  assert.equal(p.dead, true); assert.equal(died, true);
});
test('player: firing builds bloom/recoil, recoil climbs the aim, and both recover', () => {
  const p = new Player(0, 0); const g = stubGame(p);
  p.shoot(g);
  assert(p.bloom > 0, 'firing should build bloom');
  assert(Number.isFinite(p.recoil), 'recoil should stay finite');
  const bloom = p.bloom, shots = p.current.ammo;
  assert.equal(shots, 8, 'a shot should consume one round');
  for (let i = 0; i < 60; i++) p.update(0.016, g);
  assert(p.bloom < bloom, 'bloom should recover when not firing');
});
test('player: holding attack auto-fires a gun and auto-reloads an empty mag', () => {
  const p = new Player(0, 0); const g = stubGame(p, true);
  const startAmmo = p.current.ammo;
  for (let i = 0; i < 60; i++) p.update(1 / 60, g);
  assert(p.current.ammo < startAmmo, 'held fire should consume ammo');
  assert(p.current.ammo > 0, 'should not have emptied in one second');
  p.current.ammo = 0; p.current.reserve = 18; p.attackCd = 0; p.reloadT = 0;
  p.update(1 / 60, g);
  assert(p.reloadT > 0, 'an empty gun must auto-reload on held fire when reserve remains');
  g.input.mouse.left = false;
  for (let i = 0; i < 120; i++) p.update(1 / 60, g);
  assert.equal(p.current.ammo, p.magOf(p.current), 'auto-reload should refill the magazine');
});
test('player: holding attack swings a melee weapon repeatedly', () => {
  const p = new Player(0, 0); const g = stubGame(p, true);
  p.current = makeWeapon('baton');
  const before = p.meleeSwings;
  for (let i = 0; i < 90; i++) p.update(1 / 60, g);
  assert(p.meleeSwings - before > 1, `held melee should swing repeatedly (${p.meleeSwings - before})`);
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
import { CHARACTERS, facingView, poseJoints, drawCharacter } from '../src/render/character.js';
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
test('character: facingView mirrors without inverting', () => {
  for (let a = -Math.PI; a < Math.PI; a += 0.15) {
    const v = facingView(a);
    assert(['side', 'front', 'back'].includes(v.view));
    assert(v.dir === 1 || v.dir === -1);
    assert(Math.abs(v.localAim) <= Math.PI / 2 + 1e-6, `localAim ${v.localAim} at ${a}`);
  }
  assert.equal(facingView(0).flip, false); assert.equal(facingView(Math.PI).flip, true);
});
test('character: every archetype has build, palette and gear', () => {
  for (const id of ['moth0', 'guard', 'brawler', 'shotgunner', 'hunter', 'elite', 'porter']) {
    const c = CHARACTERS[id]; assert(c, id);
    for (const k of ['shirt', 'pants', 'skin', 'accent']) assert(typeof c.palette[k] === 'string', `${id}.${k}`);
    assert(c.build.bulk >= 0 && c.build.height > 0);
  }
});
test('character: poses are distinct and finite', () => {
  const P = ['idle', 'walk', 'run', 'aim', 'melee', 'reload', 'hurt', 'stunned', 'dead'];
  const sig = p => JSON.stringify(poseJoints(p, 0.3, 'side', CHARACTERS.guard.build));
  assert.equal(new Set(P.map(sig)).size, P.length);
  for (const p of P) for (const t of [0, 1, 2, 3]) assert(Number.isFinite(poseJoints(p, t, 'side', CHARACTERS.guard.build).chest));
});
test('character: draws and returns finite world sockets for every facing and archetype', () => {
  for (const id of ['moth0', 'guard', 'brawler', 'shotgunner', 'hunter', 'elite', 'porter']) {
    for (let a = -Math.PI; a < Math.PI; a += 0.5) {
      const ctx = recordingCtx();
      const r = drawCharacter(ctx, { x: 10, y: 20, archetype: id, pose: 'aim', phase: 1, facing: a, weapon: makeWeapon('pistol') });
      for (const k of ['hand', 'offhand', 'head', 'muzzle']) assert(Number.isFinite(r[k].x) && Number.isFinite(r[k].y), `${id} ${k} @ ${a}`);
      assert(ctx.calls.length > 0, id);
    }
  }
});
test('character: the coat and mask options change the drawing work', () => {
  const plain = recordingCtx(); drawCharacter(plain, { archetype: 'guard', facing: 0 });
  const coat = recordingCtx(); drawCharacter(coat, { archetype: 'elite', facing: 0 });
  const dead = recordingCtx(); drawCharacter(dead, { archetype: 'guard', facing: 0, pose: 'dead', deathT: 1 });
  assert(coat.calls.length > plain.calls.length, 'a geared archetype should add drawing work');
  assert(dead.calls.length > 0);
});
test('character: lower HP draws more damage wear', () => {
  const full = recordingCtx(); drawCharacter(full, { archetype: 'guard', facing: 0, hpFrac: 1 });
  const hurt = recordingCtx(); drawCharacter(hurt, { archetype: 'guard', facing: 0, hpFrac: 0.1 });
  assert(hurt.calls.length > full.calls.length, 'blood wear should add drawing work');
});

test('art: weapon silhouettes are distinct per type', () => {
  const counts = new Set();
  for (const id of ['fists', 'baton', 'cleaver', 'bottle', 'pistol', 'suppressed', 'shotgun', 'smg', 'revolver']) {
    const ctx = recordingCtx(); drawWeaponArt(ctx, makeWeapon(id), 1); counts.add(ctx.calls.length);
  }
  assert(counts.size >= 5, `weapons should not share silhouettes (distinct call counts: ${counts.size})`);
});
test('fx: transient arrays stay bounded under sustained heavy use', () => {
  const fx = new FX();
  for (let i = 0; i < 3000; i++) {
    fx.burst(0, 0, 10, '#ff2e88');
    fx.blood(0, 0, 12, 0);
    fx.gib(0, 0, 0, 12);
    fx.pool(0, 0, 3);
    fx.casing(0, 0, 0);
    fx.smoke(0, 0, 0);
    fx.flash(0, 0, 10);
    fx.ring(0, 0);
    fx.ghost(0, 0, 0);
    fx.limb(0, 0, 0);
  }
  assert(fx.p.length <= 900, `p ${fx.p.length}`);
  assert(fx.decals.length <= 420, `decals ${fx.decals.length}`);
  assert(fx.casings.length <= 140, `casings ${fx.casings.length}`);
  assert(fx.limbs.length <= 90, `limbs ${fx.limbs.length}`);
  assert(fx.rings.length <= 40, `rings ${fx.rings.length}`);
  assert(fx.corpses.length <= 60, `corpses ${fx.corpses.length}`);
  assert(fx.flashes.length <= 90, `flashes ${fx.flashes.length}`);
  assert(fx.after.length <= 60, `after ${fx.after.length}`);
  fx.update(0.016);
  for (const l of fx.limbs) assert(Number.isFinite(l.x) && Number.isFinite(l.y));
  for (const d of fx.decals) assert(Number.isFinite(d.r));
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
test('fx: dismemberment gore adds limbs/arterial and respects the toggle', () => {
  const fx = new FX(); fx.arterial(0, 0, 0); fx.limb(0, 0, 0, 'arm'); fx.headPop(0, 0, 0);
  assert(fx.limbs.length > 0 && fx.p.length > 0 && fx.decals.length > 0, 'gore should be emitted');
  const off = new FX(); off.bloodEnabled = false; off.arterial(0, 0, 0); off.limb(0, 0, 0); off.headPop(0, 0, 0);
  assert.equal(off.limbs.length, 0); assert.equal(off.p.length, 0); assert.equal(off.decals.length, 0);
});
test('fx: limbs settle into painted decals', () => {
  const fx = new FX(); fx.limb(0, 0, 0, 'head'); fx.update(5);
  assert.equal(fx.limbs.length, 0, 'limbs should expire');
  assert(fx.decals.length > 0, 'settled limbs should leave a decal');
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

// --------------------------------------------------- strict invariants
test('weapons: makeWeapon deep-copies the definition table', () => {
  const w = makeWeapon('pistol');
  w.damage = 999; w.ammo = 0; w.reserve = 0;
  const w2 = makeWeapon('pistol');
  assert.equal(WEAPONS.pistol.damage, 1, 'the data table was mutated by a runtime weapon');
  assert.equal(w2.damage, 1);
  assert.equal(w2.ammo, WEAPONS.pistol.mag);
});
test('weapons: numeric invariants for every entry', () => {
  for (const [id, w] of Object.entries(WEAPONS)) {
    assert(Number.isFinite(w.damage) && w.damage > 0, `${id} damage`);
    assert(Number.isFinite(w.rate) && w.rate > 0, `${id} rate`);
    assert(Number.isFinite(w.noise) && w.noise >= 0, `${id} noise`);
    assert(Number.isFinite(w.range) && w.range > 0, `${id} range`);
    assert(Number.isFinite(w.knock), `${id} knock`);
    if (w.kind === 'gun') {
      assert(w.mag > 0 && w.reload > 0 && w.spread >= 0, `${id} gun fields`);
      assert(Number.isFinite(w.recoil) && w.recoil >= 0, `${id} recoil`);
      assert(Number.isFinite(w.kick) && w.kick >= 0, `${id} kick`);
      assert(Number.isFinite(w.bloom) && w.bloom >= 0 && w.bloomMax >= w.bloom, `${id} bloom`);
      assert(Number.isFinite(w.flash) && w.flash > 0, `${id} flash`);
      assert(Number.isFinite(w.pen) && w.pen >= 0, `${id} penetration`);
    } else assert(w.arc > 0, `${id} melee arc`);
  }
});
test('missions: pickups reference real weapons', () => {
  for (const m of MISSIONS) for (const p of m.pickups) assert(WEAPONS[p.weapon], `${m.id} unknown pickup weapon ${p.weapon}`);
});
test('missions: goals are valid and self-consistent', () => {
  for (const m of MISSIONS) {
    assert(['eliminate', 'retrieve', 'target', 'boss'].includes(m.goal.type), `${m.id} goal type`);
    if (m.goal.type === 'retrieve' || m.goal.type === 'target') assert(m.goal.x != null && m.goal.y != null, `${m.id} goal coords`);
    if (m.goal.type === 'boss') assert(m.boss && m.boss.x != null, `${m.id} boss def`);
    if (m.boss) assert.equal(m.goal.type, 'boss', `${m.id} has a boss but not a boss goal`);
  }
});
test('missions: doors stay in bounds and never overlap walls', () => {
  for (const m of MISSIONS) {
    for (const d of m.doors) {
      assert(d.x >= 0 && d.y >= 0 && d.x + d.w <= m.w && d.y + d.h <= m.h, `${m.id} door out of bounds`);
      for (const w of m.walls) {
        const overlap = d.x < w.x + w.w && d.x + d.w > w.x && d.y < w.y + w.h && d.y + d.h > w.y;
        assert(!overlap, `${m.id} door ${d.x},${d.y} overlaps wall ${w.x},${w.y}`);
      }
    }
  }
});
test('missions: opening any door leaves its cell traversable', () => {
  for (const m of MISSIONS) {
    const L = new Level(m);
    for (const d of L.doors) {
      L.openDoor(d, false);
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
      assert(!L.blocked(cx, cy, 5), `${m.id} door ${d.x},${d.y} is still blocked after opening`);
    }
  }
});
test('player: fields read and written by update start finite', () => {
  const p = new Player(0, 0);
  for (const k of ['x', 'y', 'r', 'a', 'hp', 'maxHp', 'moveSpeed', 'dashCooldown', 'dashTimer', 'dashCd', 'invuln', 'attackCd', 'reloadT', 'reloadMul', 'spreadMul', 'meleeMul', 'noiseMul', 'damageMul', 'rateMul', 'magBonus', 'pierce', 'comboBonus', 'breachBonus', 'detectionMul', 'thrownBonus', 'hitFlash', 'stepT', 'animT', 'vx', 'vy']) {
    assert(Number.isFinite(p[k]), `player.${k} is not a finite number`);
  }
  assert(p.current && typeof p.current.id === 'string');
});
test('enemy: fields read and written by update start finite', () => {
  for (const t of ['guard', 'brawler', 'shotgunner', 'hunter', 'elite']) {
    const e = new Enemy(0, 0, t, []);
    for (const k of ['x', 'y', 'r', 'a', 'hp', 'maxHp', 'speed', 'fov', 'vision', 'hear', 'reaction', 'animT', 'stun', 'seenT', 'alertT', 'searchT', 'strafe', 'attackCd']) {
      assert(Number.isFinite(e[k]), `${t}.${k} not finite`);
    }
  }
});
test('boss: phase is monotonic with damage and never skips', () => {
  const b = new Boss(0, 0); b.stun = 1;
  const seen = new Set();
  for (let i = 0; i < 40 && !b.dead; i++) { const before = b.phase; b.damage(1, bossG, 0); seen.add(b.phase); assert(b.phase >= before, 'phase went backwards'); }
  assert(seen.has(1) && seen.has(2) && seen.has(3), `phase progression incomplete: ${[...seen]}`);
});

// --------------------------------------------------------------- report
if (failures.length) {
  console.log(`unit: ${passed} passed, ${failures.length} FAILED`);
  for (const f of failures) console.log('  x', f);
  process.exit(1);
}
console.log(`VEIL//DRIVE unit checks passed (${passed} tests).`);
