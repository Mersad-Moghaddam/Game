// Upgrade catalog and pure helpers. No DOM so the simulation stays testable.
export const UPGRADES = [
  {
    id: "rapid",
    name: "Rapid Patches",
    desc: "Fire 18% faster",
    rarity: "common",
    max: 4,
    icon: "rate",
  },
  {
    id: "heavy",
    name: "Heavy Patch",
    desc: "Patches deal +1 damage",
    rarity: "common",
    max: 3,
    icon: "damage",
  },
  {
    id: "sprint",
    name: "Sprint Boots",
    desc: "Move 15% faster",
    rarity: "common",
    max: 4,
    icon: "speed",
  },
  {
    id: "caffeine",
    name: "Caffeine Tolerance",
    desc: "Coffee lasts +2 seconds",
    rarity: "common",
    max: 3,
    icon: "coffee",
  },
  {
    id: "big",
    name: "Big Patches",
    desc: "Patches are 25% wider",
    rarity: "common",
    max: 3,
    icon: "size",
  },
  {
    id: "magnet",
    name: "Magnet",
    desc: "Pickup range +40%",
    rarity: "common",
    max: 2,
    icon: "magnet",
  },
  {
    id: "heart",
    name: "Extra Heart",
    desc: "+1 max heart, heal one",
    rarity: "rare",
    max: 3,
    icon: "heart",
  },
  {
    id: "pierce",
    name: "Piercing Shot",
    desc: "Patches pierce +1 bug",
    rarity: "rare",
    max: 3,
    icon: "pierce",
  },
  {
    id: "multishot",
    name: "Multishot",
    desc: "+1 patch per shot",
    rarity: "rare",
    max: 3,
    icon: "multi",
  },
  {
    id: "ricochet",
    name: "Ricochet",
    desc: "Patches bounce to a nearby bug",
    rarity: "rare",
    max: 1,
    icon: "ricochet",
  },
  {
    id: "crit",
    name: "Lucky Deployment",
    desc: "+10% chance for double damage",
    rarity: "rare",
    max: 3,
    icon: "crit",
  },
  {
    id: "secondwind",
    name: "Second Wind",
    desc: "Revive once at one heart",
    rarity: "epic",
    max: 1,
    icon: "revive",
  },
];

const RARITY_WEIGHT = { common: 1, rare: 0.55, epic: 0.28 };

export function mods() {
  return {
    fireRate: 1,
    damage: 1,
    speed: 1,
    pierce: 0,
    multishot: 0,
    patchSize: 1,
    magnet: 1,
    crit: 0,
    boostTime: 5,
    maxHearts: 3,
    revives: 0,
    ricochet: false,
  };
}

export function applies(state, id) {
  return (state.upgrades?.[id] || 0) < (UPGRADES.find((u) => u.id === id)?.max || 0);
}

export function applyUpgrade(state, id) {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def || !applies(state, id)) return state;
  state.upgrades ||= {};
  state.upgrades[id] = (state.upgrades[id] || 0) + 1;
  const m = state.mods;
  switch (id) {
    case "rapid":
      m.fireRate *= 0.82;
      break;
    case "heavy":
      m.damage += 1;
      break;
    case "sprint":
      m.speed *= 1.15;
      break;
    case "caffeine":
      m.boostTime += 2;
      break;
    case "big":
      m.patchSize *= 1.25;
      break;
    case "magnet":
      m.magnet += 0.4;
      break;
    case "heart":
      m.maxHearts += 1;
      state.hearts = Math.min((state.hearts || 0) + 1, m.maxHearts);
      break;
    case "pierce":
      m.pierce += 1;
      break;
    case "multishot":
      m.multishot += 1;
      break;
    case "ricochet":
      m.ricochet = true;
      break;
    case "crit":
      m.crit += 0.1;
      break;
    case "secondwind":
      m.revives += 1;
      break;
  }
  return state;
}

export function rollChoices(state, rng = Math.random) {
  const pool = UPGRADES.filter((u) => applies(state, u.id));
  const candidates = pool.slice();
  const choices = [];
  while (choices.length < 3 && candidates.length) {
    const total = candidates.reduce(
      (sum, c) => sum + (RARITY_WEIGHT[c.rarity] || 1),
      0,
    );
    let r = rng() * total,
      pick = candidates[candidates.length - 1];
    for (const c of candidates) {
      r -= RARITY_WEIGHT[c.rarity] || 1;
      if (r <= 0) {
        pick = c;
        break;
      }
    }
    choices.push(pick.id);
    candidates.splice(candidates.indexOf(pick), 1);
  }
  return choices;
}
