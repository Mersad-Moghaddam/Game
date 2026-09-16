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
- `Left Click` — shoot / melee
- `Right Click` — throw held weapon
- `Shift` — dash
- `E` — pick up weapon / quietly open door / take objective
- `Space` — breach door / execute stunned enemy
- `R` — reload
- `Q` — quick-swap current and previous weapon
- `Esc` — pause / back
- `1 / 2 / 3` — choose upgrade
- `F1` — debug overlay / AI vision cones
- `F2` — debug invincibility
- `F3` — debug spawn guard
- `F4` — debug clear active encounter

## Original setting

The player is **MOTH-0**, a lean masked courier wearing a faded teal bomber with asymmetrical magenta seams and an original bone-colored moth mask with offset eye slits. The first job, **Motel Static**, sends MOTH-0 into a decaying roadside motel to recover an encoded analog tape from a criminal communications cell.

The boss, **THE PORTER**, wears a keyhole-shaped service mask and changes combat behavior across three phases: ranged pressure, thrown debris, then telegraphed wall-crash charges that create vulnerability windows.

## Campaign

Five missions play back-to-back: **MOTEL STATIC** (the original room-to-room motel), **THE NEON ROOM**, **COLD STORAGE**, **LAST TRAIN** and **THE PORTER**. Each is a data-driven single floor (`src/data/missions.js`) with its own neon mood, enemy roster and objective — clear the floor, retrieve an item, assassinate the marked target, or kill the boss. Finishing the objective lights an **EXIT**; reaching it clears the mission, then a short interlude and an upgrade choice lead into the next mission. Dying rewinds the current mission instantly. Clearing all five shows the campaign grade.

Combat is intentionally brutal and fast: the player has 3 HP, grunts die in a single hit, elites take two, and enemies react quickly.

## Implemented systems

- 60 FPS delta-time game loop and responsive 16:9 letterboxing
- Tight top-down movement, normalized diagonals, aim look-ahead, dash, invulnerability window
- Melee, firearms, reloads, recoil feedback, muzzle flashes, tracers, thrown weapons
- Distinct weapon data: fists, baton, cleaver, bottle, pistol, suppressed pistol, shotgun, SMG, revolver
- Magazine + reserve ammunition
- Door opening and violent breaches
- Breakable furniture/glass and environmental collision
- Blood decals, particles, debris, impact effects, afterimages and screen shake
- Hit stop for kills, melee impacts, executions and boss death
- Enemy states: patrol, investigate, search, combat, stunned
- Vision cone, line of sight, hearing, reaction delay and local alert propagation
- Enemy archetypes: guard, brawler, shotgunner, hunter/flanker, elite
- Reactive procedural audio through Web Audio API
- Dynamic exploration/combat audio intensity
- Five-mission linear campaign with distinct compact floors (eliminate / retrieve / assassinate / boss objectives) and instant per-mission restart
- Upgrade synergies including reload, spread, dash, melee, combo, stealth and ricochet upgrades
- Multi-phase boss with telegraphed vulnerability mechanic
- Context executions
- Four original masks with persistent horizontal unlocks: MOTH-0, RAM-7, FOX-2, RAVEN-3
- Explosive environmental barrels and persistent enemy bodies that can alert other guards
- Combo/chain scoring and end-of-mission grading
- LocalStorage versioned save for settings, run count, best score and rank
- Settings/accessibility controls for volume, screen shake, blood, graphics quality, post effects, flashing and high-contrast cursor
- Pause, focus loss handling, instant mission rewind on death
- Developer/debug tools

## Rendering (Three.js / Hotline Miami look)

The game is simulated entirely in 2D and rendered through a GPU pipeline with a Hotline Miami visual style: saturated neon, palette that pulses with the music beat, heavy CRT/VHS post-processing, patterned floors and exaggerated gore.

- **Three.js (r186)** is vendored under `vendor/` and loaded with an import map in `index.html` — no bundler and no CDN. `scripts/build.mjs` copies `vendor/` into `dist/`.
- **Layer model.** Each frame the existing Canvas-2D drawing code renders two 960×540 offscreen canvases: *albedo* (the lit scene) and *emissive* (glow only). Both become `CanvasTexture`s on full-screen quads in an `OrthographicCamera` scene.
- **Lighting.** A custom `ShaderPass` (`src/render/shaders.js`) combines `albedo × lights + emissive` using up to 16 mood-coloured lights plus ambient. Lights flicker and brighten on the beat; `src/render/mood.js` holds the four mood palettes (`sunset`, `violet`, `toxic`, `blood`) used per zone.
- **Post.** `EffectComposer`: render → lighting → `UnrealBloomPass` (neon bloom) → CRT/VHS pass (chromatic aberration, scanlines, barrel distortion, vignette, grain, glitch bursts on damage/explosions) → `OutputPass`.
- **UI overlay.** HUD, menus, results and upgrade screens draw to a separate `#ui` 2D canvas stacked above the WebGL canvas, so text stays crisp and undistorted.
- **Static bake.** The environment is baked once into an 1800×1100 canvas (`Level.bake`) and blitted per frame; blood pools, corpses and broken props are painted into it and it is re-baked only when something static changes.
- **Fallback.** If WebGL is unavailable, `main.js` skips Three.js entirely and the original Canvas-2D path renders the game, so it always runs.

Debug/quality: `settings.post` toggles the bloom/CRT chain; `settings.quality` reduces lights and effects; `prefers-reduced-motion` disables scanline roll, grain and glitch. The internal resolution stays 960×540 (no pixelation downscale).

`npm run verify` boots the dev server in headless Chromium (if Playwright is installed) and asserts there are no console errors, a WebGL context exists, and the frame renders.

## Architecture

```text
src/
  core/
    Game.js       Main simulation, scene/state flow, combat orchestration, rendering
    Input.js      Keyboard/mouse state with edge-triggered actions
    Audio.js      Web Audio synthesis and dynamic ambience
    Save.js       Versioned LocalStorage persistence
    math.js       Collision/vector helpers
  entities/
    Player.js     Movement, weapons, dash, reload, damage, procedural character art
    Enemy.js      Enemy archetypes, perception and state-machine behavior
    Boss.js       Multi-phase boss behavior and procedural boss art
  combat/
    weapons.js    Data-driven weapon definitions and runtime weapon creation
  world/
    Level.js      Data-driven mission floor: layout, doors, props, pickups, collisions and line of sight
  systems/
    FX.js         Particles, blood decals, afterimages and transient flashes
  render/
    Renderer.js   Three.js renderer, layer quads, EffectComposer, fallback probe
    shaders.js    GLSL for the lighting and CRT/VHS passes
    mood.js       Per-zone neon palettes and beat-pulse colour helper
    humanoid.js   Shared Hotline Miami-style humanoid sprite/animation renderer
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
