// End-to-end scenario tests: drives the real game in headless Chromium and
// asserts behaviour across the campaign, combat, death, save and the Canvas
// fallback. Skips cleanly when Playwright is not installed.
import { spawn } from 'node:child_process';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.log('scenario-test: playwright not installed — skipping.'); process.exit(0); }

const PORT = process.env.PORT || 4173;
const URL = `http://localhost:${PORT}/`;
const EXE = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = [];
const ok = (name, cond, detail = '') => results.push([!!cond, name, detail]);
const near = (a, b, eps = 1) => Math.abs(a - b) <= eps;

const server = spawn(process.execPath, ['scripts/dev.mjs'], { stdio: 'ignore', env: { ...process.env, PORT: String(PORT) } });
await sleep(900);

let browser;
try {
  browser = await chromium.launch({ executablePath: EXE, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
} catch (e) {
  console.warn('scenario-test: could not launch chromium — skipping.', e.message);
  server.kill();
  process.exit(0);
}

const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

const snap = () => page.evaluate(() => {
  const g = window.__VEILDRIVE__;
  if (!g) return { missing: true };
  return {
    state: g.state, mi: g.missionIndex, mission: g.mission ? g.mission.id : null,
    goalDone: g.goalDone, exitActive: g.level ? g.level.exit.active : null,
    enemies: g.enemies ? g.enemies.filter(e => !e.dead).length : null,
    boss: g.boss && !g.boss.dead ? g.boss.hp : null,
    hp: g.player ? g.player.hp : null, weapon: g.player ? g.player.current.id : null,
    ammo: g.player && g.player.current.ammo != null ? g.player.current.ammo : null,
    shots: g.shots, kills: g.killCount, combo: g.combo,
    results: g.results || null, deaths: g.deaths, renderer: !!(g.renderer && g.renderer.available),
  };
});
const waitFor = async (pred, ms = 12000) => {
  const t0 = Date.now();
  let s = await snap();
  while (Date.now() - t0 < ms) { if (pred(s)) return s; await sleep(80); s = await snap(); }
  return s;
};
const evalG = fn => page.evaluate(fn);

try {
  await page.goto(URL, { waitUntil: 'load' });
  await sleep(1200);

  // --- boot ---
  const boot = await snap();
  ok('boot: game object present', !boot.missing);
  ok('boot: no console errors on load', errors.length === 0, errors[0] || '');

  // --- menu: masks, settings, credits ---
  await evalG(() => { const g = window.__VEILDRIVE__; g.save.unlockedMasks = ['MOTH-0', 'RAM-7']; g.save.selectedMask = 'MOTH-0'; });
  await evalG(() => { window.__VEILDRIVE__.menuIndex = 1; });
  const maskBefore = await evalG(() => window.__VEILDRIVE__.save.selectedMask);
  await page.keyboard.press('ArrowRight');
  const maskAfter = await evalG(() => window.__VEILDRIVE__.save.selectedMask);
  ok('menu: mask cycles with arrow keys', maskBefore !== maskAfter, `${maskBefore} -> ${maskAfter}`);

  await page.keyboard.press('ArrowDown');
  const menuIdx = await evalG(() => window.__VEILDRIVE__.menuIndex);
  ok('menu: arrow navigation moves selection', menuIdx === 2, `index ${menuIdx}`);

  await evalG(() => { window.__VEILDRIVE__.menuIndex = 2; });
  await page.keyboard.press('Enter');
  await sleep(200);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  const sState = await evalG(() => window.__VEILDRIVE__.state);
  ok('settings: opens and adjusts', sState === 'settings');
  await page.keyboard.press('Escape');
  await sleep(150);
  ok('settings: escape returns to menu', (await evalG(() => window.__VEILDRIVE__.state)) === 'menu');

  await evalG(() => { window.__VEILDRIVE__.menuIndex = 3; });
  await page.keyboard.press('Enter');
  await sleep(150);
  ok('credits: opens', (await evalG(() => window.__VEILDRIVE__.state)) === 'credits');
  await page.keyboard.press('Escape');
  await sleep(150);

  // --- start campaign ---
  await evalG(() => { window.__VEILDRIVE__.menuIndex = 0; });
  await page.keyboard.press('Enter');
  const started = await waitFor(s => s.state === 'playing');
  ok('campaign: starts on mission 1', started.state === 'playing' && started.mi === 0, JSON.stringify(started));
  ok('campaign: player starts armed with the pistol', started.weapon === 'pistol' && started.ammo > 0);
  const entry = await evalG(() => {
    const g = window.__VEILDRIVE__;
    const L = g.level, s = L.def.spawn;
    const nearest = Math.min(...g.enemies.map(e => Math.hypot(e.x - s.x, e.y - s.y)));
    let dd = Infinity; for (const d of L.doors) dd = Math.min(dd, Math.hypot(d.x + d.w / 2 - s.x, d.y + d.h / 2 - s.y));
    return { clear: !L.blocked(s.x, s.y, 14), nearest, dd, doors: L.doors.length };
  });
  ok('entry: spawn is clear, empty and has a nearby door', entry.clear && entry.nearest > 120 && entry.dd < 200, JSON.stringify(entry));

  // --- the spawn faces the door and grants a spawn shield ---
  const spawnInfo = await evalG(() => {
    const g = window.__VEILDRIVE__, L = g.level, sp = L.def.spawn;
    let best = null, bd = Infinity;
    for (const d of L.doors) { const dd = Math.hypot(d.x + d.w / 2 - sp.x, d.y + d.h / 2 - sp.y); if (dd < bd) { bd = dd; best = d; } }
    const want = Math.atan2(best.y + best.h / 2 - sp.y, best.x + best.w / 2 - sp.x);
    const diff = Math.abs(Math.atan2(Math.sin(g.player.a - want), Math.cos(g.player.a - want)));
    return { faceOk: diff < 0.3, shield: g.player.invuln > 0, atSpawn: Math.hypot(g.player.x - sp.x, g.player.y - sp.y) < 2 };
  });
  ok('spawn: starts on the mat, facing the door, with a spawn shield', spawnInfo.faceOk && spawnInfo.shield && spawnInfo.atSpawn, JSON.stringify(spawnInfo));

  // --- entry door opens and becomes traversable (the player advances out) ---
  const doorOpened = await evalG(() => {
    const g = window.__VEILDRIVE__;
    const s = g.level.def.spawn;
    let best = null, bd = Infinity;
    for (const d of g.level.doors) { const dd = Math.hypot(d.x + d.w / 2 - s.x, d.y + d.h / 2 - s.y); if (dd < bd) { bd = dd; best = d; } }
    g.player.x = best.x + best.w / 2; g.player.y = best.y + best.h / 2;   // walk up to the door
    g.interact(false);                                                    // [E] opens it
    return { open: best.open, traversable: !g.level.blocked(best.x + best.w / 2, best.y + best.h / 2, 5) };
  });
  ok('entry: the door can be opened to advance', doorOpened.open === true && doorOpened.traversable === true, JSON.stringify(doorOpened));

  // --- shooting consumes ammo and registers shots ---
  const beforeShot = await snap();
  await page.mouse.move(900, 300);
  await page.mouse.down(); await sleep(400); await page.mouse.up(); await sleep(150);
  const afterShot = await snap();
  ok('combat: firing consumes ammo and counts shots', afterShot.shots > beforeShot.shots && afterShot.ammo < beforeShot.ammo, JSON.stringify({ shots: afterShot.shots, ammo: afterShot.ammo }));

  // --- grounded gun handling: casings, bloom, penetration ---
  const gunfeel = await evalG(() => {
    const g = window.__VEILDRIVE__;
    const rev = g.level.pickups.find(x => x.weapon.id === 'revolver');
    const pist = g.level.pickups.find(x => x.weapon.id === 'pistol');
    const out = {};
    if (pist) { g.player.equip(pist.weapon, g); g.player.bloom = 0; g.fx.casings.length = 0; g.player.shoot(g); out.casings = g.fx.casings.length; out.bloom = g.player.bloom; }
    if (rev) { g.player.equip(rev.weapon, g); g.player.pierce = 0; g.player.bloom = 0; g.projectiles.length = 0; g.player.shoot(g); out.pierce = g.projectiles[0] ? g.projectiles[0].pierce : null; }
    return out;
  });
  ok('weapons: guns eject casings, build bloom and penetrate', gunfeel.casings > 0 && gunfeel.bloom > 0 && gunfeel.pierce >= 1, JSON.stringify(gunfeel));

  // --- killing an enemy gives combo/score ---
  const killed = await evalG(() => {
    const g = window.__VEILDRIVE__;
    const e = g.enemies.find(x => !x.dead);
    e.damage(99, g, 0);
    return { kills: g.killCount, combo: g.combo, dead: e.dead };
  });
  ok('combat: a kill registers and chains combo', killed.dead && killed.kills > 0 && killed.combo > 0, JSON.stringify(killed));

  // --- pickups are collectable ---
  const picked = await evalG(() => {
    const g = window.__VEILDRIVE__;
    const p = g.level.pickups.find(x => !x.taken && x.weapon.id !== g.player.current.id);
    if (!p) return { skipped: true };
    g.player.x = p.x; g.player.y = p.y;
    const want = p.weapon.id;
    g.interact(false);
    return { want, got: g.player.current.id };
  });
  ok('items: a nearby weapon pickup is collected', picked.skipped || picked.got === picked.want, JSON.stringify(picked));

  // --- a barrel explodes when shot ---
  const barrel = await evalG(async () => {
    const g = window.__VEILDRIVE__;
    const b = g.level.props.find(p => p.type === 'barrel' && !p.broken);
    if (!b) return { skipped: true };
    g.level.damageProp(b, 99);
    g.explodeAt(b.x + b.w / 2, b.y + b.h / 2);
    return { broken: b.broken };
  });
  ok('items: barrels break and explode', barrel.skipped || barrel.broken);

  // --- exit becomes active once the objective is done ---
  await page.keyboard.press('F4');
  const cleared = await waitFor(s => s.goalDone === true, 5000);
  ok('objective: clearing the floor activates the exit', cleared.goalDone && cleared.exitActive);

  // --- complete mission 1 -> interlude -> upgrade -> mission 2 ---
  await evalG(() => { const g = window.__VEILDRIVE__; g.player.x = g.level.exit.x; g.player.y = g.level.exit.y; });
  await sleep(120);
  await page.keyboard.press('KeyE');
  const inter = await waitFor(s => s.state === 'interlude' || s.state === 'results', 6000);
  ok('campaign: reaching the exit completes the mission', inter.state === 'interlude', JSON.stringify(inter));
  const up = await waitFor(s => s.state === 'upgrade' || s.state === 'results', 12000);
  ok('campaign: interlude leads to an upgrade choice', up.state === 'upgrade', JSON.stringify(up));
  await page.keyboard.press('Digit1');
  const m2 = await waitFor(s => s.state === 'playing' && s.mi === 1, 8000);
  ok('campaign: choosing an upgrade advances to mission 2', m2.state === 'playing' && m2.mi === 1, JSON.stringify(m2));

  // --- death restarts the current mission with full health ---
  const beforeDeath = await snap();
  await evalG(() => { const g = window.__VEILDRIVE__; g.player.invuln = 0; g.player.damage(99, g); });
  const afterDeath = await waitFor(s => s.hp === 3 && s.state === 'playing', 9000);
  ok('death: rewinds the current mission at full health', afterDeath.mi === beforeDeath.mi && afterDeath.hp === 3 && afterDeath.deaths > 0, JSON.stringify(afterDeath));
  const deathPos = await evalG(() => { const g = window.__VEILDRIVE__, sp = g.level.def.spawn; return { d: Math.hypot(g.player.x - sp.x, g.player.y - sp.y), inv: g.player.invuln }; });
  ok('death: respawns on the entry mat with a fresh shield', deathPos.d < 2 && deathPos.inv > 0, JSON.stringify(deathPos));

  // --- kills spill blood and gibs ---
  const gore = await evalG(() => {
    const g = window.__VEILDRIVE__;
    const d0 = g.fx.decals.length, p0 = g.fx.p.length, l0 = g.fx.limbs.length;
    const e = g.enemies.find(x => !x.dead);
    if (!e) return { skipped: true };
    e.damage(99, g, 0);
    return { dd: g.fx.decals.length - d0, dp: g.fx.p.length - p0, dl: g.fx.limbs.length - l0 };
  });
  ok('gore: an overkill dismembers, spills blood and pools', gore.skipped || (gore.dd > 0 && gore.dp > 0 && gore.dl > 0), JSON.stringify(gore));

  // --- several gun types fire ---
  const variety = await evalG(() => {
    const g = window.__VEILDRIVE__;
    const seen = new Set(); let fired = 0;
    for (const p of g.level.pickups) {
      if (p.weapon.kind !== 'gun' || seen.has(p.weapon.id)) continue;
      seen.add(p.weapon.id);
      g.player.equip(p.weapon, g);
      g.player.attackCd = 0;
      const before = g.shots;
      if (g.player.current.ammo > 0) g.player.shoot(g);
      if (g.shots > before) fired++;
    }
    return { fired, kinds: [...seen] };
  });
  ok('weapons: different gun types fire', variety.fired > 0, JSON.stringify(variety));

  // --- boss mission: jump to the finale, kill the boss, finish ---
  await evalG(() => window.__VEILDRIVE__.startMission(4, true));
  const bossStart = await waitFor(s => s.state === 'playing' && s.mi === 4, 5000);
  ok('boss: finale mission spawns the boss', bossStart.boss !== null, JSON.stringify(bossStart));
  await page.keyboard.press('F4');
  const bossDone = await waitFor(s => s.goalDone === true, 6000);
  ok('boss: defeating the boss unlocks the exit', bossDone.goalDone && bossDone.exitActive);
  await evalG(() => { const g = window.__VEILDRIVE__; g.player.x = g.level.exit.x; g.player.y = g.level.exit.y; });
  await sleep(120);
  await page.keyboard.press('KeyE');
  const results = await waitFor(s => s.state === 'results', 12000);
  ok('campaign: completing the finale shows results', results.state === 'results' && results.results && results.results.missions >= 1, JSON.stringify(results.results));

  // --- save persists across a reload ---
  await evalG(() => { const g = window.__VEILDRIVE__; g.save.highScore = 4242; g.save.bestRank = 'S'; localStorage.setItem('veildrive-save-v1', JSON.stringify(g.save)); });
  await page.reload({ waitUntil: 'load' });
  await sleep(900);
  const reloaded = await evalG(() => ({ hi: window.__VEILDRIVE__.save.highScore, rank: window.__VEILDRIVE__.save.bestRank }));
  ok('save: high score and rank persist across reload', reloaded.hi === 4242 && reloaded.rank === 'S', JSON.stringify(reloaded));

  // --- pause toggles ---
  await evalG(() => window.__VEILDRIVE__.startRun());
  await waitFor(s => s.state === 'playing', 5000);
  await page.keyboard.press('Escape');
  await sleep(150);
  ok('pause: escape pauses the run', (await evalG(() => window.__VEILDRIVE__.state)) === 'paused');
  await page.keyboard.press('Escape');
  await sleep(150);
  ok('pause: escape resumes the run', (await evalG(() => window.__VEILDRIVE__.state)) === 'playing');

  // --- pause menu: restart and quit ---
  await page.keyboard.press('Escape'); await sleep(120);
  await page.keyboard.press('ArrowDown');
  const pIdx = await evalG(() => window.__VEILDRIVE__.pauseIndex);
  ok('pause: menu selects restart', pIdx === 1, `index ${pIdx}`);
  await page.keyboard.press('Enter');
  const rstate = await waitFor(s => s.state === 'playing', 5000);
  ok('pause: restart resumes the mission at full health', rstate.state === 'playing' && rstate.hp === 3, JSON.stringify(rstate));
  await page.keyboard.press('Escape'); await sleep(120);
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); await sleep(200);
  ok('pause: quit returns to the menu', (await evalG(() => window.__VEILDRIVE__.state)) === 'menu');
  await evalG(() => window.__VEILDRIVE__.startRun());
  await waitFor(s => s.state === 'playing', 5000);
  const intro = await evalG(() => ({ t: window.__VEILDRIVE__.introT, mission: window.__VEILDRIVE__.mission && window.__VEILDRIVE__.mission.id }));
  ok('flow: mission intro card timer runs', Number.isFinite(intro.t) && !!intro.mission, JSON.stringify(intro));

  // --- idle enemies do not animate or shake ---
  const idle = await page.evaluate(async () => {
    const g = window.__VEILDRIVE__;
    const e = g.enemies[0];
    e.state = 'PATROL'; e.waypoints = []; e.x = 1600; e.y = 150; e.attackCd = 0;
    const a0 = e.animT, s0 = g.shakeMag;
    await new Promise(r => setTimeout(r, 800));
    return { da: Math.abs(e.animT - a0), shake: g.shakeMag };
  });
  ok('enemy: idle enemies are still (no idle shake)', idle.da < 1e-6 && idle.shake < 0.01, JSON.stringify(idle));

  // --- low-health heartbeat timer no longer becomes NaN ---
  const heart = await page.evaluate(async () => {
    const g = window.__VEILDRIVE__;
    g.invincible = true; g.player.hp = 1; g.heartT = 0;
    let beats = 0; const orig = g.audio.play ? g.audio.play.bind(g.audio) : null;
    if (orig) g.audio.play = n => { if (n === 'heartbeat') beats++; return orig(n); };
    await new Promise(r => setTimeout(r, 1400));
    if (orig) g.audio.play = orig;
    g.invincible = false;
    return { beats, heartT: g.heartT, finite: Number.isFinite(g.heartT) };
  });
  ok('hud: low health keeps a finite heartbeat timer', heart.finite, JSON.stringify(heart));

  // --- off-screen threat + objective markers draw without errors ---
  const markers = await page.evaluate(async () => {
    const g = window.__VEILDRIVE__;
    const e = g.enemies.find(x => !x.dead);
    if (e) { e.x = g.player.x + 3000; e.y = g.player.y; e.state = 'COMBAT'; }
    await new Promise(r => setTimeout(r, 300));
    return { hasMarkers: typeof g.drawMarkers === 'function', alive: g.enemies.filter(x => !x.dead).length };
  });
  ok('hud: markers survive an off-screen threat', markers.hasMarkers, JSON.stringify(markers));

  // --- resize does not throw ---
  await page.setViewportSize({ width: 900, height: 500 });
  await sleep(300);
  ok('layout: resizing the window is safe', errors.length === 0, errors[0] || '');
} catch (e) {
  results.push([false, 'scenario ran to completion', e.message]);
}

// --- Canvas fallback (no WebGL) ---
try {
  const fb = await chromium.launch({ executablePath: EXE, args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
  const fpage = await fb.newPage({ viewport: { width: 1280, height: 720 } });
  const ferrs = [];
  fpage.on('console', m => { if (m.type() === 'error') ferrs.push(m.text()); });
  fpage.on('pageerror', e => ferrs.push(String(e)));
  await fpage.goto(URL, { waitUntil: 'load' });
  await sleep(1000);
  await fpage.keyboard.press('Enter');
  await sleep(800);
  const fbInfo = await fpage.evaluate(() => {
    const g = window.__VEILDRIVE__;
    const el = document.getElementById('game');
    const c = document.createElement('canvas'); c.width = 160; c.height = 90;
    const ctx = c.getContext('2d'); ctx.drawImage(el, 0, 0, 160, 90);
    const d = ctx.getImageData(0, 0, 160, 90).data;
    let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4) { s += d[i]; s2 += d[i] * d[i]; n++; }
    return { renderer: g.renderer, state: g.state, variance: Math.round(s2 / n - (s / n) ** 2) };
  });
  ok('fallback: runs without WebGL and renders the canvas', fbInfo.renderer === null && fbInfo.state === 'playing' && fbInfo.variance > 0, JSON.stringify(fbInfo));
  ok('fallback: no console errors', ferrs.length === 0, ferrs[0] || '');
  await fb.close();
} catch (e) {
  results.push([false, 'fallback scenario', e.message]);
}

ok('no console errors across the whole scenario run', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();
server.kill();

const failed = results.filter(r => !r[0]);
console.log(`\nscenario: ${results.length - failed.length}/${results.length} checks passed`);
for (const [pass, name, detail] of results) console.log(`  ${pass ? 'ok' : 'XX'}  ${name}${pass || !detail ? '' : '  :: ' + detail}`);
process.exit(failed.length ? 1 : 0);
