import test from "node:test";
import assert from "node:assert/strict";
import { createGame, update, chooseUpgrade } from "./public/game.mjs";
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  WIDTH,
  HEIGHT,
  getCamera,
  screenToWorld,
} from "./public/world.mjs";

test("map is four times the original area and camera follows without leaving it", () => {
  assert.equal(WORLD_WIDTH * WORLD_HEIGHT, 960 * 560 * 4);
  assert.deepEqual(getCamera({ x: 960, y: 560 }), { x: 480, y: 280 });
  assert.deepEqual(getCamera({ x: 0, y: 0 }), { x: 0, y: 0 });
  assert.deepEqual(getCamera({ x: WORLD_WIDTH, y: WORLD_HEIGHT }), {
    x: WORLD_WIDTH - WIDTH,
    y: WORLD_HEIGHT - HEIGHT,
  });
});
test("screen aim transforms correctly after scrolling and at map edges", () => {
  for (const player of [
    { x: 960, y: 560 },
    { x: 1450, y: 820 },
    { x: 30, y: 55 },
  ]) {
    const camera = getCamera(player),
      point = { x: player.x - camera.x + 100, y: player.y - camera.y };
    const target = screenToWorld(point, player);
    assert.equal(target.x, player.x + 100);
    assert.equal(target.y, player.y);
    const g = createGame();
    update(g, { skipIntro: true }, 0);
    g.player = { ...player, angle: 0 };
    g.warnings = [];
    update(
      g,
      {
        shoot: true,
        aimAngle: Math.atan2(target.y - player.y, target.x - player.x),
      },
      0.01,
    );
    assert.ok(g.patches[0].vx > 0);
    assert.equal(g.patches[0].vy, 0);
  }
});
test("warnings spawn near the current view and safely away from cornered players", () => {
  for (const player of [
    { x: 960, y: 560 },
    { x: 30, y: 55 },
    { x: 1890, y: 1080 },
    { x: 1650, y: 160 },
  ]) {
    const g = createGame(() => 0.5);
    update(g, { skipIntro: true }, 0);
    Object.assign(g.player, player);
    g.warnings = [];
    g.spawnClock = 0;
    update(g, {}, 0.01);
    assert.ok(g.warnings.length > 0);
    const camera = getCamera(player);
    for (const w of g.warnings) {
      assert.ok(w.x >= camera.x && w.x <= camera.x + WIDTH);
      assert.ok(w.y >= camera.y && w.y <= camera.y + HEIGHT);
      assert.ok(Math.hypot(w.x - player.x, w.y - player.y) >= 170);
    }
  }
});
test("coffee stays reachable in the current view when exploring distant map areas", () => {
  const g = createGame(() => 0.9);
  update(g, { skipIntro: true }, 0);
  Object.assign(g.player, { x: 1700, y: 950 });
  g.coffeeAt = 0;
  update(g, {}, 0.01);
  const c = g.coffees[0],
    camera = getCamera(g.player);
  assert.ok(c.x > camera.x && c.x < camera.x + WIDTH);
  assert.ok(c.y > camera.y && c.y < camera.y + HEIGHT);
});
test("later phases keep the explored position instead of teleporting to the old arena", () => {
  const g = createGame(() => 0.5);
  update(g, { skipIntro: true }, 0);
  g.player.x = 1600;
  g.player.y = 900;
  g.phaseTime = 14.99;
  update(g, {}, 0.02);
  assert.equal(g.status, "intermission");
  update(g, {}, 2.7);
  assert.equal(g.status, "upgrade");
  chooseUpgrade(g, g.choices[0]);
  assert.equal(g.wave, 2);
  assert.equal(g.player.x, 1600);
  assert.equal(g.player.y, 900);
});
