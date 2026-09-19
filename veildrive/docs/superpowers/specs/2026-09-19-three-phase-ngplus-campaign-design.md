# VEIL//DRIVE — Three-Phase NG+ Campaign

Approved design for expanding the five-mission campaign into **three phases of
five missions each (15 unique missions)** with continuous New Game+ progression,
new objective types, per-phase difficulty scaling, and strict verification.

## Owner decisions (confirmed)

- **15 unique missions.** Phases 2 and 3 are ten brand-new original floors, not
  remixes of Phase 1.
- **Continuous NG+ run.** Weapons, hearts and upgrades carry across all 15
  missions in one run. Clearing the last mission of a phase shows a NEW GAME+
  phase transition, then the normal upgrade choice, then the next phase begins.
  Death still rewinds only the current mission.
- **New objective types** for real variety, in addition to the existing four.
- **"Strict review" means rigorous verification:** extend the unit and scenario
  suites to cover phases, NG+ transitions and every new goal type, run all test
  commands, and report evidence before claiming completion.

## Non-goals

- No new masks, weapons or upgrades.
- No multiplayer, no mobile/touch controls.
- No bundler, no CDN, no external art/audio assets. Keep the vendored Three.js
  and the procedural-art strategy.
- Do not change the crisp 960×540 default resolution, the four mood ids, or the
  baseline movement tuning (player/enemy/boss speeds).

## 1. Data model — `src/data/missions.js`

Restructure the flat five-mission array into phases while preserving a flat
`MISSIONS` export so every existing consumer (and test) that iterates missions
keeps working.

```js
export const MISSIONS_PER_PHASE = 5;

export const PHASES = [
  {
    id: 'p1', name: 'MOTEL STATIC', tag: 'PHASE 1',
    sub: '…',
    difficulty: { reaction: 1.00, detect: 1.00, score: 1.00 },
    missions: [ /* 5 existing mission defs, unchanged */ ],
  },
  {
    id: 'p2', name: 'DEEP COVER', tag: 'PHASE 2 // NEW GAME+',
    sub: '…',
    difficulty: { reaction: 0.88, detect: 1.10, score: 1.25 },
    missions: [ /* 5 new defs */ ],
  },
  {
    id: 'p3', name: 'BLACK ICE', tag: 'PHASE 3 // NEW GAME+',
    sub: '…',
    difficulty: { reaction: 0.78, detect: 1.20, score: 1.60 },
    missions: [ /* 5 new defs */ ],
  },
];

export const MISSIONS = PHASES.flatMap(p => p.missions);
export const MISSION_COUNT = MISSIONS.length;   // 15
export const PHASE_COUNT = PHASES.length;       // 3
export const phaseOfMission = i => Math.floor(i / MISSIONS_PER_PHASE);
export const phaseStart = p => p * MISSIONS_PER_PHASE;
```

Phase index is derived from the global mission index; mission defs do not carry a
duplicated phase field. Each phase's `missions` array is exactly five long.

### Mission lineup

| # | Phase | id | Name | Goal |
|---|-------|----|------|------|
| 1 | 1 | `motel` | MOTEL STATIC | eliminate |
| 2 | 1 | `club` | THE NEON ROOM | retrieve |
| 3 | 1 | `storage` | COLD STORAGE | eliminate |
| 4 | 1 | `subway` | LAST TRAIN | target |
| 5 | 1 | `penthouse` | THE PORTER | boss |
| 6 | 2 | `docks` | SALT DOCKS | sabotage (3 charges) |
| 7 | 2 | `arcade` | THE ARCADE | eliminate (elite-heavy) |
| 8 | 2 | `impound` | IMPOUND | survive 40s (+ reinforcements) |
| 9 | 2 | `plaza` | PLAZA | collect (3 tapes) |
| 10 | 2 | `porter2` | PORTER // REBUILT | boss |
| 11 | 3 | `foundry` | FOUNDRY | eliminate (max pressure) |
| 12 | 3 | `vault` | THE VAULT | collect (4 keys) |
| 13 | 3 | `antenna` | ANTENNA | survive 60s (+ reinforcements) |
| 14 | 3 | `skyline` | SKYLINE | sabotage (4 charges) |
| 15 | 3 | `finale` | THE PORTER PROTOCOL | boss |

Every mission def keeps the existing shape: `id, name, sub, entryLabel,
entryKind, mood, w, h, spawn, exit, goal, walls, doors, props, lights, pickups,
enemies` (plus optional `boss`, `reinforce`). The ten new floors must satisfy the
full set of existing structural invariants listed in §7.

## 2. New objective types

Goal schema, extended (existing types unchanged):

- `eliminate` — all enemies dead.
- `retrieve` — one objective taken (kept; used by Phase 1).
- `target` — marked enemy dead.
- `boss` — the boss is dead.
- `collect` — `{ type:'collect', items:[{x,y,label}, …] }`; complete when every
  item is taken.
- `sabotage` — `{ type:'sabotage', targets:[{x,y,label}, …] }`; complete when
  every charge is armed.
- `survive` — `{ type:'survive', duration:<seconds> }`; complete when
  `missionTime >= duration`. Usually paired with `reinforce`.

### Level generalization — `src/world/Level.js`

- Replace the single `this.objective` with `this.objectives = []` — an array of
  `{ x, y, taken, armed, label }`.
  - `retrieve` → one objective (`taken`).
  - `collect` → N objectives (`taken`), all required.
  - `sabotage` → N objectives (`armed`), all required.
- No `objective` alias is kept: every internal call site (`Game.js`, `Hud.js`,
  `World.js`, `Level.js`) is migrated to iterate `objectives`.
- `drawItems` draws every untaken/unarmed objective with the appropriate icon
  (tape for collect, charge for sabotage).
- Survive missions expose `goal.duration`; `reinforce` is copied onto the level
  as immutable config for the spawner.

### Interaction — `src/systems/World.js`

`interact()` gains, in priority order after the exit check:

- `collect` / `retrieve`: `[E]` takes the nearest untaken objective within range;
  when the last one is taken, `completeGoal()`.
- `sabotage`: `[E]` arms the nearest unarmed objective within range; when the
  last one is armed, `completeGoal()`.

### Completion — pure helper

Add a pure function (in `RunState.js` or a small `systems/goals.js`) so logic is
unit-testable without a Game instance:

```js
goalReached(goal, { enemies, boss, target, objectives, missionTime }) -> boolean
```

`Game.update` calls it instead of the current inline `if/else` chain.

### Survive reinforcements — `Game.js`

Optional `def.reinforce = { every, max, types:[…], points:[{x,y}, …] }`. On each
gameplay tick, when `missionTime` crosses a multiple of `every` and the living
enemy count is below `max`, spawn one enemy at the next point (round-robin,
position resolved with `Level.findOpen`) using the seeded rng. Spawns are
deterministic under a fixed seed. Missions without `reinforce` are unaffected.

## 3. Flow & progression

### `src/core/RunState.js`

- `startRun()`: reset `phaseIndex = 0`, `scoreMul = 1`, then `startMission(0, true)`.
- `startMission(i)`: compute `phase = phaseOfMission(i)`, store `this.phaseIndex`,
  `this.phase = PHASES[phase]`, `this.phaseMissionIndex = i - phaseStart(phase)`,
  and `this.scoreMul = PHASES[phase].difficulty.score`. After building enemies,
  apply `phaseDifficulty(phase)` to each: `enemy.reaction *= reaction`,
  `enemy.vision *= detect`. Base `speed` is never scaled. Record progress with
  `save.highestPhase = max(save.highestPhase, phase + 1)` and `storeSave(save)`.
- `missionComplete()`: unchanged transition into `interlude`, but scoring adds
  `scoreMul`.
- Add `beginNextPhase()`: sets state `'phase'` with `phaseT = 0`; the phase shown
  is `phaseOfMission(missionIndex + 1)`, recomputed by the following
  `startMission`. Called from the interlude branch.
- `finishCampaign()`: `results.missions` now counts out of 15; increments
  `save.campaignsCleared` and persists. `save.highestPhase` is already 3 from
  starting the final phase. Masks still unlock exactly as today.

### `src/core/Game.js`

- Interlude branch: if `missionIndex >= MISSION_COUNT - 1` → `finishCampaign()`;
  else if the just-cleared mission is the last of a non-final phase
  (`(missionIndex + 1) % MISSIONS_PER_PHASE === 0`) → `beginNextPhase()`;
  else `showUpgrade()`.
- New state `'phase'`: advances `phaseT`; at `phaseT > 2.8` → `showUpgrade()`.
  Renders via `drawPhase()`. Freeze particles/shake like the interlude.
- `renderCanvas` / `renderGL` guard conditions add `state === 'phase'` so the
  phase screen draws over the frozen world.
- Goal completion uses `goalReached(...)` for all seven types.

### `src/systems/Hud.js`

- `objectiveText()`: add lines for `collect` (“TAKE N ITEMS — x/y”), `sabotage`
  (“ARM CHARGES — x/y”), `survive` (“HOLD OUT — Ns”).
- `contextPrompt()`: add `[E] TAKE …` for collect/retrieve and
  `[E] PLANT CHARGE` for sabotage, nearest-objective based.
- `drawMarkers()`: objective chevron points at the nearest untaken/unarmed
  objective for collect/sabotage, at the exit once the goal is done; survive
  shows no item marker.
- `drawHUD()` / `drawIntro()`: title reads `PHASE p/3 · MISSION m/5 — NAME`
  (m is the within-phase index).
- `drawInterlude()`: “NEXT” is phase-aware; at a phase boundary it shows the
  NEW GAME+ phase name.
- New `drawPhase(c)`: “PHASE n CLOSED”, “NEW GAME+”, “PHASE n+1 — <name>”,
  phase subtitle and score multiplier, with a progress bar over 2.8s.

## 4. Persistence — `src/core/Save.js`

`loadSave()` repairs missing fields to defaults: `highestPhase: 1`,
`campaignsCleared: 0`. No save-version bump. `drawMenu` shows the highest phase
reached and campaigns cleared.

## 5. Difficulty — `src/systems/Difficulty.js`

- `pressure(missionIndex, alive, maxAlive)`: `progress = missionIndex /
  (MISSION_COUNT - 1)` clamped to `[0,1]`; keeps the same 0.7/0.3 weighting, so
  it is 0 at mission 1 with everyone alive, 1 at the final mission with none
  alive, and monotonic across all 15.
- New pure `phaseDifficulty(phaseIndex)` returning the phase’s
  `{ reaction, detect, score }`; out-of-range input clamps to the nearest valid
  phase; all values are finite and positive.

## 6. Verification (strict)

### Unit — `scripts/unit-test.mjs`

- **Phase structure:** `PHASES.length === 3`; each phase has exactly 5 missions;
  `MISSIONS.length === 15`; mission ids unique across all phases; `phaseOfMission`
  and `phaseStart` are correct at every boundary.
- **All existing per-mission invariants** (size, bounds, entry room empty with a
  nearby door, doors in bounds / not overlapping walls, authored positions open,
  navigation reachability, item reachability via flood fill, goal self-consistency,
  pickups reference real weapons) now run over all 15 missions.
- **New goals:** `collect`/`sabotage` declare ≥2 targets with coordinates;
  `survive` has `duration > 0`; `reinforce`, when present, has valid
  `every > 0`, `max ≥ 1`, non-empty `types` and reachable `points`. `reinforce`
  is permitted only on a `survive` goal; a non-`survive` mission with
  `reinforce` fails the test.
- **`goalReached` truth table** for all seven types (positive and negative
  cases), pure and Game-free.
- **Difficulty:** `pressure` bounded, monotonic over 0…14, 0 at start, 1 at the
  final mission, deterministic; `phaseDifficulty` monotonic non-increasing in
  reaction and non-decreasing in detect/score, all finite.
- **Save:** missing `highestPhase`/`campaignsCleared` repair to defaults;
  round-trip preserves them.

### Scenario — `scripts/scenario-test.mjs`

- Existing checks stay green (mission-index references remain valid for
  missions 0–4; `MISSION_COUNT` is now 15).
- Clearing mission 5 transitions through the `phase` screen to an upgrade and
  then boots mission 6 in Phase 2, with the carried weapon and upgrades intact.
- A `sabotage` mission completes by arming all charges; a `survive` mission
  completes on its timer; a `collect` mission completes when all items are
  taken. Drive each via scripted evaluation, not real time.
- Programmatically complete all 15 missions and assert the results screen
  reports `missions === 15`.
- Extend the “holding attack fires and swings” loop from missions 0–4 to all 15.
- No console errors across the run.

### Commands

`npm test`, `npm run test:scenario`, `npm run verify` must all be green; the
produced output is reported as evidence.

## 7. Structural invariants the ten new floors must satisfy

(Enforced by the unit suite; authoring must respect them.)

1. `m.w > 400 && m.h > 400`; `spawn`, `exit`, `goal.type` present; mood one of
   the four ids; `entryLabel`/`entryKind` valid (`door|stairs|elevator`).
2. `walls.length > 3` and `enemies.length >= 4`; every wall/prop in bounds.
3. Spawn is clear (radius 14); nearest enemy > 120 away; a door centre within
   200; exit starts inactive.
4. Every pickup is > 80 from spawn and > 48 from every door centre.
5. Authored enemy/waypoint/exit/goal/boss positions are in open space.
6. Doors stay in bounds, never overlap a wall, and are traversable once opened.
7. With doors open, nav A* reaches every enemy, the exit, the goal and the boss
   from spawn; the player-sized flood fill reaches every enemy, pickup, exit,
   objective and boss.
8. `target` goals have an enemy at the marked goal coordinates.

## 8. Files touched

- `src/data/missions.js` — phases + 10 new missions + new goal/`reinforce` data.
- `src/core/RunState.js` — phase tracking, difficulty application, phase
  transition, NG+ scoring, results out of 15.
- `src/core/Game.js` — interlude phase branch, `phase` state, reinforcement
  spawner, `goalReached` use, render guards.
- `src/core/Save.js` — `highestPhase` / `campaignsCleared` repair.
- `src/world/Level.js` — objectives array, collect/sabotage/survive support,
  `reinforce` config, icons.
- `src/systems/World.js` — collect/sabotage interaction.
- `src/systems/Hud.js` — objective text/prompt/markers, phase HUD/intro/interlude,
  `drawPhase`, menu persistence display.
- `src/systems/Difficulty.js` — 15-mission `pressure`, `phaseDifficulty`.
- `scripts/unit-test.mjs`, `scripts/scenario-test.mjs` — expanded coverage.
- `README.md` — campaign/phases documentation.
- Spec + implementation plan docs under `docs/superpowers/`.

## 9. Success criteria

- Three phases, five unique missions each, all 15 passing the full structural
  invariant suite.
- Continuous NG+ progression: upgrades/weapons/hearts carry, mission 5→6 and
  10→11 route through a NEW GAME+ phase screen into an upgrade and the next
  phase, and clearing mission 15 shows results counting out of 15.
- Seven working objective types, each exercised by at least one mission and
  covered by a test.
- Phase difficulty scales reaction/detection/score without changing base
  movement speeds, so the pacing/tuning tests stay valid.
- `npm test`, `npm run test:scenario`, `npm run verify` all green, with evidence.
