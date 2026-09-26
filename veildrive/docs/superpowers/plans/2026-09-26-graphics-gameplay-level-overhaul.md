# Graphics, Gameplay, Weapon & Level Design Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul VEIL//DRIVE's visual fidelity, character models, gun & blade mechanics, boss encounters, procedural level art, and mission scenarios under the Hyper-Stylized Neon Action aesthetic.

**Architecture:** Maintain zero-external-assets runtime Canvas-2D and Three.js shader compositing. Expand weapon systems with realistic firearm cycling, shell casings, and Katana bullet deflection. Enhance character models with dynamic cloth, detailed gear, and readable telegraphs. Upgrade Level flooring with procedural patterns, ambient occlusion, and interactive breaker hazards across all 15 campaign missions.

**Tech Stack:** JavaScript (ES modules), HTML5 Canvas 2D, Three.js (r186 vendored), Web Audio API, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-26-graphics-gameplay-level-overhaul-design.md`

## Global Constraints

- Virtual canvas resolution is strictly 960×540.
- Simulation runs at 60 Hz fixed timestep with deterministic PRNG (mulberry32).
- Zero external image, audio, or model files; all assets are procedurally generated at runtime.
- Maintain full compatibility with all 15 campaign missions, 3 NG+ phases, and existing save state formats.
- Every task must pass `npm test` before committing.

---

### Task 1: Weapon Definitions & Mechanical Data (Katana & Tactical Burst Rifle)

**Files:**
- Modify: `src/combat/weapons.js`
- Test: `scripts/unit-test.mjs`

**Interfaces:**
- Consumes: Existing `WEAPONS` and `makeWeapon` in `src/combat/weapons.js`.
- Produces: `WEAPONS.katana` and `WEAPONS.rifle` with complete firearm and melee parameters.

- [ ] **Step 1: Write the failing unit tests for new weapons**

Add tests to `scripts/unit-test.mjs`:
```javascript
// In scripts/unit-test.mjs under weapon tests:
{
  const katana = makeWeapon('katana');
  assert(katana && katana.id === 'katana', 'katana weapon exists');
  assert(katana.kind === 'melee' && katana.damage === 3 && katana.parry, 'katana has high damage and parry trait');
  
  const rifle = makeWeapon('rifle');
  assert(rifle && rifle.id === 'rifle', 'rifle weapon exists');
  assert(rifle.kind === 'gun' && rifle.burstCount === 3 && rifle.pen === 1, 'rifle is 3-round burst penetrating firearm');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/unit-test.mjs`  
Expected: FAIL with "katana weapon exists" or missing weapon definition.

- [ ] **Step 3: Implement weapon definitions in `src/combat/weapons.js`**

Add `katana` and `rifle` to `WEAPONS`:
```javascript
  katana:{id:'katana',name:'Mono-Katana',kind:'melee',damage:3,rate:0.30,range:48,arc:1.35,noise:65,knock:160,color:'#e4e8ec',parry:true},
  rifle:{id:'rifle',name:'Tactical Burst Rifle',kind:'gun',damage:1,rate:0.36,range:960,spread:0.02,burstCount:3,burstRate:0.065,mag:24,reload:1.75,noise:520,knock:110,color:'#4a5568',recoil:0.03,kick:2.2,bloom:0.02,bloomMax:0.09,flash:1.2,pen:1,casing:true,cycle:0.02}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/unit-test.mjs`  
Expected: PASS (all checks pass).

- [ ] **Step 5: Commit**

```bash
git add src/combat/weapons.js scripts/unit-test.mjs
git commit -m "feat(weapons): add Mono-Katana and Tactical Burst Rifle definitions"
```

---

### Task 2: Realistic Weapon Art & Procedural Silhouettes

**Files:**
- Modify: `src/render/weapons-art.js`
- Test: `scripts/unit-test.mjs`

**Interfaces:**
- Consumes: `drawWeaponArt(ctx, weapon, scale, skin)` in `src/render/weapons-art.js`.
- Produces: Detailed procedural rendering for all 11 weapons including slide lock, ejection ports, Katana temper line (*hamon*), and bullpup carbine receiver.

- [ ] **Step 1: Write the failing unit tests for weapon art rendering**

Add tests to `scripts/unit-test.mjs`:
```javascript
// Test drawWeaponArt with mock canvas context for all weapons including katana and rifle
{
  const mockCtx = {
    save: () => {}, restore: () => {}, scale: () => {}, translate: () => {}, rotate: () => {},
    beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, arc: () => {}, closePath: () => {},
    fill: () => {}, stroke: () => {}, strokeRect: () => {}, fillRect: () => {}
  };
  for (const id of Object.keys(WEAPONS)) {
    drawWeaponArt(mockCtx, WEAPONS[id], 1);
  }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/unit-test.mjs`  
Expected: FAIL if `katana` or `rifle` cases are not handled in `drawWeaponArt`.

- [ ] **Step 3: Implement realistic weapon silhouettes in `src/render/weapons-art.js`**

Implement detailed rendering for:
- `katana`: Curved single-edged blade, frosted hamon temper line, brass habaki collar, oval tsuba handguard, and braided diamond tsuka wrap.
- `rifle`: Bullpup silhouette with rear magazine well, top sight carrying rail/optic hood, ribbed handguard, and flash suppressor.
- Polish existing weapons: realistic slide serrations on pistol/suppressed, wooden pump-grip on shotgun, fluted cylinder on revolver.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/unit-test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/weapons-art.js scripts/unit-test.mjs
git commit -m "feat(render): realistic procedural weapon silhouettes, Katana, and Burst Rifle art"
```

---

### Task 3: Combat Mechanics: Burst Firing, Katana Bullet Deflection & Realistic FX

**Files:**
- Modify: `src/entities/Player.js`
- Modify: `src/systems/Combat.js`
- Modify: `src/systems/FX.js`
- Test: `scripts/unit-test.mjs`

**Interfaces:**
- Consumes: Player shooting/melee triggers in `Player.js`, projectile updates in `Combat.js`.
- Produces: 3-round burst queue for burst firearms, projectile parry reflection for Katana, caliber-specific shell casings (red shotgun shells, rifle brass), and transient muzzle light pulses.

- [ ] **Step 1: Write failing unit test for katana parry and burst fire logic**

Add tests to `scripts/unit-test.mjs`:
```javascript
// Test katana parry reflection of hostile projectile
{
  const g = makeTestGame();
  g.player.equip(makeWeapon('katana'), g);
  const p = g.spawnProjectile(g.player.x + 30, g.player.y, Math.PI, 400, 1, false, false, 0);
  g.meleeAttack(g.player, g.player.current, 0);
  // Assert projectile was deflected or neutralized
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/unit-test.mjs`  
Expected: FAIL.

- [ ] **Step 3: Implement burst queue, deflection, and caliber FX**

In `Player.js`:
- Add `burstQueue: 0`, `burstTimer: 0` handling in `update(dt, g)`.
- When firing a weapon with `w.burstCount > 1`, set `this.burstQueue = w.burstCount - 1` and `this.burstTimer = w.burstRate`.
- During update, decrement timer and fire subsequent rounds from the burst.

In `Combat.js`:
- In `meleeAttack(source, weapon, angle)`: if `weapon.parry` is true, find hostile projectiles in arc `[angle - weapon.arc/2, angle + weapon.arc/2]` within range `weapon.range + 10`.
- Deflect: reverse velocity, set `proj.fromPlayer = true`, change color to neon cyan (`#12e0ff`), and emit metallic deflection spark FX.

In `FX.js`:
- Support red plastic 12ga shotgun hull casings with gold rim and rifle brass casings in `casing(x, y, a, kind)`.
- Emit transient lighting buffer pulse at muzzle coordinates.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/unit-test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/Player.js src/systems/Combat.js src/systems/FX.js scripts/unit-test.mjs
git commit -m "feat(combat): implement burst fire, Katana bullet deflection, and caliber shell FX"
```

---

### Task 4: Character Model & Enemy Archetype Visual Overhaul

**Files:**
- Modify: `src/render/character.js`
- Modify: `src/render/humanoid.js`
- Test: `scripts/unit-test.mjs`

**Interfaces:**
- Consumes: `drawCharacter(ctx, spec)` in `src/render/character.js`.
- Produces: Dynamic cloth flutter, MOTH-0 mask beam, detailed enemy accessories (security cap, radio comms, tactical vest, laser sight telegraph, exo-plates).

- [ ] **Step 1: Write failing unit test for character rendering and accessories**

Add tests to `scripts/unit-test.mjs`:
```javascript
// Test character rendering across all archetypes and new gear flags
for (const arch of ['moth0', 'guard', 'brawler', 'shotgunner', 'hunter', 'elite', 'porter']) {
  drawCharacter(mockCtx, { archetype: arch, pose: 'aim', facing: 0, x: 100, y: 100 });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/unit-test.mjs`  
Expected: PASS or FAIL depending on mock setup.

- [ ] **Step 3: Implement character visual upgrades in `src/render/character.js`**

- **MOTH-0:** Dynamic bomber jacket hem flutter (sinusoidal velocity wave on back hem), dual glowing eye-slit aperture, subtle weapon slide blowback on fire frames.
- **Guard:** Security cap with emblem, shoulder radio transceiver with status LED (yellow / red).
- **Brawler:** Taped forearm wraps, brass knuckles, hunched brawler pose.
- **Shotgunner:** Segmented ballistic vest with neon hazard accents, diagonal shotgun shell loops.
- **Hunter:** Sleek hood, cybernetic monocle, and laser sight beam projection (`drawLaserSight`).
- **Elite:** Layered exo-armor plates with metallic sheen, ultraviolet visor glint, and damage spall.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/unit-test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/character.js src/render/humanoid.js scripts/unit-test.mjs
git commit -m "feat(render): character model overhaul for MOTH-0 and enemy archetypes"
```

---

### Task 5: Boss Evolution: The Porter (P1, P2, P3 Mechanics & Effects)

**Files:**
- Modify: `src/entities/Boss.js`
- Test: `scripts/unit-test.mjs`

**Interfaces:**
- Consumes: `Boss` class in `src/entities/Boss.js`, combat events in `Game.js`.
- Produces: Hydraulic armature and shockwaves in Phase 2, overclocked cybernetic core and radial spread in Phase 3, wall-impact ground fractures.

- [ ] **Step 1: Write failing unit test for boss phase states and behaviors**

Add tests to `scripts/unit-test.mjs`:
```javascript
{
  const b = new Boss(200, 200);
  assert(b.phase === 1, 'starts in phase 1');
  b.damage(7, mockGame);
  assert(b.phase === 2, 'transitions to phase 2 at <=10 hp');
  b.damage(6, mockGame);
  assert(b.phase === 3, 'transitions to phase 3 at <=5 hp');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/unit-test.mjs`  
Expected: PASS if base logic exists, then extend with phase 2/3 specific mechanics assertions.

- [ ] **Step 3: Implement enhanced boss mechanics in `src/entities/Boss.js`**

- Phase 1: Thrown debris hazards with clear warning trajectory; magnum heavy shots.
- Phase 2: Hydraulic arm armature (draws robotic shoulder arm with steam vents); hydraulic dash charge; wall impact emits radial ground shockwave rings.
- Phase 3: Overclocked cybernetic core (red glowing conduits); rapid charge with floor scorch decals; 6-way radial spread bursts before charging.
- Vulnerability state: Steam venting and hit-flash during stun windows.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/unit-test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entities/Boss.js scripts/unit-test.mjs
git commit -m "feat(boss): multi-phase Porter mechanics, hydraulic shockwaves, and cybernetic overload"
```

---

### Task 6: Procedural Level Graphics, Ambient Occlusion & Interactive Breakers

**Files:**
- Modify: `src/world/Level.js`
- Modify: `src/data/missions.js`
- Modify: `src/systems/World.js`
- Test: `scripts/unit-test.mjs`

**Interfaces:**
- Consumes: Mission data in `src/data/missions.js`, baking pipeline in `Level.js`.
- Produces: Procedural zone flooring (tile, parquet, industrial plate), wall base ambient occlusion shadows, and interactive electrical breaker props.

- [ ] **Step 1: Write failing unit test for new mission props and flooring styles**

Add tests to `scripts/unit-test.mjs`:
```javascript
// Validate all 15 missions pass structural checks with new props and weapons
for (let i = 0; i < MISSIONS.length; i++) {
  const m = MISSIONS[i];
  assert(m.walls && m.walls.length > 0, `mission ${i} has walls`);
  assert(m.pickups && m.pickups.length > 0, `mission ${i} has pickups`);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/unit-test.mjs`  
Expected: PASS / verify current state.

- [ ] **Step 3: Implement procedural flooring, ambient occlusion, and electrical breaker props**

In `Level.js`:
- In `bakeFloor(ctx)`: Render zone-specific procedural tile/parquet/industrial plate patterns based on mission mood and zone id.
- Add soft ambient occlusion gradient drop shadows (3-4px) along all wall bases.
- Support `type: 'breaker'` in props: drawing a wall-mounted electrical breaker box with high-voltage hazard symbol and pulsing amber status LED.

In `World.js` / `Combat.js`:
- When a `breaker` prop takes damage from player attack or stray bullet:
  - Explode with electrical arcs (`g.fx.burst(..., '#12e0ff')`).
  - Strobe local lights.
  - Apply `stun = 1.2` to enemies within 220px radius.
  - Mark breaker broken.

In `src/data/missions.js`:
- Place `katana` and `rifle` pickups thoughtfully across the campaign missions (e.g. VIP room in Club, weapon locker in Storage, office in Vault).
- Place breaker boxes along key corridors for tactical CQB options.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/unit-test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/world/Level.js src/data/missions.js src/systems/World.js scripts/unit-test.mjs
git commit -m "feat(level): procedural floor patterns, wall AO, and interactive electrical breaker hazards"
```

---

### Task 7: Comprehensive Verification & Push

**Files:**
- Modify: `scripts/scenario-test.mjs`
- Test: `scripts/unit-test.mjs`, `scripts/scenario-test.mjs`, `scripts/verify-render.mjs`

**Interfaces:**
- Consumes: Complete game codebase.
- Produces: Green test suites across all 112+ unit tests, 65+ scenario tests, and headless render verification.

- [ ] **Step 1: Add scenario checks for Katana, Burst Rifle, and new mechanics in `scripts/scenario-test.mjs`**

Add tests verifying:
- Katana weapon pickup and swinging.
- Burst Rifle 3-round firing cycle.
- Breaker box interaction.
- Boss multi-phase visual and combat progression.

- [ ] **Step 2: Run all test suites**

Run:
```bash
npm test
npm run test:scenario
npm run verify
npm run build
```
Expected: All suites PASS with 0 failures, 0 console errors.

- [ ] **Step 3: Commit and Push to remote branch**

```bash
git add .
git commit -m "feat(overhaul): complete graphics, gameplay, weapon, and level design overhaul"
git push origin feat/graphics-gameplay-overhaul
```

---
