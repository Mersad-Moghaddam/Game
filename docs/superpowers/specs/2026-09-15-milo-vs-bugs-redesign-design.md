# Milo vs. Bugs — Redesign

Follow-up to `2026-09-14-malvandi-design.md`. The base game (scrolling
1920×1120 map, WASD + aim, patch gun, coffee, 60s of four 15s phases) stays.
This spec covers: a rename to fictional characters, a roguelite upgrade system,
gimmick phases with new enemies and a boss, a fullscreen control, a light text
trim, and a visual overhaul including new faces for all three characters.

## Goals

- Rename every real-person name to a fictional one, including code identifiers.
- Make each phase mechanically distinct and add a satisfying final boss.
- Add a between-phase upgrade choice so runs diverge and replay is fun.
- Add true browser fullscreen for the play area.
- Trim the most repetitive text while keeping the comedy.
- Lift the art: thicker ink, richer palette, ambience, feedback, new characters.

## Names (approved)

| Old      | New    | Notes                                                        |
| -------- | ------ | ------------------------------------------------------------ |
| Mersad   | Milo   | Player/on-call hero. `mersad-world-best` → `milo-world-best`. |
| Malvandi | Marlow | Careless dev; pilots the boss. `mersad-vs-bugs` → `milo-vs-bugs`. |
| Honarvar | Hollis | Unrequested reviewer. `#honarvar`/`.honarvar-*` → `hollis-*`. |

Boss name: **Sir Deploys-A-Lot**, Marlow's giant Deploy Bot.

Persian roast line `کار که نمیکنی همش باگ` is dialogue, not a name; unchanged.
`package.json` repository/homepage URL is left as-is. README, package
description, wrangler name, tests, CSS and JS identifiers all update.

## Modules

Keep the dependency-free HTML/CSS/Canvas-JS stack and the simulation/render
split so Node tests stay deterministic.

- `public/game.mjs` — state machine, enemy table, boss state, upgrade effects.
- `public/upgrades.mjs` (new) — catalog plus pure `rollChoices` / `applyUpgrade`.
- `public/sprites.mjs` (new) — `drawMilo`, `drawMarlow`, `drawHollis`, creatures.
- `public/renderer.mjs` — scene, world, ambience and effects; uses `sprites.mjs`.
- `public/intro.mjs` — comic; uses the new sprites and trimmed copy.
- `public/main.mjs` — input, DOM, sound, fullscreen, upgrade-card UI.
- `public/index.html`, `public/style.css` — fullscreen icon, upgrade overlay,
  restyled HUD, redrawn Hollis SVG, trimmed chrome.
- Tests: extend `game.test.mjs`, add `upgrades.test.mjs`.

## Game state additions

`createGame` gains:

- `upgrades: {}` — id → stacks taken.
- `mods: { fireRate: 1, damage: 1, speed: 1, pierce: 0, multishot: 0,
  patchSize: 1, magnet: 0, crit: 0, boostTime: 5, maxHearts: 3, revives: 0 }`.
- `status` gains `"upgrade"` (cards shown) alongside `intro/playing/intermission/won/lost`.
- `choices: []` — the rolled upgrade ids for the current selection.
- `enemyShots: []` — spitter/boss projectiles.
- `boss: null` — boss entity when active.
- `shake: 0`, `vignette: 0` — renderer feedback timers.

Enemy table (type → hp, radius, speed factor, points, behavior):

- `crawler`: 1 hp, slow, 100, walks straight at the player.
- `runner`: 1 hp, 1.35×, 150, zigzags (existing swerve).
- `armor`: 3 hp, 0.75×, 250, armored, hp pips.
- `spitter`: 2 hp, 0.8×, 200, closes to range then fires a slow telegraphed bolt.
- `splitter`: 2 hp, 1×, 200, on death spawns two crawlers.
- `boss`: large hp, contact damage, pattern attacks.

## Phases

| # | Name                | Gimmick                                            | Enemies            |
| - | ------------------- | -------------------------------------------------- | ------------------ |
| 1 | Small fix           | Aim basics, gentle spawns                          | crawler            |
| 2 | Hotfix              | Fast dodgers, ranged pressure                      | runner, spitter    |
| 3 | Dependency hell     | Tanky targets that multiply                        | armor, splitter    |
| 4 | Friday production   | Boss fight, adds and telegraphed patterns          | boss + mixed adds  |

Phases 1–3 last 15s. Phase 4 runs until the boss dies. After phases 1, 2 and 3
the game enters `"upgrade"`, shows three cards, and waits for a pick; the pick
applies `mods` and begins the next phase. Defeating the boss → `"won"`.

Boss (Sir Deploys-A-Lot):

- Spawns at phase-4 start near the arena centre, idle-bobbing, ~40 hp base
  (scaled so a run with a few upgrades wins but a bad run can lose).
- HP bar shown in the HUD.
- Patterns on a timer: (a) summon a ring of crawlers, (b) telegraphed slam
  toward the player with screen-shake and a shockwave, (c) radial bolt volley
  through `enemyShots`. Patterns rotate with a wind-up tell.
- Contact and bolt hits cost a heart through the existing immunity window.

## Upgrades

Rarity-weighted roll of three distinct cards from a ~12-card catalog. Stackable
cards scale; one-shot cards are removed once owned.

| Id                  | Name               | Effect                                   | Rarity |
| ------------------- | ------------------ | ---------------------------------------- | ------ |
| `rapid`             | Rapid Patches      | cooldown ×0.82 per stack                 | common |
| `heavy`             | Heavy Patch        | patch damage +1 per stack                | common |
| `sprint`            | Sprint Boots       | move speed +15% per stack                | common |
| `caffeine`          | Caffeine Tolerance | coffee lasts +2s per stack               | common |
| `big`               | Big Patches        | hit radius ×1.25 per stack               | common |
| `heart`             | Extra Heart        | +1 max heart and heal 1 (max 3 stacks)   | rare   |
| `pierce`            | Piercing Shot      | +1 bug pierced per stack (max 3)         | rare   |
| `multishot`         | Multishot          | +1 patch per shot, small spread (max 3)  | rare   |
| `ricochet`          | Ricochet           | patches bounce to a nearby bug once      | rare   |
| `magnet`            | Magnet             | pickup radius +40% per stack             | common |
| `crit`              | Lucky Deployment   | +10% chance for ×2 damage per stack      | rare   |
| `secondwind`        | Second Wind        | revive once at 1 heart (single)          | epic   |

`rollChoices(state, rng)` returns up to three unique affordable ids.
`applyUpgrade(state, id)` is pure over the passed state and updates `upgrades`,
`mods`, and any derived max-hearts/heal.

## Fullscreen

A ⛶ button in the titlebar beside Sound toggles `requestFullscreen()` on the
game window. CSS fills the viewport and letterboxes the canvas to its 960×560
aspect; page chrome hides. `F` toggles and `Esc` exits (native). The glyph
reflects state and the control is keyboard- and touch-reachable. If the API is
missing, fall back to a CSS `maximize` class. Pointer aiming already maps
through the canvas rect, so it needs no change.

## Light text trim

- Terminal ticker: replace long multi-clause jokes with one short line and
  lengthen the dwell so it stops flickering.
- Footer and edition tagline: shorten to single short lines.
- Keep the intro comic, Hollis's roast, zone names, minimap, HUD.

## Visual overhaul

- Thicker, consistent ink outlines and soft drop shadows on entities.
- Warmer office palette with cool/warm zone contrast; parallax background.
- Zone ambience: server LED blink, coffee steam, code-rain in Untested code,
  conveyor motion in Production.
- Feedback: muzzle flash, hit flashes, larger death bursts, boss-slam
  screen-shake, damage vignette.
- HUD: cleaner stat pills, boss health bar, upgrade cards with drawn icons.
- Characters redrawn as distinct silhouettes:
  - **Milo** — rolled-sleeve hoodie, headphones around the neck, eye-bags,
    raised eyebrow, glowing patch gun; head bob, fire recoil, blink.
  - **Marlow** — smug undercut, pushed-up sunglasses, hoodie, energy drink;
    slouches, and appears as the boss's pilot.
  - **Hollis** — huge thick-rim glasses, one wild raised eyebrow, cardigan and
    tie, red correction pen / REVIEWED stamp, three hairs, slow-clap. Redrawn
    both as the in-page SVG and a matching canvas sprite.
- All decorative motion respects `prefers-reduced-motion`.

## Testing

- `upgrades.test.mjs`: roll gives three unique ids; apply updates mods; stack
  caps; one-shots vanish; max-hearts heals.
- `game.test.mjs`: intro freeze; normalized movement; manual aim; armor hits;
  fire rate; reinforcements; upgrade gate pauses combat and resumes next phase;
  new enemies (spitter fires, splitter splits); boss spawns in phase 4, takes
  damage, dies → win; death resets; terminal freeze.
- `node --check` every `.mjs`; manual browser pass for fullscreen, cards, boss,
  reduced-motion, and touch.

## Out of scope

Repo URL rewrite, sound redesign beyond the existing tones, multiplayer,
persistent progression between runs, changing the map dimensions.
