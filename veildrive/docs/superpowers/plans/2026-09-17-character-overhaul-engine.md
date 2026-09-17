# VEIL//DRIVE — Character Overhaul, Engine Hardening & Strict Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the character art as detailed HM2-feel upright sprites, harden the engine (determinism, architecture, performance, AI) and fix every real defect found in a strict audit.

**Architecture:** New `src/render/character.js` renders an articulated, world-upright figure with directional views and returns world-space sockets; `Player`/`Enemy`/`Boss` become consumers. `Game.js` is decomposed into `systems/*` and `core/RunState.js`, with one shared `renderScene`. A seedable RNG and fixed timestep make the sim deterministic; a spatial hash and object pools remove hot-loop cost.

**Tech Stack:** ES modules, Canvas 2D, Three.js r186 (vendored), Web Audio, Node test runner scripts, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-17-character-overhaul-engine-design.md`

## Global Constraints

- Internal resolution stays **960×540**; mood ids stay `sunset, violet, toxic, blood`.
- No external assets/CDN/bundler; keep procedural art and vendored Three.js.
- `Level` must stay Node-importable (no `document`/`canvas` at construction).
- Every phase ends green: `npm test`, `npm run test:scenario`, `npm run verify`.
- Commit after every task; no behaviour change in refactor tasks.
- Each bug fix ships with a regression test.
- Keep `window.__VEILDRIVE__ = game` and the `drawHUD(c)` signature (scenario tests depend on them).
- Caps: decals ≤ 420, corpses ≤ 60, limbs ≤ 90, casings ≤ 140, particles ≤ 900.

---

## Phase 1 — Determinism & test harness

### Task 1.1: Seedable RNG

**Files:**
- Create: `src/core/rng.js`
- Modify: `src/core/math.js` (`rand`, `choose` delegate to the default rng)
- Modify: every `Math.random()` call site in `src/` to `rng.random()` / `rng.range` (grep first)
- Test: `scripts/unit-test.mjs`

**Interfaces:**
- Produces: `class Rng { constructor(seed=Date.now()>>>0); random(): number; range(a,b): number; int(n): number; pick(a:Array): any; chance(p): boolean; seed(): number; reseed(n): void }`
- Produces: `export const rng = new Rng()` (default instance) and `mulberry32(seed): ()=>number`.

- [ ] **Step 1: Write the failing test** — append to `scripts/unit-test.mjs`:
```js
test('rng: same seed yields the same sequence, different seeds differ', () => {
  const a = new Rng(42), b = new Rng(42), c = new Rng(43);
  const seq = r => Array.from({length: 8}, () => r.random());
  assert.deepEqual(seq(a), seq(b));
  assert.notDeepEqual(seq(new Rng(42)), seq(c));
});
test('rng: integer/range stay in bounds', () => {
  const r = new Rng(7);
  for (let i=0;i<200;i++){ const v=r.range(-3,5); assert(v>=-3 && v<5); const n=r.int(6); assert(Number.isInteger(n)&&n>=0&&n<6); }
});
```
- [ ] **Step 2: Run and confirm failure** — `npm test` → `Rng is not defined`.
- [ ] **Step 3: Implement** `src/core/rng.js` (mulberry32) and re-export `rng`; change `math.js`:
```js
import { rng } from './rng.js';
export const rand=(a,b)=>rng.range(a,b);
export const choose=a=>rng.pick(a);
```
Replace remaining `Math.random()` in `src/` with `rng.random()`, preserving each call's range semantics.
- [ ] **Step 4: Run tests** — `npm test` green.
- [ ] **Step 5: Commit** — `feat(rng): seedable PRNG; route game randomness through it`

### Task 1.2: Fixed timestep

**Files:**
- Modify: `src/core/Game.js` (`loop`)
- Test: `scripts/unit-test.mjs`

**Interfaces:**
- Produces: `Game.STEP = 1/60`, `Game.step(dt)` (single fixed sim tick), `Game.loop(t)` accumulator with catch-up cap `MAX_STEPS = 5`.

- [ ] **Step 1: Failing test** — a fake game object exercising the accumulator helper (extract `advance(acc, frameDt, step, maxSteps) → {steps, acc}` pure function into `src/core/math.js`) :
```js
test('timestep: accumulator yields deterministic step counts and never runs away', () => {
  let acc=0; const counts=[];
  for (const dt of [0.016,0.016,0.05,0.016]) { const r=advance(acc,dt,1/60,5); acc=r.acc; counts.push(r.steps); }
  assert.deepEqual(counts, [0,1,3,1]);
  const huge=advance(0,10,1/60,5); assert.equal(huge.steps,5,'catch-up is capped');
});
```
- [ ] **Step 2: Run → fail** (`advance` undefined).
- [ ] **Step 3: Implement** `advance` in `math.js` and wire `Game.loop` to call `this.step(STEP)` up to the cap, then render once.
- [ ] **Step 4: `npm test` + `npm run test:scenario` green.**
- [ ] **Step 5: Commit** — `feat(engine): fixed timestep with capped catch-up`

### Task 1.3: Seed & deterministic run

**Files:**
- Modify: `src/core/Game.js` (`startRun` sets `rng.reseed`), `main.js` (optional `?seed=`)
- Test: `scripts/scenario-test.mjs`

- [ ] **Step 1: Failing test** — in scenario, expose `game.setSeed(n)` and run:
```js
const det = await page.evaluate(() => {
  const g = window.__VEILDRIVE__;
  const run = seed => { g.setSeed(seed); g.startRun(); g.invincible=true;
    for(let i=0;i<600;i++) g.step(1/60);
    return { hp:g.player.hp, score:g.score, ex:g.enemies.map(e=>Math.round(e.x*100)) }; };
  return { a: run(1234), b: run(1234) };
});
ok('determinism: same seed reproduces the run', JSON.stringify(det.a)===JSON.stringify(det.b));
```
- [ ] **Step 2: Run → fail** (`setSeed` missing).
- [ ] **Step 3: Implement** `Game.setSeed(n){ rng.reseed(n); }`; have `startRun` reseed from a stored `this.runSeed` that `setSeed` sets.
- [ ] **Step 4: `npm run test:scenario` green.**
- [ ] **Step 5: Commit** — `test(engine): deterministic fixed-seed run`

---

## Phase 2 — Character overhaul

### Task 2.1: Character renderer core + upright views

**Files:**
- Create: `src/render/character.js`
- Modify: `src/render/humanoid.js` (keep `rrect`/`shade`/`tint`; re-export)
- Test: `scripts/unit-test.mjs`

**Interfaces:**
- Produces: `facingView(a) → { view:'side'|'front'|'back', flip:boolean, aim:number }`.
- Produces: `drawCharacter(ctx, spec) → { hand, offhand, head, muzzle }` (world/local space, never inverted).
- `spec`: `{ archetype, pose, phase, facing, build, palette, gear, combat, deathT }`.

- [ ] **Step 1: Failing tests**
```js
test('character: facingView never asks for an inverted body', () => {
  for (let a=-Math.PI;a<Math.PI;a+=0.2){ const v=facingView(a); assert(['side','front','back'].includes(v.view)); }
  assert.equal(facingView(0).flip,false); assert.equal(facingView(Math.PI).flip,true);
});
test('character: drawCharacter returns finite world sockets for every facing', () => {
  const ctx=makeStubCtx();
  for (let a=-Math.PI;a<Math.PI;a+=0.3){ const r=drawCharacter(ctx,{archetype:'guard',pose:'walk',phase:1,facing:a});
    for (const k of ['hand','offhand','head','muzzle']) assert(Number.isFinite(r[k].x)&&Number.isFinite(r[k].y), k); }
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** the skeleton, `facingView`, and `drawCharacter` drawing upright in the world frame (translate to position; no rotation of the whole figure). Side view mirrors on X for the left half; up/down blend to front/back.
- [ ] **Step 4: `npm test` green.**
- [ ] **Step 5: Commit** — `feat(characters): articulated renderer with upright directional views`

### Task 2.2: Archetype builds, gear and palette table

**Files:**
- Modify: `src/render/character.js` (`CHARACTERS` table)
- Modify: `src/data/config.js` (character palette keys if needed)
- Test: `scripts/unit-test.mjs`

- [ ] **Step 1: Failing test** — every archetype is defined and self-consistent:
```js
test('character: every archetype has a build, palette and gear', () => {
  for (const id of ['moth0','guard','brawler','shotgunner','hunter','elite','porter']) {
    const c=CHARACTERS[id]; assert(c, id);
    for (const k of ['shirt','pants','skin','accent']) assert(typeof c.palette[k]==='string', id+'.'+k);
    assert(c.build.bulk>=0 && c.build.height>0);
  }
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** the seven entries with distinct builds, outfits, hats/masks and emissive accents (per spec).
- [ ] **Step 4: `npm test` green.**
- [ ] **Step 5: Commit** — `feat(characters): seven distinct archetype designs`

### Task 2.3: Poses and animation

**Files:**
- Modify: `src/render/character.js`
- Test: `scripts/unit-test.mjs`

- [ ] **Step 1: Failing test** — poses produce distinct, finite joint sets and walk cycles:
```js
test('character: poses are distinct, finite and cyclic', () => {
  const P=['idle','walk','run','aim','melee','reload','hurt','stunned','dead'];
  const sig=p=>JSON.stringify(poseJoints(p,0.3,'side',CHARACTERS.guard.build));
  const set=new Set(P.map(sig)); assert.equal(set.size,P.length);
  for (const p of P) for (const t of [0,1,2,3]) assert(Number.isFinite(poseJoints(p,t,'side',CHARACTERS.guard.build).chest));
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** `poseJoints(pose, phase, view, build)` and render limbs from it (contact/passing keys, hip counter-rotation, aim shoulder raise, melee windup/follow-through, reload dip, hurt flinch, stagger, death collapse via `deathT`).
- [ ] **Step 4: `npm test` green.**
- [ ] **Step 5: Commit** — `feat(characters): full pose set and animation`

### Task 2.4: Migrate Player

**Files:**
- Modify: `src/entities/Player.js`
- Test: `scripts/unit-test.mjs`, `scripts/scenario-test.mjs`

- [ ] **Step 1: Failing test** — player draw consumes `drawCharacter` and places the weapon at the returned hand:
```js
test('player: draws through the character renderer', () => {
  const calls=[]; const ctx=makeStubCtx(calls); const p=new Player(0,0);
  p.draw(ctx); assert(calls.some(c=>c.op==='drawCharacter'));
});
```
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** `Player.draw` using `CHARACTERS.moth0`, pose from `current.kind`/`attackCd`/`reloadT`/`hitFlash`/`dead`, facing `this.a`; place `drawWeaponArt` at `hand`; mask drawn at `head`.
- [ ] **Step 4: `npm test`; scenario boots and player renders.**
- [ ] **Step 5: Commit** — `refactor(player): render via the shared character renderer`

### Task 2.5: Migrate Enemy

**Files:**
- Modify: `src/entities/Enemy.js`
- Test: `scripts/unit-test.mjs`

- [ ] **Step 1: Failing test** — each enemy type maps to an archetype and draws through the renderer.
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** the `TYPE→archetype` map, pose from `state`/`animT`/`weapon.kind`/`stun`/`dead`, place weapons at the hand socket.
- [ ] **Step 4: `npm test` green.**
- [ ] **Step 5: Commit** — `refactor(enemy): archetype builds via the character renderer`

### Task 2.6: Migrate Boss

**Files:**
- Modify: `src/entities/Boss.js`
- Test: `scripts/unit-test.mjs`

- [ ] **Step 1: Failing test** — the boss uses the `porter` archetype and its phase changes the accent/apron blood.
- [ ] **Step 2–4:** implement, green.
- [ ] **Step 5: Commit** — `refactor(boss): porter character renderer`

### Task 2.7: Damage wear, glow and visual regression

**Files:**
- Modify: `src/render/character.js`, `Player.js`, `Enemy.js`, `Boss.js`
- Test: `scripts/scenario-test.mjs`

- [ ] **Step 1: Failing scenario test** — facing left samples upright (screen buffer check) and at 1 HP the figure renders a blood-wear pass.
- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** blood-spatter accumulation driven by `hp/maxHp`, limp at low HP, torn cloth at 1 HP; update `drawGlow` to use the new socket positions.
- [ ] **Step 4: `npm run test:scenario` green.**
- [ ] **Step 5: Commit** — `feat(characters): damage wear and upright-facing polish`

---

## Phase 3 — Architecture refactor (no behaviour change)

### Task 3.1: Shared scene renderer
- **Files:** Create `src/render/scene.js` (`drawScene(ctx, layer, view)` where `layer='albedo'|'emissive'`); modify `Game.js`.
- **Steps:** failing test asserting `renderScene` draws the same entities as before (count draw calls on a stub ctx); implement; `renderCanvas`/`renderGL` both call it; green; commit `refactor(render): one scene draw used by GL and fallback`.

### Task 3.2: Camera system
- **Files:** Create `src/systems/Camera.js`; modify `Game.js`.
- **Interfaces:** `new Camera(VIRTUAL_W,VIRTUAL_H)`, `update(player,mouse,level,dt)`, `screenToWorld`, `worldToScreen`, `shake(n)`, `apply(ctx)`.
- **Steps:** failing test for `screenToWorld(worldToScreen(p))≈p`; move `updateCamera`/`shake`/`screenToWorld`; green; commit `refactor(camera): extract camera system`.

### Task 3.3: HUD & menus system
- **Files:** Create `src/systems/Hud.js`; modify `Game.js`.
- **Interfaces:** `drawHud(game, ctx)`, `drawMarkers`, `drawMenu`, `drawSettings`, `drawCredits`, `drawUpgrade`, `drawPause`, `drawIntro`, `drawInterlude`, `drawResults`, `drawDeath`, `drawDebug`.
- **Constraint:** `Game.drawHUD(c)` delegates to the system so `window.__VEILDRIVE__.drawHUD` still exists.
- **Steps:** failing test that `game.drawHUD` delegates; move methods; green; commit `refactor(hud): extract HUD and menu rendering`.

### Task 3.4: Combat system
- **Files:** Create `src/systems/Combat.js`; modify `Game.js`.
- **Interfaces:** `fireWeapon`, `enemyShoot`, `enemyMelee`, `meleeAttack`, `throwWeapon`, `updateProjectiles`, `updateThrown`, `updateHazards`, `explodeAt`, `spawnHazard`, `onEnemyKilled`, `onBossKilled`.
- **Steps:** failing test that combat functions delegate and preserve signatures (assert on a spy game); move; green; commit `refactor(combat): extract combat system`.

### Task 3.5: AI system
- **Files:** Create `src/systems/AI.js`; modify `Game.js`.
- **Interfaces:** `perceiveAll(game, dt)`, `emitNoise(game,x,y,radius,type)`, `alertNearby(game,x,y,r,target)`.
- **Steps:** failing test that `emitNoise` reaches listeners within radius; move; green; commit `refactor(ai): extract perception and alerting`.

### Task 3.6: World & run state
- **Files:** Create `src/systems/World.js`, `src/core/RunState.js`; modify `Game.js`.
- **Interfaces:** `World` owns `level`, `ensureWorld/rebake/drain`; `RunState` owns score/combo/deaths/mission flow (`startRun`, `startMission`, `completeGoal`, `missionComplete`, `finishCampaign`, `restartAfterDeath`, `onPlayerDeath`).
- **Steps:** failing tests for score/combo and mission advance; move; green; `npm run test:scenario` green; commit `refactor(core): world and run-state systems; thin Game orchestrator`.

---

## Phase 4 — Performance & stability

### Task 4.1: Spatial hash for blockers and perception
- **Files:** Create `src/core/SpatialHash.js`; modify `Level.js`, `Enemy.js`, `Game.js`.
- **Interfaces:** `new SpatialHash(cell=128)`, `insert(o)`, `query(x,y,r,out)`, `clear()`, `rebuild(items)`.
- **Steps:** failing test — hash `query` returns exactly the brute-force `blocked` set for random points across every mission; wire `Level.blocked/lineBlocked/bulletHit` and enemy perception candidate queries; green; commit `perf(spatial): grid-accelerated collision and perception`.

### Task 4.2: Object pools for transient effects
- **Files:** Create `src/core/Pool.js`; modify `FX.js`, `Game.js` (projectiles).
- **Interfaces:** `new Pool(factory, reset, cap)`, `spawn()`, `release(o)`, `forEach(fn)`, `size`.
- **Steps:** failing test — spawning past the cap reuses objects and never grows; no stale fields after reset; convert `p`, `casings`, `limbs`, `decals`, `projectiles`; green; commit `perf(fx): pooled particles, casings, limbs and projectiles`.

### Task 4.3: Remove per-frame lighting allocation
- **Files:** Modify `Game.js`, `Renderer.js`.
- **Steps:** failing test via a counting stub proving `setLights` receives the same array instance across frames and creates no new `THREE.Color` after warm-up; green; commit `perf(render): reuse light buffers`.

### Task 4.4: Bake/dirty fix, caps and finite guards
- **Files:** Modify `Game.js`, `FX.js`, `Level.js`.
- **Steps:** failing test — a 10,000-tick simulated firefight keeps every transient array ≤ its cap and all player/enemy numerics finite; fix `ensureWorld` to paint new decals without a full re-bake; clamp `heartT`; green; commit `fix(stability): bounded arrays, finite state, cheaper bake`.

---

## Phase 5 — Gameplay/AI systems

### Task 5.1: Navigation grid and A*
- **Files:** Create `src/core/NavGrid.js`.
- **Interfaces:** `new NavGrid(level, cell=24)`, `walkable(cx,cy)`, `path(from,to) → [{x,y}]|null`, `flowField(to) → Float32Array`.
- **Steps:** failing test — for every mission, every enemy/waypoint/exit/objective is reachable from spawn (reuse the existing flood-fill invariant) and `path` returns an open corridor; green; commit `feat(ai): navigation grid and A* pathing`.

### Task 5.2: Integrate pathfinding into movement
- **Files:** Modify `Enemy.js`, `Game.js`.
- **Steps:** failing test — scripted maze case: with pathing an enemy reaches the target within N ticks where steering-only stalls; keep local steering as a final refinement; green; commit `feat(ai): enemies path through doorways and around props`.

### Task 5.3: Group tactics
- **Files:** Create `src/systems/Tactics.js`; modify `Enemy.js`, `Game.js`.
- **Steps:** failing test — with ≥3 combatants, roles are assigned (≥1 flank, ≤1 hold) and roles are stable across ticks; implement shared last-known and overwatch; green; commit `feat(ai): squad roles and shared contacts`.

### Task 5.4: Sound propagation
- **Files:** Modify `NavGrid.js`, `Game.js`.
- **Steps:** failing test — a noise behind a solid wall reaches fewer listeners than the same noise in open space; implement a bounded flood fill through the nav grid; green; commit `feat(ai): noises propagate through openings`.

### Task 5.5: Difficulty scaling
- **Files:** Modify `missions.js` (optional per-mission `pressure`), `Game.js`.
- **Steps:** failing test — scaling is a pure function of `(missionIndex, aliveCount, rngSeed)` and is deterministic; apply to reaction/accuracy only within safe bounds; green; commit `feat(ai): seedable difficulty pressure`.

---

## Phase 6 — Strict audit

### Task 6.1: Nearest-hit ordering
- **Files:** Modify `Level.js` (`bulletHit`).
- **Steps:** failing test — overlapping glass in front of a barrel: the front prop is returned; implement nearest intersection via segment `t`; green; commit `fix(level): bullets hit the nearest prop`.

### Task 6.2: Dead code removal
- **Files:** Modify `Enemy.js` (`_remove`), `Level.js` (`zones`, `zoneAt`), `mood.js` (`MOOD_IDS`), `Input.js` (`wheel`), `config.js` (unused colors), plus anything found.
- **Steps:** grep each symbol to prove no consumer; remove; `npm test` green; commit `chore: remove dead code`.

### Task 6.3: Remaining audit fixes
- **Files:** whatever the pass finds.
- **Steps:** for each verified defect, add a failing regression test, fix, green. Batch into coherent commits by subsystem.

### Task 6.4: Style pass
- **Files:** all of `src/`.
- **Steps:** remove unused imports/params, normalize naming, de-duplicate; no behaviour change; `npm test` + `npm run test:scenario` + `npm run verify` green; commit `style: consistency and cleanup`.

### Task 6.5: Final verification
- **Steps:** run all three commands; `npm run build`; update `README.md` (characters, engine, tests); commit `docs: update README for character and engine overhaul`.

---

## Self-review notes

- Spec coverage: determinism (1.1–1.3), characters (2.1–2.7), architecture (3.1–3.6), performance (4.1–4.4), AI (5.1–5.5), audit (6.1–6.5). All spec sections map to tasks.
- Type consistency: `drawCharacter`/`facingView`/`CHARACTERS`/`poseJoints`/`SpatialHash`/`NavGrid`/`Pool`/`advance`/`Rng` are referenced consistently.
- Placeholder scan: none; every task names files, interfaces and assertions.
