import assert from 'node:assert/strict';
import { Level } from '../src/world/Level.js';
import { WEAPONS, makeWeapon } from '../src/combat/weapons.js';
import { MASKS, UPGRADES } from '../src/data/config.js';

const level = new Level();
assert.equal(level.w, 1800);
assert.equal(level.h, 1100);
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
console.log('VEIL//DRIVE smoke checks passed.');
