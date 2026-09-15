// Character and creature artwork. Pure canvas drawing with no simulation state,
// exported as a factory so the renderer can share its primitives and ink colour.
export function createSprites({ ctx, box, oval, line, text, ink, reducedMotion }) {
  const save = (x, y, s = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
  };
  const shadow = (r) => oval(0, r + 5, r + 7, 6, "#08162366");

  function eyes(blink, y, gap) {
    if (blink) {
      line(
        [
          [-gap - 4, y],
          [-gap + 4, y],
        ],
        ink,
        2,
      );
      line(
        [
          [gap - 4, y],
          [gap + 4, y],
        ],
        ink,
        2,
      );
      return;
    }
    oval(-gap, y, 2.6, 3.6, ink);
    oval(gap, y, 2.6, 3.6, ink);
  }

  // Milo: on-call hero. Rolled-sleeve hoodie, headphones on the neck, eye-bags.
  function milo(
    x,
    y,
    scale,
    t,
    {
      moving = false,
      angle = 0,
      immune = false,
      boost = false,
      firing = false,
      seated = false,
    } = {},
  ) {
    save(x, y, scale);
    if (immune && !reducedMotion)
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 18);
    shadow(0);
    if (boost) {
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 35, 0, Math.PI * 2);
      ctx.stroke();
    }
    const walk = moving && !reducedMotion ? Math.sin(t * 17) * 4 : 0,
      blink = !reducedMotion && Math.sin(t * 1.7) > 0.985,
      recoil = firing ? -3 : 0;
    // legs + sneakers
    box(-14, 12, 11, 18 + walk, "#3f5d86", 4, ink);
    box(3, 12, 11, 18 - walk, "#3f5d86", 4, ink);
    box(-17, 26 + walk, 15, 7, ink, 3);
    box(2, 26 - walk, 15, 7, ink, 3);
    // hoodie body with rolled sleeves and a chest zip
    box(-21, -4, 42, 29, "#2f9e8b", 11, ink);
    box(-20, 4, 40, 8, "#27806f", 3);
    box(-19, -3, 38, 7, "#e9c789", 3, ink);
    line(
      [
        [0, 5],
        [0, 20],
      ],
      "#1c6155",
      2,
    );
    oval(0, -3, 17, 8, "#27806f", ink);
    // arms
    oval(-20, 12, 6, 10, "#a9d8cf", ink);
    oval(20, 12, 6, 10, "#a9d8cf", ink);
    // head
    oval(-17, -23, 5, 8, "#e9a77e");
    oval(17, -23, 5, 8, "#e9a77e");
    box(-18, -44, 36, 42, "#ffd0a8", 15, ink);
    // messy hair
    ctx.fillStyle = "#3a3247";
    ctx.beginPath();
    ctx.moveTo(-19, -22);
    ctx.quadraticCurveTo(-24, -52, -8, -56);
    ctx.quadraticCurveTo(2, -60, 9, -52);
    ctx.quadraticCurveTo(25, -55, 19, -32);
    ctx.lineTo(17, -40);
    ctx.quadraticCurveTo(-2, -33, -13, -40);
    ctx.lineTo(-14, -22);
    ctx.fill();
    // headphones resting on the neck
    line(
      [
        [-17, -6],
        [-22, 2],
      ],
      "#1f2a3d",
      5,
    );
    line(
      [
        [17, -6],
        [22, 2],
      ],
      "#1f2a3d",
      5,
    );
    oval(-20, 4, 6, 7, "#1f2a3d", ink);
    oval(20, 4, 6, 7, "#1f2a3d", ink);
    // face: eye-bags, raised brow, small mouth
    line(
      [
        [-12, -34],
        [-1, -36],
        [10, -34],
      ],
      "#3a3247",
      2,
    );
    eyes(blink, -25, 7);
    line(
      [
        [-13, -20],
        [-7, -21],
      ],
      "#c98f68",
      1.5,
    );
    line(
      [
        [7, -21],
        [13, -20],
      ],
      "#c98f68",
      1.5,
    );
    oval(0, -16, 4, 3, "#efa877");
    line(
      [
        [-6, -9],
        [0, -7],
        [6, -10],
      ],
      "#773e42",
      2,
    );
    // patch gun in the aim direction
    if (!seated) {
      ctx.save();
      ctx.translate(0, 11);
      ctx.rotate(angle);
      box(7 + recoil, -6, 28, 13, "#a5eadc", 4, ink);
      box(30 + recoil, -4, 9, 8, "#e9fff7", 2);
      box(13 + recoil, -10, 9, 5, "#5fcfb8", 2, ink);
      text("{}", 20 + recoil, 5, 10, ink);
      if (firing) oval(40 + recoil, 0, 6, 4, "#fff2c6");
      ctx.restore();
    }
    ctx.restore();
  }

  function hairMarlow(bob) {
    ctx.fillStyle = "#241f2e";
    ctx.beginPath();
    ctx.moveTo(-19, -26 + bob);
    ctx.quadraticCurveTo(-22, -52 + bob, -2, -55 + bob);
    ctx.quadraticCurveTo(20, -56 + bob, 19, -34 + bob);
    ctx.lineTo(15, -44 + bob);
    ctx.quadraticCurveTo(0, -40 + bob, -14, -44 + bob);
    ctx.closePath();
    ctx.fill();
    box(-18, -50 + bob, 17, 7, "#1b2433", 3, ink);
    box(1, -50 + bob, 17, 7, "#1b2433", 3, ink);
    line(
      [
        [-1, -47 + bob],
        [1, -47 + bob],
      ],
      ink,
      2,
    );
  }

  function faceMarlow(t, bob, angle = 0) {
    const blink = !reducedMotion && Math.sin(t * 2.1) > 0.985;
    eyes(blink, -27 + bob, 8);
    line(
      [
        [-12, -38 + bob],
        [-1, -37 + bob],
        [11, -39 + bob],
      ],
      "#3a3247",
      2,
    );
    oval(0, -18 + bob, 4, 3, "#e59a6d");
    line(
      [
        [-8, -10 + bob],
        [2, -7 + bob],
        [9, -12 + bob],
      ],
      "#6d363c",
      2,
    );
    box(22, 6 + bob, 11, 18, "#71cbb6", 3, ink);
    line(
      [
        [24, 10 + bob],
        [31, 10 + bob],
      ],
      "#e9fff7",
      2,
    );
  }

  // Marlow: careless senior dev. Undercut, pushed-up shades, energy drink.
  function marlow(
    x,
    y,
    scale,
    t,
    { seated = false, pilot = false, angle = 0 } = {},
  ) {
    save(x, y, scale);
    const bob = reducedMotion ? 0 : Math.sin(t * 2.2) * 1.5;
    if (!pilot) shadow(0);
    if (seated) {
      box(-22, 4, 44, 26, "#548bd1", 11, ink);
      oval(-18, -20, 5, 8, "#e9a77e");
      oval(18, -20, 5, 8, "#e9a77e");
      box(-19, -46 + bob, 38, 44, "#f0c39c", 15, ink);
      hairMarlow(bob);
      faceMarlow(t, bob);
      box(-30, 26, 18, 9, "#c9d7ea", 3, ink);
      box(12, 26, 18, 9, "#c9d7ea", 3, ink);
      ctx.restore();
      return;
    }
    if (pilot) {
      box(-30, 6, 60, 34, "#3f6bb0", 12, ink);
      box(-24, -44, 48, 52, "#f0c39c", 18, ink);
      hairMarlow(0);
      faceMarlow(t, 0);
      ctx.restore();
      return;
    }
    box(-15, 12, 12, 18, "#3f5d86", 4, ink);
    box(3, 12, 12, 18, "#3f5d86", 4, ink);
    box(-18, 26, 16, 7, ink, 3);
    box(2, 26, 16, 7, ink, 3);
    box(-22, -4, 44, 29, "#548bd1", 11, ink);
    line(
      [
        [-8, 0],
        [0, 9],
        [8, 0],
      ],
      "#a7c9ff",
    );
    oval(-21, 12, 6, 10, "#ffc79e", ink);
    oval(21, 12, 6, 10, "#ffc79e", ink);
    box(-19, -46 + bob, 38, 44, "#f0c39c", 15, ink);
    hairMarlow(bob);
    faceMarlow(t, bob, angle);
    ctx.restore();
  }

  // Hollis: the unrequested reviewer. Huge glasses, one wild brow, cardigan.
  function hollis(x, y, scale, t) {
    save(x, y, scale);
    const clap =
      reducedMotion || Math.sin(t * 5) < 0.3 ? 0 : Math.sin(t * 5) * 4;
    shadow(0);
    box(-24, 6, 48, 30, "#6b4a86", 12, ink);
    box(-19, 8, 38, 8, "#8d6aa9", 3);
    line(
      [
        [0, 22],
        [0, 36],
      ],
      "#4c3560",
      3,
    );
    oval(0, 4, 9, 6, "#f4d7a1");
    oval(-25, 14, 6, 10, "#6b4a86", ink);
    oval(25, 14, 6, 10, "#6b4a86", ink);
    oval(-24 + clap, 24, 5, 5, "#ffd0a8", ink);
    oval(24 - clap, 24, 5, 5, "#ffd0a8", ink);
    oval(-18, -22, 5, 8, "#e9a77e");
    oval(18, -22, 5, 8, "#e9a77e");
    box(-19, -44, 38, 42, "#ffd8b4", 15, ink);
    line(
      [
        [-6, -57],
        [-12, -64],
      ],
      "#5a4a52",
      2,
    );
    line(
      [
        [0, -58],
        [1, -67],
      ],
      "#5a4a52",
      2,
    );
    line(
      [
        [7, -57],
        [13, -64],
      ],
      "#5a4a52",
      2,
    );
    box(-18, -32, 18, 17, "#ecf7ff", 5, ink);
    box(0, -32, 18, 17, "#ecf7ff", 5, ink);
    line(
      [
        [-1, -24],
        [1, -24],
      ],
      ink,
      3,
    );
    oval(-9, -24, 4, 5, ink);
    oval(9, -24, 4, 5, ink);
    line(
      [
        [-16, -39],
        [-2, -44],
      ],
      "#5a4a52",
      3,
    );
    line(
      [
        [3, -38],
        [16, -38],
      ],
      "#5a4a52",
      3,
    );
    line(
      [
        [-7, -12],
        [7, -12],
      ],
      "#7a4a4a",
      2,
    );
    ctx.save();
    ctx.translate(22, 8);
    ctx.rotate(-0.5);
    box(-4, -16, 8, 26, "#e64d4d", 3, ink);
    ctx.restore();
    ctx.restore();
  }

  // Sir Deploys-A-Lot: Marlow's giant deploy bot, with a pilot cockpit.
  function deployBot(b, t) {
    save(b.x, b.y, 1);
    const pulse = reducedMotion ? 0.7 : 0.6 + 0.4 * Math.sin(t * 6),
      tell = b.telegraph > 0,
      flash = b.flash > 0,
      wob = reducedMotion ? 0 : Math.sin(t * 3) * 3;
    oval(0, b.r + 12, b.r + 12, 12, "#06121f88");
    box(-b.r + 6, b.r - 6, b.r - 12, 20, "#243449", 7, ink);
    box(6, b.r - 6, b.r - 12, 20, "#243449", 7, ink);
    for (let i = 0; i < 4; i++)
      line(
        [
          [-b.r + 12 + i * 14, b.r + 10],
          [-b.r + 6 + i * 14, b.r + 4],
        ],
        "#4a6785",
        3,
      );
    const shell = flash ? "#fff3d0" : tell ? "#d9698a" : "#7f8fb0";
    box(-b.r, -b.r + wob, b.r * 2, b.r * 2 - 6, shell, 20, ink);
    box(-b.r + 10, -b.r + 12 + wob, b.r * 2 - 20, 26, "#33455f", 8, ink);
    oval(0, -b.r + 20 + wob, 30, 22, "#bdf0ff", "#2a3d57");
    marlow(0, -b.r + 30 + wob, 0.5, t, { pilot: true });
    oval(0, -b.r + 2 + wob, 7, 7, tell ? "#ff5b6e" : "#ffd166", ink);
    if (!reducedMotion) {
      ctx.globalAlpha = 0.25 + pulse * 0.35;
      oval(0, -b.r + 2 + wob, 15, 15, "#ff5b6e");
      ctx.globalAlpha = 1;
    }
    box(-b.r - 14, -6, 18, 34, "#5b6c8c", 6, ink);
    box(b.r - 4, -6, 18, 34, "#5b6c8c", 6, ink);
    oval(-b.r - 5, 30, 10, 10, "#8f9fbd", ink);
    oval(b.r + 5, 30, 10, 10, "#8f9fbd", ink);
    line(
      [
        [0, -b.r + wob],
        [0, -b.r - 20],
      ],
      ink,
      3,
    );
    oval(0, -b.r - 22, 4, 4, "#ffd166", ink);
    ctx.restore();
  }

  // A bug. Types share a body with distinct colour and features.
  function creature(b, t) {
    save(b.x, b.y, 1);
    const armor = b.type === "armor",
      runner = b.type === "runner",
      spitter = b.type === "spitter",
      splitter = b.type === "splitter",
      r = armor ? 22 : b.r || 16;
    const color =
      b.flash > 0
        ? "#fff3d0"
        : armor
          ? "#e9ad55"
          : runner
            ? "#b79af2"
            : spitter
              ? "#6fd6b8"
              : splitter
                ? "#c9a0ff"
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
    } else if (splitter) {
      line(
        [
          [0, -r + 2],
          [0, r + 2],
        ],
        ink,
        2,
      );
      line(
        [
          [-7, 3],
          [7, 7],
        ],
        "#8a5fd0",
        3,
      );
      for (const side of [-1, 1]) oval(side * 9, -2, 3, 4, "#e5d3ff");
    } else {
      line(
        [
          [0, -4],
          [0, r + 1],
        ],
        ink,
        2,
      );
      oval(-7, 5, 3, 4, "#ce515b");
      oval(7, 9, 3, 4, "#ce515b");
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
      if (spitter) {
        oval(0, 2, 7, 6, "#2f8f79", ink);
        oval(0, 2, 3, 3, "#d6fff2");
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

  return { milo, marlow, hollis, deployBot, creature };
}
