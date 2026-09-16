import assert from 'node:assert/strict';
import { Level } from '../src/world/Level.js';
import { WEAPONS, makeWeapon } from '../src/combat/weapons.js';
import { MASKS, UPGRADES, COLORS } from '../src/data/config.js';
import { MOODS, MOOD_IDS, moodColor } from '../src/render/mood.js';

const level = new Level();
assert.equal(level.w, 1800);
assert.equal(level.h, 1100);
assert.equal(typeof level.bake, 'function', 'Level.bake missing');
assert.equal(level.dirty, false, 'level starts clean');
level.markDirty();
assert.equal(level.dirty, true, 'markDirty sets dirty');
assert.equal(typeof level.zoneAt, 'function', 'Level.zoneAt missing');
assert.equal(['sunset', 'violet', 'toxic', 'blood'].includes(level.zoneAt(400, 300)), true, 'zoneAt returns a mood');
assert.equal(level.zoneAt(100, 100), 'sunset', 'exterior is sunset');
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
console.log('VEIL//DRIVE smoke checks passed.');
