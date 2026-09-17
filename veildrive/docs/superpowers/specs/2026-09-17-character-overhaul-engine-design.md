# VEIL//DRIVE — Character Overhaul, Engine Hardening & Strict Audit

Follow-up to the pixel HM2 overhaul. Three workstreams were approved together:

1. **Character overhaul** — make MOTH-0, the five enemy archetypes and THE
   PORTER read like detailed, high-resolution Hotline Miami 2 characters.
2. **Engine improvements** — determinism/tooling, architecture, performance &
   stability, and gameplay/AI systems.
3. **Strict audit** — find and fix real defects (behavioural + latent), remove
   dead code and normalize style, each fix covered by a regression test.

Direction confirmed with the owner: **detailed vector, HM2-sprite feel**
(crisp 960×540 pipeline unchanged), all four engine areas, and the widest
audit scope (bugs + dead code + style).

## Non-goals

- No external art/audio assets, no CDN, no bundler. Keep the vendored Three.js
  and the procedural-art strategy.
- No multiplayer, no mobile/touch controls.
- Do not change the crisp 960×540 default resolution or the four mood ids.
- No new missions, weapons, upgrades or masks.

## Confirmed problems in the current build

These are verified by reading the source and are the seeds of the audit phase.

1. **Characters render upside-down when facing left.** `Player.draw`,
   `Enemy.draw` and `Boss.draw` all `ctx.rotate(this.a)` a sprite authored to
   face `+x`. At angles in the left half the whole humanoid is inverted. HM
   avoids this with directional sprites.
2. **`Level.bulletHit` returns the first blocker in array order, not the
   nearest intersection.** Bullets/throws can damage a prop behind a nearer
   one.
3. **Dead code:** `Enemy._remove` is filtered but never set; `Level.zones` and
   `Level.zoneAt()` ignore their arguments; `MOOD_IDS`; `Input.mouse.wheel`;
   unused `COLORS` keys.
4. **Unbounded state:** `Game.heartT` drifts to large negative values when HP
   > 1; several per-frame arrays are filtered into fresh arrays.
5. **Per-frame allocation/GC churn:** `pushLights` builds a `THREE.Color` and
   a hex string per light per frame; `drawHUD`/`drawMarkers` re-filter the
   enemy list every frame; `FX.update` reallocates five arrays per frame.
6. **Rendering duplication:** `renderCanvas` and `renderGL` hand-roll the same
   scene draw twice.
7. **Non-deterministic simulation:** every system calls `Math.random()` (and
   `rand`/`choose` wrap it), and the loop uses a variable `dt`. Bugs are not
   reproducible and replays are impossible.

## Phase order

Phases are sequential; every phase ends green (`npm test`,
`npm run test:scenario`, `npm run verify`) and is committed.

### Phase 1 — Determinism & test harness

- Add `src/core/rng.js`: a seedable PRNG (`mulberry32`) with `Rng.next()`,
  `range(a,b)`, `int(n)`, `pick(arr)`, `chance(p)`, seed get/set. Provide a
  module-level default instance used by `math.rand`/`choose` and every
  `Math.random()` call site in `src/`.
- Add a fixed-timestep accumulator to the main loop: simulate at a fixed
  `STEP = 1/60` (bounded catch-up), render once per frame. Keep a
  `variableStep` fallback for the first frame / tab resume.
- Add `Game.replay` hooks: record `{seed, inputs-by-frame}` behind `F5`, and
  deterministic `Game.setSeed(n)` for tests.
- Tests: PRNG determinism (same seed → same sequence); a scripted fixed-step
  run produces identical state with the same seed; `rand`/`choose` use the
  seeded instance.

### Phase 2 — Character overhaul

Rewrite `src/render/humanoid.js` into a proper articulated character renderer
and add `src/render/character.js` as the shared seam used by `Player`,
`Enemy` and `Boss`.

**Skeleton** (local space, +x is the facing axis for the side view):
pelvis, chest, neck, head; shoulder/elbow/hand per arm; hip/knee/foot per leg.
Poses are computed from joint angles, not the current fixed two-segment
approximations.

**Directional view (fixes problem 1).** `drawCharacter` renders the figure
upright in the *world* frame, selecting a view from the facing angle:

- `facingView(a)` → `{ dir: 'side'|'front'|'back', flip: boolean, aimY }`,
  quantised to 8 directions.
- Right half → side view; left half → side view mirrored on X. Up/down arcs
  blend toward the front/back view (head turn, shoulders square, weapon held
  toward the aim axis). The figure never inverts.
- Callers stop rotating the context; instead they pass `facing` and receive
  world-space sockets.

**Poses:** `idle` (breathing sway, weapon ready), `walk`/`run` (contact &
passing keys, hip counter-rotation, arm counter-swing), `aim` (two-hand hold,
shoulder raise, muzzle climb), `melee` (windup → follow-through), `reload`
(hand to magazine, weapon dip), `hurt` (flinch + step back), `stunned`
(stagger), `dead` (collapse keyed off a per-entity death clock), plus
archetype-specific tweaks.

**Builds & gear** (data-driven `CHARACTERS` table):

- `MOTH-0` — lean; faded teal bomber, asymmetric magenta seams, bone moth mask
  with offset emissive slits; holster and courier strap.
- `guard` — average; dark pressed uniform, service cap, radio on shoulder.
- `brawler` — heavy; tank top, bald/bandana, taped fists, thick neck.
- `shotgunner` — bulky; tactical vest with shell loops, bandana, pump gun.
- `hunter` — slim and tall; hooded jacket, running shoes, light step.
- `elite` — tall; long coat, shoulder pads, full visor (emissive), gloves.
- `porter` — huge boss; bloodied apron over a coat, keyhole mask (emissive),
  meat-cleaver sidearm; phase-reactive accent and increasingly bloody apron.

**Materials & detail:** 4-tone cloth shading (shadow/base/highlight/rim),
fold lines, straps/belts/pouches, cloth patterns, stubble and brow, faces with
a readable expression, mask emissive slits, and **damage wear** — blood
spatter that accumulates as HP drops, a limping walk at low HP, and torn cloth
at 1 HP.

**Sockets:** `drawCharacter(ctx, spec)` returns
`{ hand, offhand, head, muzzle }` in world space; `weapons-art.js` is placed at
`hand`/`muzzle`. `drawGlow` stays a separate emissive-pass concern.

**Animation without runaway cost:** poses are pure functions of
`(pose, phase, facing, build)`; no per-frame object churn beyond the returned
sockets.

### Phase 3 — Architecture refactor

Decompose `src/core/Game.js` (~195 lines, one class doing everything) into
focused systems with unchanged behaviour, tests green throughout:

- `systems/World.js` — level lifecycle, bake/dirty, decals & corpses.
- `systems/Combat.js` — projectiles, throws, hazards, melee, explosions,
  damage application, kill/death orchestration.
- `systems/AI.js` — perception ticks, alert propagation, steering/pathing.
- `systems/Camera.js` — follow, shake, screen↔world mapping.
- `systems/Hud.js` — HUD, markers, menus, intro/interlude/upgrade/pause/results.
- `core/RunState.js` — campaign state, score/combo, death/respawn, saves.

`Game` becomes a thin orchestrator (state machine + wiring). Scene drawing is
extracted to a single `renderScene(ctx, layer)` used by both the WebGL and the
Canvas fallback paths (fixes problem 6). No gameplay change.

### Phase 4 — Performance & stability

- **Spatial hash** (`core/SpatialHash.js`) for blockers, projectiles, enemies
  and particles; replace O(n) `.some`/`.filter` collision and perception hot
  loops. Rebuild incrementally on `markDirty`.
- **Object pooling** for projectiles, particles, casings, limbs and decals;
  reuse objects instead of allocate/filter each frame.
- **Bake/dirty fix:** paint decals directly and avoid full re-bakes; only
  re-bake when static geometry changes.
- **Kill per-frame allocation:** cache `THREE.Color`s in `pushLights`, reuse
  the light array, precompute mood colors; drop `.filter()` in draw paths.
- **Caps & guards:** clamp `heartT`, cap all transient arrays, guard every
  numeric tick against `NaN`/`Infinity`.
- Tests: hash equivalence vs brute force; pool reuse leaves no stale state;
  a long simulated run keeps array sizes bounded and all state finite.

### Phase 5 — Gameplay/AI systems

- **Pathfinding:** a flow-field / A* grid over the level to replace
  steering-only movement; enemies route through doorways and around props,
  with steering retained for local avoidance.
- **Group tactics:** role assignment (flank, suppress, hold), shared last-known
  positions, bounding overwatch for gunners.
- **Sound propagation:** noises travel through openings rather than a flat
  radius (cheap flood fill), so walls actually muffle.
- **Difficulty scaling:** light pressure scaling by mission index and living
  enemy count, fully data-driven and seedable.
- Tests: grid reachability per mission; a flow-field path from spawn to target
  is shorter than or equal to steering-only for scripted cases; deterministic
  under a fixed seed.

### Phase 6 — Strict audit

Behavioural + latent fixes, each with a regression test, plus dead-code and
style cleanup. Seeds from the list above plus whatever the full pass finds:

1. `Level.bulletHit` nearest-hit ordering (problem 2) — return the nearest
   intersection, not array order; test with overlapping props.
2. Dead-code removal (problem 3) and unused-export cleanup.
3. `heartT` clamp and finite-state guards (problem 4).
4. Allocation cleanup verified by the Phase 4 tests (problem 5).
5. Style pass: consistent naming, no unused parameters/imports, remove
   duplication revealed by Phase 3.

## Testing & verification strategy

- `npm test` — unit suite (Node). Every new module and every bug fix gets a
  test; determinism tests run a fixed-seed fixed-step simulation.
- `npm run test:scenario` — headless Chromium end-to-end: existing scenarios
  must stay green, plus new checks for directional character rendering (a
  facing-left figure samples upright), pooled effects, and a fixed-seed run.
- `npm run verify` — render probe (non-blank, no console errors).
- Per-phase manual sanity via the scenario screenshot path.

## Risks & mitigations

- **Directional rendering touches all three entities.** Mitigate by landing
  `character.js` behind a stable interface first and keeping a temporary
  legacy path until all three are migrated in one commit.
- **Refactor + perf + AI is a lot at once.** Mitigate by strict phase
  isolation: no behaviour changes in Phase 3, no API changes in Phase 4.
- **Determinism can expose order-dependent bugs.** That is the point; fix them
  under Phase 6 with tests.

## Success criteria

- Characters are upright in every facing, visibly distinct per archetype, and
  animate through idle/walk/aim/recoil/hurt/stun/death with damage wear.
- All three test commands are green and the scenario suite gains coverage.
- No known dead code; every audit finding fixed with a test.
- Simulation is deterministic under a fixed seed and fixed timestep.
