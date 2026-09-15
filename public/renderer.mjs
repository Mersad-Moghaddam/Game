import {
  PHASES,
  INTRO_DURATION,
  BOSS_NAME,
  WIDTH,
  HEIGHT,
} from "./game.mjs";
import { WORLD_WIDTH, WORLD_HEIGHT, getCamera, ZONES } from "./world.mjs";
import { createIntro } from "./intro.mjs";
import { createSprites } from "./sprites.mjs";

export function createRenderer(ctx, reducedMotion = false) {
  const ink = "#102237";
  function box(x, y, w, h, color, r = 0, stroke) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  function oval(x, y, rx, ry, color, stroke) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  function line(points, color, width = 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  function text(
    value,
    x,
    y,
    size = 14,
    color = "#dce6f7",
    align = "center",
    font = "monospace",
  ) {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px ${font}`;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  }

  const sprites = createSprites({
    ctx,
    box,
    oval,
    line,
    text,
    ink,
    reducedMotion,
  });
  const drawIntro = createIntro(
    {
      ctx,
      box,
      oval,
      line,
      text,
      milo: sprites.milo,
      marlow: sprites.marlow,
      creature: sprites.creature,
    },
    reducedMotion,
  );

  let fireFlash = 0,
    lastShots = 0;

  function ambience() {
    if (reducedMotion) return;
    const t = performance.now() / 1000;
    // Server rack glowing LEDs.
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 5; j++)
        if ((Math.sin(t * 3 + i * 2 + j) + 1) / 2 > 0.6)
          oval(174 + i * 85, 238 + j * 22, 2, 2, "#7ce0c6");
    // Coffee steam.
    for (let i = 0; i < 3; i++) {
      const y = 300 - ((t * 26 + i * 22) % 60);
      ctx.globalAlpha = 0.25;
      oval(1534 + Math.sin(t * 2 + i) * 6, y, 4, 6, "#e9d9bd");
      ctx.globalAlpha = 1;
    }
    // Code rain over Untested code.
    for (let i = 0; i < 10; i++) {
      const x = 150 + (i * 61) % 600,
        y = 720 + ((t * 60 + i * 53) % 260);
      text(i % 2 ? "{}" : ";", x, y, 13, "#9d7fc0");
    }
    // Conveyor chevrons in Production.
    for (let i = 0; i < 8; i++) {
      const x = 860 + ((t * 40 + i * 120) % 960);
      line(
        [
          [x, 1000],
          [x + 18, 1012],
          [x, 1024],
        ],
        "#31544f",
        3,
      );
    }
  }

  function room(wave, t) {
    box(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "#162a42");
    for (let x = 0; x < WORLD_WIDTH; x += 48)
      line(
        [
          [x, 0],
          [x, WORLD_HEIGHT],
        ],
        "#243a53",
        1,
      );
    for (let y = 0; y < WORLD_HEIGHT; y += 48)
      line(
        [
          [0, y],
          [WORLD_WIDTH, y],
        ],
        "#243a53",
        1,
      );
    for (const z of ZONES) {
      box(z.x, z.y, z.w, z.h, z.color + "22", 18, z.color + "99");
      box(z.x + 20, z.y + 18, z.w - 40, 51, z.color + "33", 8);
      box(z.x + 20, z.y + 18, 5, 51, z.color, 2);
      text(z.name.toUpperCase(), z.x + z.w / 2, z.y + 42, 20, z.color);
      text(z.joke, z.x + z.w / 2, z.y + 59, 10, "#a1b1c8");
    }
    for (let i = 0; i < 6; i++) {
      box(159 + i * 85, 220, 60, 135, "#27465b", 6);
      for (let j = 0; j < 5; j++) {
        box(166 + i * 85, 232 + j * 22, 46, 13, "#1a3347", 2);
        oval(174 + i * 85, 238 + j * 22, 2, 2, "#568989");
      }
    }
    oval(1534, 299, 64, 64, "#b18b5422", "#937c5644");
    text("☕", 1534, 321, 64, "#b7a078");
    text("TODO", 420, 867, 50, "#705783");
    text("fix after launch", 420, 901, 17, "#836e95");
    text("{ production }", 1320, 757, 47, "#31544f");
    text("you are the rollback plan", 1320, 793, 14, "#54786f");
    for (const x of [4, WORLD_WIDTH - 41])
      for (let y = 74; y < WORLD_HEIGHT - 80; y += 98) {
        box(x, y, 37, 75, "#0e2035", 5);
        for (let i = 0; i < 3; i++) {
          box(x + 5, y + 8 + i * 20, 27, 15, "#2b4460", 2);
          oval(
            x + 11,
            y + 15 + i * 20,
            2,
            2,
            wave > 2 ? PHASES[wave - 1].color : "#82c8b7",
          );
        }
      }
    box(
      43,
      44,
      WORLD_WIDTH - 86,
      WORLD_HEIGHT - 88,
      "#00000000",
      10,
      "#536079",
    );
    for (let x = 60; x < WORLD_WIDTH - 60; x += 24) {
      line(
        [
          [x, 34],
          [x + 9, 43],
        ],
        "#827858",
        4,
      );
      line(
        [
          [x, WORLD_HEIGHT - 43],
          [x + 9, WORLD_HEIGHT - 34],
        ],
        "#827858",
        4,
      );
    }
    if (wave >= 3) {
      ctx.save();
      ctx.globalAlpha = reducedMotion ? 0.18 : 0.1 + Math.sin(t * 3) * 0.04;
      box(0, 0, WORLD_WIDTH, 8, PHASES[wave - 1].color);
      ctx.restore();
    }
    ambience();
  }

  function minimap(g, camera) {
    const x = WIDTH - 171,
      y = 57,
      s = 0.077;
    box(x - 8, y - 22, 164, 112, "#0d1e32e8", 7, "#526b87");
    text("INCIDENT MAP", x + 73, y - 7, 9, "#b8cfe3");
    box(x, y, WORLD_WIDTH * s, WORLD_HEIGHT * s, "#1c334a", 3);
    for (const z of ZONES)
      box(x + z.x * s, y + z.y * s, z.w * s, z.h * s, z.color + "66", 2);
    box(
      x + camera.x * s,
      y + camera.y * s,
      WIDTH * s,
      HEIGHT * s,
      "#f5ffff0b",
      1,
      "#9bb7ca",
    );
    for (const b of g.bugs) oval(x + b.x * s, y + b.y * s, 1.5, 1.5, "#ff817b");
    if (g.boss)
      oval(x + g.boss.x * s, y + g.boss.y * s, 3.5, 3.5, "#ff647c", "#fff");
    for (const c of g.coffees) oval(x + c.x * s, y + c.y * s, 2, 2, "#ffd166");
    oval(x + g.player.x * s, y + g.player.y * s, 3, 3, "#a5f4d7");
  }

  function drawWorld(g) {
    const camera = getCamera(g.player),
      t = g.time || g.sceneTime;
    let sx = 0,
      sy = 0;
    if (g.shake > 0 && !reducedMotion) {
      sx = (Math.sin(t * 90) * 7 * g.shake) | 0;
      sy = (Math.cos(t * 77) * 7 * g.shake) | 0;
    }
    const visible = (p) =>
      p.x >= camera.x - 80 &&
      p.x <= camera.x + WIDTH + 80 &&
      p.y >= camera.y - 80 &&
      p.y <= camera.y + HEIGHT + 80;
    ctx.save();
    ctx.translate(-camera.x + sx, -camera.y + sy);
    room(g.wave, t);
    for (const w of g.warnings) {
      if (!visible(w)) continue;
      const r = 17 + (1 - w.life / 0.75) * 17;
      oval(w.x, w.y, r, r, "#ff776e28", "#ff9383");
      text("!", w.x, w.y + 6, 20, "#ffd166");
    }
    for (const c of g.coffees) {
      if (!visible(c)) continue;
      oval(c.x, c.y + 14, 18, 5, "#071a2c77");
      oval(c.x, c.y, 25, 25, "#ffd16619");
      box(c.x - 11, c.y - 12, 22, 25, "#ffd166", 5, ink);
      line(
        [
          [c.x + 12, c.y - 7],
          [c.x + 19, c.y - 7],
          [c.x + 19, c.y + 4],
          [c.x + 12, c.y + 4],
        ],
        "#ffd166",
        4,
      );
      text("~", c.x, c.y - 20, 20, "#e6f1ff");
    }
    if (g.boss && visible(g.boss)) sprites.deployBot(g.boss, t);
    for (const s of g.enemyShots) {
      if (!visible(s)) continue;
      oval(s.x, s.y, 9, 9, "#2f8f7955");
      oval(s.x, s.y, 5.5, 5.5, "#d6fff2", "#2f8f79");
    }
    for (const b of g.bugs) if (visible(b)) sprites.creature(b, t);
    for (const shot of g.patches) {
      if (!visible(shot)) continue;
      ctx.save();
      ctx.translate(shot.x, shot.y);
      ctx.rotate(Math.atan2(shot.vy, shot.vx));
      box(-13, -5, 23, 10, "#a6ecda", 3);
      line(
        [
          [-22, 0],
          [-14, 0],
        ],
        "#6cccb888",
        3,
      );
      ctx.restore();
    }
    for (const p of g.particles) {
      ctx.globalAlpha = p.life / 0.4;
      box(p.x, p.y, 5, 5, p.color, 1);
    }
    ctx.globalAlpha = 1;
    if (fireFlash > 0 && !reducedMotion) {
      const mx = g.player.x + Math.cos(g.player.angle) * 30,
        my = g.player.y + Math.sin(g.player.angle) * 30;
      ctx.globalAlpha = fireFlash / 0.08;
      oval(mx, my, 10, 8, "#fff2c6");
      ctx.globalAlpha = 1;
    }
    if (!["intro", "menu"].includes(g.status))
      sprites.milo(g.player.x, g.player.y, 1, t, {
        ...g.player,
        immune: g.immune > 0,
        boost: g.boost > 0,
        firing: fireFlash > 0,
      });
    if (g.status === "playing") {
      const x = g.player.x + Math.cos(g.player.angle) * 76,
        y = g.player.y + Math.sin(g.player.angle) * 76;
      oval(x, y, 9, 9, "#bcebdd08", "#bcebdd");
      for (const [dx, dy] of [
        [-14, 0],
        [-6, 0],
        [6, 0],
        [14, 0],
        [0, -14],
        [0, -6],
        [0, 6],
        [0, 14],
      ])
        line(
          [
            [x + dx, y + dy],
            [x + dx * 0.5, y + dy * 0.5],
          ],
          "#bcebdd",
        );
    }
    ctx.restore();
    minimap(g, camera);
    if (g.vignette > 0) {
      const a = Math.min(0.5, g.vignette);
      const grad = ctx.createRadialGradient(
        WIDTH / 2,
        HEIGHT / 2,
        HEIGHT * 0.3,
        WIDTH / 2,
        HEIGHT / 2,
        HEIGHT * 0.75,
      );
      grad.addColorStop(0, "#ff2d3f00");
      grad.addColorStop(1, `#ff2d3f${Math.round(a * 255)
        .toString(16)
        .padStart(2, "0")}`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  function bossBar(g) {
    const w = 460,
      x = (WIDTH - w) / 2,
      y = HEIGHT - 46;
    box(x - 6, y - 22, w + 12, 30, "#0b1a2dcc", 8, "#ff647c");
    text(BOSS_NAME.toUpperCase(), x + w / 2, y - 4, 12, "#ffd1d8");
    box(x, y + 2, w, 8, "#3a2030", 4);
    box(x, y + 2, (w * Math.max(0, g.boss.hp)) / g.boss.maxHp, 8, "#ff647c", 4);
  }

  function intermission(g) {
    box(0, 0, WIDTH, HEIGHT, "#091a30cc");
    text(`PHASE ${g.wave} CLEARED`, 480, 178, 18, "#a6ecda");
    text(
      g.wave === 3
        ? "Marlow broke it. Milo fixed it."
        : "Marlow broke it. Milo gets the review.",
      480,
      222,
      24,
      "#f4f7ff",
      "center",
      "sans-serif",
    );
    text(
      `Up next: ${PHASES[g.wave].name}`,
      480,
      256,
      14,
      "#b6cce7",
    );
    sprites.hollis(760, 400, 1.6, g.sceneTime);
    text(
      `Hollis: “${"کار که نمیکنی همش باگ"}”`,
      300,
      420,
      15,
      "#fff5dc",
      "left",
      "sans-serif",
    );
  }

  return function draw(g, { menu = false } = {}) {
    fireFlash = Math.max(0, fireFlash - 0.016);
    if (g.shots !== lastShots) {
      lastShots = g.shots;
      fireFlash = 0.08;
    }
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (g.status === "intro") {
      if (!menu && g.sceneTime >= 7.2) {
        const f = Math.min(1, (g.sceneTime - 7.2) / (INTRO_DURATION - 7.2));
        drawWorld(g);
        ctx.save();
        ctx.globalAlpha = 1 - f;
        if (!reducedMotion) {
          const scale = 1 - f * 0.72;
          ctx.translate(WIDTH / 2, HEIGHT / 2);
          ctx.scale(scale, scale);
          ctx.translate(-WIDTH / 2, -HEIGHT / 2);
        }
        drawIntro(g);
        ctx.restore();
        box(150, 55, 660, 53, "#102237ed", 8);
        text("YOUR TURN, MILO. GOOD LUCK WITH THAT.", 480, 87, 17, "#a5eadc");
      } else drawIntro(g, menu);
      return;
    }
    drawWorld(g);
    if (g.status === "intermission") intermission(g);
    if (g.boss && g.status === "playing") bossBar(g);
  };
}
