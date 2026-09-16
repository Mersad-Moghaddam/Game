import assert from 'node:assert/strict';
import { Level } from '../src/world/Level.js';
import { WEAPONS, makeWeapon } from '../src/combat/weapons.js';
import { MASKS, UPGRADES, COLORS } from '../src/data/config.js';
import { MOODS, MOOD_IDS, moodColor } from '../src/render/mood.js';
import { MISSIONS, MISSION_COUNT } from '../src/data/missions.js';
import { FX } from '../src/systems/FX.js';
import { Player } from '../src/entities/Player.js';
import { Enemy } from '../src/entities/Enemy.js';
import { Boss } from '../src/entities/Boss.js';

const level = new Level();
assert.equal(level.w, 1800);
assert.equal(level.h, 1100);
assert.equal(typeof level.bake, 'function', 'Level.bake missing');
assert.equal(typeof level.findOpen, 'function', 'Level.findOpen missing');
assert.equal(typeof level.drawItems, 'function', 'Level.drawItems missing');
assert.equal(level.dirty, false, 'level starts clean');
level.markDirty();
assert.equal(level.dirty, true, 'markDirty sets dirty');
assert.equal(typeof level.zoneAt, 'function', 'Level.zoneAt missing');
assert.equal(['sunset', 'violet', 'toxic', 'blood'].includes(level.zoneAt(400, 300)), true, 'zoneAt returns a mood');
assert.equal(level.zoneAt(100, 100), level.mood, 'zoneAt returns the mission mood');
assert(level.doors.length >= 8, 'expected multiple tactical doors');
assert.equal(new Set(level.doors.map(d => `${d.x}:${d.y}:${d.w}:${d.h}`)).size, level.doors.length, 'duplicate doors');
assert.equal(level.blocked(340, 465, 10), false, 'front breach gap should be traversable');
assert.equal(level.blocked(340, 540, 10), true, 'outer wall should block below breach gap');
for (const door of level.doors) {
  const cx = door.x + door.w / 2, cy = door.y + door.h / 2;
  assert(level.blocked(cx, cy, 5), `closed door should block at ${door.x},${door.y}`);
  level.openDoor(door, false);
  assert(!level.blocked(cx, cy, 5), `open doorway should be traversable at ${door.x},${door.y}`);
}
for (const [id, data] of Object.entries(WEAPONS)) {
  const w = makeWeapon(id);
  assert.equal(w.id, id);
  if (data.kind === 'gun') assert(w.reserve > 0 && w.ammo === w.mag, `${id} ammo initialization`);
}
assert(MASKS.length >= 4);
assert(UPGRADES.length >= 8);
assert.deepEqual(Object.keys(MOODS).sort(), ['blood', 'sunset', 'toxic', 'violet']);
assert.deepEqual([...MOOD_IDS].sort(), ['blood', 'sunset', 'toxic', 'violet']);
for (const id of Object.keys(MOODS)) {
  for (const key of ['ground', 'ground2', 'wall', 'wallHi', 'glow', 'accent']) {
    assert(/^#[0-9a-f]{6}$/i.test(moodColor(id, key, 0.5)), `bad mood color ${id}.${key}`);
  }
}
assert.equal(moodColor('sunset', 'glow', 0), moodColor('sunset', 'glow', 0), 'mood color must be deterministic');
assert.notEqual(moodColor('sunset', 'glow', 0), moodColor('sunset', 'glow', 1), 'pulse must brighten');
for (const key of ['void', 'ground', 'ground2', 'wall', 'wallHi', 'hotPink', 'magenta', 'cyan', 'blue', 'violet', 'orange', 'lime', 'bone', 'ink', 'blood', 'bloodDark']) {
  assert(COLORS[key] && /^#[0-9a-f]{6}$/i.test(COLORS[key]), `missing palette key ${key}`);
}

// Gore painting must survive the decal/corpse caps (the cap shifts the array,
// so an index cursor would silently stop painting new decals).
const fx = new FX();
while (fx.decals.length < 260) fx.decals.push({ x: 0, y: 0, r: 5, a: 0.5, painted: false });
fx.markAllPainted();
assert.equal(fx.unpaintedCount(), 0, 'markAllPainted clears pending gore');
fx.pool(0, 0, 1);
assert(fx.unpaintedCount() > 0, 'new gore after the cap must remain paintable');
for (let i = 0; i < 500; i++) fx.pool(i % 100, i % 100, 3);
assert.equal(fx.decals.length, 260, 'decal cap enforced');
assert(fx.unpaintedCount() > 0, 'gore remains paintable after heavy use');
for (let i = 0; i < 100; i++) fx.addCorpse(i, 0, 0);
assert.equal(fx.corpses.length, 40, 'corpse cap enforced');
fx.markAllPainted();
assert.equal(fx.unpaintedCount(), 0, 'markAllPainted clears pending corpses too');
assert.equal(fx.blood({ x: 0, y: 0 }) === undefined, true, 'blood() must not throw');

// Brutal tuning (original-HM pace) and the mission campaign.
const hero = new Player(0, 0);
assert.equal(hero.hp, 3, 'player starts with 3 HP');
assert.equal(hero.maxHp, 3, 'player max HP is 3');
assert(hero.moveSpeed >= 260, 'player moves fast');
assert.equal(makeWeapon('pistol').reserve, makeWeapon('pistol').mag * 2, 'reserve ammo x2');
const guard = new Enemy(0, 0, 'guard', []);
assert.equal(guard.hp, 1, 'grunts die in one hit');
assert(guard.reaction <= 0.35, 'enemies react fast');
assert(guard.speed >= 115, 'enemies move fast');
assert.equal(new Enemy(0, 0, 'elite', []).hp, 2, 'elites take two hits');
assert.equal(new Boss(0, 0).maxHp, 16, 'boss HP');

// MOTH-0 starts armed and can upgrade firearms through the campaign.
assert.equal(hero.current.id, 'pistol', 'player starts with the pistol');
assert.equal(hero.current.kind, 'gun', 'starting weapon is a gun');
assert.equal(hero.magOf(hero.current), hero.current.mag, 'base magazine matches');
assert.equal(hero.damageMul, 1, 'base gun damage multiplier');
for (const id of ['power', 'trigger', 'extmag', 'pierce']) assert(UPGRADES.some(u => u.id === id), `${id} gun mod exists`);
const baseMag = hero.magOf(hero.current);
UPGRADES.find(u => u.id === 'power').apply(hero);
assert(hero.damageMul > 1, 'HOT LOAD raises gun damage');
UPGRADES.find(u => u.id === 'extmag').apply(hero);
assert.equal(hero.magOf(hero.current), baseMag + 3, 'EXTENDED MAG adds 3 rounds');
UPGRADES.find(u => u.id === 'pierce').apply(hero);
assert.equal(hero.pierce, 1, 'ARMOR PIERCING adds a pierce');

const fakeCtx = { save(){}, restore(){}, fillRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, fill(){}, arc(){}, ellipse(){}, strokeRect(){}, setLineDash(){}, fillText(){}, translate(){}, rotate(){}, clearRect(){}, globalAlpha: 1, globalCompositeOperation: '' };
assert(MISSION_COUNT >= 5, 'at least 5 missions in the campaign');
assert.equal(MISSIONS.length, MISSION_COUNT);
for (const m of MISSIONS) {
  assert(typeof m.id === 'string' && typeof m.name === 'string' && typeof m.sub === 'string', `${m.id} metadata`);
  assert(m.w > 400 && m.h > 400, `${m.id} size`);
  assert(m.spawn && m.exit && m.goal && m.goal.type, `${m.id} spawn/exit/goal`);
  assert(['sunset', 'violet', 'toxic', 'blood'].includes(m.mood), `${m.id} mood`);
  assert(Array.isArray(m.walls) && m.walls.length > 3, `${m.id} walls`);
  assert(m.enemies.length >= 4, `${m.id} enemies`);
  for (const w of m.walls) assert(w.x >= 0 && w.y >= 0 && w.x + w.w <= m.w && w.y + w.h <= m.h, `${m.id} wall in bounds`);
  for (const p of m.props) assert(p.x >= 0 && p.y >= 0 && p.x + p.w <= m.w && p.y + p.h <= m.h, `${m.id} prop in bounds`);
  const built = new Level(m);
  assert.equal(built.w, m.w);
  assert.equal(built.exit.x, m.exit.x);
  built.bake(fakeCtx);
}
for (const t of ['eliminate', 'retrieve', 'target', 'boss']) {
  assert(MISSIONS.some(m => m.goal.type === t), `campaign has a ${t} mission`);
}
assert.equal(MISSIONS[0].id, 'motel', 'the original motel map is mission 1');
assert(MISSIONS[0].w === 1800 && MISSIONS[0].h === 1100, 'mission 1 keeps the room-to-room map');
console.log('VEIL//DRIVE smoke checks passed.');
