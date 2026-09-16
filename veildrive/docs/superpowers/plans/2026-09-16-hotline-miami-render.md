# VEIL//DRIVE — Hotline Miami Render Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-render the existing `veildrive` top-down roguelite through Three.js with a Hotline Miami look: neon palette, beat-synced colour pulsing, GPU lighting, and a bloom + CRT/VHS post chain, without touching gameplay.

**Architecture:** The simulation is unchanged. Each frame the existing Canvas-2D drawing code renders into two offscreen 960×540 canvases — *albedo* (lit scene) and *emissive* (glow only). Both become `CanvasTexture`s fed to a Three.js `EffectComposer`: a custom lighting `ShaderPass` combines them (`albedo × lights + emissive`), `UnrealBloomPass` blooms the neon, and a custom CRT/VHS pass grades and distorts. HUD/menus draw to a separate sharp 2D canvas overlay. The static environment is baked into an 1800×1100 world canvas and blitted per frame.

**Tech Stack:** Three.js r186 (vendored under `vendor/`, loaded via an import map — no bundler, no CDN), Canvas 2D, ES modules, Web Audio.

**Spec:** `docs/superpowers/specs/2026-09-16-hotline-miami-render-design.md`

## Global Constraints

- Internal resolution is **960×540** and is never downscaled; `VIRTUAL_W`/`VIRTUAL_H` unchanged.
- Virtual world is **1800×1100**; `Level` must remain usable in Node (no `document`/`canvas` in its constructor — `scripts/smoke.mjs` imports it).
- No new gameplay, collision, AI, weapon, mask, upgrade, level or audio content.
- Rendering must remain self-contained: no CDN, no external asset files.
- Draw into the emissive layer only with `globalCompositeOperation = 'lighter'` on a black fill.
- Every phase leaves the game runnable; commit after each task.
- Palette keys are exactly: `void, ground, ground2, wall, wallHi, hotPink, magenta, cyan, blue, violet, orange, lime, bone, ink, blood, bloodDark`.
- Mood ids are exactly: `sunset, violet, toxic, blood`.
- Respect `settings.post`, `settings.quality`, `settings.flashes`, `settings.shake`, `settings.highContrastCursor`; honour `prefers-reduced-motion`.

---

### Task 1: Vendor Three.js, import map, and Renderer scaffold

**Files:**
- Create: `vendor/three.module.js`, `vendor/three.core.js`, `vendor/jsm/postprocessing/{Pass,EffectComposer,RenderPass,ShaderPass,MaskPass,UnrealBloomPass,OutputPass}.js`, `vendor/jsm/shaders/{CopyShader,LuminosityHighPassShader,OutputShader}.js`
- Create: `src/render/Renderer.js`
- Modify: `index.html`
- Modify: `scripts/build.mjs`
- Modify: `package.json` (add `three` to devDependencies for re-vendoring)

**Interfaces:**
- Produces: `new Renderer(glCanvas)` with `{ available, w, h, albedoCtx, emissiveCtx, canvas, render(), setSize(), dispose() }`. `available === false` on WebGL failure.
- Produces: import map mapping `three` → `./vendor/three.module.js` and `three/addons/` → `./vendor/jsm/`.

- [ ] **Step 1: Install Three and copy the closure into `vendor/`**

```bash
cd "$(git rev-parse --show-toplevel)/veildrive"
npm install --no-save --no-audit --no-fund three@0.186.0
mkdir -p vendor/jsm/postprocessing vendor/jsm/shaders
cp node_modules/three/build/three.module.js vendor/three.module.js
cp node_modules/three/build/three.core.js   vendor/three.core.js
for f in Pass EffectComposer RenderPass ShaderPass MaskPass UnrealBloomPass OutputPass; do
  cp "node_modules/three/examples/jsm/postprocessing/$f.js" vendor/jsm/postprocessing/
done
for f in CopyShader LuminosityHighPassShader OutputShader; do
  cp "node_modules/three/examples/jsm/shaders/$f.js" vendor/jsm/shaders/
done
ls -R vendor
```

Expected: `vendor/` contains the two Three builds and exactly 10 addon files.

- [ ] **Step 2: Add the import map and keep the canvas**

Replace `index.html` with:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#0b0416" />
  <title>VEIL//DRIVE — Motel Static</title>
  <link rel="stylesheet" href="./style.css" />
  <script type="importmap">
  {
    "imports": {
      "three": "./vendor/three.module.js",
      "three/addons/": "./vendor/jsm/"
    }
  }
  </script>
</head>
<body>
  <main id="stage" aria-label="VEIL DRIVE game canvas">
    <canvas id="game" width="960" height="540"></canvas>
    <div id="scanlines" aria-hidden="true"></div>
  </main>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Copy `vendor/` in the build**

In `scripts/build.mjs` change the copy loop line:

```js
for (const entry of ['index.html','style.css','src','vendor']) fs.cpSync(path.join(root,entry), path.join(out,entry), {recursive:true});
```

- [ ] **Step 4: Write the Renderer scaffold**

Create `src/render/Renderer.js`:

```js
import * as THREE from 'three';
import { VIRTUAL_W, VIRTUAL_H } from '../data/config.js';

const hex = c => c.replace('#','');

export class Renderer {
  constructor(glCanvas) {
    this.available = false;
    this.w = VIRTUAL_W; this.h = VIRTUAL_H;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, alpha: false });
    } catch (err) { this.error = err; return; }
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.w, this.h, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.albedo = makeLayer();
    this.albedo.texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: this.albedo.texture, depthTest: false, depthWrite: false })
    );
    this.scene.add(mesh);
    this.albedoMesh = mesh;
    this.available = true;
  }
  get albedoCtx() { return this.albedo.ctx; }
  render() {
    if (!this.available) return;
    this.albedo.texture.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }
  setSize() { if (this.available) this.renderer.setSize(this.w, this.h, false); }
  dispose() { if (this.available) this.renderer.dispose(); }
}

function makeLayer() {
  const canvas = document.createElement('canvas');
  canvas.width = VIRTUAL_W; canvas.height = VIRTUAL_H;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#' + hex('#0b0416');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return { canvas, ctx, texture };
}
```

- [ ] **Step 5: Boot it from `main.js` to prove the pipeline**

Replace `src/main.js` with:

```js
import { Game } from './core/Game.js';
import { Renderer } from './render/Renderer.js';
const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const game = new Game(canvas, renderer);
game.start();
window.__VEILDRIVE__ = game;
```

In `src/core/Game.js` change the constructor signature `constructor(canvas)` → `constructor(canvas, renderer)` and, at the end of `render()`, when `this.renderer?.available`, call `this.renderer.render()`. For this task only, temporarily make `render()` paint the albedo ctx magenta so the pipeline is visible:

```js
render() {
  const c = this.ctx;
  if (this.renderer?.available) {
    const a = this.renderer.albedoCtx;
    a.fillStyle = '#ff2e88'; a.fillRect(0, 0, 960, 540);
    this.renderer.render();
    return;
  }
  /* ...existing canvas path unchanged... */
}
```

- [ ] **Step 6: Verify headless (no console errors, WebGL alive, non-uniform)**

```bash
cd "$(git rev-parse --show-toplevel)/veildrive"
node scripts/dev.mjs > /tmp/veil-dev.log 2>&1 &
sleep 1
mise x npm:playwright -- playwright screenshot --viewport-size="1280,720" --wait-for-timeout=2000 http://localhost:4173/ /tmp/veil-shots/t1.png 2>&1 | tail -3
node -e "const s=require('fs').statSync('/tmp/veil-shots/t1.png');if(s.size<20000)throw new Error('blank');console.log('ok',s.size)"
```

Expected: screenshot > 20 KB (a solid magenta frame compresses small; if under, confirm the colour via a DOM probe instead). Then delete the temporary magenta block from `Game.render()`.

- [ ] **Step 7: Commit**

```bash
git add vendor index.html scripts/build.mjs src/render/Renderer.js src/main.js src/core/Game.js package.json
git commit -m "feat(render): vendor three.js and add renderer scaffold"
```

---

### Task 2: Palette, mood table, and pulse helper

**Files:**
- Modify: `src/data/config.js`
- Create: `src/render/mood.js`
- Modify: `scripts/smoke.mjs` (add pure checks)

**Interfaces:**
- Produces: `COLORS` with the exact global palette keys.
- Produces: `MOODS` (ids `sunset|violet|toxic|blood`) and `moodColor(moodId, key, pulse=0)` → `'#rrggbb'`.

- [ ] **Step 1: Add a failing smoke check**

Append to `scripts/smoke.mjs` before the final `console.log`:

```js
import { MOODS, moodColor } from '../src/render/mood.js';
import { COLORS } from '../src/data/config.js';
assert.deepEqual(Object.keys(MOODS).sort(), ['blood','sunset','toxic','violet']);
for (const id of Object.keys(MOODS)) {
  for (const key of ['ground','ground2','wall','wallHi','glow','accent']) {
    assert(/^#[0-9a-f]{6}$/i.test(moodColor(id, key, 0.5)), `bad mood color ${id}.${key}`);
  }
}
assert.equal(moodColor('sunset','glow',0), moodColor('sunset','glow',0), 'mood color must be deterministic');
for (const key of ['void','ground','ground2','wall','wallHi','hotPink','magenta','cyan','blue','violet','orange','lime','bone','ink','blood','bloodDark']) {
  assert(COLORS[key] && /^#[0-9a-f]{6}$/i.test(COLORS[key]), `missing palette key ${key}`);
}
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/render/mood.js'`.

- [ ] **Step 3: Replace the palette in `config.js`**

Replace the `COLORS` const:

```js
export const COLORS = {
  void:'#0b0416', ground:'#1a0a33', ground2:'#2a1055', wall:'#3d1263', wallHi:'#8a35d6',
  hotPink:'#ff2e88', magenta:'#ff1e9c', cyan:'#12e0ff', blue:'#2e5bff', violet:'#8b2bff',
  orange:'#ff7a1a', lime:'#c6ff2e', bone:'#f6f2e6', ink:'#120620', blood:'#ff0a3c', bloodDark:'#7a0018'
};
```

- [ ] **Step 4: Write `src/render/mood.js`**

```js
export const MOODS = {
  sunset: { ground:'#1a0a33', ground2:'#4a1240', wall:'#5a1440', wallHi:'#ff5a3c', glow:'#ff7a1a', accent:'#ff2e88' },
  violet: { ground:'#150733', ground2:'#341063', wall:'#4a1a7a', wallHi:'#b06bff', glow:'#8b2bff', accent:'#12e0ff' },
  toxic:  { ground:'#101a12', ground2:'#243a12', wall:'#2e4a1a', wallHi:'#c6ff2e', glow:'#c6ff2e', accent:'#12e0ff' },
  blood:  { ground:'#1a0611', ground2:'#3a0a1c', wall:'#5a0f26', wallHi:'#ff4a5a', glow:'#ff7a1a', accent:'#ff0a3c' }
};

const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const hexToRgb = h => { const n = parseInt(h.slice(1),16); return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 }; };
const rgbToHex = c => { const v = v => clamp(Math.round(v),0,255).toString(16).padStart(2,'0'); return `#${v(c.r)}${v(c.g)}${v(c.b)}`; };

export function moodColor(moodId, key, pulse = 0) {
  const base = (MOODS[moodId] || MOODS.violet)[key] || '#ffffff';
  const c = hexToRgb(base);
  const k = 1 + 0.45 * clamp(pulse, 0, 1);
  return rgbToHex({ r:c.r*k, g:c.g*k, b:c.b*k });
}
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: `VEIL//DRIVE smoke checks passed.`

- [ ] **Step 6: Commit**

```bash
git add src/data/config.js src/render/mood.js scripts/smoke.mjs
git commit -m "feat(render): hotline miami palette and mood pulse helper"
```

---

### Task 3: Static environment bake + Hotline Miami floor/wall art

**Files:**
- Modify: `src/world/Level.js`
- Modify: `scripts/smoke.mjs`

**Interfaces:**
- Consumes: `COLORS`, `MOODS` from Tasks 2.
- Produces: `Level.bake(ctx)` — draws the whole static world into a 1800×1100 ctx.
- Produces: `Level.dirty` (bool) and `Level.markDirty()`; `Level.zoneAt(x,y)` → mood id; `Level.paintDecal(ctx,d)` and `Level.paintCorpse(ctx,c)`.
- Keeps `Level.draw(ctx)` as an alias of `bake` for the fallback path.
- Keeps the `Level` constructor free of `document`.

- [ ] **Step 1: Add a failing structural smoke check**

Append to `scripts/smoke.mjs` before the final log:

```js
assert.equal(typeof level.bake, 'function', 'Level.bake missing');
assert.equal(level.dirty, false, 'level starts clean');
level.markDirty(); assert.equal(level.dirty, true, 'markDirty sets dirty');
assert.equal(typeof level.zoneAt, 'function', 'Level.zoneAt missing');
assert(['sunset','violet','toxic','blood'].includes(level.zoneAt(400, 300)), 'zoneAt returns a mood');
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — `Level.bake missing`.

- [ ] **Step 3: Add mood zones and dirty tracking to `Level`**

In the `Level` constructor add `this.dirty=false;`. In `build()`, change the `zones` array to carry moods:

```js
this.zones=[
  {x:0,y:0,w:1800,h:1100,type:'asphalt',mood:'sunset'},
  {x:330,y:100,w:1240,h:820,type:'interior',mood:'violet'},
  {x:1220,y:690,w:320,h:200,type:'office',mood:'toxic'}
];
```

Add methods:

```js
markDirty(){ this.dirty = true; }
zoneAt(x,y){ for(const z of this.zones) if(x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h&&z.type!=='asphalt') return z.mood; return 'sunset'; }
```

Call `this.markDirty()` at the end of `openDoor()` and in `damageProp()` when a prop breaks.

- [ ] **Step 4: Rewrite `Level.draw` as `bake` with patterned floors**

Rename `draw(ctx)` → `bake(ctx)` and keep `draw(ctx){ this.bake(ctx); }`. Replace the flat fills with mood-driven patterns driven by `moodColor(zone.mood, key, 0)`:

- Asphalt: fill `void`; parking stripes at 45° in `hotPink` (lineWidth 4, alpha 0.35); cracked slab lines in `ink`; a few oil ellipses.
- Interior: fill `ground`; diagonal two-tone checker using `ground`/`ground2` tiles of 48 px (`for x,y in steps of 48` alternating fill); scuff specks.
- Office: fill `ground`; 32 px grid lines in `moodColor('toxic','wallHi',0)` at alpha 0.15.
- Walls: body `wall`; inner dark line `ink`; 6 px top bevel `wallHi`; baseboard 3 px `ink`; random cracks and bullet pocks seeded deterministically from wall coords (use a tiny hash `(x*73856093 ^ y*19349663) >>> 0`).
- Doors: closed = `wall` panel with `wallHi` frame; open/broken = dashed `orange` outline.
- Props: per-type palette from `COLORS` (car `blue`, bed `magenta`, vending `hotPink`, barrel `orange`, glass translucent `cyan`, sofa/desk/table `violet`).
- Windows/glass unbroken: translucent `cyan` with a white streak.
- Neon sign: draw at the exterior top-left with `hotPink` glow rectangles and the text `MOTEL` in `bone`.
- Lights are unchanged data; add `mood` to each light entry from its zone, e.g. `{x:500,y:260,r:190,mood:'violet'}`.

Add the decal/corpse painters:

```js
paintDecal(ctx,d){ ctx.globalAlpha=d.a; ctx.fillStyle=COLORS.bloodDark; ctx.beginPath(); ctx.ellipse(d.x,d.y,d.r,d.r*.65,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
paintCorpse(ctx,c){ ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.a); ctx.fillStyle='#2a1030'; ctx.fillRect(-11,-7,22,14); ctx.fillStyle=COLORS.blood; ctx.beginPath(); ctx.arc(6,0,5,0,Math.PI*2); ctx.fill(); ctx.restore(); }
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/world/Level.js scripts/smoke.mjs
git commit -m "feat(level): hotline miami patterned environment bake"
```

---

### Task 4: Albedo/emissive pipeline for gameplay

**Files:**
- Modify: `src/render/Renderer.js` (add emissive layer + `render()`)
- Modify: `src/core/Game.js` (bake world canvas, split render)
- Modify: `src/entities/Player.js`, `src/entities/Enemy.js`, `src/entities/Boss.js` (add `drawGlow(ctx)`)
- Modify: `src/systems/FX.js` (`drawGlow(ctx)`)

**Interfaces:**
- Consumes: `Renderer.albedoCtx` (Task 1), `Level.bake` (Task 3).
- Produces: `Renderer.emissiveCtx`; `Renderer.render()` uploads both textures.
- Produces: `FX.drawGlow(ctx)`; `Player.drawGlow(ctx)`, `Enemy.drawGlow(ctx)`, `Boss.drawGlow(ctx)`.

- [ ] **Step 1: Add the emissive layer to the Renderer**

In `Renderer` constructor add `this.emissive = makeLayer();` and a second plane with additive blending:

```js
this.emissive.texture.colorSpace = THREE.SRGBColorSpace;
const glowMat = new THREE.MeshBasicMaterial({ map: this.emissive.texture, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
const glowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), glowMat);
glowMesh.position.z = 0.1;
this.scene.add(glowMesh);
this.emissiveMesh = glowMesh;
```

Add getter `get emissiveCtx(){ return this.emissive.ctx; }`, and in `render()` set `this.emissive.texture.needsUpdate = true;`. (Task 6 replaces this additive mesh with the shader's `tEmissive` uniform; keeping the mesh here makes Task 4 work standalone.)

- [ ] **Step 2: Bake the world canvas in Game**

In `Game.startRun()` do not bake yet. Add a method:

```js
ensureWorld(){
  if (!this.worldCanvas) {
    this.worldCanvas = document.createElement('canvas');
    this.worldCanvas.width = this.level.w; this.worldCanvas.height = this.level.h;
    this.worldCtx = this.worldCanvas.getContext('2d');
    this.worldCtx.imageSmoothingEnabled = false;
    this.level.markDirty();
  }
  if (this.level.dirty) { this.rebakeWorld(); this.level.dirty = false; }
  this.drainDecalsAndCorpses();
}
rebakeWorld(){
  this.level.bake(this.worldCtx);
  for (const d of this.fx.decals) this.level.paintDecal(this.worldCtx, d);
  for (const c of this.fx.corpses) this.level.paintCorpse(this.worldCtx, c);
  this.decalDrawn = this.fx.decals.length;
  this.corpseDrawn = this.fx.corpses.length;
}
drainDecalsAndCorpses(){
  for (let i = this.decalDrawn || 0; i < this.fx.decals.length; i++) this.level.paintDecal(this.worldCtx, this.fx.decals[i]);
  this.decalDrawn = this.fx.decals.length;
  for (let i = this.corpseDrawn || 0; i < this.fx.corpses.length; i++) this.level.paintCorpse(this.worldCtx, this.fx.corpses[i]);
  this.corpseDrawn = this.fx.corpses.length;
}
```

In `startRun()` reset `this.worldCanvas=null; this.decalDrawn=0; this.corpseDrawn=0;`.

In the `FX` constructor add `this.corpses = [];` now (Task 9 fills it) so the loops below are safe. In the `Game` constructor add `this.uiCtx = this.ctx;` as a temporary UI target; Task 5 replaces it with the real `#ui` context.

- [ ] **Step 3: Split `Game.render()` and draw the world through the albedo layer**

Replace `render()`:

```js
render() {
  if (this.renderer?.available) return this.renderGL();
  return this.renderCanvas();
}
```

Keep the existing body as `renderCanvas()` verbatim. Add `renderGL()`:

```js
renderGL() {
  const c = this.renderer.albedoCtx, g = this.renderer.emissiveCtx, ui = this.uiCtx;
  c.setTransform(1,0,0,1,0,0); c.fillStyle = COLORS.void; c.fillRect(0,0,VIRTUAL_W,VIRTUAL_H);
  g.setTransform(1,0,0,1,0,0); g.fillStyle = '#000000'; g.fillRect(0,0,VIRTUAL_W,VIRTUAL_H);
  if (this.state === 'menu') { this.drawMenu(ui); this.renderer.render(); return; }
  if (this.state === 'settings') { this.drawSettings(ui); this.renderer.render(); return; }
  if (this.state === 'credits')  { this.drawCredits(ui); this.renderer.render(); return; }
  if (this.state === 'results')  { this.drawResults(ui); this.renderer.render(); return; }
  if (!this.level) { this.renderer.render(); return; }
  this.ensureWorld();
  const ox = -this.cam.x + this.shakeX, oy = -this.cam.y + this.shakeY;
  c.drawImage(this.worldCanvas, this.cam.x - this.shakeX, this.cam.y - this.shakeY, VIRTUAL_W, VIRTUAL_H, 0, 0, VIRTUAL_W, VIRTUAL_H);
  c.save(); c.translate(ox, oy);
  for (const b of this.projectiles) { c.strokeStyle=b.color; c.lineWidth=2; c.beginPath(); c.moveTo(b.px,b.py); c.lineTo(b.x,b.y); c.stroke(); }
  for (const t of this.thrown) { c.save(); c.translate(t.x,t.y); c.rotate(t.a); c.fillStyle=t.weapon.color; c.fillRect(-10,-3,20,6); c.restore(); }
  for (const h of this.hazards) { c.save(); c.translate(h.x,h.y); c.rotate(h.a||0); c.fillStyle='#8f6c4e'; c.fillRect(-9,-7,18,14); c.restore(); }
  for (const e of this.enemies) e.draw(c, this.debug);
  if (this.boss) this.boss.draw(c);
  this.fx.draw(c); this.player.draw(c);
  c.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; g.translate(ox, oy);
  this.fx.drawGlow(g);
  for (const e of this.enemies) e.drawGlow(g);
  if (this.boss) this.boss.drawGlow(g);
  this.player.drawGlow(g);
  g.restore();
  this.renderer.render();
  this.drawHUD(this.uiCtx);
  if (this.state === 'upgrade') this.drawUpgrade(this.uiCtx);
  if (this.state === 'paused') this.drawPause(this.uiCtx);
  if (this.player.dead) this.drawDeath(this.uiCtx);
  if (this.debug) this.drawDebug(this.uiCtx);
}
```

Import `COLORS` in `Game.js`.

- [ ] **Step 4: Add no-op `drawGlow` methods so Task 4 runs**

Add to `Player`, `Enemy`, `Boss`:

```js
drawGlow(ctx) { /* filled in Task 8 */ }
```

Add to `FX`:

```js
drawGlow(ctx) {
  for (const f of this.flashes) {
    const a = Math.max(0, f.life / f.max);
    const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
    grd.addColorStop(0, `rgba(255,255,255,${a})`);
    grd.addColorStop(0.4, hexA(f.color, a * 0.8));
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fill();
  }
}
```

with a module helper `const hexA = (hex,a)=>{ const n=parseInt(hex.slice(1),16); return \`rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})\`; };`

- [ ] **Step 5: Verify the game renders and plays**

```bash
node scripts/dev.mjs > /tmp/veil-dev.log 2>&1 & sleep 1
mise x npm:playwright -- playwright screenshot --wait-for-timeout=2500 --viewport-size="1280,720" http://localhost:4173/ /tmp/veil-shots/t4.png 2>&1 | tail -2
```

Expected: no console errors in `/tmp/veil-dev.log`; the menu renders (Task 4 does not restore colourful gameplay HUD yet).

- [ ] **Step 6: Commit**

```bash
git add src/render/Renderer.js src/core/Game.js src/entities src/systems/FX.js
git commit -m "feat(render): albedo + emissive layer pipeline"
```

---

### Task 5: Split HUD/menus onto the `#ui` canvas

**Files:**
- Modify: `index.html` (add `#ui`), `style.css`, `src/core/Game.js`, `src/main.js`

**Interfaces:**
- Consumes: Renderer from Task 4.
- Produces: `Game.uiCtx`; `Game.drawHUD(ctx)`, `drawUpgrade(ctx)`, `drawPause(ctx)`, `drawDeath(ctx)`, `drawDebug(ctx)`, `drawSettings(ctx)`, `drawCredits(ctx)`, `drawResults(ctx)`, `drawMenuUI()` all take/use the ui context.
- Produces: `Game.drawMenuWorld(ctx)` and `Game.drawResultsWorld(ctx)` (animated backdrops into the albedo layer).

- [ ] **Step 1: Add the UI canvas**

In `index.html` add above `#scanlines`:

```html
<canvas id="ui" width="960" height="540" aria-hidden="true"></canvas>
```

In `style.css` add `#ui { position:absolute; pointer-events:none; image-rendering:pixelated; }` and keep `#game`'s sizing rule; add `#ui` to the same size (share a selector):

```css
#game, #ui { position:absolute; image-rendering:pixelated; image-rendering:crisp-edges; outline:none; box-shadow:0 0 80px rgba(0,0,0,.75); }
#ui { pointer-events:none; }
```

- [ ] **Step 2: Wire `uiCtx` and resize it with `#game`**

In `Game` constructor add:

```js
this.uiCanvas = document.getElementById('ui');
this.uiCtx = this.uiCanvas ? this.uiCanvas.getContext('2d') : null;
this.uiCtx && (this.uiCtx.imageSmoothingEnabled = false);
```

In `resize()` apply the same computed `cw/ch` to `this.uiCanvas.style` as to the game canvas.

- [ ] **Step 3: Clear the UI each frame and draw HUD/menus there**

At the top of `renderGL()` add:

```js
if (this.uiCtx) { this.uiCtx.setTransform(1,0,0,1,0,0); this.uiCtx.clearRect(0,0,VIRTUAL_W,VIRTUAL_H); }
```

Change every HUD/menu draw call in `renderGL()` to pass `this.uiCtx`, and swap the Task-4 menu branches to use the new world backdrops:

```js
if (this.state === 'menu') { this.drawMenuWorld(c); this.renderer.render(); this.drawMenuUI(); return; }
if (this.state === 'settings') { this.drawMenuWorld(c); this.renderer.render(); this.drawSettings(this.uiCtx); return; }
if (this.state === 'credits')  { this.drawMenuWorld(c); this.renderer.render(); this.drawCredits(this.uiCtx); return; }
if (this.state === 'results')  { this.drawResultsWorld(c); this.renderer.render(); this.drawResults(this.uiCtx); return; }
```

with `drawMenuUI()` defined as:

```js
drawMenuUI() { const c = this.uiCtx; if (!c) return; this.drawMenu(c); }
```

Keep `drawMenu(c)` as-is for now (restyled in Task 10). In `renderCanvas()` (fallback) keep drawing everything on the single canvas.
Also remove the temporary `this.uiCtx = this.ctx;` from the constructor so `uiCtx` is the real overlay.

- [ ] **Step 4: Add the animated menu backdrop skeleton**

Add to `Game`:

```js
drawMenuWorld(c) { c.fillStyle = COLORS.void; c.fillRect(0,0,960,540); }
drawResultsWorld(c) { c.fillStyle = COLORS.void; c.fillRect(0,0,960,540); }
```

(Fleshed out in Task 10.)

- [ ] **Step 5: Verify**

Run the dev server + screenshot as in Task 4/Step 5, and confirm the menu is legible over the WebGL backdrop and there are no console errors.

- [ ] **Step 6: Commit**

```bash
git add index.html style.css src/core/Game.js src/main.js
git commit -m "feat(render): split HUD and menus onto the ui canvas"
```

---

### Task 6: GPU lighting pass

**Files:**
- Create: `src/render/shaders.js`
- Modify: `src/render/Renderer.js` (composer + lighting pass; remove the additive emissive mesh)
- Modify: `src/core/Audio.js` (expose `pulse`)
- Modify: `src/core/Game.js` (feed uniforms, beat pulse)
- Modify: `src/world/Level.js` (light `mood` already added in Task 3)

**Interfaces:**
- Consumes: `MOODS`, `moodColor`.
- Produces: `AudioSystem.pulse` (number, decays); `Game.beatPulse()`.
- Produces: `Renderer.setLights({ lights, ambient, pulse, flash, flashlight })` and `Renderer.setPost(bool)`, `Renderer.setQuality(number)`.
- Produces: `LightingShader` in `src/render/shaders.js`.

- [ ] **Step 1: Write the lighting shader**

Create `src/render/shaders.js` exporting `LightingShader`:

```js
import * as THREE from 'three';

export const MAX_LIGHTS = 16;

export const LightingShader = {
  uniforms: {
    tDiffuse: { value: null },
    tEmissive: { value: null },
    uAmbient: { value: 0.30 },
    uPulse: { value: 0 },
    uResolution: { value: new THREE.Vector2(960, 540) },
    uLightPos: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector2()) },
    uLightColor: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Color()) },
    uLightData: { value: new Float32Array(MAX_LIGHTS * 2) }, // radius, intensity
    uLightCount: { value: 0 },
    uFlashPos: { value: new THREE.Vector2() },
    uFlashArc: { value: 0.6 },
    uFlashOn: { value: 0 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    #define MAX_LIGHTS ${MAX_LIGHTS}
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform sampler2D tEmissive;
    uniform float uAmbient;
    uniform float uPulse;
    uniform vec2  uResolution;
    uniform vec2  uLightPos[MAX_LIGHTS];
    uniform vec3  uLightColor[MAX_LIGHTS];
    uniform float uLightData[MAX_LIGHTS * 2];
    uniform int   uLightCount;
    uniform vec2  uFlashPos;
    uniform float uFlashArc;
    uniform float uFlashOn;

    void main(){
      vec3 base = texture2D(tDiffuse, vUv).rgb;
      vec3 glow = texture2D(tEmissive, vUv).rgb;
      vec2 px = vUv * uResolution;

      vec3 light = vec3(uAmbient);
      for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= uLightCount) break;
        float radius = uLightData[i * 2];
        float intensity = uLightData[i * 2 + 1] * (1.0 + 0.5 * uPulse);
        float d = distance(px, uLightPos[i]);
        float atten = pow(clamp(1.0 - d / radius, 0.0, 1.0), 2.0);
        light += uLightColor[i] * atten * intensity;
      }
      if (uFlashOn > 0.5) {
        vec2 dir = normalize(px - uFlashPos);
        float cone = smoothstep(uFlashArc, 0.0, abs(dir.y));
        light += vec3(1.0, 0.85, 0.6) * cone * 0.35;
      }
      vec3 lit = base * light;
      lit = lit / (lit + vec3(0.85));           // soft roll-off
      vec3 outCol = lit * 1.6 + glow;
      outCol = mix(outCol, smoothstep(vec3(0.0), vec3(1.0), outCol), 0.15);
      gl_FragColor = vec4(outCol, 1.0);
    }
  `
};
```

- [ ] **Step 2: Build the composer in the Renderer**

In `Renderer` constructor after the albedo mesh, construct:

```js
this.composer = new EffectComposer(this.renderer);
this.composer.addPass(new RenderPass(this.scene, this.camera));
this.lightPass = new ShaderPass(LightingShader);
this.lightPass.uniforms.tEmissive.value = this.emissive.texture;
this.lightPass.uniforms.uResolution.value.set(this.w, this.h);
this.composer.addPass(this.lightPass);
this.postEnabled = true;
```

Change `render()` to:

```js
render() {
  if (!this.available) return;
  this.albedo.texture.needsUpdate = true;
  this.emissive.texture.needsUpdate = true;
  this.emissiveMesh.visible = false; // emissive is consumed by the light pass
  if (this.postEnabled) this.composer.render();
  else this.renderer.render(this.scene, this.camera);
  this.emissiveMesh.visible = true;
}
```

Add:

```js
setPost(on) { this.postEnabled = !!on; }
setQuality(q) { this.quality = q; this.composer && (this.composer.setSize(this.w, this.h)); }
setLights({ lights = [], ambient = 0.3, pulse = 0, flashPos = null, flashArc = 0.6 }) {
  if (!this.available) return;
  const u = this.lightPass.uniforms;
  const n = Math.min(lights.length, MAX_LIGHTS);
  for (let i = 0; i < n; i++) {
    u.uLightPos.value[i].set(lights[i].sx, lights[i].sy);
    u.uLightColor.value[i].set(lights[i].color);
    u.uLightData.value[i * 2] = lights[i].radius;
    u.uLightData.value[i * 2 + 1] = lights[i].intensity;
  }
  u.uLightCount.value = n;
  u.uAmbient.value = ambient;
  u.uPulse.value = pulse;
  if (flashPos) { u.uFlashPos.value.set(flashPos.sx, flashPos.sy); u.uFlashArc.value = flashArc; u.uFlashOn.value = 1; }
  else u.uFlashOn.value = 0;
}
```

Import `EffectComposer`, `RenderPass`, `ShaderPass`, `MAX_LIGHTS`, `LightingShader`.

- [ ] **Step 3: Expose a beat pulse**

In `AudioSystem.startDrone()`'s interval, add `this.pulse = 1;` inside the beat block. In the constructor add `this.pulse = 0;`. Add a method:

```js
decayPulse(dt) { this.pulse = Math.max(0, (this.pulse || 0) - dt * 3.2); }
```

- [ ] **Step 4: Feed lights from Game**

In `Game.update(dt)` (playing branch) add `this.audio.decayPulse(dt);`.

Add methods:

```js
beatPulse() { return this.settings.music > 0 ? (this.audio.pulse || 0) * Math.min(1, this.audio.intensity + 0.35) : 0; }
pushLights() {
  if (!this.renderer?.available) return;
  const pulse = this.beatPulse();
  const lights = [];
  for (const l of this.level.lights) {
    const mood = this.level.zoneAt(l.x, l.y);
    const col = new THREE.Color(moodColor(mood, 'glow', pulse));
    lights.push({ sx: l.x - this.cam.x + this.shakeX, sy: l.y - this.cam.y + this.shakeY, radius: l.r, intensity: 0.55, color: col });
  }
  for (const f of this.fx.flashes) {
    lights.push({ sx: f.x - this.cam.x + this.shakeX, sy: f.y - this.cam.y + this.shakeY, radius: f.r * 2.2, intensity: 1.1, color: new THREE.Color(f.color) });
  }
  this.renderer.setLights({ lights, ambient: 0.30, pulse, flashPos: null, flashArc: 0.6 });
}
```

Call `this.pushLights()` in `renderGL()` just before `this.renderer.render()`. Import `THREE` and `moodColor`.

- [ ] **Step 5: Verify**

Run the dev server, screenshot the menu and a played run; confirm no console errors and that the frame is no longer flat-dark.

- [ ] **Step 6: Commit**

```bash
git add src/render/shaders.js src/render/Renderer.js src/core/Audio.js src/core/Game.js
git commit -m "feat(render): gpu neon lighting pass with beat pulse"
```

---

### Task 7: Bloom + CRT/VHS post chain, toggles, and canvas fallback

**Files:**
- Modify: `src/render/shaders.js` (add `CRTShader`)
- Modify: `src/render/Renderer.js` (bloom + CRT + output; quality/post)
- Modify: `src/core/Game.js` (damage/explosion glitch, pushLights)
- Modify: `style.css` (soften the CSS scanline overlay)

**Interfaces:**
- Consumes: composer from Task 6.
- Produces: `Renderer.glitch(strength)`; `Renderer.setPost`, `setQuality` honour the settings.
- Produces: `CRTShader`.

- [ ] **Step 1: Write the CRT/VHS shader**

Append to `src/render/shaders.js`:

```js
export const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(960, 540) },
    uAberration: { value: 1.1 },
    uScanline: { value: 0.10 },
    uGrain: { value: 0.055 },
    uVignette: { value: 0.42 },
    uBarrel: { value: 0.06 },
    uSaturation: { value: 1.28 },
    uContrast: { value: 1.06 },
    uGlitch: { value: 0 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform float uTime, uAberration, uScanline, uGrain, uVignette, uBarrel, uSaturation, uContrast, uGlitch;
    uniform vec2 uResolution;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    void main(){
      vec2 uv = vUv * 2.0 - 1.0;
      uv *= 1.0 + uBarrel * dot(uv, uv);
      uv = uv * 0.5 + 0.5;
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0,0.0,0.0,1.0); return; }
      float gl = uGlitch * (0.5 + 0.5 * sin(uTime * 40.0));
      uv.x += gl * 0.012 * sin(uv.y * 60.0 + uTime * 30.0);

      vec2 dir = uv - 0.5;
      float ab = (uAberration + gl * 3.0) / uResolution.x;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ab).b;

      float scan = 1.0 - uScanline * (0.5 + 0.5 * sin(uv.y * uResolution.y * 1.6 + uTime * 3.0));
      col *= scan;

      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(lum), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;

      float vig = smoothstep(1.25, 0.35, length(dir));
      col *= mix(1.0, vig, uVignette);

      col += (hash(uv * uResolution + uTime) - 0.5) * uGrain;

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
```

- [ ] **Step 2: Add bloom, CRT and output to the composer**

In `Renderer` constructor after the light pass:

```js
this.bloom = new UnrealBloomPass(new THREE.Vector2(this.w, this.h), 0.9, 0.55, 0.62);
this.composer.addPass(this.bloom);
this.crt = new ShaderPass(CRTShader);
this.crt.uniforms.uResolution.value.set(this.w, this.h);
this.composer.addPass(this.crt);
this.composer.addPass(new OutputPass());
```

Add a running time uniform and glitch:

```js
glitch(strength = 1) { this.glitchT = Math.max(this.glitchT || 0, 0.16 * strength); }
```

In `render()` before rendering:

```js
const t = performance.now() / 1000;
this.crt.uniforms.uTime.value = t;
this.glitchT = Math.max(0, (this.glitchT || 0) - 0.016);
this.crt.uniforms.uGlitch.value = this.glitchT > 0 ? Math.min(1, this.glitchT * 6) : 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduced) { this.crt.uniforms.uScanline.value = 0; this.crt.uniforms.uGrain.value = 0; }
```

`setQuality(q)` and `setPost(on)` gate these:

```js
setPost(on) { this.postEnabled = !!on; if (this.bloom) this.bloom.enabled = !!on; if (this.crt) this.crt.enabled = !!on; }
setQuality(q) { this.quality = q; if (this.lightPass) this.lightPass.enabled = true; if (this.bloom) this.bloom.strength = q < 0.5 ? 0.5 : 0.9; if (this.crt) this.crt.uniforms.uScanline.value = q < 0.5 ? 0 : 0.10; }
```

Import `UnrealBloomPass`, `CRTShader`, `OutputPass`.

- [ ] **Step 3: Call glitch on damage and explosions and apply settings**

In `Game`, after `applyDomSettings()` add:

```js
applyRenderSettings() {
  if (!this.renderer?.available) return;
  this.renderer.setPost(!!this.settings.post);
  this.renderer.setQuality(this.settings.quality);
}
```

Call it from the constructor (after renderer assignment), `startRun()`, and whenever a setting changes in `updateSettings()`.

In `Player.damage()` / `Game.explodeAt()` call `g.renderer?.glitch(1)`. Simplest: in `Game.onPlayerDeath()` and `Game.explodeAt()` add `this.renderer?.glitch(1)`; in `Player.damage()` add `g.renderer?.glitch(0.6)`.

- [ ] **Step 4: Soften the CSS overlay**

In `style.css` change `#scanlines` opacity from `.22` to `.08` (CRT now lives in the shader), or hide it entirely when WebGL is active. Keep the element for the fallback path.

- [ ] **Step 5: Verify toggles and fallback**

Playwright: load, toggle `settings.post` off via `localStorage` pre-seed, confirm no errors. Force the fallback by temporarily setting `renderer.available=false` in the console and confirm the canvas path still draws (HUD visible, no errors).

- [ ] **Step 6: Commit**

```bash
git add src/render/shaders.js src/render/Renderer.js src/core/Game.js src/entities/Player.js style.css
git commit -m "feat(render): bloom and crt/vhs post chain with toggles"
```

---

### Task 8: Redraw characters in Hotline Miami style with emissive accents

**Files:**
- Modify: `src/entities/Player.js`, `src/entities/Enemy.js`, `src/entities/Boss.js`

**Interfaces:**
- Consumes: palette `COLORS`; `drawGlow(ctx)` no-ops from Task 4.
- Produces: `drawGlow` implementations for player/enemies/boss.
- Keeps every hitbox radius (`r`), weapon mount, and `draw(ctx)` signature unchanged.

- [ ] **Step 1: Player art + animation**

Rewrite `Player.draw` to use the palette with a heavy `ink` outline, a bright `cyan`/`hotPink` bomber, and mask-specific `accent`. Add a walk cycle: keep a `this.animT` incremented in `update` (`this.animT += dt * (moving ? 9 : 2)`), and offset leg rectangles by `Math.sin(this.animT) * 3`. Add fire recoil: shift the weapon arm back `4px` scaled by `this.attackCd`. Masks keep their four shapes, recoloured: MOTH `cyan`+`hotPink`, RAM `orange`, FOX `cyan`, RAVEN `violet`.

Add `drawGlow(ctx)`:

```js
drawGlow(ctx) {
  if (this.dead) return;
  ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.a);
  const col = this.maskId === 'RAM-7' ? '#ff7a1a' : this.maskId === 'FOX-2' ? '#12e0ff' : this.maskId === 'RAVEN-3' ? '#8b2bff' : '#12e0ff';
  ctx.fillStyle = col; ctx.fillRect(6, -6, 6, 3); ctx.fillRect(9, 3, 6, 3);
  ctx.restore();
}
```

- [ ] **Step 2: Enemy archetype art + alert glow**

Rewrite `Enemy.draw` so silhouettes differ per type: `guard` flat cap, `brawler` broad shoulders, `shotgunner` vest band, `hunter` hood, `elite` visor. Recolour each with the palette (`accent` per type). Add `drawGlow` drawing a bright eye/sensor whose alpha rises with `this.state === 'COMBAT'`:

```js
drawGlow(ctx) {
  if (this.dead) return;
  const hot = this.state === 'COMBAT';
  ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.a);
  ctx.fillStyle = hot ? '#ff2e88' : this.color;
  ctx.fillRect(9, -3, 6, 2); ctx.fillRect(9, 2, 6, 2);
  ctx.restore();
}
```

- [ ] **Step 3: Boss art + phase accents**

Recolour `Boss.draw` with the palette; keep the keyhole mask and bellhop hat; add arm animation via `this.burst`/`this.mode` and a white damage flash using `this.stun`. Add `drawGlow` for the keyhole eye and the telegraph line (already drawn — move it into the glow layer for bloom).

- [ ] **Step 4: Verify**

Dev server + a played run screenshot; no console errors; confirm `r`/hitboxes unchanged by re-running `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/entities/Player.js src/entities/Enemy.js src/entities/Boss.js
git commit -m "feat(art): hotline miami character redraw with emissive accents"
```

---

### Task 9: Gore and emissive FX

**Files:**
- Modify: `src/systems/FX.js`
- Modify: `src/core/Game.js` (corpses, glitch hooks)

**Interfaces:**
- Consumes: `Level.paintDecal`, `Level.paintCorpse` (Task 3); `TestRenderer` none.
- Produces: `FX.corpses`; `FX.drawGlow(ctx)` full; `FX.pool(x,y,amount)`.

- [ ] **Step 1: Add pools, trails and corpses**

In `FX`: add `this.corpses = []`. Add `pool(x,y,amount)` pushing several large decals with `r` 10–26 and alpha 0.5–0.75 (cap `decals` higher, e.g. 260). In `blood()`, also emit a directional **trail**: push 2–3 decals along the angle. In `kill` handling (called from `Game.onEnemyKilled`), push a corpse `{x,y,a}` and a pool. Cap `corpses` at 40.

- [ ] **Step 2: Draw corpses in the corpse pass only**

Corpses are painted into the world canvas (Task 4 `drainDecalsAndCorpses`), not the albedo per-frame draw. Ensure a corpse is pushed exactly once per kill.

- [ ] **Step 3: Full `drawGlow`**

Extend `FX.drawGlow` to also render: tracer lines as bright `cyan`/`orange` gradients (the projectiles are drawn in albedo as thin lines; draw a wider soft line in glow), explosive `flash` cores as white radial gradients, and any particle with a `glow:true` flag. Add `glow` particles in `burst()` when `color` is a neon colour.

- [ ] **Step 4: Verify**

Playwright scripted run (Task 7 pattern): press `W` and click repeatedly via `page.keyboard`/`page.mouse` for ~6 s; assert no console errors; confirm the dev log stays clean.

- [ ] **Step 5: Commit**

```bash
git add src/systems/FX.js src/core/Game.js
git commit -m "feat(fx): gore pools, corpses and emissive effects"
```

---

### Task 10: Menu backdrop and neon UI restyle

**Files:**
- Modify: `src/core/Game.js`

**Interfaces:**
- Consumes: `moodColor`, `COLORS`, `beatPulse`.
- Produces: finished `drawMenuWorld`, `drawResultsWorld`, and restyled `drawMenu`, `drawSettings`, `drawCredits`, `drawUpgrade`, `drawPause`, `drawDeath`, `drawResults`, `drawHUD`.

- [ ] **Step 1: Animated backdrop**

Implement `drawMenuWorld(c)` and `drawResultsWorld(c)` into the albedo layer: `void` fill, a slow diagonal **rain** of `cyan`/`hotPink` streaks seeded from a counter, a flickering neon `VEIL//DRIVE` sign glow, and a subtle horizon glow using `moodColor('violet','glow', this.beatPulse())`. These run through the post chain, so they get bloom/CRT automatically.

- [ ] **Step 2: Restyle HUD**

Rewrite `drawHUD(c)` for the `#ui` canvas: health as bright `hotPink` pips with a dark `ink` backing, a weapon/ammo card with a `cyan` rule, a dash meter in `cyan`, score in `bone`, and a large combo counter using `moodColor('sunset','glow', this.beatPulse())` that scales with the pulse. Off-screen objective marker as a `hotPink` chevron on the screen edge.

- [ ] **Step 3: Restyle menus**

Rewrite `drawMenu`, `drawSettings`, `drawCredits`, `drawUpgrade`, `drawPause`, `drawDeath`, `drawResults` with dark violet panels, neon rules/brackets, and `hotPink`/`cyan` selection highlights. Preserve every existing label, key hint and value (no copy changes).

- [ ] **Step 4: Verify**

Screenshot the menu, settings, upgrade and results screens via Playwright (drive states by `window.__VEILDRIVE__.state`); confirm no errors and that text is legible.

- [ ] **Step 5: Commit**

```bash
git add src/core/Game.js
git commit -m "feat(ui): neon hud and animated menu backdrop"
```

---

### Task 11: Verify, document, tune, and ship

**Files:**
- Create: `scripts/verify-render.mjs`
- Modify: `README.md`
- Modify: `package.json` (add `verify` script)

**Interfaces:**
- Produces: `npm run verify` headless check (skips if Playwright is absent).

- [ ] **Step 1: Write the verification script**

Create `scripts/verify-render.mjs`:

```js
import { spawn } from 'node:child_process';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.log('verify-render: playwright not installed — skipping.'); process.exit(0); }

const server = spawn(process.execPath, ['scripts/dev.mjs'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1000));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForTimeout(1500);

const state = await page.evaluate(() => ({
  gl: !!document.getElementById('game').getContext('webgl2') || !!document.getElementById('game').getContext('webgl'),
  available: window.__VEILDRIVE__?.renderer?.available ?? null
}));
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.keyboard.down('w'); await page.waitForTimeout(600);
await page.mouse.click(640, 360); await page.waitForTimeout(400); await page.keyboard.up('w');
await page.waitForTimeout(600);

const nonUniform = await page.evaluate(() => {
  const el = document.querySelector('#ui');
  const ctx = el.getContext('2d');
  const d = ctx.getImageData(0, 0, el.width, el.height).data;
  let sum = 0, sum2 = 0, n = 0;
  for (let i = 0; i < d.length; i += 4000) { const v = d[i]; sum += v; sum2 += v * v; n++; }
  return (sum2 / n) - (sum / n) ** 2;
});

await browser.close(); server.kill();
if (errors.length) { console.error('console errors:', errors); process.exit(1); }
if (!state.available) console.warn('renderer unavailable — canvas fallback in use');
if (!(nonUniform > 0)) { console.error('frame looked blank'); process.exit(1); }
console.log('verify-render passed.', state, 'variance', nonUniform.toFixed(1));
```

Add to `package.json` scripts: `"verify": "node scripts/verify-render.mjs"`.

- [ ] **Step 2: Run everything**

```bash
node --check src/render/Renderer.js && node --check src/render/shaders.js && node --check src/render/mood.js
npm test
npm run build
ls dist/vendor/three.module.js
npm run verify
```

Expected: smoke passes, `dist/vendor/` exists, `verify-render` passes (or skips if Playwright missing).

- [ ] **Step 3: Update the README**

Add a “Rendering” section documenting: Three.js vendored under `vendor/`, the albedo/emissive layer model, GPU lighting, bloom + CRT/VHS, mood/beat pulsing, the `#ui` overlay, the Canvas-2D fallback, and `npm run verify`.

- [ ] **Step 4: Final tune and commit**

Tune ambient, bloom strength, aberration and light intensities for readability (health pips and enemies must read against bright floors). Then:

```bash
git add scripts/verify-render.mjs package.json README.md src
git commit -m "feat(render): hotline miami visual overhaul"
```

- [ ] **Step 5: Push**

```bash
git push origin main
```
