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
- Two-stage encounter structure with randomized enemy composition and upgrade choice
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
    Level.js      Motel layout, doors, props, pickups, collisions and line of sight
  systems/
    FX.js         Particles, blood decals, afterimages and transient flashes
  data/
    config.js     Settings, palette and upgrade definitions
```

The game intentionally keeps content data separate from entity behavior so additional districts, weapons, enemy types, masks and upgrades can be added without rewriting the core loop.

## Asset strategy and attribution

All visible game graphics are constructed procedurally at runtime from original layered shapes. All sound is synthesized at runtime through Web Audio. There are no external asset files requiring attribution.

For a larger production, the procedural `draw()` methods can be replaced by sprite-sheet rendering while retaining entity dimensions, weapon sockets and gameplay code.

## Browser notes

Audio starts after the first user interaction because browsers block autoplaying Web Audio. The game contains no page scrolling and scales the virtual canvas to the largest 16:9 area that fits the browser window.
