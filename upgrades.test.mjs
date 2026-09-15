import test from "node:test";
import assert from "node:assert/strict";
import { UPGRADES, mods, applyUpgrade, rollChoices, applies } from "./public/upgrades.mjs";

const state = () => ({ upgrades: {}, mods: mods(), hearts: 3 });

test("roll returns three unique ids", () => {
  const s = state();
  for (let seed = 0; seed < 20; seed++) {
    const rng = ((n) => () => ((n = (n * 9301 + 49297) % 233280) / 233280))(
      seed + 1,
    );
    const choices = rollChoices(s, rng);
    assert.equal(choices.length, 3);
    assert.equal(new Set(choices).size, 3);
    for (const id of choices) assert.ok(UPGRADES.some((u) => u.id === id));
  }
});

test("applyUpgrade updates mods and stacks", () => {
  const s = state();
  applyUpgrade(s, "rapid");
  assert.ok(s.mods.fireRate < 1);
  assert.equal(s.upgrades.rapid, 1);
  const before = s.mods.fireRate;
  applyUpgrade(s, "rapid");
  assert.ok(s.mods.fireRate < before);
});

test("stack caps hold and one-shots disappear", () => {
  const s = state();
  for (let i = 0; i < 5; i++) applyUpgrade(s, "secondwind");
  assert.equal(s.upgrades.secondwind, 1);
  assert.equal(s.mods.revives, 1);
  assert.equal(applies(s, "secondwind"), false);

  const capped = state();
  for (let i = 0; i < 10; i++) applyUpgrade(capped, "heavy");
  assert.equal(capped.upgrades.heavy, 3);
  assert.equal(capped.mods.damage, 4);
});

test("extra heart raises max hearts and heals", () => {
  const s = state();
  s.hearts = 1;
  applyUpgrade(s, "heart");
  assert.equal(s.mods.maxHearts, 4);
  assert.equal(s.hearts, 2);
  s.hearts = 4;
  applyUpgrade(s, "heart");
  assert.equal(s.mods.maxHearts, 5);
  assert.equal(s.hearts, 5);
});

test("crit, magnet and ricochet accumulate", () => {
  const s = state();
  applyUpgrade(s, "crit");
  applyUpgrade(s, "crit");
  assert.ok(Math.abs(s.mods.crit - 0.2) < 1e-9);
  applyUpgrade(s, "magnet");
  assert.ok(Math.abs(s.mods.magnet - 1.4) < 1e-9);
  applyUpgrade(s, "ricochet");
  assert.equal(s.mods.ricochet, true);
});
