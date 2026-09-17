import { VIRTUAL_W, VIRTUAL_H, VIEW_W, VIEW_H, PIXEL, COLORS } from '../data/config.js';
import { Input } from './Input.js';
import { AudioSystem } from './Audio.js';
import { loadSave, storeSave } from './Save.js';
import { FX } from '../systems/FX.js';
import { Enemy } from '../entities/Enemy.js';
import { drawWeaponArt } from '../render/weapons-art.js';
import { MISSION_COUNT } from '../data/missions.js';
import { clamp, rand, advance } from './math.js';
import { rng } from './rng.js';
// Systems are installed onto Game.prototype below, so their methods run with
// `this` bound to the Game instance while their code lives in focused modules.
import { CameraSystem } from '../systems/Camera.js';
import { AISystem } from '../systems/AI.js';
import { CombatSystem } from '../systems/Combat.js';
import { WorldSystem } from '../systems/World.js';
import { HudSystem } from '../systems/Hud.js';
import { RunStateSystem } from './RunState.js';

export const STEP = 1 / 60;
export const MAX_STEPS = 5;

export class Game {
  constructor(canvas, renderer) { this.canvas = canvas; this.renderer = renderer || null; this.ctx = canvas.getContext('2d', { alpha: false }); this.ctx.imageSmoothingEnabled = false; this.input = new Input(renderer && renderer.available ? renderer.canvas : canvas); this.save = loadSave(); this.settings = this.save.settings; this.audio = new AudioSystem(this.settings); this.fx = new FX(); this.fx.bloodEnabled = this.settings.blood; this.fx.quality = this.settings.quality; this.applyDomSettings(); this.state = 'menu'; this.menuIndex = 0; this.settingsIndex = 0; this.pauseIndex = 0; this.cam = { x: 0, y: 0, tx: 0, ty: 0 }; this.shakeMag = 0; this.shakeX = 0; this.shakeY = 0; this.debug = false; this.invincible = false; this.heartT = 0; this.last = performance.now(); this.acc = 0; this.aiStep = .1; this.runSeed = null; this._projFree = []; this.fps = 60; this.fpsT = 0; this.frames = 0; this.uiCanvas = document.getElementById('ui'); this.uiCtx = this.uiCanvas ? this.uiCanvas.getContext('2d') : this.ctx; if (this.uiCtx) this.uiCtx.imageSmoothingEnabled = false; this.applyRenderSettings(); this.resize(); addEventListener('resize', () => this.resize()); }
  applyRenderSettings() { if (!this.renderer || !this.renderer.available) return; this.renderer.setPost(!!this.settings.post); this.renderer.setQuality(this.settings.quality); this.renderer.setPixelMode(this.settings.pixel !== false); }
  resize() { const ratio = VIRTUAL_W / VIRTUAL_H, w = innerWidth, h = innerHeight; let cw = w, ch = w / ratio; if (ch > h) { ch = h; cw = h * ratio; } const size = { width: `${Math.floor(cw)}px`, height: `${Math.floor(ch)}px` }; for (const id of ['game', 'gl', 'ui']) { const el = document.getElementById(id); if (el) Object.assign(el.style, size); } }
  start() { requestAnimationFrame(t => this.loop(t)); }
  // Deterministic hooks: `step` runs exactly one fixed simulation tick and
  // `setSeed` pins the run's RNG stream, so tests (and replays) reproduce a run.
  step(dt = STEP) { this.update(dt); }
  setSeed(n) { this.runSeed = n >>> 0; rng.reseed(this.runSeed); }
  loop(t) { const raw = Math.min(.25, (t - this.last) / 1000); this.last = t; const a = advance(this.acc, raw, STEP, MAX_STEPS); this.acc = a.acc; for (let i = 0; i < a.steps; i++) { this.update(STEP); this.input.endFrame(); } this.render(); this.frames++; this.fpsT += raw; if (this.fpsT > .5) { this.fps = Math.round(this.frames / this.fpsT); this.frames = 0; this.fpsT = 0; } requestAnimationFrame(x => this.loop(x)); }
  unlockAudio() { this.audio.unlock(); this.audio.apply(); }
  applyDomSettings() { const s = document.getElementById('scanlines'); if (!s) return; const glPost = !!(this.renderer && this.renderer.available) && this.settings.post; s.style.display = glPost ? 'none' : (this.settings.post ? 'block' : 'none'); }
  beatPulse() { return this.settings.music > 0 ? (this.audio.pulse || 0) * Math.min(1, (this.audio.intensity || 0) + .35) : 0; }
  update(dt) {
    if ((this.input.pressed.size || this.input.mouse.leftPressed || this.input.mouse.rightPressed) && !this.audio.ctx) this.unlockAudio();
    if (this.input.tap('F1')) this.debug = !this.debug; if (this.input.tap('F2')) this.invincible = !this.invincible;
    if (this.state === 'menu') { this.updateMenu(); return; }
    if (this.state === 'settings') { this.updateSettings(); return; }
    if (this.state === 'credits') { if (this.input.tap('Escape') || this.input.tap('Enter')) this.state = 'menu'; return; }
    if (this.state === 'results') { if (this.input.tap('Enter')) this.state = 'menu'; if (this.input.tap('KeyR')) this.startRun(); return; }
    if (this.state === 'interlude') { this.interludeT = (this.interludeT || 0) + dt; this.fx.update(dt); this.shakeMag *= Math.pow(.025, dt); this.shakeX = rand(-this.shakeMag, this.shakeMag); this.shakeY = rand(-this.shakeMag, this.shakeMag); if (this.interludeT > 1.6) { if (this.missionIndex >= MISSION_COUNT - 1) this.finishCampaign(); else this.showUpgrade(); } return; }
    if (this.state === 'upgrade') { this.updateUpgrade(); return; }
    if (this.state === 'paused') { const opts = 3; if (this.input.tap('Escape')) { this.state = 'playing'; return; } if (this.input.tap('ArrowDown') || this.input.tap('KeyS')) { this.pauseIndex = (this.pauseIndex + 1) % opts; this.audio.play('ui'); } if (this.input.tap('ArrowUp') || this.input.tap('KeyW')) { this.pauseIndex = (this.pauseIndex + opts - 1) % opts; this.audio.play('ui'); } if (this.input.tap('Enter')) { if (this.pauseIndex === 0) this.state = 'playing'; else if (this.pauseIndex === 1) { this.audio.play('ui'); this.restartAfterDeath(); } else { this.audio.play('ui'); this.state = 'menu'; this.pauseIndex = 0; } } return; }
    if (this.state !== 'playing') return;
    if ((this.freeze || 0) > 0) { this.freeze -= dt; this.fx.update(dt); return; }
    if (this.input.tap('Escape')) { this.state = 'paused'; this.pauseIndex = 0; return; }
    if (this.input.tap('F3')) this.enemies.push(new Enemy(this.player.x + 80, this.player.y, 'guard', []));
    if (this.input.tap('F4')) { for (const e of this.enemies) e.dead = true; if (this.boss) this.boss.dead = true; }
    this.introT = Math.min(6, (this.introT || 0) + dt); this.missionTime += dt; this.campaignTime += dt; this.hurtFlash = Math.max(0, (this.hurtFlash || 0) - dt * 1.6); this.heartT = Math.max(0, this.heartT - dt); this.audio.decayPulse(dt); if (this.player.hp === 1 && this.heartT <= 0) { this.heartT = .9; this.audio.play('heartbeat'); } this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; if (this.player.dead) { this.deathT += dt; if (this.deathT > .5) this.restartAfterDeath(); return; }
    this.player.update(dt, this); this.updateCamera(dt); this.fx.update(dt); this.updateProjectiles(dt); this.updateThrown(dt); this.updateHazards(dt);
    this.acc += dt; if (this.acc >= this.aiStep) { this.aiTick(); this.acc = 0; }
    for (const e of this.enemies) e.update(dt, this); if (this.boss) this.boss.update(dt, this);
    if (!this.goalDone) { const g = this.mission.goal; if (g.type === 'eliminate' && !this.enemies.some(e => !e.dead)) this.completeGoal(); else if (g.type === 'target' && this.target && this.target.dead) this.completeGoal(); else if (g.type === 'boss' && this.boss && this.boss.dead) this.completeGoal(); }
    this.audio.setIntensity(clamp((this.enemies.filter(e => e.state === 'COMBAT' && !e.dead).length + (this.boss && !this.boss.dead ? 3 : 0)) / 7, 0.08, 1));
    this.shakeMag *= Math.pow(.025, dt); this.shakeX = rand(-this.shakeMag, this.shakeMag); this.shakeY = rand(-this.shakeMag, this.shakeMag);
  }
  updateMenu() { const items = 5; if (this.input.tap('ArrowDown') || this.input.tap('KeyS')) { this.menuIndex = (this.menuIndex + 1) % items; this.audio.play('ui'); } if (this.input.tap('ArrowUp') || this.input.tap('KeyW')) { this.menuIndex = (this.menuIndex + items - 1) % items; this.audio.play('ui'); } if (this.menuIndex === 1 && (this.input.tap('ArrowLeft') || this.input.tap('KeyA'))) this.cycleMask(-1); if (this.menuIndex === 1 && (this.input.tap('ArrowRight') || this.input.tap('KeyD'))) this.cycleMask(1); if (this.input.tap('Enter') || this.input.mouse.leftPressed) { if (this.input.mouse.leftPressed) { const y = this.input.mouse.y; this.menuIndex = clamp(Math.floor((y - 270) / 40), 0, 4); } if (this.menuIndex === 0) this.startRun(); if (this.menuIndex === 1) this.cycleMask(1); if (this.menuIndex === 2) this.state = 'settings'; if (this.menuIndex === 3) this.state = 'credits'; if (this.menuIndex === 4) location.reload(); } }
  updateSettings() { const keys = ['master', 'music', 'sfx', 'shake', 'blood', 'quality', 'post', 'pixel', 'flashes', 'highContrastCursor']; if (this.input.tap('Escape')) { this.save.settings = this.settings; storeSave(this.save); this.state = 'menu'; return; } if (this.input.tap('ArrowDown') || this.input.tap('KeyS')) this.settingsIndex = (this.settingsIndex + 1) % keys.length; if (this.input.tap('ArrowUp') || this.input.tap('KeyW')) this.settingsIndex = (this.settingsIndex + keys.length - 1) % keys.length; const k = keys[this.settingsIndex], dir = (this.input.tap('ArrowRight') || this.input.tap('KeyD') ? 1 : 0) - (this.input.tap('ArrowLeft') || this.input.tap('KeyA') ? 1 : 0); if (dir) { if (typeof this.settings[k] === 'boolean') this.settings[k] = !this.settings[k]; else this.settings[k] = clamp(this.settings[k] + dir * .1, 0, 1); this.audio.apply(); this.fx.bloodEnabled = this.settings.blood; this.fx.quality = this.settings.quality; this.applyDomSettings(); this.applyRenderSettings(); this.audio.play('ui'); } }
  // Single source of truth for the simulated scene, shared by the WebGL and
  // Canvas fallback paths.
  drawActors(c) {
    this.level.drawItems(c);
    for (const b of this.projectiles) { c.strokeStyle = b.color; c.lineWidth = 2; c.beginPath(); c.moveTo(b.px, b.py); c.lineTo(b.x, b.y); c.stroke(); }
    for (const t of this.thrown) { c.save(); c.translate(t.x, t.y); c.rotate(t.a); drawWeaponArt(c, t.weapon, 0.9); c.restore(); }
    for (const h of this.hazards) { c.save(); c.translate(h.x, h.y); c.rotate(h.a || 0); c.fillStyle = '#8f6c4e'; c.fillRect(-9, -7, 18, 14); c.restore(); }
    for (const e of this.enemies) e.draw(c, this.debug);
    if (this.boss) this.boss.draw(c);
    this.fx.draw(c);
    if (!this.player.dead) this.player.draw(c);
  }
  render() { if (this.renderer && this.renderer.available) return this.renderGL(); return this.renderCanvas(); }
  renderCanvas() {
    const out = this.ctx; out.setTransform(1, 0, 0, 1, 0, 0); out.fillStyle = '#05060a'; out.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    if (this.state === 'menu') { this.drawMenu(out); return; } if (this.state === 'settings') { this.drawSettings(out); return; } if (this.state === 'credits') { this.drawCredits(out); return; } if (this.state === 'results') { this.drawResults(out); return; } if (!this.level) { return; }
    let c = out;
    if (this.settings.pixel !== false && PIXEL > 1) { if (!this.pixCanvas) { this.pixCanvas = document.createElement('canvas'); this.pixCanvas.width = VIEW_W; this.pixCanvas.height = VIEW_H; this.pixCtx = this.pixCanvas.getContext('2d'); this.pixCtx.imageSmoothingEnabled = false; } c = this.pixCtx; c.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, 0); }
    c.fillStyle = '#05060a'; c.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    this.ensureWorld(); c.drawImage(this.worldCanvas, this.cam.x - this.shakeX, this.cam.y - this.shakeY, VIRTUAL_W, VIRTUAL_H, 0, 0, VIRTUAL_W, VIRTUAL_H);
    c.save(); c.translate(-this.cam.x + this.shakeX, -this.cam.y + this.shakeY); this.drawActors(c); c.restore();
    this.drawLighting(c); this.drawHUD(c); if (this.state === 'playing') this.drawIntro(c); if (this.state === 'interlude') this.drawInterlude(c); if (this.state === 'upgrade') this.drawUpgrade(c); if (this.state === 'paused') this.drawPause(c); if (this.player.dead) this.drawDeath(c); this.drawPost(c); if (this.debug) this.drawDebug(c);
    if (c !== out) { out.setTransform(1, 0, 0, 1, 0, 0); out.imageSmoothingEnabled = false; out.drawImage(this.pixCanvas, 0, 0, VIRTUAL_W, VIRTUAL_H); }
  }
  renderGL() {
    const ui = this.uiCtx || this.ctx; if (ui) { ui.setTransform(1, 0, 0, 1, 0, 0); ui.clearRect(0, 0, VIRTUAL_W, VIRTUAL_H); }
    const c = this.renderer.albedoCtx, g = this.renderer.emissiveCtx, S = this.settings.pixel !== false ? 1 / PIXEL : 1;
    c.setTransform(S, 0, 0, S, 0, 0); c.imageSmoothingEnabled = false; c.fillStyle = COLORS.void; c.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    g.setTransform(S, 0, 0, S, 0, 0); g.imageSmoothingEnabled = false; g.fillStyle = '#000000'; g.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    if (this.state === 'menu' || this.state === 'settings' || this.state === 'credits' || this.state === 'results') this.renderer.setLights({ lights: [], ambient: 1, pulse: this.beatPulse() });
    if (this.state === 'menu') { this.drawMenuWorld(c); this.renderer.render(); this.drawMenuUI(); return; }
    if (this.state === 'settings') { this.drawMenuWorld(c); this.renderer.render(); this.drawSettings(ui); return; }
    if (this.state === 'credits') { this.drawMenuWorld(c); this.renderer.render(); this.drawCredits(ui); return; }
    if (this.state === 'results') { this.drawResultsWorld(c); this.renderer.render(); this.drawResults(ui); return; }
    if (!this.level) { this.renderer.render(); return; }
    this.ensureWorld(); const ox = -this.cam.x + this.shakeX, oy = -this.cam.y + this.shakeY;
    c.drawImage(this.worldCanvas, this.cam.x - this.shakeX, this.cam.y - this.shakeY, VIRTUAL_W, VIRTUAL_H, 0, 0, VIRTUAL_W, VIRTUAL_H);
    c.save(); c.translate(ox, oy); this.drawActors(c); c.restore();
    g.save(); g.globalCompositeOperation = 'lighter'; g.translate(ox, oy);
    for (const b of this.projectiles) { g.strokeStyle = b.color; g.lineWidth = 3; g.globalAlpha = .45; g.beginPath(); g.moveTo(b.px, b.py); g.lineTo(b.x, b.y); g.stroke(); } g.globalAlpha = 1;
    for (const p of this.level.pickups) { if (p.taken) continue; g.globalAlpha = .5; g.fillStyle = p.weapon.color; g.beginPath(); g.arc(p.x, p.y, 10, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1;
    { const ob = this.level.objective; if (ob && !ob.taken) { g.globalAlpha = .6; g.fillStyle = COLORS.orange; g.beginPath(); g.arc(ob.x, ob.y, 16, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; } }
    if (this.level.exit && this.level.exit.active) { g.globalAlpha = .5; g.fillStyle = COLORS.cyan; g.beginPath(); g.arc(this.level.exit.x, this.level.exit.y, 22, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    this.fx.drawGlow(g); for (const e of this.enemies) e.drawGlow(g); if (this.boss) this.boss.drawGlow(g); if (!this.player.dead) this.player.drawGlow(g); g.restore();
    this.pushLights(); this.renderer.render(); this.drawHUD(ui); if (this.state === 'playing') this.drawIntro(ui); if (this.state === 'interlude') this.drawInterlude(ui); if (this.state === 'upgrade') this.drawUpgrade(ui); if (this.state === 'paused') this.drawPause(ui); if (this.player && this.player.dead) this.drawDeath(ui); if (this.debug) this.drawDebug(ui);
  }
}

Object.assign(Game.prototype, CameraSystem, AISystem, CombatSystem, WorldSystem, HudSystem, RunStateSystem);
