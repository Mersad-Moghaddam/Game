import { PHASES, INTRO_DURATION } from "./game.mjs";
import {
  WIDTH,
  HEIGHT,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  getCamera,
  ZONES,
} from "./world.mjs";
import { createIntro } from "./intro.mjs";

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
  function programmer(
    x,
    y,
    scale,
    t,
    {
      moving = false,
      angle = 0,
      immune = false,
      boost = false,
      seated = false,
    } = {},
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (immune && !reducedMotion)
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 18);
    oval(0, 25, 24, 7, "#08162365");
    if (boost) {
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    const walk = moving && !reducedMotion ? Math.sin(t * 17) * 4 : 0;
    box(-14, 12, 11, 18 + walk, "#7894bf", 4, ink);
    box(3, 12, 11, 18 - walk, "#7894bf", 4, ink);
    box(-17, 26 + walk, 15, 7, ink, 3);
    box(2, 26 - walk, 15, 7, ink, 3);
    box(-21, -3, 42, 28, seated ? "#548bd1" : "#4eaf9f", 10, ink);
    line(
      [
        [-7, 0],
        [0, 8],
        [7, 0],
      ],
      seated ? "#a7c9ff" : "#a7f0d9",
    );
    oval(-20, 12, 6, 10, "#ffc79e", ink);
    oval(20, 12, 6, 10, "#ffc79e", ink);
    oval(-18, -22, 5, 8, "#e9a77e");
    oval(18, -22, 5, 8, "#e9a77e");
    box(-18, -43, 36, 41, "#ffd0a8", 14, ink);
    ctx.fillStyle = "#342f43";
    ctx.beginPath();
    ctx.moveTo(-19, -18);
    ctx.lineTo(-22, -41);
    ctx.quadraticCurveTo(-27, -56, -11, -53);
    ctx.lineTo(-14, -61);
    ctx.quadraticCurveTo(3, -60, 5, -52);
    ctx.quadraticCurveTo(27, -54, 21, -36);
    ctx.lineTo(17, -23);
    ctx.lineTo(12, -39);
    ctx.quadraticCurveTo(-4, -34, -12, -39);
    ctx.lineTo(-13, -20);
    ctx.fill();
    if (!seated) {
      box(-19, -38, 37, 6, "#ffd166", 2);
      line(
        [
          [18, -35],
          [28, -27],
          [31, -32],
        ],
        "#ffd166",
        4,
      );
    }
    box(-17, -30, 15, 12, "#e2f4ff", 4, ink);
    box(2, -30, 15, 12, "#e2f4ff", 4, ink);
    line(
      [
        [-2, -25],
        [2, -25],
      ],
      ink,
      3,
    );
    oval(-7, -24, 2.5, 3.5, ink);
    oval(10, -24, 2.5, 3.5, ink);
    oval(0, -16, 4, 3, "#efa877");
    line(
      [
        [-5, -10],
        [1, seated ? -8 : -10],
        [7, -11],
      ],
      "#773e42",
      2,
    );
    if (!seated) {
      ctx.save();
      ctx.translate(0, 11);
      ctx.rotate(angle);
      box(7, -6, 27, 12, "#a5eadc", 4, ink);
      box(29, -4, 8, 8, "#e9fff7", 2);
      text("{}", 20, 4, 10, ink);
      ctx.restore();
    }
    ctx.restore();
  }
  function bug(b, t) {
    ctx.save();
    ctx.translate(b.x, b.y);
    const armor = b.type === "armor",
      runner = b.type === "runner",
      r = armor ? 22 : 16;
    const color =
      b.flash > 0
        ? "#fff3d0"
        : armor
          ? "#e9ad55"
          : runner
            ? "#b79af2"
            : "#ff817b";
    oval(0, r + 5, r + 7, 6, "#08162366");
    for (let i = -1; i <= 1; i++) {
      const wiggle = reducedMotion
        ? 0
        : Math.sin(t * (runner ? 20 : 13) + i * 2) * 4;
      for (const side of [-1, 1]) {
        const points = [
          [side * (r - 4), i * 9],
          [side * (r + 9), i * 13 + wiggle],
          [side * (r + 13), i * 15 + 7 + wiggle],
        ];
        line(points, ink, 5);
        line(points, color, 2.5);
      }
    }
    oval(0, 0, r, r + 5, color, ink);
    if (armor) {
      box(-18, -6, 36, 19, "#ba7a38", 6, ink);
      line(
        [
          [0, -20],
          [0, 17],
        ],
        ink,
        2,
      );
      for (const side of [-1, 1]) oval(side * 11, 2, 3, 3, "#ffe2a1");
      if (b.hp < 3)
        line(
          [
            [-3, -15],
            [3, -5],
            [-3, 2],
            [4, 10],
          ],
          "#ffe8b0",
          3,
        );
      if (b.hp < 2)
        line(
          [
            [13, -2],
            [6, 5],
            [14, 13],
          ],
          "#ffe8b0",
          3,
        );
    } else {
      line(
        [
          [0, -4],
          [0, r + 1],
        ],
        ink,
        2,
      );
      oval(-7, 5, 3, 4, runner ? "#795aa7" : "#ce515b");
      oval(7, 9, 3, 4, runner ? "#795aa7" : "#ce515b");
      if (runner) {
        line(
          [
            [-7, 7],
            [-17, 18],
          ],
          "#e3ceff",
          3,
        );
        line(
          [
            [7, 7],
            [17, 18],
          ],
          "#e3ceff",
          3,
        );
      }
    }
    line(
      [
        [-8, -r],
        [-13, -r - 12],
        [-19, -r - 13],
      ],
      color,
      3,
    );
    line(
      [
        [8, -r],
        [13, -r - 12],
        [19, -r - 13],
      ],
      color,
      3,
    );
    oval(-8, -r + 4, 7, 8, "#fff7e9", ink);
    oval(8, -r + 4, 7, 8, "#fff7e9", ink);
    oval(-6, -r + 5, 3, 4, ink);
    oval(6, -r + 5, 3, 4, ink);
    line(
      [
        [-15, -r - 4],
        [-4, -r - 1],
      ],
      ink,
      3,
    );
    line(
      [
        [15, -r - 4],
        [4, -r - 1],
      ],
      ink,
      3,
    );
    line(
      [
        [-6, -3],
        [-3, 2],
        [0, -1],
        [3, 2],
        [6, -3],
      ],
      "#5e3347",
      2,
    );
    if (armor)
      for (let i = 0; i < 3; i++)
        box(-14 + i * 10, 34, 8, 4, i < b.hp ? "#ffd166" : "#4a3d37", 2);
    ctx.restore();
  }
  const drawIntro = createIntro(
    { ctx, box, oval, line, text, programmer, bug },
    reducedMotion,
  );
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
      box(z.x, z.y, z.w, z.h, z.color + "1c", 18, z.color + "88");
      box(z.x + 20, z.y + 18, z.w - 40, 51, z.color + "2b", 8);
      text(z.name.toUpperCase(), z.x + z.w / 2, z.y + 42, 20, z.color);
      text(z.joke, z.x + z.w / 2, z.y + 59, 10, "#a1b1c8");
    }
    // Floor graphics identify zones without creating invisible collision walls.
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
      ctx.globalAlpha = reducedMotion ? 0.18 : 0.12 + Math.sin(t * 3) * 0.04;
      box(0, 0, WORLD_WIDTH, 8, PHASES[wave - 1].color);
      ctx.restore();
    }
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
    for (const c of g.coffees) oval(x + c.x * s, y + c.y * s, 2, 2, "#ffd166");
    oval(x + g.player.x * s, y + g.player.y * s, 3, 3, "#a5f4d7");
  }
  function drawWorld(g) {
    const camera = getCamera(g.player),
      t = g.time;
    const visible = (p) =>
      p.x >= camera.x - 60 &&
      p.x <= camera.x + WIDTH + 60 &&
      p.y >= camera.y - 60 &&
      p.y <= camera.y + HEIGHT + 60;
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
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
    for (const b of g.bugs) if (visible(b)) bug(b, t);
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
    programmer(g.player.x, g.player.y, 1, t, {
      ...g.player,
      immune: g.immune > 0,
      boost: g.boost > 0,
    });
    text("Mersad", g.player.x, g.player.y + 48, 10, "#d0e1f6");
    if (g.status === "playing") {
      const x = g.player.x + Math.cos(g.player.angle) * 76,
        y = g.player.y + Math.sin(g.player.angle) * 76;
      oval(x, y, 9, 9, "#bcebdd08", "#bcebdd");
      line(
        [
          [x - 14, y],
          [x - 6, y],
        ],
        "#bcebdd",
      );
      line(
        [
          [x + 6, y],
          [x + 14, y],
        ],
        "#bcebdd",
      );
      line(
        [
          [x, y - 14],
          [x, y - 6],
        ],
        "#bcebdd",
      );
      line(
        [
          [x, y + 6],
          [x, y + 14],
        ],
        "#bcebdd",
      );
    }
    for (const p of g.particles) {
      ctx.globalAlpha = p.life / 0.4;
      box(p.x, p.y, 5, 5, p.color, 1);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    minimap(g, camera);
  }
  return function draw(g, { menu = false } = {}) {
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
        box(200, 55, 560, 53, "#102237ed", 8);
        text("YOUR TURN, MERSAD. GOOD LUCK WITH THAT.", 480, 87, 17, "#a5eadc");
      } else drawIntro(g, menu);
      return;
    }
    drawWorld(g);
    if (g.status === "intermission") {
      box(0, 0, WIDTH, HEIGHT, "#091a3099");
      text(`PHASE ${g.wave} SURVIVED`, 480, 185, 18, "#a6ecda");
      text(
        g.wave === 4
          ? "Mersad fixed it. Malvandi took credit."
          : "Malvandi broke it. Mersad gets the review.",
        480,
        229,
        24,
        "#f4f7ff",
        "center",
        "sans-serif",
      );
      text(
        g.wave === 4
          ? "Next stop: the weekend."
          : `Up next: ${PHASES[g.wave].name}`,
        480,
        263,
        14,
        "#b6cce7",
      );
    }
  };
}
