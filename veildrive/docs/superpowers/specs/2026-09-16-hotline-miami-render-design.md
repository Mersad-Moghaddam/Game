# VEIL//DRIVE — Hotline Miami Render Overhaul

Visual overhaul of the existing `veildrive` prototype. The game is already a
complete top-down roguelite (simulation, AI, collision, combat, progression and
Canvas-2D procedural art all work). This spec changes only how the game is
rendered and how it looks. Target look: **Hotline Miami** — saturated neon,
palette that pulses to the beat, heavy CRT/VHS post-processing, bold floor
patterns, and excessive gore.

## Goals

- Move presentation to a GPU render pipeline owned by Three.js so we get real
  post-processing (bloom, chromatic aberration, scanlines, barrel distortion,
  grain, colour grading) instead of hand-drawn overlays.
- Repaint the whole game in a Hotline Miami palette: high saturation, neon
  magenta/cyan/violet/orange on deep violet grounds, strong figure/ground
  contrast.
- Add per-zone mood palettes that cross-fade and pulse with the music beat.
- Add GPU-driven neon lighting: coloured glow pools, emissive elements that
  bloom, and a beat-synced brightness pulse.
- Dramatically upgrade gore, floor/wall patterns, characters, environments and
  effects.
- Keep the game runnable at 60 FPS on desktop and fully self-contained (no CDN,
  no external art/audio assets).

## Non-goals

- No gameplay, collision, AI, weapon-balance, scoring or progression changes.
- No new levels, enemies, weapons, masks or upgrades.
- No change to the internal resolution: the virtual canvas stays 960×540 and is
  **not** downscaled (no pixelation pass).
- No new audio content. Existing synthesised audio and its beat timer are reused
  as the pulse source.
- No mobile/touch support work.

## Art direction

### Palette

A shared, saturated palette replaces the current muted one in `src/data/config.js`.
Canonical swatches (names are the palette keys):

| Key        | Hex       | Use                                   |
| ---------- | --------- | ------------------------------------- |
| `void`     | `#0b0416` | out-of-bounds / letterbox dark        |
| `ground`   | `#1a0a33` | deep violet floor base                |
| `ground2`  | `#2a1055` | floor pattern accent                  |
| `wall`     | `#3d1263` | wall body                             |
| `wallHi`   | `#8a35d6` | wall top/edge highlight               |
| `hotPink`  | `#ff2e88` | primary neon                          |
| `magenta`  | `#ff1e9c` | secondary neon                        |
| `cyan`     | `#12e0ff` | primary cool neon                     |
| `blue`     | `#2e5bff` | cool accent                           |
| `violet`   | `#8b2bff` | mid neon                              |
| `orange`   | `#ff7a1a` | warm accent / fire                    |
| `lime`     | `#c6ff2e` | toxic accent                          |
| `bone`     | `#f6f2e6` | text / mask highlights                |
| `ink`      | `#120620` | outlines, shadow core                 |
| `blood`    | `#ff0a3c` | fresh blood                           |
| `bloodDark`| `#7a0018` | pooled/dried blood                    |

Dash/letterbox background stays near-black. Text stays `bone` on dark panels.

### Mood palettes and pulsing

The level already defines `zones` (asphalt, interior, office). Each zone gains
a `mood` id. A mood maps to `{ ground, ground2, wall, wallHi, glow, accent }`.

Moods (4): `sunset` (orange/pink/hotPink), `violet` (violet/blue/cyan),
`toxic` (lime/lime/cyan), `blood` (bloodDark/blood/orange).

- Zone transitions cross-fade mood colours over ~0.5 s when the camera moves
  between zones.
- A global `beatPulse` (0→1, decaying each beat) is derived from the existing
  `AudioSystem.beat` timer. It drives: neon glow intensity, floor-pattern
  brightness, wall highlight brightness, HUD accent, and a subtle bloom
  strength modulation. Pulse depth is capped so it never harms readability and
  is disabled when `music` volume is 0 or reduced-motion is preferred.
- Palette is data, not code: all colours resolve through helper
  `moodColor(mood, key, pulse)`.

### Floor and wall patterns

Floors are no longer flat fills:

- Asphalt/exterior: dark violet with painted **angled parking stripes** in
  `hotPink`, cracked slabs, oil stains, and occasional neon road markings.
- Interior corridors: bold **geometric carpet** — a two-tone repeating tile
  (diamond or checker) in the zone mood colours, with stains and scuff marks.
- Rooms: distinct rug/pattern per room so rooms read differently at a glance.
- Office: cool grid tiles with pink grout.
- Walls: thick `wall` body, `wallHi` top bevel with an inner dark line for
  depth, baseboard, cracks, bullet pocks, and spray-paint tags in neon.
- Windows/glass: bright translucent cyan with a neon frame and a highlight
  streak; moonlight replaced by neon spill.
- The motel exterior gets a **neon sign** (magenta) that flickers and blooms.

### Gore

Hotline Miami means extreme, readable violence:

- Directional blood sprays, arterial jets on melee kills, and fine mist.
- Large irregular **floor blood pools** that grow from bodies and persist for the
  rest of the run; they tint with the `blood` mood.
- Blood trails that follow knocked-back and stunned enemies.
- Persistent **corpses** with a decal under them; corpses can be shot again for
  extra gore and can alert guards (existing gameplay).
- Executions produce a burst plus a lasting pool.
- Blood, pools and corpses are all drawn into the static environment layer so
  they cost nothing per frame (see architecture).

### Characters

Redrawn for bold Hotline-Miami silhouettes while keeping every existing `draw()`
socket, hitbox radius and weapon mount unchanged:

- **Player / masks**: high-contrast bomber (neon piping), heavy black outline,
  bright mask with glowing eye slits. Each of the four masks keeps its distinct
  shape with a signature neon accent (MOTH teal/pink, RAM orange, FOX cyan,
  RAVEN violet) and animated walk/aim/recoil.
- **Enemies**: silhouette-first per archetype (guard cap, brawler bulk,
  shotgunner vest, hunter hood, elite visor), each with a distinct accent colour
  and a **glowing eye/sensor** that brightens in `COMBAT`.
- **Boss (THE PORTER)**: larger, keyhole mask, bellhop hat and uniform, arm
  animation, phase-driven accent shift, white damage flash and a telegraph glow.

### HUD and menus

- HUD: minimal and neon. Segmented health as bright pips, a compact weapon/ammo
  card, a dash meter, and a large animated **combo counter** that scales/pulses
  with `beatPulse`. Off-screen objective and threat markers as neon chevrons.
- Menus (title/settings/credits/upgrade/results): dark violet panels, neon
  rules and brackets, a full-screen animated background (rain, flickering neon
  sign, slow parallax), and a pulse on selection.
- All HUD/menu text remains crisp and is never passed through CRT distortion.

## Rendering architecture

### Render ownership

- `THREE.WebGLRenderer` renders into a dedicated WebGL canvas at 960×540; CSS
  letterboxes it exactly as today.
- `THREE.OrthographicCamera` sits in front of the layer quads.
- A second, transparent 2D canvas (`#ui`, also 960×540) is stacked over the
  WebGL canvas for HUD and menus, so UI stays sharp and undistorted. Input stays
  bound to the WebGL canvas; `#ui` is `pointer-events:none`.

### Layer model

All game art is still produced by the existing procedural Canvas-2D code. Per
frame the simulation draws into two offscreen canvases at 960×540:

1. **Albedo canvas** — the lit scene: environment blit + entities + particles +
   corpses. This replaces the current single-frame drawing.
2. **Emissive canvas** — additive glow only: neon signs, light cores, muzzle
   flashes, tracers, glowing eyes, objective, pickups, explosions. Drawn black
   where there is no glow, so a bloom threshold can isolate it.

The static environment is baked once into a world-sized **environment canvas**
(1800×1100) from `Level`; each frame the camera window is blitted into the top of
the albedo canvas (`drawImage`), and the bake is refreshed only when something
static changes (door opens, prop breaks, new blood decal/corpse). Bake refreshes
are cheap and infrequent.

Each canvas becomes a `THREE.CanvasTexture` on a full-screen quad. This keeps a
1:1 pixel mapping and avoids per-object coordinate/UV conversion, so no existing
`draw()` code needs rewriting.

### Lighting

A custom fullscreen shader pass replaces `Game.drawLighting`:

- Uniforms: up to 16 lights `{position (screen space), radius, colour,
  intensity}` sourced from `Level.lights` plus muzzle flashes and explosions;
  ambient level; player flashlight cone position/direction/arc; `beatPulse`.
- Output: `albedo × (ambient + Σ lightContribution)`, then `+ emissive`, with a
  mild contrast/saturation curve. Coloured neon falloff, no flat dark overlay.
- Lights flicker (fluorescent), pulse on the beat, and tint by zone mood.
- Quality setting reduces light count / disables flicker when lowered.

### Post-processing

`EffectComposer` chain:

1. `RenderPass` — the layer quads.
2. **Lighting** `ShaderPass` (above).
3. `UnrealBloomPass` — neon bloom, threshold tuned so only emissive blooms;
   strength modulated by `beatPulse`.
4. **CRT/VHS** `ShaderPass` — combined: horizontal + radial RGB chromatic
   aberration, rolling scanlines, barrel distortion, vignette, animated grain,
   saturation/contrast grade, and a short glitch/jitter burst triggered on
   player damage and explosions.
5. `OutputPass`.

`settings.post = false` (or low quality) bypasses 3–4 and renders the lighting
output directly. Reduced-motion suppresses scanline roll, glitch bursts and the
beat pulse.

### Fallback

If WebGL/`WebGLRenderer` creation fails, `Game` falls back to the existing pure
Canvas-2D render path (no post, flat lighting) so the game always runs. The
fallback reuses the albedo canvas and the legacy `drawLighting`/`drawPost`.

## Integration and build

- Vendor Three.js locally under `vendor/` (no CDN, no bundler):
  - `vendor/three.module.js`, `vendor/three.core.js` (the module imports core).
  - `vendor/jsm/postprocessing/`: `Pass.js`, `EffectComposer.js`, `RenderPass.js`,
    `ShaderPass.js`, `MaskPass.js`, `UnrealBloomPass.js`, `OutputPass.js`.
  - `vendor/jsm/shaders/`: `CopyShader.js`, `LuminosityHighPassShader.js`,
    `OutputShader.js`.
- `index.html` adds an `<script type="importmap">` mapping `three` →
  `./vendor/three.module.js` and `three/addons/` → `./vendor/jsm/`, before the
  module script, plus the `#ui` canvas.
- `scripts/build.mjs` copies `vendor/` into `dist/` alongside `index.html`,
  `style.css`, `src`.
- `scripts/dev.mjs` serves `.mjs`/`.js` as `text/javascript` (`.js` already is);
  no other server change.
- `style.css` keeps the letterbox scaling for both canvases and moves the
  scanline overlay out of CSS (CRT now lives in the shader); it may keep a
  subtle static overlay only if it does not fight the shader.

## Code changes

- New `src/render/Renderer.js` — WebGL renderer, ortho camera, layer quads,
  texture upload, composer construction, quality/post toggling, fallback probe.
- New `src/render/shaders.js` — GLSL for the lighting and CRT/VHS grade passes.
- New `src/render/mood.js` — mood palette table, `moodColor`, pulse helpers.
- `src/data/config.js` — new palette, mood table, updated `COLORS`.
- `src/core/Game.js` — split `render()` into `renderGL()` / `renderCanvas()`;
  own albedo+emissive canvases; split HUD/menu drawing onto the `#ui` context;
  beat pulse; camera intro zoom; pass light uniforms; keep all simulation code
  intact.
- `src/world/Level.js` — split static bake (`bakeStatic`) from per-frame blit;
  add mood zones, floor/wall patterns, neon sign, static decal/corpse support.
- `src/entities/Player.js`, `Enemy.js`, `Boss.js` — redrawn Hotline Miami art
  and animation; emissive parts drawn through an `emissive` flag/context.
- `src/systems/FX.js` — blood pools/trails/corpses, emissive particles, glitch
  trigger hooks; `drawGlow(ctx)` for the emissive layer.
- `src/main.js` — construct `Renderer`, pass to `Game`.
- `index.html`, `style.css`, `scripts/build.mjs`, `scripts/dev.mjs`, `README.md`.

## Settings and performance

- Existing settings gain no new user-facing toggles except reusing `quality`,
  `post`, `flashes`, `shake` and `highContrastCursor`. Reduced-motion is honoured
  automatically.
- Targets: 960×540, 60 FPS desktop, ≤2 canvas texture uploads/frame, ≤16 lights,
  one bloom pass. Static environment and blood are baked, not redrawn per frame.
- Quality presets: high = bloom + CRT + full lights + flicker; medium = bloom +
  CRT + fewer lights; low = lighting only, no bloom/CRT, no flicker.

## Testing

- `npm test` (`scripts/smoke.mjs`) must keep passing unchanged (level, weapons,
  masks, upgrades) — simulation is untouched.
- Add `scripts/verify-render.mjs` (Playwright, optional): boots the dev server,
  loads the page, and asserts (a) no console errors, (b) a WebGL context exists,
  (c) the rendered canvas is non-uniform (something drew), (d) a scripted run
  (move+shoot for ~5 s) produces no errors. Skips with a clear message if
  Playwright is not installed. Not part of `npm test`.
- `node --check` every changed/new `.js` file.
- `npm run build` produces a `dist/` containing `vendor/`.
- Manual browser pass: menu, a full run, boss, all four moods, damage glitch,
  settings toggles (post off, low quality), and the no-WebGL fallback.

## Phasing

Each phase leaves the game runnable and is committed separately:

1. Vendor Three.js, import map, build copies, `Renderer` scaffold rendering a
   clear colour; verify in headless Chromium.
2. Environment: static bake + per-frame blit into the albedo quad, with the
   redrawn Hotline Miami floor/wall/pattern art.
3. Actors + emissive layer: entities/particles drawn into albedo and emissive
   quads with redrawn characters and FX.
4. GPU lighting pass with mood-coloured lights and beat pulse.
5. Post chain: bloom + CRT/VHS grade + glitch bursts; quality/post toggles;
   Canvas-2D fallback path.
6. UI split onto `#ui` and the neon HUD/menu restyle.
7. Gore pass: pools, trails, corpses, high-res blood.
8. Verify (smoke, build, headless), update README, final art tune, commit, push.
