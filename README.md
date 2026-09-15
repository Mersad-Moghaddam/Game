# Game

## Mersad vs. Bugs — Malvandi's Friday deployment

Malvandi pushes an AI-written “small fix” to production after skipping the
tests. Bugs escape the monitor. You play as Mersad, armed with a patch gun and
assigned to clean up Malvandi's incident across a scrolling 1920 × 1120 map.
After each phase, Honarvar appears with giant glasses, three hairs, and
unrequested feedback: **«کار که نمیکنی همش باگ»**.

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
| Touch          | Left direction buttons; drag the right stick to aim and fire |
| Intro          | Watch the deployment or press Skip intro                     |

Patches have limited range and a firing cooldown. Aim ahead of runners rather
than at where they were. Coffee grants five seconds of faster movement and
shooting. There is no auto-aim.

1. **Small fix:** Crawlers and continuous reinforcements.
2. **Hotfix:** Faster, zigzagging runners.
3. **Dependency hell:** Three-hit armored beetles mixed with runners.
4. **Friday production:** Fastest spawn rate and enemy mix.

Spawn markers give a 0.75-second warning. Combat freezes for Honarvar's
3.5-second laughing review after each phase, including the final phase before
victory. Intro and review time do not count toward the 60-second survival time.
Three hearts and brief damage immunity. The world includes Server racks, Coffee
corner, Untested code, and Production zones, with a minimap and camera that
follows Mersad. New bugs and coffee appear safely near the current view.

Sound is optional (synthesized arcade sounds and a cartoon chuckle). Honarvar's
Persian dialogue is displayed as text with animated lip movements. Reduced-motion
preferences disable shaking and decorative character animation.

Manual-aim high scores use a separate browser storage key. Storage failure does
not stop gameplay.

## Verify

```sh
node --test game.test.mjs world.test.mjs
node --check main.mjs
node --check renderer.mjs
node --check intro.mjs
```

`game.mjs`: simulation and phase state machine. `world.mjs`: world, zones and
camera transforms. `renderer.mjs` and `intro.mjs`: Canvas artwork, scrolling
world, minimap and deployment comic. `main.mjs`: input, DOM, sound and browser
lifecycle. `index.html` / `style.css`: responsive interface and Honarvar SVG.
