# Three-Phase NG+ Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand VEIL//DRIVE from a five-mission campaign into three phases of five unique missions each (15 total), with continuous New Game+ progression, new objective types, per-phase difficulty, and full test coverage.

**Architecture:** `src/data/missions.js` becomes the single source of truth for phases and all 15 missions. A pure `core/goals.js` decides goal completion for all seven objective types. `Level` generalizes its single objective into an `objectives[]` array. `RunState`/`Game` add a `phase` state and NG+ transitions; `Hud` renders phase-aware labels, objective UI and the phase screen. `Difficulty` gains a 15-mission `pressure` curve and a pure `phaseDifficulty`.

**Tech Stack:** Vanilla ES modules (no bundler), Canvas 2D / Three.js for rendering, Node's built-in test runner for units, Playwright for headless scenarios.

**Spec:** `veildrive/docs/superpowers/specs/2026-09-19-three-phase-ngplus-campaign-design.md`

## Global Constraints

- Work in the `veildrive/` project directory; all paths below are relative to it.
- No new masks, weapons or upgrades; no new mood ids; do not change the crisp 960×540 default, `PIXEL`, or base movement speeds (player ~270, guard 120, brawler 155, shotgunner 112, hunter 145, elite 160, boss ~88).
- Determinism: all randomness goes through the seeded `rng` (`src/core/rng.js`). No `Math.random()` in `src/`.
- Correctness gates after every task: `node scripts/unit-test.mjs` (or `npm test`) must pass; `node --check <changed file>` must pass for each changed `.js`. `npm run test:scenario` and `npm run verify` may be skipped only if Playwright/Chromium is unavailable (the scripts self-skip).
- Do not commit unless the owner explicitly asks.

---

### Task 1: Phase data model and the ten new missions

**Files:**
- Modify: `src/data/missions.js`
- Test: `scripts/unit-test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `MISSIONS` (flat array of 15, index order = campaign order), `MISSION_COUNT` (15), `PHASES` (array of 3 `{ id, name, tag, sub, difficulty:{reaction,detect,score}, missions:[5] }`), `PHASE_COUNT` (3), `MISSIONS_PER_PHASE` (5), `phaseOfMission(i) -> 0|1|2`, `phaseStart(p) -> 0|5|10`.

- [ ] **Step 1: Write the failing phase-structure tests**

In `scripts/unit-test.mjs`, change the missions import on line 13 to:

```js
import { MISSIONS, MISSION_COUNT, PHASES, PHASE_COUNT, MISSIONS_PER_PHASE, phaseOfMission, phaseStart } from '../src/data/missions.js';
```

Append these tests just before the `// --------------------------------------------------------------- report` comment at the end of the file:

```js
// --------------------------------------------------------------- phases
test('phases: three phases of five unique missions', () => {
  assert.equal(PHASE_COUNT, 3);
  assert.equal(MISSIONS_PER_PHASE, 5);
  assert.equal(PHASES.length, 3);
  for (const p of PHASES) assert.equal(p.missions.length, MISSIONS_PER_PHASE, `${p.id} mission count`);
  assert.equal(MISSIONS.length, 15);
  const ids = MISSIONS.map(m => m.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate mission ids');
  for (let i = 0; i < MISSIONS.length; i++) {
    assert.equal(MISSIONS[i], PHASES[phaseOfMission(i)].missions[i % MISSIONS_PER_PHASE], `phaseOfMission(${i})`);
    assert.equal(phaseStart(phaseOfMission(i)), Math.floor(i / MISSIONS_PER_PHASE) * MISSIONS_PER_PHASE, `phaseStart(${i})`);
  }
  for (const p of PHASES) for (const k of ['reaction', 'detect', 'score']) assert(Number.isFinite(p.difficulty[k]) && p.difficulty[k] > 0, `${p.id}.${k}`);
});
test('phases: goals are valid, varied and self-consistent', () => {
  const types = new Set();
  for (const m of MISSIONS) {
    types.add(m.goal.type);
    assert(['eliminate', 'retrieve', 'target', 'boss', 'collect', 'sabotage', 'survive'].includes(m.goal.type), `${m.id} goal ${m.goal.type}`);
    if (m.goal.type === 'collect') {
      assert(Array.isArray(m.goal.items) && m.goal.items.length >= 2, `${m.id} collect items`);
      for (const it of m.goal.items) assert(Number.isFinite(it.x) && Number.isFinite(it.y) && !!it.label, `${m.id} collect item`);
    }
    if (m.goal.type === 'sabotage') {
      assert(Array.isArray(m.goal.targets) && m.goal.targets.length >= 2, `${m.id} sabotage targets`);
      for (const t of m.goal.targets) assert(Number.isFinite(t.x) && Number.isFinite(t.y) && !!t.label, `${m.id} sabotage target`);
    }
    if (m.goal.type === 'survive') assert(m.goal.duration > 0, `${m.id} survive duration`);
    if (m.reinforce) {
      assert.equal(m.goal.type, 'survive', `${m.id} reinforce only on survive`);
      assert(m.reinforce.every > 0 && m.reinforce.max >= 1, `${m.id} reinforce timing`);
      assert(m.reinforce.types.length >= 1 && m.reinforce.points.length >= 1, `${m.id} reinforce roster/points`);
    }
  }
  for (const t of ['eliminate', 'retrieve', 'target', 'boss', 'collect', 'sabotage', 'survive']) assert(types.has(t), `goal type ${t} unused`);
});
test('phases: new objective and reinforcement positions are open and reachable', () => {
  const bad = [];
  for (const m of MISSIONS) {
    const L = new Level(m);
    const objs = [...(m.goal.items || []), ...(m.goal.targets || [])];
    for (const o of objs) {
      if (L.blocked(o.x, o.y, 14)) bad.push(`${m.id} objective ${o.x},${o.y} blocked`);
      if (!gridReachable(L, m.spawn, o, 8, 13)) bad.push(`${m.id} objective ${o.x},${o.y} unreachable`);
    }
    if (m.reinforce) for (const p of m.reinforce.points) {
      if (L.blocked(p.x, p.y, 12)) bad.push(`${m.id} reinforce ${p.x},${p.y} blocked`);
      if (!gridReachable(L, m.spawn, p, 8, 13)) bad.push(`${m.id} reinforce ${p.x},${p.y} unreachable`);
    }
  }
  assert.equal(bad.length, 0, bad.join(' | '));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node scripts/unit-test.mjs`
Expected: FAIL — `PHASES`, `PHASE_COUNT`, `MISSIONS_PER_PHASE`, `phaseOfMission`, `phaseStart` are not exported (import error), and `MISSIONS.length` is 5 not 15.

- [ ] **Step 3: Restructure `missions.js` into phases and add the ten missions**

In `src/data/missions.js`, change the opening of the existing array (line 13) from:

```js
export const MISSIONS = [
```

to:

```js
const PHASE1_MISSIONS = [
```

Leave the five existing mission definitions unchanged.

Replace the final line `export const MISSION_COUNT = MISSIONS.length;` with the following block (this both closes Phase 1 and defines Phases 2 and 3). The entry-room pattern used by the new floors is the proven one from `penthouse`/`subway`: a 190×160 box at `(ox, oy)` with a 60px breach door on its right wall.

```js
];

// Phase 2 — DEEP COVER. Ten new floors across three phases; each phase is five
// missions with a distinct objective mix. All coordinates obey the structural
// invariants enforced by scripts/unit-test.mjs.
const PHASE2_MISSIONS = [
  {
    id: 'docks',
    name: 'SALT DOCKS',
    sub: 'Dropped at the dock gate. Plant charges on the pumps and winches, then get back out.',
    entryLabel: 'DOCK GATE', entryKind: 'door',
    mood: 'toxic',
    w: 1500, h: 900,
    spawn: { x: 120, y: 450 },
    exit: { x: 120, y: 450 },
    goal: { type: 'sabotage', targets: [{ x: 240, y: 150, label: 'CRANE PUMP' }, { x: 940, y: 800, label: 'FUEL LINE' }, { x: 1380, y: 150, label: 'DOCK WINCH' }] },
    walls: [
      W(0, 0, 1500, 28), W(0, 872, 1500, 28), W(0, 28, 28, 844), W(1472, 28, 28, 844),
      W(40, 370, 190, 24), W(40, 506, 190, 24), W(40, 370, 24, 160), W(206, 370, 24, 60), W(206, 490, 24, 40),
      W(620, 28, 28, 320), W(620, 438, 28, 434), W(1080, 28, 28, 520), W(1080, 638, 28, 234),
      W(458, 700, 200, 28)
    ],
    doors: [D(206, 430, 24, 60)],
    props: [
      P(300, 120, 90, 34, 'sofa'), P(560, 700, 54, 54, 'desk', true, 3), P(880, 110, 80, 28, 'bench'),
      P(1280, 700, 44, 44, 'vending'), P(1350, 200, 24, 24, 'barrel', true, 1), P(500, 420, 24, 24, 'barrel', true, 1),
      P(950, 760, 24, 24, 'barrel', true, 1), P(740, 300, 40, 40, 'cabinet', true, 3), P(1200, 520, 40, 40, 'cabinet', true, 3),
      P(820, 600, 12, 28, 'glass', false, 1)
    ],
    lights: [L(250, 150, 170), L(600, 300, 170), L(900, 400, 170), L(1250, 250, 170), L(1250, 700, 170), L(120, 450, 150)],
    pickups: [{ x: 300, y: 700, weapon: 'pistol' }, { x: 700, y: 100, weapon: 'shotgun' }, { x: 980, y: 780, weapon: 'baton' }, { x: 1400, y: 600, weapon: 'smg' }, { x: 420, y: 140, weapon: 'cleaver' }, { x: 860, y: 520, weapon: 'suppressed' }],
    enemies: [
      E(320, 650, 'guard', [{ x: 280, y: 600 }, { x: 380, y: 700 }]),
      E(340, 200, 'brawler', [{ x: 300, y: 160 }, { x: 400, y: 260 }]),
      E(560, 300, 'hunter', [{ x: 520, y: 250 }, { x: 610, y: 360 }]),
      E(660, 780, 'shotgunner', [{ x: 620, y: 720 }, { x: 720, y: 820 }]),
      E(880, 260, 'guard', [{ x: 840, y: 220 }, { x: 940, y: 320 }]),
      E(940, 650, 'elite', [{ x: 900, y: 600 }, { x: 1000, y: 720 }]),
      E(1000, 420, 'brawler', [{ x: 960, y: 380 }, { x: 1060, y: 460 }]),
      E(1240, 300, 'hunter', [{ x: 1180, y: 260 }, { x: 1320, y: 360 }]),
      E(1260, 640, 'guard', [{ x: 1200, y: 600 }, { x: 1330, y: 720 }]),
      E(1420, 460, 'shotgunner', [{ x: 1380, y: 400 }, { x: 1460, y: 520 }]),
      E(220, 700, 'brawler', [{ x: 180, y: 650 }, { x: 280, y: 760 }]),
      E(760, 500, 'guard', [{ x: 700, y: 460 }, { x: 820, y: 560 }])
    ]
  },
  {
    id: 'arcade',
    name: 'THE ARCADE',
    sub: 'Token booth to the back room. The floor is thick with elites \u2014 clear it.',
    entryLabel: 'TOKEN BOOTH', entryKind: 'door',
    mood: 'sunset',
    w: 1300, h: 760,
    spawn: { x: 120, y: 380 },
    exit: { x: 120, y: 380 },
    goal: { type: 'eliminate' },
    walls: [
      W(0, 0, 1300, 28), W(0, 732, 1300, 28), W(0, 28, 28, 704), W(1272, 28, 28, 704),
      W(40, 300, 190, 24), W(40, 436, 190, 24), W(40, 300, 24, 160), W(206, 300, 24, 60), W(206, 420, 24, 40),
      W(500, 28, 28, 250), W(500, 368, 28, 364), W(900, 28, 28, 420), W(900, 538, 28, 194)
    ],
    doors: [D(206, 360, 24, 60)],
    props: [
      P(300, 120, 90, 34, 'sofa'), P(700, 120, 44, 44, 'vending'), P(1100, 600, 44, 44, 'vending'),
      P(600, 600, 54, 54, 'desk', true, 3), P(1000, 300, 24, 24, 'barrel', true, 1), P(350, 600, 24, 24, 'barrel', true, 1),
      P(820, 400, 12, 28, 'glass', false, 1)
    ],
    lights: [L(200, 380, 140), L(600, 250, 170), L(1000, 250, 170), L(600, 600, 170), L(1000, 600, 170), L(1200, 380, 160)],
    pickups: [{ x: 320, y: 650, weapon: 'pistol' }, { x: 620, y: 100, weapon: 'shotgun' }, { x: 1000, y: 700, weapon: 'smg' }, { x: 1150, y: 120, weapon: 'cleaver' }, { x: 760, y: 300, weapon: 'baton' }, { x: 1180, y: 400, weapon: 'revolver' }],
    enemies: [
      E(300, 250, 'elite', [{ x: 260, y: 200 }, { x: 360, y: 320 }]),
      E(400, 600, 'guard', [{ x: 360, y: 560 }, { x: 460, y: 660 }]),
      E(600, 250, 'brawler', [{ x: 560, y: 200 }, { x: 660, y: 320 }]),
      E(700, 600, 'shotgunner', [{ x: 660, y: 560 }, { x: 760, y: 660 }]),
      E(800, 250, 'hunter', [{ x: 760, y: 200 }, { x: 860, y: 320 }]),
      E(1000, 250, 'elite', [{ x: 960, y: 200 }, { x: 1060, y: 320 }]),
      E(1050, 600, 'elite', [{ x: 1000, y: 560 }, { x: 1140, y: 660 }]),
      E(1200, 300, 'hunter', [{ x: 1160, y: 260 }, { x: 1260, y: 360 }]),
      E(1200, 650, 'guard', [{ x: 1150, y: 600 }, { x: 1270, y: 720 }]),
      E(300, 450, 'shotgunner', [{ x: 260, y: 420 }, { x: 360, y: 500 }])
    ]
  },
  {
    id: 'impound',
    name: 'IMPOUND',
    sub: 'Locked in the office. Hold the lot until the crew stops coming.',
    entryLabel: 'IMPOUND GATE', entryKind: 'door',
    mood: 'blood',
    w: 1400, h: 900,
    spawn: { x: 120, y: 450 },
    exit: { x: 120, y: 450 },
    goal: { type: 'survive', duration: 40 },
    reinforce: { every: 7, max: 12, types: ['guard', 'brawler', 'hunter'], points: [{ x: 1250, y: 150 }, { x: 1300, y: 750 }, { x: 700, y: 80 }, { x: 500, y: 820 }] },
    walls: [
      W(0, 0, 1400, 28), W(0, 872, 1400, 28), W(0, 28, 28, 844), W(1372, 28, 28, 844),
      W(40, 370, 190, 24), W(40, 506, 190, 24), W(40, 370, 24, 160), W(206, 370, 24, 60), W(206, 490, 24, 40),
      W(560, 28, 28, 300), W(560, 418, 28, 454), W(980, 28, 28, 500), W(980, 618, 28, 254)
    ],
    doors: [D(206, 430, 24, 60)],
    props: [
      P(300, 120, 118, 48, 'car', true, 4), P(820, 120, 118, 48, 'car', true, 4), P(300, 700, 118, 48, 'car', true, 4),
      P(820, 700, 118, 48, 'car', true, 4), P(1300, 400, 24, 24, 'barrel', true, 1), P(650, 450, 24, 24, 'barrel', true, 1),
      P(760, 150, 44, 44, 'vending'), P(760, 700, 44, 44, 'vending')
    ],
    lights: [L(120, 450, 140), L(400, 250, 170), L(800, 450, 180), L(1200, 250, 170), L(1200, 700, 170), L(700, 780, 160)],
    pickups: [{ x: 200, y: 120, weapon: 'pistol' }, { x: 1200, y: 120, weapon: 'shotgun' }, { x: 200, y: 750, weapon: 'smg' }, { x: 1300, y: 800, weapon: 'baton' }, { x: 500, y: 450, weapon: 'baton' }, { x: 700, y: 300, weapon: 'revolver' }],
    enemies: [
      E(300, 300, 'guard', [{ x: 260, y: 250 }, { x: 360, y: 360 }]),
      E(450, 600, 'brawler', [{ x: 400, y: 550 }, { x: 520, y: 660 }]),
      E(650, 250, 'hunter', [{ x: 600, y: 200 }, { x: 720, y: 320 }]),
      E(700, 600, 'shotgunner', [{ x: 650, y: 550 }, { x: 760, y: 660 }]),
      E(800, 450, 'elite', [{ x: 760, y: 400 }, { x: 860, y: 520 }]),
      E(1100, 250, 'brawler', [{ x: 1050, y: 200 }, { x: 1160, y: 320 }]),
      E(1150, 600, 'guard', [{ x: 1100, y: 550 }, { x: 1220, y: 660 }]),
      E(1300, 250, 'hunter', [{ x: 1250, y: 200 }, { x: 1360, y: 320 }]),
      E(1300, 650, 'shotgunner', [{ x: 1250, y: 600 }, { x: 1370, y: 720 }]),
      E(420, 120, 'guard', [{ x: 380, y: 90 }, { x: 480, y: 160 }])
    ]
  },
  {
    id: 'plaza',
    name: 'PLAZA',
    sub: 'Three tapes are scattered across the concourse. Collect them all and leave.',
    entryLabel: 'PLAZA GATE', entryKind: 'door',
    mood: 'sunset',
    w: 1600, h: 900,
    spawn: { x: 120, y: 450 },
    exit: { x: 120, y: 450 },
    goal: { type: 'collect', items: [{ x: 400, y: 150, label: 'TAPE // A' }, { x: 900, y: 120, label: 'TAPE // B' }, { x: 1350, y: 800, label: 'TAPE // C' }] },
    walls: [
      W(0, 0, 1600, 28), W(0, 872, 1600, 28), W(0, 28, 28, 844), W(1572, 28, 28, 844),
      W(40, 370, 190, 24), W(40, 506, 190, 24), W(40, 370, 24, 160), W(206, 370, 24, 60), W(206, 490, 24, 40),
      W(560, 28, 28, 340), W(560, 458, 28, 414), W(1040, 28, 28, 300), W(1040, 418, 28, 454)
    ],
    doors: [D(206, 430, 24, 60)],
    props: [
      P(300, 120, 90, 34, 'sofa'), P(700, 700, 90, 34, 'sofa'), P(1200, 120, 90, 34, 'sofa'),
      P(1400, 700, 44, 44, 'vending'), P(900, 450, 56, 30, 'table'), P(400, 600, 24, 24, 'barrel', true, 1),
      P(1300, 450, 24, 24, 'barrel', true, 1), P(820, 250, 54, 54, 'desk', true, 3)
    ],
    lights: [L(120, 450, 140), L(500, 250, 170), L(900, 150, 170), L(900, 600, 170), L(1300, 250, 170), L(1400, 700, 160)],
    pickups: [{ x: 300, y: 700, weapon: 'pistol' }, { x: 650, y: 120, weapon: 'shotgun' }, { x: 1150, y: 750, weapon: 'smg' }, { x: 1450, y: 250, weapon: 'cleaver' }, { x: 750, y: 300, weapon: 'baton' }, { x: 1250, y: 600, weapon: 'revolver' }],
    enemies: [
      E(320, 300, 'guard', [{ x: 280, y: 260 }, { x: 380, y: 360 }]),
      E(450, 700, 'brawler', [{ x: 400, y: 650 }, { x: 520, y: 760 }]),
      E(650, 250, 'hunter', [{ x: 600, y: 200 }, { x: 720, y: 320 }]),
      E(700, 550, 'shotgunner', [{ x: 650, y: 500 }, { x: 760, y: 620 }]),
      E(820, 120, 'guard', [{ x: 780, y: 90 }, { x: 900, y: 160 }]),
      E(950, 400, 'elite', [{ x: 900, y: 360 }, { x: 1020, y: 460 }]),
      E(1150, 250, 'brawler', [{ x: 1100, y: 200 }, { x: 1220, y: 320 }]),
      E(1200, 600, 'hunter', [{ x: 1150, y: 550 }, { x: 1300, y: 660 }]),
      E(1350, 300, 'guard', [{ x: 1300, y: 250 }, { x: 1430, y: 360 }]),
      E(1450, 600, 'shotgunner', [{ x: 1400, y: 550 }, { x: 1520, y: 660 }]),
      E(600, 450, 'brawler', [{ x: 550, y: 420 }, { x: 680, y: 500 }])
    ]
  },
  {
    id: 'porter2',
    name: 'PORTER // REBUILT',
    sub: 'The elevator opens on his new floor. He has been rebuilt. Put him down again.',
    entryLabel: 'ELEVATOR', entryKind: 'elevator',
    mood: 'violet',
    w: 1400, h: 860,
    spawn: { x: 120, y: 430 },
    exit: { x: 120, y: 430 },
    goal: { type: 'boss' },
    boss: { x: 1200, y: 430 },
    walls: [
      W(0, 0, 1400, 28), W(0, 832, 1400, 28), W(0, 28, 28, 804), W(1372, 28, 28, 804),
      W(40, 350, 190, 24), W(40, 486, 190, 24), W(40, 350, 24, 160), W(206, 350, 24, 60), W(206, 470, 24, 40),
      W(560, 28, 28, 300), W(560, 418, 28, 414), W(1000, 28, 28, 360), W(1000, 478, 28, 354)
    ],
    doors: [D(206, 410, 24, 60)],
    props: [
      P(120, 80, 80, 36, 'bed'), P(120, 740, 72, 34, 'desk'), P(300, 300, 60, 30, 'table'),
      P(700, 80, 92, 34, 'sofa'), P(700, 700, 92, 34, 'sofa'), P(1200, 80, 78, 36, 'bed'),
      P(1300, 700, 72, 34, 'desk'), P(900, 650, 44, 58, 'cabinet', true, 3),
      P(1150, 400, 24, 24, 'barrel', true, 1), P(600, 600, 24, 24, 'barrel', true, 1), P(500, 250, 24, 24, 'barrel', true, 1)
    ],
    lights: [L(200, 430, 150), L(400, 250, 170), L(800, 180, 180), L(800, 650, 180), L(1200, 250, 180), L(1200, 650, 180)],
    pickups: [{ x: 300, y: 180, weapon: 'baton' }, { x: 650, y: 120, weapon: 'smg' }, { x: 650, y: 720, weapon: 'shotgun' }, { x: 1280, y: 120, weapon: 'suppressed' }, { x: 700, y: 680, weapon: 'cleaver' }, { x: 520, y: 200, weapon: 'revolver' }],
    enemies: [
      E(600, 200, 'elite', [{ x: 560, y: 180 }, { x: 680, y: 260 }]),
      E(600, 600, 'shotgunner', [{ x: 560, y: 560 }, { x: 680, y: 660 }]),
      E(950, 180, 'brawler', [{ x: 900, y: 150 }, { x: 1050, y: 240 }]),
      E(950, 650, 'hunter', [{ x: 900, y: 600 }, { x: 1050, y: 720 }]),
      E(1200, 400, 'guard', [{ x: 1150, y: 360 }, { x: 1280, y: 440 }]),
      E(330, 250, 'guard', [{ x: 300, y: 220 }, { x: 380, y: 300 }]),
      E(330, 550, 'guard', [{ x: 300, y: 520 }, { x: 380, y: 600 }]),
      E(760, 400, 'elite', [{ x: 720, y: 360 }, { x: 820, y: 460 }])
    ]
  }
];

// Phase 3 — BLACK ICE. The hardest floors; maximum pressure and the final boss.
const PHASE3_MISSIONS = [
  {
    id: 'foundry',
    name: 'FOUNDRY',
    sub: 'Smoke on the foundry floor. Everything down here is hunting you.',
    entryLabel: 'FOUNDRY GATE', entryKind: 'door',
    mood: 'blood',
    w: 1500, h: 1000,
    spawn: { x: 120, y: 500 },
    exit: { x: 120, y: 500 },
    goal: { type: 'eliminate' },
    walls: [
      W(0, 0, 1500, 28), W(0, 972, 1500, 28), W(0, 28, 28, 944), W(1472, 28, 28, 944),
      W(40, 420, 190, 24), W(40, 556, 190, 24), W(40, 420, 24, 160), W(206, 420, 24, 60), W(206, 540, 24, 40),
      W(560, 28, 28, 360), W(560, 478, 28, 494), W(1040, 28, 28, 400), W(1040, 518, 28, 454)
    ],
    doors: [D(206, 480, 24, 60)],
    props: [
      P(300, 150, 90, 34, 'sofa'), P(700, 800, 90, 34, 'sofa'), P(1200, 150, 90, 34, 'sofa'),
      P(900, 500, 56, 30, 'table'), P(400, 700, 24, 24, 'barrel', true, 1), P(1350, 800, 24, 24, 'barrel', true, 1),
      P(700, 300, 40, 40, 'cabinet', true, 3), P(1250, 400, 40, 40, 'cabinet', true, 3), P(950, 800, 80, 28, 'bench')
    ],
    lights: [L(120, 500, 140), L(400, 300, 170), L(800, 180, 180), L(800, 700, 180), L(1250, 300, 180), L(1250, 700, 180)],
    pickups: [{ x: 300, y: 800, weapon: 'pistol' }, { x: 700, y: 120, weapon: 'shotgun' }, { x: 1150, y: 850, weapon: 'smg' }, { x: 1450, y: 300, weapon: 'revolver' }, { x: 800, y: 400, weapon: 'baton' }, { x: 1250, y: 700, weapon: 'cleaver' }],
    enemies: [
      E(320, 300, 'guard', [{ x: 280, y: 250 }, { x: 380, y: 360 }]),
      E(450, 750, 'brawler', [{ x: 400, y: 700 }, { x: 520, y: 820 }]),
      E(650, 250, 'hunter', [{ x: 600, y: 200 }, { x: 720, y: 320 }]),
      E(700, 600, 'shotgunner', [{ x: 650, y: 550 }, { x: 760, y: 660 }]),
      E(820, 150, 'elite', [{ x: 780, y: 120 }, { x: 900, y: 200 }]),
      E(950, 400, 'brawler', [{ x: 900, y: 360 }, { x: 1020, y: 460 }]),
      E(1150, 250, 'guard', [{ x: 1100, y: 200 }, { x: 1220, y: 320 }]),
      E(1200, 650, 'hunter', [{ x: 1150, y: 600 }, { x: 1300, y: 720 }]),
      E(1350, 300, 'elite', [{ x: 1300, y: 250 }, { x: 1430, y: 360 }]),
      E(1400, 650, 'shotgunner', [{ x: 1350, y: 600 }, { x: 1460, y: 720 }]),
      E(600, 450, 'guard', [{ x: 550, y: 420 }, { x: 680, y: 500 }]),
      E(1000, 700, 'elite', [{ x: 950, y: 650 }, { x: 1080, y: 760 }])
    ]
  },
  {
    id: 'vault',
    name: 'THE VAULT',
    sub: 'Four keys, one vault. Collect every key before the door will open.',
    entryLabel: 'VAULT DOOR', entryKind: 'door',
    mood: 'toxic',
    w: 1300, h: 820,
    spawn: { x: 120, y: 410 },
    exit: { x: 120, y: 410 },
    goal: { type: 'collect', items: [{ x: 250, y: 250, label: 'KEY // 01' }, { x: 650, y: 700, label: 'KEY // 02' }, { x: 1050, y: 250, label: 'KEY // 03' }, { x: 1250, y: 700, label: 'KEY // 04' }] },
    walls: [
      W(0, 0, 1300, 28), W(0, 792, 1300, 28), W(0, 28, 28, 764), W(1272, 28, 28, 764),
      W(40, 330, 190, 24), W(40, 466, 190, 24), W(40, 330, 24, 160), W(206, 330, 24, 60), W(206, 450, 24, 40),
      W(500, 28, 28, 280), W(500, 398, 28, 394), W(900, 28, 28, 360), W(900, 478, 28, 314)
    ],
    doors: [D(206, 390, 24, 60)],
    props: [
      P(300, 120, 90, 34, 'sofa'), P(700, 650, 90, 34, 'sofa'), P(1100, 120, 44, 44, 'vending'),
      P(600, 300, 54, 54, 'desk', true, 3), P(1000, 650, 54, 54, 'desk', true, 3), P(400, 650, 24, 24, 'barrel', true, 1),
      P(1200, 400, 24, 24, 'barrel', true, 1), P(820, 450, 12, 28, 'glass', false, 1)
    ],
    lights: [L(120, 410, 150), L(400, 250, 170), L(750, 180, 170), L(750, 600, 170), L(1150, 250, 170), L(1150, 650, 170)],
    pickups: [{ x: 300, y: 650, weapon: 'pistol' }, { x: 620, y: 120, weapon: 'shotgun' }, { x: 1000, y: 120, weapon: 'smg' }, { x: 1150, y: 700, weapon: 'revolver' }, { x: 700, y: 400, weapon: 'baton' }, { x: 380, y: 180, weapon: 'cleaver' }],
    enemies: [
      E(300, 300, 'guard', [{ x: 260, y: 260 }, { x: 360, y: 360 }]),
      E(450, 600, 'brawler', [{ x: 400, y: 550 }, { x: 520, y: 660 }]),
      E(600, 200, 'hunter', [{ x: 560, y: 160 }, { x: 680, y: 260 }]),
      E(700, 500, 'shotgunner', [{ x: 650, y: 460 }, { x: 760, y: 560 }]),
      E(800, 120, 'elite', [{ x: 760, y: 90 }, { x: 880, y: 180 }]),
      E(1000, 300, 'brawler', [{ x: 950, y: 260 }, { x: 1060, y: 360 }]),
      E(1100, 550, 'hunter', [{ x: 1050, y: 500 }, { x: 1180, y: 620 }]),
      E(1200, 250, 'guard', [{ x: 1150, y: 200 }, { x: 1270, y: 320 }]),
      E(350, 450, 'shotgunner', [{ x: 300, y: 420 }, { x: 420, y: 500 }])
    ]
  },
  {
    id: 'antenna',
    name: 'ANTENNA',
    sub: 'Cornered under the antenna. Hold the platform until extraction.',
    entryLabel: 'ANTENNA ACCESS', entryKind: 'stairs',
    mood: 'blood',
    w: 1200, h: 800,
    spawn: { x: 120, y: 400 },
    exit: { x: 120, y: 400 },
    goal: { type: 'survive', duration: 60 },
    reinforce: { every: 6, max: 10, types: ['guard', 'brawler', 'hunter', 'elite'], points: [{ x: 1000, y: 80 }, { x: 1050, y: 720 }, { x: 500, y: 80 }, { x: 700, y: 720 }] },
    walls: [
      W(0, 0, 1200, 28), W(0, 772, 1200, 28), W(0, 28, 28, 744), W(1172, 28, 28, 744),
      W(40, 320, 190, 24), W(40, 456, 190, 24), W(40, 320, 24, 160), W(206, 320, 24, 60), W(206, 440, 24, 40),
      W(460, 28, 28, 260), W(460, 378, 28, 394), W(860, 28, 28, 320), W(860, 438, 28, 334)
    ],
    doors: [D(206, 380, 24, 60)],
    props: [
      P(300, 120, 90, 34, 'sofa'), P(700, 650, 90, 34, 'sofa'), P(1000, 120, 44, 44, 'vending'),
      P(600, 600, 54, 54, 'desk', true, 3), P(350, 650, 24, 24, 'barrel', true, 1), P(1050, 650, 24, 24, 'barrel', true, 1),
      P(700, 300, 24, 24, 'barrel', true, 1), P(950, 400, 12, 28, 'glass', false, 1)
    ],
    lights: [L(120, 400, 140), L(400, 250, 170), L(750, 180, 170), L(750, 600, 170), L(1050, 300, 170), L(1050, 650, 160)],
    pickups: [{ x: 300, y: 650, weapon: 'pistol' }, { x: 620, y: 120, weapon: 'shotgun' }, { x: 1000, y: 700, weapon: 'smg' }, { x: 1100, y: 250, weapon: 'revolver' }, { x: 700, y: 450, weapon: 'baton' }],
    enemies: [
      E(300, 300, 'guard', [{ x: 260, y: 260 }, { x: 360, y: 360 }]),
      E(420, 600, 'brawler', [{ x: 380, y: 550 }, { x: 500, y: 660 }]),
      E(620, 200, 'hunter', [{ x: 580, y: 160 }, { x: 700, y: 260 }]),
      E(700, 500, 'shotgunner', [{ x: 650, y: 460 }, { x: 780, y: 560 }]),
      E(800, 200, 'elite', [{ x: 800, y: 160 }, { x: 920, y: 260 }]),
      E(950, 550, 'brawler', [{ x: 900, y: 500 }, { x: 1060, y: 620 }]),
      E(1100, 400, 'guard', [{ x: 1050, y: 360 }, { x: 1170, y: 460 }]),
      E(350, 450, 'elite', [{ x: 300, y: 420 }, { x: 420, y: 500 }])
    ]
  },
  {
    id: 'skyline',
    name: 'SKYLINE',
    sub: 'On the rooftop relays. Wire all four charges and take the lift out.',
    entryLabel: 'ROOFTOP LIFT', entryKind: 'elevator',
    mood: 'violet',
    w: 1600, h: 800,
    spawn: { x: 120, y: 400 },
    exit: { x: 120, y: 400 },
    goal: { type: 'sabotage', targets: [{ x: 250, y: 200, label: 'RELAY [1]' }, { x: 700, y: 700, label: 'RELAY [2]' }, { x: 1030, y: 150, label: 'RELAY [3]' }, { x: 1480, y: 750, label: 'RELAY [4]' }] },
    walls: [
      W(0, 0, 1600, 28), W(0, 772, 1600, 28), W(0, 28, 28, 744), W(1572, 28, 28, 744),
      W(40, 320, 190, 24), W(40, 456, 190, 24), W(40, 320, 24, 160), W(206, 320, 24, 60), W(206, 440, 24, 40),
      W(600, 28, 28, 300), W(600, 418, 28, 354), W(1100, 28, 28, 260), W(1100, 378, 28, 394)
    ],
    doors: [D(206, 380, 24, 60)],
    props: [
      P(300, 120, 90, 34, 'sofa'), P(800, 650, 90, 34, 'sofa'), P(1300, 120, 90, 34, 'sofa'),
      P(500, 600, 54, 54, 'desk', true, 3), P(1000, 600, 54, 54, 'desk', true, 3), P(1400, 650, 44, 44, 'vending'),
      P(400, 250, 24, 24, 'barrel', true, 1), P(1200, 250, 24, 24, 'barrel', true, 1), P(850, 400, 12, 28, 'glass', false, 1)
    ],
    lights: [L(120, 400, 140), L(500, 150, 170), L(900, 150, 170), L(900, 600, 170), L(1400, 250, 170), L(1400, 650, 160)],
    pickups: [{ x: 300, y: 650, weapon: 'pistol' }, { x: 700, y: 120, weapon: 'shotgun' }, { x: 1150, y: 700, weapon: 'smg' }, { x: 1500, y: 250, weapon: 'revolver' }, { x: 800, y: 300, weapon: 'baton' }, { x: 1350, y: 450, weapon: 'cleaver' }],
    enemies: [
      E(320, 300, 'guard', [{ x: 280, y: 260 }, { x: 380, y: 360 }]),
      E(450, 600, 'brawler', [{ x: 400, y: 550 }, { x: 520, y: 660 }]),
      E(650, 200, 'hunter', [{ x: 600, y: 160 }, { x: 720, y: 260 }]),
      E(700, 500, 'shotgunner', [{ x: 650, y: 460 }, { x: 780, y: 560 }]),
      E(850, 120, 'elite', [{ x: 800, y: 90 }, { x: 920, y: 180 }]),
      E(1000, 400, 'brawler', [{ x: 950, y: 360 }, { x: 1080, y: 460 }]),
      E(1200, 150, 'guard', [{ x: 1150, y: 120 }, { x: 1300, y: 200 }]),
      E(1250, 600, 'hunter', [{ x: 1200, y: 550 }, { x: 1350, y: 660 }]),
      E(1450, 350, 'elite', [{ x: 1400, y: 300 }, { x: 1540, y: 420 }]),
      E(950, 650, 'shotgunner', [{ x: 900, y: 600 }, { x: 1050, y: 720 }])
    ]
  },
  {
    id: 'finale',
    name: 'THE PORTER PROTOCOL',
    sub: 'The last floor. The Porter, his guard, and the end of the file.',
    entryLabel: 'THE PORTER PROTOCOL', entryKind: 'elevator',
    mood: 'violet',
    w: 1400, h: 900,
    spawn: { x: 120, y: 450 },
    exit: { x: 120, y: 450 },
    goal: { type: 'boss' },
    boss: { x: 1150, y: 450 },
    walls: [
      W(0, 0, 1400, 28), W(0, 872, 1400, 28), W(0, 28, 28, 844), W(1372, 28, 28, 844),
      W(40, 370, 190, 24), W(40, 506, 190, 24), W(40, 370, 24, 160), W(206, 370, 24, 60), W(206, 490, 24, 40),
      W(560, 28, 28, 320), W(560, 438, 28, 434), W(1000, 28, 28, 380), W(1000, 498, 28, 374)
    ],
    doors: [D(206, 430, 24, 60)],
    props: [
      P(120, 80, 80, 36, 'bed'), P(300, 300, 60, 30, 'table'), P(700, 80, 92, 34, 'sofa'),
      P(700, 780, 92, 34, 'sofa'), P(1200, 80, 78, 36, 'bed'), P(900, 700, 44, 58, 'cabinet', true, 3),
      P(650, 600, 24, 24, 'barrel', true, 1), P(1150, 400, 24, 24, 'barrel', true, 1), P(500, 250, 24, 24, 'barrel', true, 1)
    ],
    lights: [L(120, 450, 140), L(400, 250, 170), L(800, 180, 180), L(800, 700, 180), L(1250, 250, 180), L(1250, 700, 180)],
    pickups: [{ x: 300, y: 180, weapon: 'baton' }, { x: 650, y: 120, weapon: 'smg' }, { x: 650, y: 750, weapon: 'shotgun' }, { x: 1280, y: 120, weapon: 'suppressed' }, { x: 700, y: 680, weapon: 'cleaver' }, { x: 520, y: 200, weapon: 'revolver' }],
    enemies: [
      E(600, 200, 'elite', [{ x: 560, y: 180 }, { x: 680, y: 260 }]),
      E(600, 600, 'shotgunner', [{ x: 560, y: 560 }, { x: 680, y: 660 }]),
      E(950, 180, 'brawler', [{ x: 900, y: 150 }, { x: 1050, y: 240 }]),
      E(950, 650, 'hunter', [{ x: 900, y: 600 }, { x: 1050, y: 720 }]),
      E(1200, 400, 'guard', [{ x: 1150, y: 360 }, { x: 1280, y: 440 }]),
      E(330, 250, 'guard', [{ x: 300, y: 220 }, { x: 380, y: 300 }]),
      E(330, 550, 'guard', [{ x: 300, y: 520 }, { x: 380, y: 600 }]),
      E(760, 400, 'elite', [{ x: 720, y: 360 }, { x: 820, y: 460 }]),
      E(1150, 700, 'elite', [{ x: 1100, y: 650 }, { x: 1250, y: 760 }])
    ]
  }
];

export const PHASES = [
  { id: 'p1', name: 'MOTEL STATIC', tag: 'PHASE 1', sub: 'Marlow\u2019s incident: five floors from the motel to the Porter.', difficulty: { reaction: 1.00, detect: 1.00, score: 1.00 }, missions: PHASE1_MISSIONS },
  { id: 'p2', name: 'DEEP COVER', tag: 'PHASE 2 // NEW GAME+', sub: 'The signal goes deeper. Harder rooms, same mask.', difficulty: { reaction: 0.88, detect: 1.10, score: 1.25 }, missions: PHASE2_MISSIONS },
  { id: 'p3', name: 'BLACK ICE', tag: 'PHASE 3 // NEW GAME+', sub: 'No backup, no exit. End the Porter protocol.', difficulty: { reaction: 0.78, detect: 1.20, score: 1.60 }, missions: PHASE3_MISSIONS }
];

export const MISSIONS = PHASES.flatMap(p => p.missions);
export const MISSION_COUNT = MISSIONS.length;
export const PHASE_COUNT = PHASES.length;
export const MISSIONS_PER_PHASE = 5;
export const phaseOfMission = i => Math.floor(i / MISSIONS_PER_PHASE);
export const phaseStart = p => p * MISSIONS_PER_PHASE;
```

- [ ] **Step 4: Run the tests and fix any map violations**

Run: `node scripts/unit-test.mjs`
Expected: PASS. If any authored position is flagged by the structural/reachability tests, nudge that coordinate off the offending wall/prop (keep it at least 14px clear of geometry and inside the room) and re-run until green.

- [ ] **Step 5: Syntax-check and commit**

```bash
node --check src/data/missions.js
node scripts/unit-test.mjs
git add src/data/missions.js scripts/unit-test.mjs
git commit -m "feat(campaign): three phases of five missions, new goal data"
```

(Do not commit unless the owner asks; otherwise stop after the green run.)

---

### Task 2: Goal logic and generalized Level objectives

**Files:**
- Create: `src/core/goals.js`
- Modify: `src/world/Level.js`
- Test: `scripts/unit-test.mjs`

**Interfaces:**
- Consumes: `MISSION_COUNT`/mission defs from Task 1.
- Produces: `goalReached(goal, state) -> boolean` where `state = { enemies, boss, target, objectives, missionTime }`. `Level.objectives` is an array of `{ x, y, taken, armed, label }`. `Level.goal` unchanged reference to the def goal.

- [ ] **Step 1: Write the failing tests**

Add to the top imports of `scripts/unit-test.mjs`:

```js
import { goalReached } from '../src/core/goals.js';
```

Append before the report block:

```js
// --------------------------------------------------------------- goals
test('goals: goalReached truth table for all seven types', () => {
  assert.equal(goalReached({ type: 'eliminate' }, { enemies: [{ dead: true }] }), true);
  assert.equal(goalReached({ type: 'eliminate' }, { enemies: [{ dead: false }] }), false);
  assert.equal(goalReached({ type: 'target' }, { target: { dead: true } }), true);
  assert.equal(goalReached({ type: 'target' }, { target: { dead: false } }), false);
  assert.equal(goalReached({ type: 'target' }, { target: null }), false);
  assert.equal(goalReached({ type: 'boss' }, { boss: { dead: true } }), true);
  assert.equal(goalReached({ type: 'boss' }, { boss: null }), false);
  assert.equal(goalReached({ type: 'retrieve' }, { objectives: [{ taken: true }] }), true);
  assert.equal(goalReached({ type: 'retrieve' }, { objectives: [{ taken: false }] }), false);
  assert.equal(goalReached({ type: 'collect' }, { objectives: [{ taken: true }, { taken: false }] }), false);
  assert.equal(goalReached({ type: 'collect' }, { objectives: [{ taken: true }, { taken: true }] }), true);
  assert.equal(goalReached({ type: 'sabotage' }, { objectives: [{ armed: true }, { armed: false }] }), false);
  assert.equal(goalReached({ type: 'sabotage' }, { objectives: [{ armed: true }, { armed: true }] }), true);
  assert.equal(goalReached({ type: 'survive', duration: 10 }, { missionTime: 9.9 }), false);
  assert.equal(goalReached({ type: 'survive', duration: 10 }, { missionTime: 10 }), true);
  assert.equal(goalReached({ type: 'unknown' }, {}), false);
  assert.equal(goalReached(null, {}), false);
});
test('level: objectives are built for retrieve, collect and sabotage', () => {
  const retrieve = new Level({ ...MISSIONS[1] });
  assert.equal(retrieve.objectives.length, 1);
  assert.equal(retrieve.objectives[0].taken, false);
  const collect = MISSIONS.find(m => m.goal.type === 'collect');
  const Lc = new Level(collect);
  assert.equal(Lc.objectives.length, collect.goal.items.length);
  assert(Lc.objectives.every(o => o.taken === false && o.armed === false && typeof o.label === 'string'));
  const sab = MISSIONS.find(m => m.goal.type === 'sabotage');
  const Ls = new Level(sab);
  assert.equal(Ls.objectives.length, sab.goal.targets.length);
  const elim = new Level(MISSIONS[0]);
  assert.equal(elim.objectives.length, 0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node scripts/unit-test.mjs`
Expected: FAIL — `../src/core/goals.js` cannot be resolved, and `Level.objectives` is undefined.

- [ ] **Step 3: Create `src/core/goals.js`**

```js
// Pure goal evaluation for every objective type. Kept free of the Game so it
// is trivially unit-testable and shared by Game.update and World.interact.
export function goalReached(goal, s) {
  if (!goal) return false;
  const objectives = s.objectives || [];
  switch (goal.type) {
    case 'eliminate':
      return objectives.length === 0 && (s.enemies || []).every(e => e.dead) && !(s.boss && !s.boss.dead);
    case 'target':
      return !!s.target && s.target.dead === true;
    case 'boss':
      return !!s.boss && s.boss.dead === true;
    case 'retrieve':
    case 'collect':
      return objectives.length > 0 && objectives.every(o => o.taken === true);
    case 'sabotage':
      return objectives.length > 0 && objectives.every(o => o.armed === true);
    case 'survive':
      return (s.missionTime || 0) >= (goal.duration || 0);
    default:
      return false;
  }
}
```

- [ ] **Step 4: Generalize `Level` objectives**

In `src/world/Level.js`, replace the line that sets `this.objective = null;` and the later `if(this.goal.type === 'retrieve') this.objective = ...;` line. Add `import { goalReached } from '../core/goals.js';` is **not** needed here; only the objective construction changes.

Replace:

```js
    this.objective = null;
```

with:

```js
    this.objectives = [];
```

Replace:

```js
    if(this.goal.type === 'retrieve') this.objective = { x: this.goal.x, y: this.goal.y, taken: false, label: this.goal.label || 'OBJECTIVE' };
```

with:

```js
    if(this.goal.type === 'retrieve') this.objectives.push({ x: this.goal.x, y: this.goal.y, taken: false, armed: false, label: this.goal.label || 'OBJECTIVE' });
    if(this.goal.type === 'collect') for(const it of (this.goal.items || [])) this.objectives.push({ x: it.x, y: it.y, taken: false, armed: false, label: it.label || 'ITEM' });
    if(this.goal.type === 'sabotage') for(const t of (this.goal.targets || [])) this.objectives.push({ x: t.x, y: t.y, taken: false, armed: false, label: t.label || 'CHARGE' });
```

In `drawItems`, replace the single-objective block:

```js
    if(this.objective&&!this.objective.taken){ctx.save();ctx.translate(this.objective.x,this.objective.y);ctx.globalAlpha=.3;ctx.fillStyle=COLORS.orange;ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.rotate(-.35);ctx.fillStyle=COLORS.orange;ctx.fillRect(-11,-7,22,14);ctx.fillStyle=COLORS.ink;ctx.fillRect(-7,-4,5,8);ctx.fillRect(2,-4,5,8);ctx.restore();}
```

with a loop that draws every pending objective, using a charge icon for sabotage:

```js
    const sab = this.goal.type === 'sabotage';
    for(const o of this.objectives){
      const pending = sab ? !o.armed : !o.taken;
      if(!pending) continue;
      ctx.save();ctx.translate(o.x,o.y);ctx.globalAlpha=.3;ctx.fillStyle=COLORS.orange;ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      ctx.rotate(-.35);
      if(sab){ctx.fillStyle=COLORS.orange;ctx.fillRect(-8,-10,16,20);ctx.fillStyle=COLORS.ink;ctx.fillRect(-4,-6,8,12);ctx.fillStyle=COLORS.blood;ctx.beginPath();ctx.arc(0,-14,3,0,Math.PI*2);ctx.fill();}
      else{ctx.fillStyle=COLORS.orange;ctx.fillRect(-11,-7,22,14);ctx.fillStyle=COLORS.ink;ctx.fillRect(-7,-4,5,8);ctx.fillRect(2,-4,5,8);}
      ctx.restore();
    }
```

- [ ] **Step 5: Run the tests**

Run: `node --check src/core/goals.js && node --check src/world/Level.js && node scripts/unit-test.mjs`
Expected: PASS. (`World.js` still references `this.level.objective`; that is fixed in Task 3, and it is not exercised by the unit suite in this step. Do not run the scenario suite until Task 3 lands.)

- [ ] **Step 6: Commit**

```bash
git add src/core/goals.js src/world/Level.js scripts/unit-test.mjs
git commit -m "feat(goals): pure goalReached + generalized Level objectives"
```

---

### Task 3: Collect/sabotage interaction and objective HUD

**Files:**
- Modify: `src/systems/World.js`
- Modify: `src/systems/Hud.js`
- Test: `scripts/unit-test.mjs`

**Interfaces:**
- Consumes: `goalReached` (Task 2), `Level.objectives` (Task 2).
- Produces: `World.interact` takes/arms objectives; `Hud.objectiveText`, `Hud.contextPrompt`, `Hud.drawMarkers` understand collect/sabotage/survive.

- [ ] **Step 1: Write the failing interaction tests**

Add to the top imports of `scripts/unit-test.mjs`:

```js
import { WorldSystem } from '../src/systems/World.js';
```

Append before the report block:

```js
// --------------------------------------------------- world interaction
function interactStub(level, mission) {
  return {
    player: { x: 0, y: 0, dead: false, a: 0 }, enemies: [], goalDone: false,
    level, mission, score: 0, audio: { play() {} }, hitStop() {}, shake() {},
    emitNoise() {}, completeGoal() { this.goalDone = true; },
  };
}
test('world: sabotage arms each charge and completes on the last', () => {
  const def = { id: 't', name: 'T', sub: 'x', entryLabel: 'X', entryKind: 'door', mood: 'violet', w: 400, h: 300,
    spawn: { x: 40, y: 40 }, exit: { x: 40, y: 40 },
    goal: { type: 'sabotage', targets: [{ x: 200, y: 150, label: 'A' }, { x: 300, y: 200, label: 'B' }] },
    walls: [], doors: [], props: [], lights: [], pickups: [], enemies: [] };
  const level = new Level(def), g = interactStub(level, def);
  g.player.x = 200; g.player.y = 150;
  WorldSystem.interact.call(g, false);
  assert.equal(level.objectives[0].armed, true); assert.equal(g.goalDone, false);
  g.player.x = 300; g.player.y = 200;
  WorldSystem.interact.call(g, false);
  assert.equal(level.objectives[1].armed, true); assert.equal(g.goalDone, true);
});
test('world: collect takes each item and completes on the last', () => {
  const def = { id: 't', name: 'T', sub: 'x', entryLabel: 'X', entryKind: 'door', mood: 'violet', w: 400, h: 300,
    spawn: { x: 40, y: 40 }, exit: { x: 40, y: 40 },
    goal: { type: 'collect', items: [{ x: 200, y: 150, label: 'A' }, { x: 300, y: 200, label: 'B' }] },
    walls: [], doors: [], props: [], lights: [], pickups: [], enemies: [] };
  const level = new Level(def), g = interactStub(level, def);
  g.player.x = 200; g.player.y = 150;
  WorldSystem.interact.call(g, false);
  assert.equal(level.objectives[0].taken, true); assert.equal(g.goalDone, false);
  g.player.x = 300; g.player.y = 200;
  WorldSystem.interact.call(g, false);
  assert.equal(level.objectives[1].taken, true); assert.equal(g.goalDone, true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node scripts/unit-test.mjs`
Expected: FAIL — `WorldSystem.interact` does not recognize sabotage/collect (`goalDone` stays false), and `World.js` still reads `this.level.objective`.

- [ ] **Step 3: Update `World.interact`**

In `src/systems/World.js`, add to the imports at the top:

```js
import { goalReached } from '../core/goals.js';
```

Replace the retrieve-only block:

```js
    if (!this.goalDone && this.mission.goal.type === 'retrieve' && this.level.objective && !this.level.objective.taken && dist(this.player, this.level.objective) < 55) {
      this.level.objective.taken = true; this.completeGoal(); return;
    }
```

with:

```js
    if (!this.goalDone && this.mission.goal.type !== 'survive') {
      const sabotage = this.mission.goal.type === 'sabotage';
      let best = null, bd = 55;
      for (const o of this.level.objectives) {
        if (sabotage ? o.armed : o.taken) continue;
        const d = dist(this.player, o); if (d < bd) { best = o; bd = d; }
      }
      if (best) {
        if (sabotage) best.armed = true; else best.taken = true;
        this.audio.play('pickup');
        if (goalReached(this.mission.goal, { enemies: this.enemies, boss: this.boss, target: this.target, objectives: this.level.objectives, missionTime: this.missionTime })) this.completeGoal();
        return;
      }
    }
```

- [ ] **Step 4: Update the HUD objective reads**

In `src/systems/Hud.js`:

Replace `objectiveText()` with:

```js
  objectiveText() {
    if (this.goalDone) return 'REACH THE EXIT';
    if (!this.mission) return '';
    const g = this.mission.goal;
    const total = this.level.objectives.length;
    const taken = this.level.objectives.filter(o => o.taken).length;
    const armed = this.level.objectives.filter(o => o.armed).length;
    if (g.type === 'eliminate') return 'ELIMINATE ALL HOSTILES';
    if (g.type === 'target') return 'KILL THE MARKED MAN';
    if (g.type === 'boss') return 'KILL THE PORTER';
    if (g.type === 'retrieve') return 'TAKE ' + (this.level.objectives[0] ? this.level.objectives[0].label : 'THE OBJECTIVE');
    if (g.type === 'collect') return `TAKE ITEMS ${taken}/${total}`;
    if (g.type === 'sabotage') return `ARM CHARGES ${armed}/${total}`;
    if (g.type === 'survive') return `HOLD OUT ${Math.max(0, Math.ceil((g.duration || 0) - (this.missionTime || 0)))}s`;
    return '';
  },
```

In `contextPrompt()`, replace the retrieve clause:

```js
    if (!this.goalDone && this.mission && this.mission.goal.type === 'retrieve' && this.level.objective && !this.level.objective.taken && dist(this.player, this.level.objective) < 55) return `[E] TAKE ${this.level.objective.label}`;
```

with:

```js
    if (!this.goalDone && this.mission && (this.mission.goal.type === 'retrieve' || this.mission.goal.type === 'collect')) {
      for (const o of this.level.objectives) if (!o.taken && dist(this.player, o) < 55) return `[E] TAKE ${o.label}`;
    }
    if (!this.goalDone && this.mission && this.mission.goal.type === 'sabotage') {
      for (const o of this.level.objectives) if (!o.armed && dist(this.player, o) < 55) return `[E] PLANT ${o.label}`;
    }
```

In `drawMarkers()`, replace:

```js
    const ob = this.level.objective;
    if (!this.goalDone && this.mission && this.mission.goal.type === 'retrieve' && ob && !ob.taken) target = ob;
    else if (!this.goalDone && this.mission && this.mission.goal.type === 'target' && this.target && !this.target.dead) target = this.target;
    else if (this.goalDone && this.level.exit.active) target = this.level.exit;
```

with:

```js
    if (!this.goalDone && this.mission && ['retrieve', 'collect', 'sabotage'].includes(this.mission.goal.type)) {
      const sabotage = this.mission.goal.type === 'sabotage';
      let best = null, bd = Infinity;
      for (const o of this.level.objectives) {
        if (sabotage ? o.armed : o.taken) continue;
        const d = Math.hypot(o.x - this.player.x, o.y - this.player.y); if (d < bd) { bd = d; best = o; }
      }
      target = best;
    } else if (!this.goalDone && this.mission && this.mission.goal.type === 'target' && this.target && !this.target.dead) target = this.target;
    else if (this.goalDone && this.level.exit.active) target = this.level.exit;
```

Also replace the remaining `this.level.objective` read in `renderGL` (`Game.js` line ~102) with an objectives loop:

```js
    for (const ob of this.level.objectives) { if (ob.taken || ob.armed) continue; g.globalAlpha = .6; g.fillStyle = COLORS.orange; g.beginPath(); g.arc(ob.x, ob.y, 16, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
```

- [ ] **Step 5: Run the tests**

Run: `node --check src/systems/World.js && node --check src/systems/Hud.js && node --check src/core/Game.js && node scripts/unit-test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/systems/World.js src/systems/Hud.js src/core/Game.js scripts/unit-test.mjs
git commit -m "feat(objectives): collect/sabotage interaction and phase-ready HUD"
```

---

### Task 4: Phase progression, NG+ transition and difficulty scaling

**Files:**
- Modify: `src/systems/Difficulty.js`
- Modify: `src/core/RunState.js`
- Modify: `src/core/Game.js`
- Modify: `src/core/Save.js`
- Modify: `src/systems/Hud.js`
- Test: `scripts/unit-test.mjs`

**Interfaces:**
- Consumes: `PHASES`, `PHASE_COUNT`, `MISSIONS_PER_PHASE`, `phaseOfMission`, `phaseStart`, `MISSION_COUNT` (Task 1).
- Produces: `phaseDifficulty(phaseIndex)`, updated `pressure`; `RunState.beginNextPhase()`; game state `'phase'`; `Hud.drawPhase(c)`; saved `highestPhase`/`campaignsCleared`.

- [ ] **Step 1: Write the failing tests**

In `scripts/unit-test.mjs`, change the Difficulty import to:

```js
import { pressure, phaseDifficulty } from '../src/systems/Difficulty.js';
```

Append before the report block:

```js
// ----------------------------------------------------------- difficulty
test('difficulty: pressure spans the full 15-mission campaign', () => {
  assert.equal(pressure(0, 10, 10), 0, 'no pressure at the start with everyone alive');
  assert.equal(pressure(MISSION_COUNT - 1, 0, 10), 1, 'full pressure on the final mission with none alive');
  let last = -1;
  for (let m = 0; m < MISSION_COUNT; m++) { const p = pressure(m, 5, 10); assert(p >= 0 && p <= 1); assert(p >= last, 'monotonic in mission index'); last = p; }
  assert.equal(pressure(2, 3, 10), pressure(2, 3, 10));
});
test('difficulty: phaseDifficulty scales reaction down, detect and score up', () => {
  const d1 = phaseDifficulty(0), d2 = phaseDifficulty(1), d3 = phaseDifficulty(2);
  assert(d1.reaction >= d2.reaction && d2.reaction >= d3.reaction, 'reaction should fall per phase');
  assert(d1.detect <= d2.detect && d2.detect <= d3.detect, 'detection should rise per phase');
  assert(d1.score <= d2.score && d2.score <= d3.score, 'score should rise per phase');
  for (const d of [d1, d2, d3]) for (const k of ['reaction', 'detect', 'score']) assert(Number.isFinite(d[k]) && d[k] > 0, k);
  assert.deepEqual(phaseDifficulty(99), d3, 'high clamps to the last phase');
  assert.deepEqual(phaseDifficulty(-4), d1, 'low clamps to the first phase');
});
test('save: phase progress fields are repaired and round-trip', () => {
  memStore['veildrive-save-v1'] = JSON.stringify({ version: 1 });
  const s = loadSave();
  assert.equal(s.highestPhase, 1); assert.equal(s.campaignsCleared, 0);
  storeSave({ ...s, highestPhase: 2, campaignsCleared: 1 });
  const s2 = loadSave();
  assert.equal(s2.highestPhase, 2); assert.equal(s2.campaignsCleared, 1);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node scripts/unit-test.mjs`
Expected: FAIL — `phaseDifficulty` is not exported; `pressure(14,0,10)` is not 1 with the old `/4` divisor; save fields are undefined.

- [ ] **Step 3: Update `Difficulty.js`**

Replace the whole file with:

```js
// Seedable difficulty pressure plus per-phase scaling. Pure functions of run
// progress and difficulty tier, so they stay deterministic and easy to reason
// about and test.
import { PHASES } from '../data/missions.js';

export function pressure(missionIndex, alive, maxAlive) {
  const span = Math.max(1, PHASES.length * 5 - 1);
  const progress = Math.min(1, Math.max(0, missionIndex) / span);
  const attrition = maxAlive > 0 ? 1 - Math.max(0, Math.min(1, alive / maxAlive)) : 0;
  return Math.max(0, Math.min(1, progress * 0.7 + attrition * 0.3));
}

export function phaseDifficulty(phaseIndex) {
  const i = Math.max(0, Math.min(PHASES.length - 1, Math.floor(phaseIndex) || 0));
  const d = PHASES[i].difficulty;
  return { reaction: d.reaction, detect: d.detect, score: d.score };
}
```

- [ ] **Step 4: Update `RunState.js`**

Change the missions import:

```js
import { MISSIONS, PHASES, MISSIONS_PER_PHASE, phaseOfMission, phaseStart } from '../data/missions.js';
```

Add after the other imports:

```js
import { phaseDifficulty } from '../systems/Difficulty.js';
```

In `startRun()`, add phase state to the reset line (immediately after `this.missionIndex = 0;`):

```js
    this.phaseIndex = 0; this.phaseMissionIndex = 0; this.phase = PHASES[0]; this.scoreMul = 1; this.phaseT = 0;
```

In `startMission`, right after `this.missionIndex = i; this.mission = def;`, insert:

```js
    const phase = phaseOfMission(i); this.phaseIndex = phase; this.phase = PHASES[phase]; this.phaseMissionIndex = i - phaseStart(phase); this.scoreMul = PHASES[phase].difficulty.score;
    this.save.highestPhase = Math.max(this.save.highestPhase || 1, phase + 1); storeSave(this.save);
```

Then apply phase scaling where enemies are constructed. Replace:

```js
      const en = new Enemy(p.x, p.y, e.type, wps); this.enemies.push(en);
```

with:

```js
      const en = new Enemy(p.x, p.y, e.type, wps);
      const diff = phaseDifficulty(phase);
      en.reaction = Math.max(0.05, en.reaction * diff.reaction);
      en.vision *= diff.detect;
      this.enemies.push(en);
```

Scale scoring. Replace `completeGoal()` and `missionComplete()` scoring, and `addCombo`:

```js
  completeGoal() { if (this.goalDone) return; this.goalDone = true; this.level.exit.active = true; this.audio.play('pickup'); this.score += Math.round(400 * (this.scoreMul || 1)); },
  missionComplete() { this.missionsCleared++; this.score += Math.round((1000 + Math.max(0, Math.round(2500 - this.missionTime * 15))) * (this.scoreMul || 1)); this.audio.setIntensity(.1); this.state = 'interlude'; this.interludeT = 0; this.hitStop(.04); },
```

and in `addCombo`: `this.score += Math.round(base * (1 + Math.min(3, this.combo * .18)) * (this.scoreMul || 1));`.

Add `beginNextPhase()` next to `showUpgrade()`:

```js
  beginNextPhase() { this.state = 'phase'; this.phaseT = 0; this.audio.setIntensity(.12); this.hitStop(.04); },
```

In `finishCampaign()`, after `this.save.runs++;` add:

```js
    this.save.campaignsCleared = (this.save.campaignsCleared || 0) + 1;
```

(`results.missions = this.missionsCleared` already counts out of `MISSION_COUNT` = 15.)

- [ ] **Step 5: Update `Game.js` flow**

Change the missions import:

```js
import { MISSION_COUNT, MISSIONS_PER_PHASE } from '../data/missions.js';
```

In `update`, add a `'phase'` branch immediately after the `'interlude'` branch:

```js
    if (this.state === 'phase') { this.phaseT = (this.phaseT || 0) + dt; this.fx.update(dt); this.shakeMag *= Math.pow(.025, dt); this.shakeX = rand(-this.shakeMag, this.shakeMag); this.shakeY = rand(-this.shakeMag, this.shakeMag); if (this.phaseT > 2.8) this.showUpgrade(); return; }
```

Replace the interlude advance condition:

```js
if (this.interludeT > 1.6) { if (this.missionIndex >= MISSION_COUNT - 1) this.finishCampaign(); else this.showUpgrade(); }
```

with:

```js
if (this.interludeT > 1.6) { if (this.missionIndex >= MISSION_COUNT - 1) this.finishCampaign(); else if ((this.missionIndex + 1) % MISSIONS_PER_PHASE === 0) this.beginNextPhase(); else this.showUpgrade(); }
```

Replace the inline goal `if` chain in `update`:

```js
    if (!this.goalDone) { const g = this.mission.goal; if (g.type === 'eliminate' && !this.enemies.some(e => !e.dead)) this.completeGoal(); else if (g.type === 'target' && this.target && this.target.dead) this.completeGoal(); else if (g.type === 'boss' && this.boss && this.boss.dead) this.completeGoal(); }
```

with:

```js
    if (!this.goalDone && goalReached(this.mission.goal, { enemies: this.enemies, boss: this.boss, target: this.target, objectives: this.level.objectives, missionTime: this.missionTime })) this.completeGoal();
```

Add `import { goalReached } from './goals.js';` near the top imports.

Add the phase screen to both render paths. In `renderCanvas`, after the `if (this.state === 'upgrade') this.drawUpgrade(c);` clause add `if (this.state === 'phase') this.drawPhase(c);`. In `renderGL`, after `if (this.state === 'upgrade') this.drawUpgrade(ui);` add `if (this.state === 'phase') this.drawPhase(ui);`.

- [ ] **Step 6: Update `Save.js`**

Replace `loadSave` with defaults that include the new fields:

```js
import { SAVE_KEY, DEFAULT_SETTINGS } from '../data/config.js';
export function loadSave(){
  try{ const raw=localStorage.getItem(SAVE_KEY); if(!raw) throw 0; const v=JSON.parse(raw); if(v.version!==1) throw 0; return {...v,selectedMask:v.selectedMask||'MOTH-0',unlockedMasks:v.unlockedMasks||['MOTH-0'],highestPhase:v.highestPhase||1,campaignsCleared:v.campaignsCleared||0,settings:{...DEFAULT_SETTINGS,...v.settings}}; }
  catch{ return {version:1,highScore:0,bestRank:'—',runs:0,unlockedMasks:['MOTH-0'],selectedMask:'MOTH-0',highestPhase:1,campaignsCleared:0,settings:{...DEFAULT_SETTINGS}}; }
}
export function storeSave(s){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(s)); }catch{} }
```

- [ ] **Step 7: Update the phase HUD, intro, interlude, results and menu**

In `src/systems/Hud.js`, update the missions import:

```js
import { MISSIONS, MISSION_COUNT, PHASES, PHASE_COUNT, MISSIONS_PER_PHASE, phaseOfMission } from '../data/missions.js';
```

In `drawHUD`, replace the mission title line:

```js
    if (this.mission) { c.textAlign = 'center'; c.font = 'bold 13px monospace'; c.fillStyle = COLORS.hotPink; c.fillText(`MISSION ${this.missionIndex + 1}/${MISSION_COUNT} — ${this.mission.name}`, 480, 18); c.font = '11px monospace'; c.fillStyle = this.goalDone ? COLORS.cyan : COLORS.orange; c.fillText(this.objectiveText(), 480, 36); if (this.missionTime < 4.5) { c.fillStyle = COLORS.bone; c.fillText(this.mission.sub, 480, 52); } }
```

with:

```js
    if (this.mission) { c.textAlign = 'center'; c.font = 'bold 13px monospace'; c.fillStyle = COLORS.hotPink; c.fillText(`PHASE ${this.phaseIndex + 1}/${PHASE_COUNT} · M${this.phaseMissionIndex + 1}/${MISSIONS_PER_PHASE} — ${this.mission.name}`, 480, 18); c.font = '11px monospace'; c.fillStyle = this.goalDone ? COLORS.cyan : COLORS.orange; c.fillText(this.objectiveText(), 480, 36); if (this.missionTime < 4.5) { c.fillStyle = COLORS.bone; c.fillText(this.mission.sub, 480, 52); } }
```

In `drawIntro`, replace:

```js
c.fillText(`MISSION ${this.missionIndex + 1} / ${MISSION_COUNT}`, 480, 222);
```

with:

```js
c.fillText(`PHASE ${this.phaseIndex + 1} / ${PHASE_COUNT}  ·  MISSION ${this.phaseMissionIndex + 1} / ${MISSIONS_PER_PHASE}`, 480, 222);
```

In `drawInterlude`, replace the NEXT line:

```js
c.fillText(this.missionIndex >= MISSION_COUNT - 1 ? 'FINAL RESULTS…' : `NEXT: ${MISSIONS[this.missionIndex + 1].name}`, 480, 330);
```

with:

```js
const last = this.missionIndex >= MISSION_COUNT - 1;
const boundary = !last && (this.missionIndex + 1) % MISSIONS_PER_PHASE === 0;
c.fillText(last ? 'FINAL RESULTS…' : boundary ? `NEXT PHASE: ${PHASES[phaseOfMission(this.missionIndex + 1)].name}` : `NEXT: ${MISSIONS[this.missionIndex + 1].name}`, 480, 330);
```

Add `drawPhase(c)` as a new system method (place it next to `drawUpgrade`):

```js
  drawPhase(c) {
    const next = PHASES[Math.min(PHASE_COUNT - 1, phaseOfMission(this.missionIndex + 1))];
    c.fillStyle = 'rgba(11,4,22,.8)'; c.fillRect(0, 0, 960, 540);
    c.textAlign = 'center';
    c.fillStyle = COLORS.cyan; c.font = 'bold 13px monospace'; c.fillText('NEW GAME+', 480, 196);
    c.fillStyle = COLORS.hotPink; c.font = 'bold 40px monospace'; c.fillText('PHASE CLEARED', 480, 244);
    c.fillStyle = COLORS.bone; c.font = 'bold 24px monospace'; c.fillText(`PHASE ${next ? phaseOfMission(this.missionIndex + 1) + 1 : 0} — ${next ? next.name : ''}`, 480, 292);
    c.fillStyle = '#c9b7d8'; c.font = '12px monospace'; if (next) this.wrapText(c, next.sub, 480, 320, 540, 16);
    c.fillStyle = COLORS.orange; c.font = 'bold 12px monospace'; if (next) c.fillText(`THREAT x${next.difficulty.score.toFixed(2)} SCORE  ·  REACTION x${next.difficulty.reaction.toFixed(2)}`, 480, 356);
    const t = clamp((this.phaseT || 0) / 2.8, 0, 1);
    c.fillStyle = COLORS.ink; c.fillRect(340, 382, 280, 5);
    c.fillStyle = COLORS.hotPink; c.fillRect(340, 382, 280 * t, 5);
    c.textAlign = 'left';
  },
```

In `drawMenu`, after the best-score line, add a phase-progress line:

```js
  c.fillStyle = '#8f7f9a'; c.font = '11px monospace'; c.fillText(`PHASE PROGRESS ${Math.max(1, this.save.highestPhase || 1)}/${PHASE_COUNT}  ·  CAMPAIGNS ${this.save.campaignsCleared || 0}`, 390, 530);
```

- [ ] **Step 8: Run the tests and syntax checks**

Run: `node --check src/systems/Difficulty.js && node --check src/core/RunState.js && node --check src/core/Game.js && node --check src/core/Save.js && node --check src/systems/Hud.js && node scripts/unit-test.mjs`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/systems/Difficulty.js src/core/RunState.js src/core/Game.js src/core/Save.js src/systems/Hud.js scripts/unit-test.mjs
git commit -m "feat(progression): phase flow, NEW GAME+ screen and per-phase difficulty"
```

---

### Task 5: Survive reinforcements

**Files:**
- Modify: `src/core/Game.js`
- Test: `scripts/scenario-test.mjs`

**Interfaces:**
- Consumes: `def.reinforce` authored in Task 1; `Enemy`; `rng`.
- Produces: deterministic periodic spawns while a survive mission is in a `reinforce`-configured mission.

- [ ] **Step 1: Implement the spawner**

In `src/core/Game.js`, add a field to the constructor initializer (anywhere in the constructor body):

```js
    this._reinforceT = 0; this._reinforceIdx = 0;
```

In `startMission` (RunState.js) reset them when the mission starts. Add after `this.missionTime = 0; ...`:

```js
    this._reinforceT = 0; this._reinforceIdx = 0;
```

Add this method to `Game` (near `update`, or in the RunState-assigned methods; a plain prototype method on the class is fine):

```js
  updateReinforcements(dt) {
    const r = this.mission && this.mission.reinforce; if (!r || this.goalDone) return;
    this._reinforceT += dt;
    if (this._reinforceT < r.every) return;
    this._reinforceT -= r.every;
    const alive = this.enemies.filter(e => !e.dead).length + (this.boss && !this.boss.dead ? 1 : 0);
    if (alive >= r.max) return;
    const p = r.points[this._reinforceIdx % r.points.length]; this._reinforceIdx++;
    const spot = this.level.findOpen(p.x, p.y, 12);
    const type = r.types[rng.int(r.types.length)];
    this.enemies.push(new Enemy(spot.x, spot.y, type, []));
  }
```

Call it from `update` in the playing branch, right after `this.hazards` updates:

```js
    this.updateReinforcements(dt);
```

- [ ] **Step 2: Syntax-check**

Run: `node --check src/core/Game.js && node scripts/unit-test.mjs`
Expected: PASS.

- [ ] **Step 3: Scenario verification is added in Task 6 (the survive check asserts the living count rises).**

- [ ] **Step 4: Commit**

```bash
git add src/core/Game.js src/core/RunState.js
git commit -m "feat(survive): deterministic reinforcement waves"
```

---

### Task 6: Scenario coverage for phases, new goals and the full 15-mission run

**Files:**
- Modify: `scripts/scenario-test.mjs`

**Interfaces:**
- Consumes: everything above.
- Produces: end-to-end assertions; no new production interface.

- [ ] **Step 1: Extend the "holding attack" loop to all 15 missions**

Replace `for (let mi = 0; mi < 5; mi++) {` with `for (let mi = 0; mi < 15; mi++) {` inside the `holdAttack` block. Leave the rest unchanged.

- [ ] **Step 2: Add phase, new-goal and completion checks**

Immediately after the existing boss/results block (after the `ok('campaign: completing the finale shows results', …)` line), insert:

```js
  // --- NG+ phase transition: clearing mission 5 opens the phase screen ---
  await evalG(() => { const g = window.__VEILDRIVE__; g.runSeed = 7; g.startRun(); g.invincible = true; });
  await evalG(() => window.__VEILDRIVE__.startMission(4, true));
  await evalG(() => window.__VEILDRIVE__.completeGoal());
  await evalG(() => { const g = window.__VEILDRIVE__; g.player.x = g.level.exit.x; g.player.y = g.level.exit.y; g.interact(false); });
  const phaseScreen = await waitFor(s => s.state === 'interlude' || s.state === 'phase', 6000);
  const afterPhaseScreen = await waitFor(s => s.state === 'phase', 6000);
  ok('phase: clearing mission 5 enters the NEW GAME+ phase screen', afterPhaseScreen.state === 'phase', JSON.stringify(afterPhaseScreen));
  const phaseInit = await evalG(() => ({ phaseIndex: window.__VEILDRIVE__.phaseIndex, phase: window.__VEILDRIVE__.phase && window.__VEILDRIVE__.phase.id }));
  ok('phase: the run is still phase 1 before the upgrade', phaseInit.phaseIndex === 0 && phaseInit.phase === 'p1', JSON.stringify(phaseInit));
  const upAfterPhase = await waitFor(s => s.state === 'upgrade', 9000);
  ok('phase: the phase screen leads to an upgrade', upAfterPhase.state === 'upgrade', JSON.stringify(upAfterPhase));
  const carriedWeapon = await evalG(() => window.__VEILDRIVE__.player.current.id);
  await page.keyboard.press('Digit1');
  const phase2 = await waitFor(s => s.state === 'playing' && s.mi === 5, 9000);
  ok('phase: the next mission starts in phase 2 (mission 6)', phase2.mi === 5, JSON.stringify(phase2));
  const phaseInfo = await evalG(() => ({ phaseIndex: window.__VEILDRIVE__.phaseIndex, phase: window.__VEILDRIVE__.phase && window.__VEILDRIVE__.phase.id, hp: window.__VEILDRIVE__.player.hp, weapon: window.__VEILDRIVE__.player.current.id }));
  ok('phase: phase 2 is active and the loadout carried over', phaseInfo.phaseIndex === 1 && phaseInfo.phase === 'p2' && phaseInfo.hp === 5 && phaseInfo.weapon === carriedWeapon, JSON.stringify(phaseInfo));

  // --- sabotage: arming every charge completes the goal ---
  const sabotageDone = await evalG(() => {
    const g = window.__VEILDRIVE__;
    g.startMission(5, true);
    const objs = g.level.objectives;
    for (const o of objs) { g.player.x = o.x; g.player.y = o.y; g.interact(false); }
    return { type: g.mission.goal.type, armed: objs.filter(o => o.armed).length, total: objs.length, goalDone: g.goalDone };
  });
  ok('sabotage: arming every charge completes the goal', sabotageDone.type === 'sabotage' && sabotageDone.armed === sabotageDone.total && sabotageDone.goalDone, JSON.stringify(sabotageDone));

  // --- collect: taking every item completes the goal ---
  const collectDone = await evalG(() => {
    const g = window.__VEILDRIVE__;
    g.startMission(8, true);
    const objs = g.level.objectives;
    for (const o of objs) { g.player.x = o.x; g.player.y = o.y; g.interact(false); }
    return { type: g.mission.goal.type, taken: objs.filter(o => o.taken).length, total: objs.length, goalDone: g.goalDone };
  });
  ok('collect: taking every item completes the goal', collectDone.type === 'collect' && collectDone.taken === collectDone.total && collectDone.goalDone, JSON.stringify(collectDone));

  // --- survive: reinforcements appear and the timer completes the goal ---
  const surviveDone = await evalG(() => {
    const g = window.__VEILDRIVE__;
    g.startMission(7, true);
    const start = g.enemies.filter(e => !e.dead).length;
    for (let i = 0; i < 60 * 46; i++) g.step(1 / 60);
    return { type: g.mission.goal.type, start, end: g.enemies.length, goalDone: g.goalDone, time: g.missionTime };
  });
  ok('survive: reinforcements spawn over time', surviveDone.type === 'survive' && surviveDone.end > surviveDone.start, JSON.stringify(surviveDone));
  ok('survive: holding the timer completes the goal', surviveDone.goalDone === true && surviveDone.time >= 40, JSON.stringify(surviveDone));

  // --- the full campaign reports 15 missions ---
  const all15 = await evalG(() => {
    const g = window.__VEILDRIVE__;
    g.startRun();
    for (let i = 0; i < 15; i++) { g.startMission(i, true); g.completeGoal(); g.missionComplete(); }
    g.finishCampaign();
    return { cleared: g.missionsCleared, reported: g.results && g.results.missions, state: g.state };
  });
  ok('campaign: all 15 missions count toward the results', all15.cleared === 15 && all15.reported === 15 && all15.state === 'results', JSON.stringify(all15));
```

- [ ] **Step 3: Run the scenario suite**

Run: `npm run test:scenario`
Expected: all checks pass, or the suite self-skips with "playwright not installed". If Playwright is present and a check fails, fix the production code (not the assertion) and re-run.

- [ ] **Step 4: Run the render probe**

Run: `npm run verify`
Expected: PASS (or self-skip if no Chromium).

- [ ] **Step 5: Commit**

```bash
git add scripts/scenario-test.mjs
git commit -m "test(scenario): phases, new objectives and the 15-mission run"
```

---

### Task 7: Documentation and full verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: user-facing documentation; no code interface.

- [ ] **Step 1: Update the README**

In `veildrive/README.md`:

- Change the "## Campaign" section to describe three phases of five missions (15 total), listing all 15 by name and phase, and the continuous NG+ rule (upgrades/hearts/weapons carry; mission 5→6 and 10→11 show a NEW GAME+ phase screen; clearing 15 shows results out of 15).
- Add the three new objective types (sabotage, collect, survive-with-reinforcements) to the implemented-systems list.
- Update the `src/data/missions.js` architecture line to "the fifteen mission definitions grouped into three phases".
- In the controls/tips area, mention `[E] PLANT` for sabotage and `[E] TAKE` for collect.

- [ ] **Step 2: Run the full verification suite**

Run, and capture the output:

```bash
npm test
npm run test:scenario
npm run verify
```

Expected: `npm test` reports all unit tests passing; `test:scenario` reports all scenario checks passing (or skips cleanly); `verify` passes (or skips). Record the actual output.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document the three-phase NG+ campaign"
```

---

## Self-Review

**Spec coverage:**
- §1 phases/data model → Task 1.
- §2 new goals, Level objectives, interaction, goalReached, survive reinforcements → Tasks 2, 3, 5.
- §3 flow/progression → Task 4 (plus `goalReached` wiring in Task 4 Step 5).
- §4 persistence → Task 4 Step 6.
- §5 difficulty → Task 4 Step 3.
- §6 verification → Tasks 1–6 tests and Task 7 full run.
- §7 invariants → Task 1 tests run existing invariants over all 15.
- §8 files → covered across tasks; README in Task 7.
- §9 success criteria → Tasks 6 + 7 verify.

**Type consistency:** `goalReached(goal, state)` reads `state.objectives` (array of `{taken, armed}`), `state.enemies`, `state.boss`, `state.target`, `state.missionTime`. Because `objectives` lives on `this.level` while the other four live on the Game, both call sites pass an explicit view object; Tasks 3 and 4 already use the corrected form. `phaseDifficulty` is named and shaped identically in `Difficulty.js`, `RunState.js` and the unit tests. `phaseOfMission`, `phaseStart`, `PHASES`, `PHASE_COUNT`, `MISSIONS_PER_PHASE` are spelled identically everywhere.

**Placeholder scan:** No TBD/TODO; every code step carries the actual code.
