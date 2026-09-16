# VEIL//DRIVE — Pixel HM2 Overhaul

Follow-up to the render overhaul. The game already plays as a five-mission
Hotline-Miami-style top-down roguelite. This pass makes it *look and feel* much
closer to Hotline Miami 2, hardens it with stricter tests, and fixes real bugs.

Direction confirmed with the owner:

- **Pixel-like visuals** — render the world at a low internal resolution and
  upscale with nearest-neighbour into chunky pixel art. Keep the existing neon
  Hotline Miami palette, mood pulsing, bloom and CRT, but make them read as
  pixel art rather than smooth vector.
- **HM2-max violence** — dismemberment, decapitations, arterial spray and
  persistent gore, all behind the existing `BLOOD FX` toggle.
- **Grounded-but-arcade guns** — recoil, per-shot spread bloom, shell casings,
  visible reload state, pump/slide cycling and penetration, without losing the
  fast Hotline Miami pacing.
- **Phased commits**, verified with `npm test`, `npm run test:scenario`,
  `npm run build` and `npm run verify`, then pushed.

## Non-goals

- No external art/audio assets, no CDN, no bundler (keep the vendored Three.js
  and procedural art strategy).
- No multiplayer, no mobile/touch controls.

## Phase 1 — strict review, bug fixes, harder tests

Real defects found while reading the code:

1. **Low-health heartbeat never plays.** `Game.update` does `this.heartT -= dt`
   on an uninitialised field, producing `NaN`; `NaN <= 0` is always false.
   Fix: initialise `heartT` (constructor + `startMission`).
2. **Canvas fallback draws the dead player.** `renderCanvas` calls
   `this.player.draw(c)` unconditionally, while `renderGL` guards it with
   `!this.player.dead`. Fix the fallback to match.
3. **Thrown weapons can drop inside walls.** A thrown weapon that hits a wall
   becomes a floor pickup at the impact point, which can sit inside geometry
   and be unreachable. Fix: nudge the drop onto the last open position.
4. **README/impl mismatch: no off-screen markers.** The spec promised neon
   objective/threat chevrons; none exist. Implement them (also Phase 2 flow).

Test hardening:

- Unit: assert the heartbeat fires at 1 HP; assert `Player`/`Enemy`/`Boss`
  fields touched by `update` are initialised; assert weapons have valid
  `mag/rate/reload` and that pickups reference real weapons; assert level doors
  do not overlap walls; assert every mission's goal type is one of the known
  types; assert `makeWeapon` deep-copies (mutating a runtime copy must not
  change the data table).
- Scenario: drive an auto-play run and assert no console errors, assert the
  new markers/counter render, assert the low-health heartbeat path runs, and
  assert the pixel render dimensions.

## Phase 2 — mission, scenario and flow upgrades

- Per-mission **intro card** (name, briefing, objective, threat count) that
  fades out, so the player reads the job before the action.
- HUD: **HOSTILES remaining**, off-screen **objective/exit marker** and
  **threat chevrons** for enemies in `COMBAT`, plus a directional exit arrow.
- **Pause menu** with Resume / Restart mission / Abandon run instead of
  resume-only.
- More mission flavour: place the unused `cleaver`/`bottle` weapons, add a
  second `retrieve`/`target` beat where it fits, and tighten spawn/pace.
- Interlude shows the next mission name and a short "get ready" beat.

## Phase 3 — grounded-but-arcade guns

- Per-weapon `recoil` (kick), `bloom` (spread added per shot, decays),
  `pump`/`cycle` timing, `casing` size, `penetration` and `falloff`.
- Player aim/position kick on fire; spread grows while firing and recovers.
- Shell casings as short-lived FX; muzzle smoke; louder slide/pump audio.
- Reload has a visible state (mag drop → insert) with per-gun timing.
- Keep damage/ttk arcade: grunts still drop in one hit.

## Phase 4 — HM2-max gore

- Dismemberment on melee overkill and heavy hits: flying limbs, head pops,
  arterial jets with gravity, and oversized persistent pools.
- Corpse variety (intact, opened, decapitated) baked into the static layer.
- Gore stays 100% behind `BLOOD FX` and respects existing caps.

## Phase 5 — pixel render pipeline

- `PIXEL = 2`: the world renders at 480×270 and upscales nearest to 960×540
  (and to the window). Simulation coordinates stay 960×540 — the layer
  contexts get a `1/PIXEL` scale transform, so no gameplay math changes.
- UI canvas stays 960×540 for readable text; the world, bloom and CRT run at
  the low resolution so pixels are crisp and cheap.
- Input maps pointer coordinates from the canvas backing size to the 960×540
  virtual space so aiming is unaffected.
- Redraw humans/weapons/floors with chunkier, palette-limited pixel shapes;
  a `settings.pixel` toggle can turn the downscale off.

## Verification

Each phase must keep `npm test` and `npm run test:scenario` green and add
coverage for its new behaviour. Final pass runs `npm run build` and
`npm run verify`.
