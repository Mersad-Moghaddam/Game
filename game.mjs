import {
  WIDTH,
  HEIGHT,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  getCamera,
} from "./world.mjs";
export { WIDTH, HEIGHT };
export const INTRO_DURATION = 9;
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
    subtitle: "npm install more-problems",
    interval: 1,
    speed: 100,
    color: "#ffc765",
  },
  {
    name: "Friday production",
    subtitle: "Nobody merge anything. MALVANDI!",
    interval: 0.65,
    speed: 115,
    color: "#ff647c",
  },
];
export const ROAST = "کار که نمیکنی همش باگ";
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
    time: 0,
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
    message: "Malvandi: “AI wrote it. What could go wrong?”",
    messageTime: 4,
    kills: 0,
    shots: 0,
    random,
  };
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
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
  const type =
    g.wave >= 3 && serial % 4 === 2
      ? "armor"
      : g.wave >= 2 && serial % 3 !== 0
        ? "runner"
        : "crawler";
  g.warnings.push({
    x,
    y,
    type,
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
  g.message = PHASES[g.wave - 1].subtitle;
  g.messageTime = 4;
  for (let i = 0; i < 2 + g.wave; i++) queueBug(g);
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
    if (g.wave === 4 && g.serial % 2 === 0) queueBug(g);
  }
  g.warnings = g.warnings.filter((w) => {
    w.life -= dt;
    if (w.life > 0) return true;
    const hp = w.type === "armor" ? 3 : 1;
    g.bugs.push({
      x: w.x,
      y: w.y,
      type: w.type,
      hp,
      maxHp: hp,
      r: w.type === "armor" ? 23 : 17,
      speed:
        phase.speed *
        (w.type === "runner" ? 1.35 : w.type === "armor" ? 0.75 : 1),
      age: w.serial,
      flash: 0,
    });
    return false;
  });
}
function moveAndShoot(g, input, dt) {
  const p = g.player,
    dx = input.x || 0,
    dy = input.y || 0,
    n = Math.max(1, Math.hypot(dx, dy)),
    speed = g.boost ? 325 : 240;
  p.moving = !!(dx || dy);
  p.x = Math.max(30, Math.min(WORLD_WIDTH - 30, p.x + (dx / n) * speed * dt));
  p.y = Math.max(55, Math.min(WORLD_HEIGHT - 40, p.y + (dy / n) * speed * dt));
  if (Number.isFinite(input.aimAngle)) p.angle = input.aimAngle;
  if (input.shoot && g.cooldown <= 0) {
    g.patches.push({
      x: p.x + Math.cos(p.angle) * 23,
      y: p.y + Math.sin(p.angle) * 23,
      vx: Math.cos(p.angle) * 440,
      vy: Math.sin(p.angle) * 440,
      life: 0.95,
    });
    g.cooldown = g.boost ? 0.18 : 0.34;
    g.shots++;
  }
}
function resolveCombat(g, dt) {
  const p = g.player;
  for (const b of g.bugs) {
    b.age += dt;
    b.flash = Math.max(0, (b.flash || 0) - dt);
    const d = distance(p, b) || 1,
      ux = (p.x - b.x) / d,
      uy = (p.y - b.y) / d,
      swerve = b.type === "runner" ? Math.sin(b.age * 8) * 0.8 : 0;
    b.x += (ux - uy * swerve) * b.speed * dt;
    b.y += (uy + ux * swerve) * b.speed * dt;
  }
  for (const shot of g.patches) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life <= 0) continue;
    for (const b of g.bugs) {
      if (!b.dead && distance(shot, b) < b.r + 6) {
        b.hp--;
        b.flash = 0.12;
        shot.life = 0;
        burst(g, shot.x, shot.y, b.hp > 0 ? "#ffc765" : "#ff887b");
        if (b.hp <= 0) {
          b.dead = true;
          g.score += b.type === "armor" ? 250 : b.type === "runner" ? 150 : 100;
          g.kills++;
        }
        break;
      }
    }
  }
  g.bugs = g.bugs.filter((b) => !b.dead);
  g.patches = g.patches.filter((s) => s.life > 0);
  for (const b of g.bugs) {
    if (g.immune === 0 && distance(p, b) < b.r + 15) {
      g.hearts--;
      g.immune = 1.5;
      g.message = "Mersad: “Who approved this? Oh. Malvandi approved himself.”";
      g.messageTime = 2;
      burst(g, p.x, p.y, "#ffd166");
      if (g.hearts === 0) {
        g.status = "lost";
        return;
      }
    }
  }
}
export function update(g, input, dt) {
  if (g.status === "won" || g.status === "lost") return;
  g.sceneTime += dt;
  if (g.status === "intro") {
    g.message =
      g.sceneTime < 2
        ? "Malvandi: “AI wrote it. What could go wrong?”"
        : g.sceneTime < 3.2
          ? "Tests: skipped. Reviewer: myself. Confidence: 100%."
          : g.sceneTime < 4.3
            ? "Uploading code… uploading bugs…"
            : g.sceneTime < 5.4
              ? "Disabling weekend… Done."
              : g.sceneTime < 7.2
                ? "Malvandi: “Probably a frontend issue.”"
                : "Incident assigned to Mersad. He was about to go home.";
    if (input.skipIntro || g.sceneTime >= INTRO_DURATION) beginPhase(g);
    return;
  }
  if (g.status === "intermission") {
    if (g.sceneTime >= 3.5) {
      if (g.wave === 4) g.status = "won";
      else {
        g.wave++;
        beginPhase(g);
      }
    }
    return;
  }
  g.phaseTime = Math.min(15, g.phaseTime + dt);
  g.time = Math.min(60, (g.wave - 1) * 15 + g.phaseTime);
  if (g.phaseTime >= 15) {
    g.status = "intermission";
    g.sceneTime = 0;
    g.bugs = [];
    g.patches = [];
    g.warnings = [];
    g.particles = [];
    g.coffees = [];
    g.message = `Honarvar: ${ROAST}`;
    g.messageTime = 4;
    return;
  }
  g.boost = Math.max(0, g.boost - dt);
  g.immune = Math.max(0, g.immune - dt);
  g.cooldown -= dt;
  g.messageTime -= dt;
  spawnBugs(g, dt);
  moveAndShoot(g, input, dt);
  resolveCombat(g, dt);
  if (g.status === "lost") return;
  if (g.time >= g.coffeeAt) {
    g.coffeeAt += 9;
    const camera = getCamera(g.player);
    g.coffees.push({
      x: camera.x + 100 + g.random() * (WIDTH - 200),
      y: camera.y + 100 + g.random() * (HEIGHT - 200),
    });
  }
  g.coffees = g.coffees.filter((c) => {
    if (distance(g.player, c) < 31) {
      g.boost = 5;
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
