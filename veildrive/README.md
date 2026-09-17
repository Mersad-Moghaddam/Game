# VEIL//DRIVE — Motel Static

An original, self-contained top-down action roguelite prototype for modern desktop browsers. It uses a crisp 960×540 virtual canvas, procedural vector/pixel-art rendering, synthesized Web Audio sound, perception-driven enemy AI, fast restart, roguelite upgrades, local progression, and a complete first mission.

No third-party game art, music, sound effects, characters, dialogue, maps, logos, or copyrighted game assets are included.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:4173`.

Production build:

```bash
npm run build
npm run preview
```

The build is written to `dist/`.

## Controls

- `WASD` — move
- `Mouse` — aim
- `Left Click` — shoot / melee (hold to keep firing or swinging; an empty gun auto-reloads if reserve remains)
- `Right Click` — throw held weapon
- `Shift` — dash
- `E` — pick up weapon / quietly open door / take objective
- `Space` — breach door / execute stunned enemy
- `R` — reload
- `Q` — quick-swap current and previous weapon
- `Esc` — pause menu (resume / restart mission / quit) / back
- `1 / 2 / 3` — choose upgrade
- `F1` — debug overlay / AI vision cones
- `F2` — debug invincibility
- `F3` — debug spawn guard
- `F4` — debug clear active encounter

## Original setting

The player is **MOTH-0**, a lean masked courier wearing a faded teal bomber with asymmetrical magenta seams and an original bone-colored moth mask with offset eye slits. The first job, **Motel Static**, sends MOTH-0 into a decaying roadside motel to recover an encoded analog tape from a criminal communications cell.

The boss, **THE PORTER**, wears a keyhole-shaped service mask and changes combat behavior across three phases: ranged pressure, thrown debris, then telegraphed wall-crash charges that create vulnerability windows.

## Campaign

Five missions play back-to-back: **MOTEL STATIC** (the original room-to-room motel), **THE NEON ROOM**, **COLD STORAGE**, **LAST TRAIN** and **THE PORTER**. Each is a data-driven single floor (`src/data/missions.js`) with its own neon mood, enemy roster and objective — clear the floor, retrieve an item, assassinate the marked target, or kill the boss. **Every mission opens with the player sealed in an empty entry room** dressed as a floor entrance (a mat, a floor sign and an arrow pointing to the breachable door into the action) and a **mission intro card** (number, name, briefing, objective and hostile count) that fades as the action starts; finishing the objective lights an **EXIT**; reaching it clears the mission, then a short interlude (time, hostiles down, score and next mission) and an upgrade choice lead into the next mission. The HUD tracks **HOSTILES remaining** and draws **neon off-screen chevrons** toward the objective/exit and any enemy in combat, so you always know where the fight is. **Esc opens a pause menu** (resume, restart the mission, or quit to menu). Dying rewinds the current mission instantly. Clearing all five shows the campaign grade.

Combat is intentionally brutal but readable: MOTH-0 starts the campaign armed with a **9mm Pistol** (melee weapons are still available as pickups for silent work), has 5 hearts (5 HP), grunts die in a single hit, elites take two, and enemies react quickly — while movement keeps a deliberate, Hotline-Miami-paced top speed (player ~200 px/s, enemies 88–126, boss 70, with a short dash burst) so fights stay readable instead of frantic. Between missions you pick an upgrade; the pool includes stacking **gun mods** — HOT LOAD (+damage), HAIR TRIGGER (+fire rate), EXTENDED MAG (+magazine) and ARMOR PIERCING (+pierce) — so your firearms get stronger run after run.

## Implemented systems

- Fixed-timestep 60 Hz simulation with a capped catch-up accumulator, a **seedable RNG** and deterministic replays, plus responsive 16:9 letterboxing
- Tight top-down movement, normalized diagonals, aim look-ahead, dash, invulnerability window
- Melee, firearms, reloads, recoil feedback, muzzle flashes, tracers, thrown weapons, shell casings and muzzle smoke
- Grounded-but-arcade gun handling: per-weapon **aim recoil** (muzzle climb that recovers), **spread bloom** that builds while firing, a physical **kick**, **pump/slide cycle** time, **penetration** (the revolver punches through), a **visible reload state** and distinct reload timings
- Distinct weapon data: fists, baton, cleaver, bottle, pistol, suppressed pistol, shotgun, SMG, revolver — melee weapons are available at pickups in every mission
- Every weapon is drawn as its own silhouette (held, thrown, on the floor and in the HUD), with a coloured ground glow so pickups read by type at a glance
- Starts armed with the 9mm Pistol; stacking gun mods (damage, fire rate, magazine size, armor piercing)
- Smarter enemy AI: predictive aim for hunters/elites, elite burst fire, closing distance to regain line of sight, patrol pauses, jitter-free obstacle steering, **A\* pathfinding through doorways on a navigation grid**, **deterministic squad roles** (suppress/flank/hold/push), **wall-muffled sound** and **seedable difficulty pressure**
- Magazine + reserve ammunition
- Door opening and violent breaches
- Breakable furniture/glass and environmental collision, backed by a **spatial hash** for collision and line-of-sight queries
- HM2-max gore: directional blood, growing pools, **dismemberment** (flying limbs and heads), **arterial jets**, overkill deaths that tear a body open, and persistent **intact / decapitated / opened** corpses — all behind the `BLOOD FX` toggle
- Blood decals, gibs, particles, debris, impact effects, afterimages and heavy screen shake, all **pooled** (particles, casings, limbs and projectiles reuse objects and lists compact in place)
- Hit stop for kills, melee impacts, executions and boss death
- Enemy states: patrol, investigate, search, combat, stunned
- Vision cone, line of sight, hearing, reaction delay and local alert propagation
- Enemy archetypes: guard, brawler, shotgunner, hunter/flanker, elite
- Reactive procedural audio through Web Audio API
- Dynamic exploration/combat audio intensity
- Five-mission linear campaign with distinct compact floors (eliminate / retrieve / assassinate / boss objectives) and instant per-mission restart
- Spawns and respawns on a dressed entry mat, facing the breach door, with a brief spawn shield
- Upgrade synergies including reload, spread, dash, melee, combo, stealth and ricochet upgrades
- Multi-phase boss with telegraphed vulnerability mechanic
- Context executions
- Four original masks with persistent horizontal unlocks: MOTH-0, RAM-7, FOX-2, RAVEN-3
- Explosive environmental barrels and persistent enemy bodies that can alert other guards
- Combo/chain scoring and end-of-mission grading
- LocalStorage versioned save for settings, run count, best score and rank
- Settings/accessibility controls for volume, screen shake, blood, graphics quality, post effects, **PIXEL WORLD** (off by default — the crisp 960×540 design; on enables the low-res Hotline Miami 2 pixel look), flashing and high-contrast cursor
- Pause, focus loss handling, instant mission rewind on death
- Developer/debug tools

## Rendering (Three.js / Hotline Miami look)

The game is simulated entirely in 2D and rendered through a GPU pipeline with a Hotline Miami visual style: saturated neon, palette that pulses with the music beat, heavy CRT/VHS post-processing, patterned floors and exaggerated gore. Feedback is deliberately loud — heavy screen shake on firing, hits, kills, breaches and explosions, with expanding shockwave rings, big muzzle flashes, hit-stop and glitch bursts on impact. Kills burst into blood, gibs and growing floor pools, and taking a hit flashes a red damage vignette.

- **Three.js (r186)** is vendored under `vendor/` and loaded with an import map in `index.html` — no bundler and no CDN. `scripts/build.mjs` copies `vendor/` into `dist/`.
- **Layer model.** Each frame the existing Canvas-2D drawing code renders two 960×540 offscreen canvases: *albedo* (the lit scene) and *emissive* (glow only). Both become `CanvasTexture`s on full-screen quads in an `OrthographicCamera` scene.
- **Characters.** `src/render/character.js` draws an articulated figure **upright in the world frame**: body orientation comes from the facing quadrant (mirrored for the left half, never inverted) while the arms and weapon follow the true aim, so a character facing left no longer renders upside down. Seven archetypes (MOTH-0, guard, brawler, shotgunner, hunter, elite, PORTER) have distinct builds, outfits, masks/visors and gear, a full pose set (idle/walk/run/aim/melee/reload/hurt/stunned/dead), multi-tone cloth shading and HP-driven damage wear.
- **Lighting.** A custom `ShaderPass` (`src/render/shaders.js`) combines `albedo × lights + emissive` using up to 16 mood-coloured lights plus ambient. Lights flicker and brighten on the beat; `src/render/mood.js` holds the four mood palettes (`sunset`, `violet`, `toxic`, `blood`) used per zone.
- **Pixel pipeline (opt-in).** The default design is crisp 960×540. With **PIXEL WORLD** on, the world instead renders internally at **480×270** (`PIXEL = 2`) and is upscaled with nearest-neighbour, giving chunky Hotline Miami 2 pixels. Simulation and HUD coordinates stay 960×540 either way (layer contexts get a `1/PIXEL` scale), so no gameplay math changes and the UI stays sharp. The setting toggles at runtime.
- **Post.** `EffectComposer`: render → lighting → `UnrealBloomPass` (neon bloom) → CRT/VHS pass (chromatic aberration, scanlines, barrel distortion, vignette, grain, glitch bursts on damage/explosions) → `OutputPass`. A palette-quantise + 2×2 ordered dither step gives the limited-colour, banded pixel-art look.
- **UI overlay.** HUD, menus, results and upgrade screens draw to a separate `#ui` 2D canvas stacked above the WebGL canvas, so text stays crisp and undistorted.
- **Static bake.** The environment is baked once into a world-sized canvas (`Level.bake`) and blitted per frame; blood pools, corpses and broken props are painted into it and it is re-baked only when something static changes.
- **Fallback.** If WebGL is unavailable, `main.js` skips Three.js entirely and the original Canvas-2D path renders the game, so it always runs.

Debug/quality: `settings.post` toggles the bloom/CRT chain; `settings.quality` reduces lights, effects, scanline and dither; `prefers-reduced-motion` disables scanline roll, grain and glitch. Pointer input is mapped from the canvas backing store to the 960×540 virtual space so aiming is unaffected by the pixel downscale. The Canvas-2D fallback (no WebGL) applies the same low-res-then-upscale pixelation.

## Testing

- `npm test` — unit suite (Node, no browser): math, **seeded-RNG determinism and the fixed-timestep accumulator**, save persistence, weapon/upgrade data (including gun recoil/bloom/kick/penetration invariants and deep-copy safety), mood palettes, level collision and line-of-sight, **spatial-hash queries never missing an overlap (matched against brute force across every mission)**, **navigation A* routing around walls and reaching every objective with doors open**, **bounded effect arrays under sustained use**, **pool object reuse**, **deterministic squad roles and difficulty pressure**, every mission's structural invariants (clear empty entry room, a door within reach, **doors stay in bounds and never overlap walls, and every opened door is traversable**, no pickup shadows a door, valid/self-consistent goals, every enemy/waypoint/exit/objective reachable by a player-sized flood fill), player/enemy/boss behaviour (firing builds and recovers bloom/recoil), gore caps and **dismemberment/limb settling**, the character renderer (upright facings, poses, sockets, damage wear) and the art helpers.
- `npm run test:scenario` — end-to-end scenarios in headless Chromium (skips if Playwright is absent): boot, the **480×270 pixel pipeline**, menu/settings/credits, **a fixed-seed run reproducing exactly**, **characters staying upright facing either way**, **movement pacing** (readable walk speed, enemy speed band, dash burst, one-/two-hit kills), spawn on the entry mat facing the door with a shield, firing, kills, gun casings/bloom/penetration, pickups, barrels, objective → exit → interlude → upgrade → next mission, the boss finale, **overkill dismemberment**, death respawn on the entry mat, the **heartbeat cue at 1 HP**, off-screen markers, save persistence across reload, pause + **pause-menu restart/quit**, idle-still enemies, resize, and the no-WebGL Canvas fallback.
- `npm run verify` — a fast headless render probe (WebGL context, non-blank frame, no console errors).

## Architecture

```text
src/
  core/
    Game.js       Thin orchestrator: loop, state machine, render, scene draw
    RunState.js   Campaign flow: missions, masks, upgrades, scoring, death
    Input.js      Keyboard/mouse state with edge-triggered actions
    Audio.js      Web Audio synthesis and dynamic ambience
    Save.js       Versioned LocalStorage persistence
    math.js       Collision/vector helpers, fixed-timestep accumulator
    rng.js        Seedable PRNG (mulberry32); the shared simulation stream
    SpatialHash.js Uniform-grid index for collision and line-of-sight queries
    NavGrid.js    Uniform nav grid + deterministic A* pathing for enemies
    Pool.js       Free-list helpers for effects and projectiles
  entities/
    Player.js     Movement, weapons, dash, reload, damage, procedural character art
    Enemy.js      Enemy archetypes, perception, state machine, path following
    Boss.js       Multi-phase boss behavior and procedural boss art
  combat/
    weapons.js    Data-driven weapon definitions and runtime weapon creation
  world/
    Level.js      Data-driven mission floor: layout, doors, props, pickups, collisions and line of sight
  systems/
    Camera.js     Mouse-led follow, screen/world mapping, screen shake
    Combat.js     Firing, projectiles, melee, throws, hazards, explosions, kills
    AI.js         Perception, alerting, wall-muffled sound, AI cadence
    Tactics.js    Deterministic squad roles (suppress/flank/hold/push)
    Difficulty.js Seedable difficulty pressure (progress x attrition)
    World.js      World bake/dirty, decal painting, lighting buffer, interaction
    Hud.js        HUD, markers, menus and end-of-run screens
    FX.js         Particles, blood decals, afterimages and transient flashes
  render/
    Renderer.js   Three.js renderer, layer quads, EffectComposer, fallback probe
    shaders.js    GLSL for the lighting and CRT/VHS passes
    mood.js       Per-zone neon palettes and beat-pulse colour helper
    character.js  Shared articulated HM2-style character renderer (upright views)
    humanoid.js   rrect/shade/tint drawing helpers
    LightBuffer.js Reusable, allocation-free light list for the lighting pass
    weapons-art.js Per-weapon procedural silhouettes (held, thrown, floor, HUD)
  data/
    missions.js   The five mission definitions (floors, rosters, objectives, moods)
    config.js     Settings, palette and upgrade definitions
```

The game intentionally keeps content data separate from entity behavior so additional districts, weapons, enemy types, masks and upgrades can be added without rewriting the core loop.

## Asset strategy and attribution

All visible game graphics are constructed procedurally at runtime from original layered shapes. All sound is synthesized at runtime through Web Audio. There are no external art, music or sound asset files requiring attribution. The only third-party code is the MIT-licensed Three.js library, vendored under `vendor/` for GPU compositing and post-processing.

For a larger production, the procedural `draw()` methods can be replaced by sprite-sheet rendering while retaining entity dimensions, weapon sockets and gameplay code.

## Browser notes

Audio starts after the first user interaction because browsers block autoplaying Web Audio. The game contains no page scrolling and scales the virtual canvas to the largest 16:9 area that fits the browser window.
