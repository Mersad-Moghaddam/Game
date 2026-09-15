# Milo vs. Bugs

## Milo vs. Bugs — Marlow's Friday deployment

Marlow pushes an AI-written “small fix” to production after skipping the
tests. Bugs escape the monitor. You play as Milo, armed with a patch gun and
assigned to clean up Marlow's incident across a scrolling 1920 × 1120 map.
After each phase, pick a roguelite upgrade, then face the final boss:
**Sir Deploys-A-Lot**, Marlow's giant deploy bot. Between phases Hollis appears
with giant glasses, three hairs, and unrequested feedback: **«کار که نمیکنی همش باگ»**.

## Run

```sh
python3 -m http.server 5173 --bind 0.0.0.0
```

Open http://localhost:5173. No build, dependencies, or external assets needed.

## Controls

| Action         | Control                                                      |
| -------------- | ------------------------------------------------------------ |
| Move           | WASD or arrow keys                                           |
| Aim            | Mouse; IJKL for keyboard-only aiming                         |
| Shoot          | Hold left click or Space                                     |
| Pause / resume | P, Escape, or the pause button                               |
| Fullscreen     | F or the ⛶ button                                            |
| Upgrades       | Click a card, or press 1 / 2 / 3                             |
| Touch          | Left direction buttons; drag the right stick to aim and fire |
| Intro          | Watch the deployment or press Skip intro                     |

Patches have limited range and a firing cooldown. Aim ahead of runners rather
than at where they were. Coffee grants a timed speed and fire boost. There is
no auto-aim.

## Phases

1. **Small fix:** crawlers and continuous reinforcements.
2. **Hotfix:** faster, zigzagging runners plus spitters that return fire.
3. **Dependency hell:** three-hit armored beetles and splitters that break into
   two crawlers when destroyed.
4. **Friday production:** Sir Deploys-A-Lot — a boss with summons, a telegraphed
   slam, and a radial volley — supported by mixed adds.

Clear phases 1–3 to choose one of three random upgrades. The catalog includes
fire rate, damage, pierce, multishot, ricochet, crits, move speed, coffee
duration, extra hearts, magnet range, and a one-time Second Wind revive.

## Notes

Spawn markers give a 0.75-second warning. Combat freezes for Hollis's roast and
the upgrade pick between phases. Three hearts and brief damage immunity. The
world includes Server racks, Coffee corner, Untested code, and Production
zones, with a minimap and a camera that follows Milo. New bugs and coffee appear
safely near the current view.

Sound is optional (synthesized arcade sounds and a cartoon chuckle). Hollis's
Persian dialogue is displayed as text. Reduced-motion preferences disable
shaking and decorative character animation.

Personal bests use a separate browser storage key. Storage failure does not stop
gameplay.

## Verify

```sh
node --test game.test.mjs world.test.mjs upgrades.test.mjs
node --check public/main.mjs
node --check public/game.mjs
node --check public/world.mjs
node --check public/upgrades.mjs
node --check public/renderer.mjs
node --check public/sprites.mjs
node --check public/intro.mjs
```

`game.mjs`: simulation and phase/boss state machine. `upgrades.mjs`: upgrade
catalog and pure apply/roll logic. `world.mjs`: world, zones and camera
transforms. `sprites.mjs`: character and creature artwork. `renderer.mjs` and
`intro.mjs`: Canvas scene, scrolling world, minimap and deployment comic.
`main.mjs`: input, DOM, sound, fullscreen and browser lifecycle.
`index.html` / `style.css`: responsive interface and upgrade cards.
