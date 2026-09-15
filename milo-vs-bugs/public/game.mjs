import {
  WIDTH,
  HEIGHT,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  getCamera,
} from "./world.mjs";
import { mods as baseMods, applyUpgrade, rollChoices } from "./upgrades.mjs";
export { WIDTH, HEIGHT };
export const INTRO_DURATION = 9;
export const BOSS_NAME = "Sir Deploys-A-Lot";
export const PHASES = [
  {
    name: "Small fix",
    subtitle: "Just one line. Famous last words.",
    interval: 2,
    speed: 65,
    color: "#ff887b",
  },
  {
    name: "Hotfix",
    subtitle: "The bugs learned to dodge.",
    interval: 1.35,
    speed: 85,
    color: "#c1a1ff",
  },
  {
    name: "Dependency hell",
    subtitle: "They multiply in production.",
    interval: 1,
    speed: 100,
    color: "#ffc765",
  },
  {
    name: "Friday production",
    subtitle: "Sir Deploys-A-Lot is online.",
    interval: 0.9,
    speed: 115,
    color: "#ff647c",
  },
];
export const ROAST = "کار که نمیکنی همش باگ";

export const ENEMIES = {
  crawler: { hp: 1, r: 17, speed: 1, points: 100 },
  runner: { hp: 1, r: 16, speed: 1.4, points: 150 },
  armor: { hp: 3, r: 22, speed: 0.72, points: 250 },
  spitter: { hp: 2, r: 18, speed: 0.8, points: 200 },
  splitter: { hp: 2, r: 19, speed: 1.05, points: 200 },
  boss: { hp: 46, r: 58, speed: 46, points: 2000 },
};

export function createGame(random = Math.random) {
  return {
    player: {
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
      angle: -Math.PI / 2,
      moving: false,
    },
    bugs: [],
    patches: [],
    warnings: [],
    coffees: [],
    particles: [],
    enemyShots: [],
    boss: null,
    upgrades: {},
    mods: baseMods(),
    choices: [],
    time: 0,
    clock: 0,
    phaseTime: 0,
    sceneTime: 0,
    score: 0,
    hearts: 3,
    wave: 1,
    boost: 0,
    immune: 0,
    cooldown: 0,
    coffeeAt: 6,
    spawnClock: 1,
    serial: 0,
    status: "intro",
    message: "Marlow: “AI wrote it. What could go wrong?”",
    messageTime: 4,
    kills: 0,
    shots: 0,
    shake: 0,
    vignette: 0,
    random,
  };
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function bugTypeFor(wave, serial) {
  if (wave >= 3) {
    if (serial % 5 === 2) return "splitter";
    if (serial % 4 === 1) return "armor";
    if (serial % 3 !== 0) return "runner";
    return "crawler";
  }
  if (wave === 2) {
    if (serial % 4 === 3) return "spitter";
    if (serial % 3 !== 0) return "runner";
    return "crawler";
  }
  return "crawler";
}

function spawnBugAt(g, x, y, type, flash = 0) {
  const def = ENEMIES[type];
  const bug = {
    x,
    y,
    type,
    hp: def.hp,
    maxHp: def.hp,
    r: def.r,
    speed: PHASES[g.wave - 1].speed * def.speed,
    age: 0,
    flash,
    cool: 1.2 + g.random(),
  };
  g.bugs.push(bug);
  return bug;
}

function queueBug(g) {
  const serial = g.serial++,
    t = 0.12 + g.random() * 0.76;
  const camera = getCamera(g.player);
  let x, y;
  // Move the warning to another edge if the player is cornered nearby.
  for (let attempt = 0; attempt < 4; attempt++) {
    const edge = (serial + attempt) % 4;
    x = camera.x + (edge === 0 ? 28 : edge === 1 ? WIDTH - 28 : t * WIDTH);
    y =
      camera.y +
      (edge === 2 ? 48 : edge === 3 ? HEIGHT - 48 : 65 + t * (HEIGHT - 130));
    if (Math.hypot(x - g.player.x, y - g.player.y) >= 170) break;
  }
  g.warnings.push({
    x,
    y,
    type: bugTypeFor(g.wave, serial),
    life: 0.75,
    serial,
  });
}

function beginPhase(g) {
  g.status = "playing";
  g.phaseTime = 0;
  g.sceneTime = 0;
  g.spawnClock = 0.8;
  g.serial = 0;
  g.immune = 1.2;
  g.cooldown = 0;
  g.bugs = [];
  g.patches = [];
  g.warnings = [];
  g.particles = [];
  g.enemyShots = [];
  g.boss = null;
  g.message = PHASES[g.wave - 1].subtitle;
  g.messageTime = 4;
  if (g.wave === 4) spawnBoss(g);
  else for (let i = 0; i < 2 + g.wave; i++) queueBug(g);
}

function spawnBoss(g) {
  const camera = getCamera(g.player),
    hp = ENEMIES.boss.hp;
  g.boss = {
    x: Math.max(140, Math.min(WORLD_WIDTH - 140, camera.x + WIDTH / 2 + 210)),
    y: Math.max(150, Math.min(WORLD_HEIGHT - 150, camera.y + HEIGHT / 2 - 110)),
    hp,
    maxHp: hp,
    r: ENEMIES.boss.r,
    speed: ENEMIES.boss.speed,
    age: 0,
    flash: 0,
    attackClock: 2.4,
    telegraph: 0,
    pattern: -1,
    pending: 0,
    dead: false,
  };
  g.message = `${BOSS_NAME}: “Works on my machine!”`;
  g.messageTime = 4;
}

function burst(g, x, y, color) {
  for (let i = 0; i < 10; i++) {
    const a = g.random() * Math.PI * 2,
      s = 40 + g.random() * 140;
    g.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.4,
      color,
    });
  }
}

function spawnBugs(g, dt) {
  const phase = PHASES[g.wave - 1];
  g.spawnClock -= dt;
  if (g.spawnClock <= 0) {
    g.spawnClock += phase.interval;
    queueBug(g);
    if (g.wave === 4 && g.serial % 3 === 0) queueBug(g);
  }
  g.warnings = g.warnings.filter((w) => {
    w.life -= dt;
    if (w.life > 0) return true;
    spawnBugAt(g, w.x, w.y, w.type);
    return false;
  });
}

function fire(g) {
  const p = g.player,
    m = g.mods,
    count = 1 + m.multishot;
  for (let i = 0; i < count; i++) {
    const spread = count > 1 ? (i - (count - 1) / 2) * 0.16 : 0,
      a = p.angle + spread;
    g.patches.push({
      x: p.x + Math.cos(a) * 23,
      y: p.y + Math.sin(a) * 23,
      vx: Math.cos(a) * 440,
      vy: Math.sin(a) * 440,
      life: 0.95,
      pierce: m.pierce,
      hits: [],
      crit: g.random() < m.crit,
    });
  }
  g.cooldown = (g.boost ? 0.18 : 0.34) * m.fireRate;
  g.shots++;
}

function moveAndShoot(g, input, dt) {
  const p = g.player,
    dx = input.x || 0,
    dy = input.y || 0,
    n = Math.max(1, Math.hypot(dx, dy)),
    speed = (g.boost ? 325 : 240) * g.mods.speed;
  p.moving = !!(dx || dy);
  p.x = Math.max(30, Math.min(WORLD_WIDTH - 30, p.x + (dx / n) * speed * dt));
  p.y = Math.max(55, Math.min(WORLD_HEIGHT - 40, p.y + (dy / n) * speed * dt));
  if (Number.isFinite(input.aimAngle)) p.angle = input.aimAngle;
  if (input.shoot && g.cooldown <= 0) fire(g);
}

function killBug(g, b) {
  b.dead = true;
  g.score += ENEMIES[b.type].points;
  g.kills++;
  if (b.type === "splitter")
    for (let i = 0; i < 2; i++) {
      const a = g.random() * Math.PI * 2;
      spawnBugAt(g, b.x + Math.cos(a) * 26, b.y + Math.sin(a) * 26, "crawler", 0.12);
    }
}

function ricochet(g, shot) {
  let best = null,
    bd = 1e9;
  for (const b of g.bugs) {
    if (b.dead || shot.hits.includes(b)) continue;
    const d = distance(shot, b);
    if (d < 340 && d < bd) {
      bd = d;
      best = b;
    }
  }
  if (!best) return;
  const a = Math.atan2(best.y - shot.y, best.x - shot.x);
  shot.vx = Math.cos(a) * 440;
  shot.vy = Math.sin(a) * 440;
  shot.life = 0.6;
  shot.pierce = 0;
}

function hurt(g) {
  g.hearts--;
  g.immune = 1.5;
  g.vignette = 0.5;
  burst(g, g.player.x, g.player.y, "#ffd166");
  if (g.hearts <= 0) {
    if (g.mods.revives > 0) {
      g.mods.revives--;
      g.hearts = 1;
      g.immune = 2.4;
      g.message = "Second Wind! Back on call.";
      g.messageTime = 3;
    } else {
      g.status = "lost";
      g.message = "Marlow caused this. Milo needed a raise.";
      g.messageTime = 3;
    }
  } else {
    g.message = "Milo: “Who approved this? Oh. Marlow approved himself.”";
    g.messageTime = 2;
  }
}

function updateBugs(g, dt) {
  const p = g.player;
  for (const b of g.bugs) {
    b.age += dt;
    b.flash = Math.max(0, (b.flash || 0) - dt);
    const d = distance(p, b) || 1,
      ux = (p.x - b.x) / d,
      uy = (p.y - b.y) / d;
    if (b.type === "runner") {
      const swerve = Math.sin(b.age * 8) * 0.8;
      b.x += (ux - uy * swerve) * b.speed * dt;
      b.y += (uy + ux * swerve) * b.speed * dt;
    } else if (b.type === "spitter") {
      b.cool -= dt;
      if (d < 300 && b.cool <= 0) {
        b.cool = 2.4;
        const a = Math.atan2(p.y - b.y, p.x - b.x);
        g.enemyShots.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(a) * 175,
          vy: Math.sin(a) * 175,
          life: 3,
          r: 7,
          kind: "spit",
        });
      }
      if (d > 270) {
        b.x += ux * b.speed * dt;
        b.y += uy * b.speed * dt;
      }
    } else {
      b.x += ux * b.speed * dt;
      b.y += uy * b.speed * dt;
    }
  }
}

function updateBoss(g, dt) {
  const b = g.boss;
  if (!b || b.dead) return;
  b.age += dt;
  b.flash = Math.max(0, (b.flash || 0) - dt);
  const p = g.player,
    d = distance(p, b) || 1;
  if (b.telegraph > 0) {
    b.telegraph -= dt;
    if (b.telegraph <= 0) bossAttack(g, b, b.pending);
    return;
  }
  if (d > 220) {
    b.x += ((p.x - b.x) / d) * b.speed * dt;
    b.y += ((p.y - b.y) / d) * b.speed * dt;
  }
  b.attackClock -= dt;
  if (b.attackClock <= 0) {
    b.attackClock = 2.6;
    b.pattern = (b.pattern + 1) % 3;
    b.pending = b.pattern;
    b.telegraph = 0.85;
  }
}

function bossAttack(g, b, pattern) {
  const p = g.player;
  if (pattern === 0) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      spawnBugAt(
        g,
        b.x + Math.cos(a) * 92,
        b.y + Math.sin(a) * 92,
        "crawler",
        0.12,
      );
    }
    g.message = `${BOSS_NAME} deploys six more bugs.`;
    g.messageTime = 2;
  } else if (pattern === 1) {
    const a = Math.atan2(p.y - b.y, p.x - b.x);
    b.x += Math.cos(a) * 140;
    b.y += Math.sin(a) * 140;
    g.shake = 0.5;
    g.vignette = Math.max(g.vignette, 0.35);
    if (distance(p, b) < b.r + 78 && g.immune === 0) hurt(g);
  } else {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + b.age;
      g.enemyShots.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(a) * 185,
        vy: Math.sin(a) * 185,
        life: 3,
        r: 7,
        kind: "spit",
      });
    }
  }
}

function resolveCombat(g, dt) {
  const p = g.player;
  for (const shot of g.patches) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life <= 0) continue;
    for (const b of g.bugs) {
      if (b.dead || shot.hits.includes(b)) continue;
      if (distance(shot, b) < b.r + 6 * g.mods.patchSize) {
        const dmg = g.mods.damage * (shot.crit ? 2 : 1);
        b.hp -= dmg;
        b.flash = 0.12;
        shot.hits.push(b);
        burst(g, shot.x, shot.y, b.hp > 0 ? "#ffc765" : "#ff887b");
        g.vignette = Math.max(g.vignette, shot.crit ? 0.2 : 0.08);
        if (b.hp <= 0) killBug(g, b);
        if (shot.pierce > 0) shot.pierce--;
        else {
          shot.life = 0;
          if (g.mods.ricochet) ricochet(g, shot);
        }
        break;
      }
    }
    if (
      shot.life > 0 &&
      g.boss &&
      !g.boss.dead &&
      !shot.hits.includes(g.boss) &&
      distance(shot, g.boss) < g.boss.r + 6 * g.mods.patchSize
    ) {
      const dmg = g.mods.damage * (shot.crit ? 2 : 1);
      g.boss.hp -= dmg;
      g.boss.flash = 0.12;
      shot.hits.push(g.boss);
      burst(g, shot.x, shot.y, g.boss.hp > 0 ? "#ffc765" : "#ff887b");
      if (shot.pierce > 0) shot.pierce--;
      else shot.life = 0;
    }
  }
  g.bugs = g.bugs.filter((b) => !b.dead);
  g.patches = g.patches.filter((s) => s.life > 0);

  g.enemyShots = g.enemyShots.filter((s) => {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.life <= 0) return false;
    if (g.immune === 0 && distance(s, p) < (s.r || 7) + 14) {
      hurt(g);
      return false;
    }
    return true;
  });
  if (g.status === "lost") return;

  for (const b of g.bugs) {
    if (g.immune === 0 && distance(p, b) < b.r + 15) {
      hurt(g);
      if (g.status === "lost") return;
    }
  }
  if (g.boss && !g.boss.dead && g.immune === 0 && distance(p, g.boss) < g.boss.r + 14) {
    hurt(g);
    if (g.status === "lost") return;
  }
  if (g.boss && g.boss.hp <= 0 && !g.boss.dead) {
    g.boss.dead = true;
    g.score += ENEMIES.boss.points;
    burst(g, g.boss.x, g.boss.y, "#ffd166");
    g.status = "won";
    g.message = "Sir Deploys-A-Lot decommissioned.";
    g.messageTime = 4;
  }
}

export function chooseUpgrade(g, id) {
  if (g.status !== "upgrade") return g;
  applyUpgrade(g, id);
  g.wave++;
  beginPhase(g);
  return g;
}

export function update(g, input, dt) {
  if (g.status === "won" || g.status === "lost") return;
  g.sceneTime += dt;
  if (g.status === "intro") {
    g.message =
      g.sceneTime < 2
        ? "Marlow: “AI wrote it. What could go wrong?”"
        : g.sceneTime < 3.2
          ? "Tests: skipped. Reviewer: myself. Confidence: 100%."
          : g.sceneTime < 4.3
            ? "Uploading code… uploading bugs…"
            : g.sceneTime < 5.4
              ? "Disabling weekend… Done."
              : g.sceneTime < 7.2
                ? "Marlow: “Probably a frontend issue.”"
                : "Incident assigned to Milo. He was about to go home.";
    if (input.skipIntro || g.sceneTime >= INTRO_DURATION) beginPhase(g);
    return;
  }
  if (g.status === "intermission") {
    if (g.sceneTime >= 2.6) {
      if (g.wave >= 4) g.status = "won";
      else {
        g.choices = rollChoices(g, g.random);
        g.status = "upgrade";
        g.sceneTime = 0;
      }
    }
    return;
  }
  if (g.status === "upgrade") return;
  g.phaseTime = Math.min(15, g.phaseTime + dt);
  g.clock += dt;
  if (g.wave < 4) g.time = Math.min(60, (g.wave - 1) * 15 + g.phaseTime);
  if (g.wave < 4 && g.phaseTime >= 15) {
    g.status = "intermission";
    g.sceneTime = 0;
    g.bugs = [];
    g.patches = [];
    g.warnings = [];
    g.particles = [];
    g.coffees = [];
    g.enemyShots = [];
    g.boss = null;
    g.message = `Hollis: ${ROAST}`;
    g.messageTime = 4;
    return;
  }
  g.boost = Math.max(0, g.boost - dt);
  g.immune = Math.max(0, g.immune - dt);
  g.shake = Math.max(0, g.shake - dt);
  g.vignette = Math.max(0, g.vignette - dt * 1.6);
  g.cooldown -= dt;
  g.messageTime -= dt;
  spawnBugs(g, dt);
  moveAndShoot(g, input, dt);
  updateBugs(g, dt);
  updateBoss(g, dt);
  resolveCombat(g, dt);
  if (g.status === "lost") return;
  if (g.status === "won") return;
  if (g.clock >= g.coffeeAt) {
    g.coffeeAt += 9;
    const camera = getCamera(g.player);
    g.coffees.push({
      x: camera.x + 100 + g.random() * (WIDTH - 200),
      y: camera.y + 100 + g.random() * (HEIGHT - 200),
    });
  }
  g.coffees = g.coffees.filter((c) => {
    if (distance(g.player, c) < 31 * g.mods.magnet) {
      g.boost = g.mods.boostTime;
      g.message = "Coffee installed. Confidence unjustified.";
      g.messageTime = 3;
      burst(g, c.x, c.y, "#ffd166");
      return false;
    }
    return true;
  });
  for (const s of g.particles) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
  }
  g.particles = g.particles.filter((s) => s.life > 0);
}
