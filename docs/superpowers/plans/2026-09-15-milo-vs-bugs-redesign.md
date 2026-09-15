# Milo vs. Bugs Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the game's real names to fictional ones, add roguelite upgrades, gimmick phases with new enemies and a boss, fullscreen, and a visual/character overhaul.

**Architecture:** Keep the dependency-free Canvas stack and the simulation/render split. Extract the upgrade catalog into a pure, testable `upgrades.mjs` and the character/creature art into `sprites.mjs`; `game.mjs` remains the state machine, `renderer.mjs` the scene/effects layer, `main.mjs` the DOM/input layer.

**Tech Stack:** Vanilla ES modules, HTML, CSS, Canvas 2D. Node's built-in `node:test` for simulation tests. Wrangler for static hosting of `./public`.

**Spec:** `docs/superpowers/specs/2026-09-15-milo-vs-bugs-redesign-design.md`

## Global Constraints

- No build step, no runtime dependencies, no external assets or network calls.
- Must run from `python3 -m http.server` and serve `./public`.
- Simulation (`game.mjs`, `upgrades.mjs`) must stay deterministic and DOM-free so Node tests pass.
- Preserve `prefers-reduced-motion` behavior on every decorative animation.
- Fictional names only: Mersad→Milo, Malvandi→Marlow, Honarvar→Hollis. Boss: Sir Deploys-A-Lot.
- localStorage must remain failure-tolerant.
- Existing public API names `createGame`, `update`, `PHASES`, `ROAST`, `WIDTH`, `HEIGHT` stay exported from `game.mjs` (tests and renderer depend on them).

---

### Task 0: Repair the moved test imports + baseline green

**Files:** Modify `game.test.mjs:3`, `world.test.mjs:3-11`.

- Update imports to `./public/game.mjs` and `./public/world.mjs`.
- Run `node --test game.test.mjs world.test.mjs` → all pass.

### Task 1: `upgrades.mjs` catalog + pure logic

**Files:** Create `public/upgrades.mjs`; create `upgrades.test.mjs`.

**Interfaces (produces):**
- `UPGRADES` — array of `{ id, name, desc, rarity, max, icon }`.
- `mods()` → default modifiers object.
- `rollChoices(state, rng)` → `string[]` up to 3 unique affordable ids.
- `applyUpgrade(state, id)` → mutates `state.upgrades`, `state.mods`, returns `state`.

Test: roll returns 3 unique; `max` caps stacks; one-shots removed; `heart` raises `maxHearts` and heals; `rapid` lowers cooldown.

### Task 2: `game.mjs` — upgrades state, enemy table, spitter/splitter

**Files:** Modify `public/game.mjs`; extend `game.test.mjs`.

- `createGame`: add `upgrades`, `mods`, `choices`, `enemyShots`, `boss`, `shake`, `vignette`; `status` may be `"upgrade"`.
- Enemy table drives hp/speed/points; add `spitter` (fires `enemyShots` when in range) and `splitter` (spawns 2 crawlers on death).
- Patch damage/pierce/multishot/crit/size read from `mods`.
- Movement speed from `mods.speed`; coffee duration from `mods.boostTime`.
- Phase end → `"upgrade"` (roll choices) instead of auto-advance; `chooseUpgrade(g, id)` applies and starts next phase.

Tests: spitter creates a shot; splitter spawns crawlers; upgrade gate freezes combat; choose resumes.

### Task 3: `game.mjs` — boss + victory

**Files:** Modify `public/game.mjs`; extend `game.test.mjs`.

- Phase 4 begins the boss (`spawnBoss`), no timer end.
- Boss patterns: ring summon, telegraphed slam (sets `shake`), radial volley.
- Boss takes patch damage; hp ≤ 0 → `"won"`.
- Boss contact/bolts cost hearts via immunity.

Tests: boss exists at wave 4; damage reduces hp; death → won; terminal freeze.

### Task 4: `sprites.mjs` — three characters + creatures

**Files:** Create `public/sprites.mjs`; wire into `renderer.mjs` and `intro.mjs`.

**Interfaces (produces):** `createSprites({ ctx, box, oval, line, text, ink, reducedMotion }, { creature })` returning `{ milo, marlow, hollis, deployBot, creature }`.

- `milo(x,y,scale,t,opts)` — hoodie, headphones, eye-bags, patch gun; recoil/bob/blink.
- `marlow(x,y,scale,t,opts)` — smug, sunglasses, drink; `pilot` variant for the boss.
- `hollis(x,y,scale,t)` — huge glasses, one eyebrow, cardigan, stamp, slow-clap.
- `deployBot(boss,t)` — Sir Deploys-A-Lot body with a Marlow pilot cockpit.
- Keep the existing creature/bug drawing (moved from renderer) as `creature`.

### Task 5: `renderer.mjs` — scene, ambience, HUD feedback

**Files:** Modify `public/renderer.mjs`.

- Use `sprites.mjs` for Milo, Marlow, Hollis, boss, creatures.
- Ambience: parallax, server LED blink, coffee steam, code-rain, conveyor.
- Effects: muzzle flash, hit flash, bigger bursts, shake, vignette.
- Boss health bar; upgrade overlay draw; letterbox-aware clear.

### Task 6: `main.mjs` + `index.html` + `style.css` — fullscreen, upgrade UI, trim, restyle

**Files:** Modify all three.

- Fullscreen ⛶ button beside Sound; Fullscreen API on game window; `F` toggles; CSS fallback; letterbox CSS.
- Upgrade overlay: three cards, click/tap or keys 1-3; wired to `chooseUpgrade`.
- Redraw Hollis SVG; trim terminal ticker/footer/edition to short lines.
- Restyle HUD as stat pills; add boss bar and card styles.

### Task 7: Rename sweep + docs/metadata + .gitignore

**Files:** all source, `README.md`, `package.json`, `wrangler.jsonc`, tests; create `.gitignore`.

- Text, identifiers, CSS, localStorage key, tests, wrangler `name`, package description.
- `.gitignore`: `node_modules/`, `.wrangler/`.
- README updated for new features and controls.

### Task 8: Verify + commit + push

- `node --test game.test.mjs world.test.mjs upgrades.test.mjs`
- `node --check` every `public/*.mjs`.
- Browser smoke via local server.
- Commit source (not node_modules/.wrangler) and push `main`.
