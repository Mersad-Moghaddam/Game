import test from "node:test";
import assert from "node:assert/strict";
import { createGame, update } from "./game.mjs";

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
});
const step = (g, seconds, input = {}) => {
  for (let i = 0; i < Math.round(seconds * 100); i++) update(g, input, 0.01);
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
test("phase completion freezes combat for Honarvar then starts next phase", () => {
  const g = active();
  g.phaseTime = 14.99;
  g.time = 14.99;
  update(g, {}, 0.02);
  assert.equal(g.status, "intermission");
  assert.equal(g.wave, 1);
  const time = g.time;
  step(g, 2, { x: 1, shoot: true });
  assert.equal(g.time, time);
  assert.equal(g.hearts, 3);
  step(g, 1.6);
  assert.equal(g.status, "playing");
  assert.equal(g.wave, 2);
  assert.ok(g.phaseTime < 0.3);
});
test("later phases spawn faster bugs, runners and armor at shorter intervals", () => {
  const first = active();
  step(first, 4);
  const later = active();
  later.wave = 4;
  step(later, 4);
  assert.ok(
    later.bugs.length + later.warnings.length >
      first.bugs.length + first.warnings.length,
  );
  assert.ok(later.bugs.some((b) => b.type === "runner"));
  assert.ok(later.bugs.some((b) => b.type === "armor"));
  assert.ok(
    Math.max(...later.bugs.map((b) => b.speed)) >
      Math.max(...first.bugs.map((b) => b.speed)),
  );
});
test("coffee grants five seconds of faster movement and fire", () => {
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
test("final phase plays Honarvar before victory; terminal states freeze", () => {
  const g = active();
  g.wave = 4;
  g.phaseTime = 14.99;
  g.time = 59.99;
  update(g, {}, 0.02);
  assert.equal(g.status, "intermission");
  assert.equal(g.time, 60);
  step(g, 3.6);
  assert.equal(g.status, "won");
  const x = g.player.x;
  update(g, { x: 1 }, 1);
  assert.equal(g.player.x, x);
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
});
