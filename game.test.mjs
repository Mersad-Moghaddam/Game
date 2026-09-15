import test from "node:test";
import assert from "node:assert/strict";
import { createGame, update, chooseUpgrade } from "./public/game.mjs";

const active = () => {
  const g = createGame(() => 0.5);
  update(g, { skipIntro: true }, 0);
  g.warnings = [];
  g.immune = 0;
  return g;
};
const bug = (x, y, hp = 1) => ({
  x,
  y,
  hp,
  maxHp: hp,
  r: 18,
  speed: 0,
  type: hp > 1 ? "armor" : "crawler",
  age: 0,
  flash: 0,
  cool: 0,
});
const step = (g, seconds, input = {}) => {
  for (let i = 0; i < Math.round(seconds * 100); i++) update(g, input, 0.01);
};
const toUpgrade = (g) => {
  g.phaseTime = 14.99;
  g.time = (g.wave - 1) * 15 + 14.99;
  update(g, {}, 0.02);
  step(g, 2.7);
};
const toBoss = (g) => {
  for (let i = 0; i < 3; i++) {
    toUpgrade(g);
    chooseUpgrade(g, g.choices[0]);
  }
};

test("intro freezes combat until skipped or finished", () => {
  const g = createGame();
  assert.equal(g.status, "intro");
  update(g, { shoot: true, x: 1 }, 2);
  assert.equal(g.time, 0);
  assert.equal(g.player.x, 960);
  assert.equal(g.patches.length, 0);
  update(g, { skipIntro: true }, 0);
  assert.equal(g.status, "playing");
  assert.ok(g.warnings.length > 0);
  const h = createGame();
  step(h, 9.1);
  assert.equal(h.status, "playing");
});
test("movement remains normalized and bounded", () => {
  const g = active(),
    p = { ...g.player };
  update(g, { x: 1, y: 1 }, 0.1);
  assert.ok(
    Math.abs(Math.hypot(g.player.x - p.x, g.player.y - p.y) - 24) < 0.01,
  );
  step(g, 5, { x: 1, y: 1 });
  assert.ok(g.player.x > 960 && g.player.y > 560);
  assert.ok(g.player.x <= 1890 && g.player.y <= 1080);
});
test("manual aim does not lock on to a nearby bug", () => {
  const g = active();
  g.bugs = [bug(g.player.x + 70, g.player.y)];
  step(g, 0.5, { shoot: true, aimAngle: -Math.PI / 2 });
  assert.equal(g.score, 0);
  assert.equal(g.bugs.length, 1);
  step(g, 0.5, { shoot: true, aimAngle: 0 });
  assert.equal(g.score, 100);
  assert.equal(g.kills, 1);
});
test("armor requires three separate patch hits", () => {
  const g = active();
  g.bugs = [bug(g.player.x + 80, g.player.y, 3)];
  update(g, { shoot: true, aimAngle: 0 }, 0.01);
  step(g, 0.2);
  assert.equal(g.bugs[0].hp, 2);
  assert.equal(g.score, 0);
  step(g, 0.2);
  update(g, { shoot: true, aimAngle: 0 }, 0.01);
  step(g, 0.2);
  assert.equal(g.bugs[0].hp, 1);
  step(g, 0.2);
  update(g, { shoot: true, aimAngle: 0 }, 0.01);
  step(g, 0.2);
  assert.equal(g.bugs.length, 0);
  assert.equal(g.score, 250);
});
test("shots have limited range and cannot be spammed every frame", () => {
  const g = active();
  step(g, 0.1, { shoot: true, aimAngle: 0 });
  assert.equal(g.patches.length, 1);
  step(g, 1);
  assert.equal(g.patches.length, 0);
});
test("continuous reinforcements are warned before entering", () => {
  const g = active();
  step(g, 2);
  assert.ok(g.warnings.length > 0 || g.bugs.length > 0);
  const h = createGame(() => 0.5);
  update(h, { skipIntro: true }, 0);
  assert.equal(h.bugs.length, 0);
  step(h, 0.8);
  assert.ok(h.bugs.length > 0);
});
test("phase completion roasts with Hollis, then waits for an upgrade pick", () => {
  const g = active();
  toUpgrade(g);
  assert.equal(g.status, "upgrade");
  assert.equal(g.wave, 1);
  assert.equal(g.choices.length, 3);
  const clock = g.clock;
  step(g, 2, { x: 1, shoot: true });
  assert.equal(g.clock, clock);
  assert.equal(g.hearts, 3);
  chooseUpgrade(g, g.choices[0]);
  assert.equal(g.status, "playing");
  assert.equal(g.wave, 2);
  assert.ok(g.phaseTime < 0.3);
});
test("upgrade choices apply and the boss arrives in phase four", () => {
  const g = active();
  toUpgrade(g);
  chooseUpgrade(g, "rapid");
  assert.equal(g.upgrades.rapid, 1);
  assert.ok(g.mods.fireRate < 1);
  assert.equal(g.wave, 2);

  toUpgrade(g);
  chooseUpgrade(g, "heavy");
  assert.equal(g.wave, 3);

  toUpgrade(g);
  assert.equal(g.status, "upgrade");
  chooseUpgrade(g, g.choices[0]);
  assert.equal(g.wave, 4);
  assert.ok(g.boss, "boss spawns in phase four");
  assert.ok(g.boss.hp > 0);
  assert.equal(g.phaseTime, 0);
});
test("spitters fire a projectile and splitters split in two", () => {
  const g = active();
  g.wave = 2;
  g.bugs = [
    {
      x: g.player.x + 140,
      y: g.player.y,
      type: "spitter",
      hp: 2,
      maxHp: 2,
      r: 18,
      speed: 0,
      age: 0,
      flash: 0,
      cool: 0,
    },
  ];
  step(g, 0.1);
  assert.ok(g.enemyShots.length > 0, "spitter fires");

  const h = active();
  h.bugs = [
    {
      x: h.player.x + 80,
      y: h.player.y,
      type: "splitter",
      hp: 1,
      maxHp: 2,
      r: 19,
      speed: 0,
      age: 0,
      flash: 0,
      cool: 0,
    },
  ];
  update(h, { shoot: true, aimAngle: 0 }, 0.01);
  step(h, 0.3);
  assert.equal(h.kills, 1);
  assert.equal(h.bugs.length, 2, "splitter becomes two crawlers");
  assert.ok(h.bugs.every((b) => b.type === "crawler"));
});
test("boss takes damage and dying wins the run", () => {
  const g = active();
  toBoss(g);
  assert.equal(g.wave, 4);
  assert.ok(g.boss);
  g.boss.hp = 1;
  g.patches = [
    {
      x: g.boss.x - 40,
      y: g.boss.y,
      vx: 440,
      vy: 0,
      life: 1,
      pierce: 0,
      hits: [],
    },
  ];
  update(g, {}, 0.02);
  assert.ok(g.boss.hp <= 0);
  update(g, {}, 0.01);
  assert.equal(g.status, "won");
  const x = g.player.x;
  update(g, { x: 1 }, 1);
  assert.equal(g.player.x, x);
});
test("later phases spawn faster varied bugs at shorter intervals", () => {
  const first = active();
  step(first, 4);
  const later = active();
  later.wave = 3;
  step(later, 4);
  assert.ok(
    later.bugs.length + later.warnings.length >=
      first.bugs.length + first.warnings.length,
  );
  assert.ok(later.bugs.some((b) => b.type === "runner"));
  assert.ok(later.bugs.some((b) => b.type === "armor" || b.type === "splitter"));
  assert.ok(
    Math.max(...later.bugs.map((b) => b.speed)) >
      Math.max(...first.bugs.map((b) => b.speed)),
  );
});
test("coffee grants a timed speed and fire boost", () => {
  const g = active();
  g.coffees = [{ ...g.player }];
  update(g, {}, 0.01);
  assert.equal(g.boost, 5);
  const x = g.player.x;
  update(g, { x: 1, shoot: true, aimAngle: 0 }, 0.1);
  assert.ok(g.player.x - x > 24);
  assert.ok(g.cooldown < 0.25);
  assert.equal(g.coffees.length, 0);
});
test("overlapping bugs cost only one heart during immunity", () => {
  const g = active();
  g.bugs = Array.from({ length: 3 }, () => bug(g.player.x, g.player.y));
  update(g, {}, 0.01);
  assert.equal(g.hearts, 2);
  update(g, {}, 0.01);
  assert.equal(g.hearts, 2);
});
test("second wind revives once before defeat", () => {
  const g = active();
  g.mods.revives = 1;
  g.hearts = 1;
  g.bugs = [bug(g.player.x, g.player.y)];
  update(g, {}, 0.01);
  assert.equal(g.status, "playing");
  assert.equal(g.hearts, 1);
  assert.equal(g.mods.revives, 0);
  g.immune = 0;
  update(g, {}, 0.01);
  assert.equal(g.status, "lost");
});
test("death ends the run and a fresh game resets all phases", () => {
  const g = active();
  g.hearts = 1;
  g.bugs = [bug(g.player.x, g.player.y)];
  update(g, {}, 0.01);
  assert.equal(g.status, "lost");
  const h = createGame();
  assert.equal(h.status, "intro");
  assert.equal(h.wave, 1);
  assert.equal(h.hearts, 3);
  assert.equal(h.score, 0);
  assert.equal(h.boss, null);
  assert.deepEqual(h.upgrades, {});
});
