// Run state: campaign flow, missions, masks, upgrades, scoring and death.
import { UPGRADES, MASKS, COLORS } from '../data/config.js';
import { MISSIONS } from '../data/missions.js';
import { clamp } from './math.js';
import { rng } from './rng.js';
import { storeSave } from './Save.js';
import { Level } from '../world/Level.js';
import { NavGrid } from './NavGrid.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { FX } from '../systems/FX.js';

export const RunStateSystem = {
  startRun() {
    this.unlockAudio();
    rng.reseed(this.runSeed != null ? this.runSeed : (Date.now() >>> 0));
    this.missionIndex = 0; this.deaths = 0; this.campaignTime = 0; this.score = 0; this.combo = 0; this.comboT = 0;
    this.maxCombo = 0; this.shots = 0; this.hits = 0; this.stealthKills = 0; this.killCount = 0; this.weaponKinds = new Set();
    this.results = null; this.upgradeShown = false; this.upgradeChoices = []; this.activeUpgrades = []; this.missionsCleared = 0;
    this.startMission(0, true);
  },
  startMission(i, fresh = false, respawn = false) {
    const def = MISSIONS[i]; this.missionIndex = i; this.mission = def; this.level = new Level(def); this.nav = new NavGrid(this.level);
    const sp = this.level.findOpen(def.spawn.x, def.spawn.y, 14);
    if (fresh || !this.player) { this.player = new Player(sp.x, sp.y); this.applyMask(); }
    else { this.player.x = sp.x; this.player.y = sp.y; this.player.dead = false; this.player.hp = respawn ? this.player.maxHp : Math.min(this.player.maxHp, this.player.hp + 1); }
    this.player.a = this.level.entryFacing();
    this.player.vx = 0; this.player.vy = 0; this.player.invuln = .7; this.player.dashCd = 0; this.player.dashTimer = 0; this.player.reloadT = 0; this.player.reloadWeapon = null; this.player.attackCd = 0; this.player.animT = 0;
    this.enemies = []; this.boss = null; this.projectiles = []; this.thrown = []; this.hazards = []; this.target = null;
    this.fx = new FX(); this.fx.bloodEnabled = this.settings.blood; this.fx.quality = this.settings.quality;
    this.fx.ring(sp.x, sp.y, COLORS.cyan, 64, .5);
    this.worldCanvas = null; this.worldCtx = null; this.hurtFlash = 0;
    for (const e of def.enemies) {
      const p = this.level.findOpen(e.x, e.y, 12);
      const wps = (e.waypoints || []).map(w => this.level.findOpen(w.x, w.y, 12));
      const en = new Enemy(p.x, p.y, e.type, wps); this.enemies.push(en);
      if (def.goal.type === 'target' && !this.target && Math.abs(e.x - def.goal.x) < 10 && Math.abs(e.y - def.goal.y) < 10) this.target = en;
    }
    if (def.goal.type === 'target' && !this.target && this.enemies.length) this.target = this.enemies[0];
    if (def.goal.type === 'boss' && def.boss) this.boss = new Boss(def.boss.x, def.boss.y);
    this.goalDone = false; this.level.exit.active = false; this.freeze = 0;
    this.missionTime = 0; this.deathT = 0; this.roomClearT = 0; this.heartT = 0; this.introT = 0;
    this.updateCamera(0); this.cam.x = this.cam.tx; this.cam.y = this.cam.ty;
    this.state = 'playing'; this.audio.setIntensity(def.goal.type === 'boss' ? .8 : .2); this.applyRenderSettings();
  },
  completeGoal() { if (this.goalDone) return; this.goalDone = true; this.level.exit.active = true; this.audio.play('pickup'); this.score += 400; },
  missionComplete() { this.missionsCleared++; this.score += 1000 + Math.max(0, Math.round(2500 - this.missionTime * 15)); this.audio.setIntensity(.1); this.state = 'interlude'; this.interludeT = 0; this.hitStop(.04); },
  applyMask() {
    const id = this.save.selectedMask || 'MOTH-0'; this.player.maskId = id;
    if (id === 'MOTH-0') this.player.comboBonus += .35;
    if (id === 'RAM-7') this.player.breachBonus = 1;
    if (id === 'FOX-2') { this.player.noiseMul *= .68; this.player.detectionMul = .82; }
    if (id === 'RAVEN-3') this.player.thrownBonus = 1;
  },
  cycleMask(dir = 1) {
    const unlocked = MASKS.filter(m => this.save.unlockedMasks.includes(m.id));
    let i = Math.max(0, unlocked.findIndex(m => m.id === this.save.selectedMask));
    i = (i + dir + unlocked.length) % unlocked.length;
    this.save.selectedMask = unlocked[i].id; storeSave(this.save); this.audio.play('ui');
  },
  showUpgrade() {
    this.upgradeShown = true; this.state = 'upgrade';
    const pool = [...UPGRADES]; this.upgradeChoices = [];
    while (this.upgradeChoices.length < 3) { const u = pool.splice(rng.int(pool.length), 1)[0]; this.upgradeChoices.push(u); }
    this.audio.play('ui');
  },
  updateUpgrade() {
    let idx = -1;
    if (this.input.tap('Digit1')) idx = 0; if (this.input.tap('Digit2')) idx = 1; if (this.input.tap('Digit3')) idx = 2;
    if (this.input.mouse.leftPressed) { const x = this.input.mouse.x; idx = clamp(Math.floor((x - 135) / 235), 0, 2); }
    if (idx >= 0) {
      const u = this.upgradeChoices[idx]; u.apply(this.player); this.activeUpgrades.push(u.id);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
      this.audio.play('pickup'); this.startMission(this.missionIndex + 1, false);
    }
  },
  restartAfterDeath() { this.startMission(this.missionIndex, false, true); },
  addCombo(base) { this.combo++; this.comboT = 2.25 + this.player.comboBonus; this.maxCombo = Math.max(this.maxCombo, this.combo); this.score += Math.round(base * (1 + Math.min(3, this.combo * .18))); },
  hitStop(sec) { this.freeze = Math.max(this.freeze || 0, sec); },
  onPlayerDeath() {
    this.deaths++; this.fx.blood(this.player.x, this.player.y, 28, this.player.a); this.fx.gib(this.player.x, this.player.y, this.player.a, 14); this.fx.limb(this.player.x, this.player.y, this.player.a, 'arm');
    this.audio.setIntensity(.05); this.shake(14); this.hitStop(.05); this.renderer?.glitch?.(1);
  },
  finishCampaign() {
    const acc = this.shots ? this.hits / this.shots : 1;
    let value = this.score + this.maxCombo * 90 + acc * 700 - this.deaths * 450;
    let rank = 'D'; if (value > 3000) rank = 'C'; if (value > 4800) rank = 'B'; if (value > 6500) rank = 'A'; if (value > 8200) rank = 'S'; if (value > 10000) rank = 'S+';
    const unlocks = [];
    this.results = { score: Math.round(this.score), time: this.campaignTime, accuracy: Math.round(acc * 100), combo: this.maxCombo, deaths: this.deaths, variety: this.weaponKinds.size, stealth: this.stealthKills, rank, value: Math.round(value), unlocks, missions: this.missionsCleared };
    this.save.runs++;
    if (!this.save.unlockedMasks.includes('RAM-7')) { this.save.unlockedMasks.push('RAM-7'); unlocks.push('RAM-7'); }
    if (['A', 'S', 'S+'].includes(rank) && !this.save.unlockedMasks.includes('FOX-2')) { this.save.unlockedMasks.push('FOX-2'); unlocks.push('FOX-2'); }
    if (this.maxCombo >= 6 && !this.save.unlockedMasks.includes('RAVEN-3')) { this.save.unlockedMasks.push('RAVEN-3'); unlocks.push('RAVEN-3'); }
    if (value > this.save.highScore) { this.save.highScore = Math.round(value); this.save.bestRank = rank; }
    storeSave(this.save); this.state = 'results'; this.audio.setIntensity(.08);
  }
};
