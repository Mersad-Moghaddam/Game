// A short, skippable deployment comic. Combat time starts after the handoff.
export function createIntro(
  { ctx, box, oval, line, text, programmer, bug },
  reducedMotion,
) {
  return function drawIntro(g, menu = false) {
    const t = menu ? 0.7 : g.sceneTime,
      pressed = t >= 2,
      broken = t >= 5.4;
    box(0, 0, 960, 560, "#14283f");
    // Office wall, evening city, desk lamp, and a deeply optimistic poster.
    box(354, 49, 562, 412, "#233e58", 20);
    box(707, 76, 171, 186, "#627e9f", 8, "#102237");
    box(718, 87, 148, 162, "#c58e99", 3);
    oval(822, 119, 22, 22, "#f6ca98");
    for (let i = 0; i < 7; i++) {
      const h = 31 + ((i * 29) % 70);
      box(718 + i * 23, 249 - h, 21, h, "#334964");
      for (let j = 0; j < 3; j++)
        box(723 + i * 23, 253 - h + j * 19, 5, 7, "#e9c789");
    }
    line(
      [
        [789, 82],
        [789, 254],
      ],
      "#a1b4c7",
      5,
    );
    line(
      [
        [713, 178],
        [871, 178],
      ],
      "#a1b4c7",
      5,
    );
    box(378, 78, 123, 87, "#f1dab0", 4, "#102237");
    text("MOVE FAST", 439, 105, 13, "#3d4a60");
    text("BLAME CACHE", 439, 126, 13, "#3d4a60");
    text("— engineering values", 439, 148, 8, "#667284");
    // Visible clock reinforces the Friday-before-the-weekend joke.
    box(538, 70, 136, 53, "#15283f", 8);
    text("FRIDAY 16:59", 606, 93, 12, "#ffd166");
    text("weekend: allegedly", 606, 111, 9, "#97adc5");
    oval(650, 493, 248, 26, "#0c1d3066");
    box(457, 264, 130, 170, "#102135", 32);
    box(511, 409, 20, 73, "#111f31", 4);
    line(
      [
        [479, 485],
        [563, 485],
      ],
      "#101e30",
      8,
    );
    const lean = pressed && !broken ? 9 : 0;
    ctx.save();
    if (!reducedMotion && pressed && !broken) {
      ctx.translate(532, 332);
      ctx.rotate(-0.04);
      ctx.translate(-532, -332);
    }
    programmer(523 + lean, 290, 2.2, t, { seated: true });
    ctx.restore();
    // Wide rounded desk with drawers and a monitor large enough to read.
    box(386, 407, 504, 24, "#a7bdd3", 7, "#102237");
    box(409, 431, 22, 69, "#66819b", 3);
    box(844, 431, 22, 69, "#66819b", 3);
    box(743, 433, 95, 54, "#3c5773", 5);
    line(
      [
        [753, 458],
        [826, 458],
      ],
      "#203750",
      2,
    );
    box(780, 443, 22, 3, "#aac0d3", 1);
    box(474, 390, 105, 13, "#d5deea", 4, "#102237");
    for (let i = 0; i < 9; i++)
      line(
        [
          [480 + i * 11, 395],
          [485 + i * 11, 395],
        ],
        "#5c718b",
        2,
      );
    if (!pressed) {
      const tap = reducedMotion ? 0 : Math.sin(t * 20) * 3;
      oval(516, 382 + tap, 13, 8, "#ffd0a8", "#102237");
    }
    box(594, 213, 270, 176, "#94abc4", 12, "#102237");
    box(604, 224, 250, 154, broken ? "#572a42" : "#0e2235", 7);
    box(715, 389, 24, 14, "#7187a3", 2);
    box(680, 402, 94, 6, "#425c78", 3);
    box(604, 224, 250, 24, broken ? "#874258" : "#314f69", 5);
    text("mersad-is-offline / production", 729, 240, 10, "#e6f0fa");
    if (!pressed) {
      text("$ ship --trust-me-bro", 619, 269, 12, "#a6ead6", "left");
      text("Tests: skipped", 619, 292, 12, "#ffc765", "left");
      text("Review: myself", 619, 312, 12, "#c4cbea", "left");
      text("Confidence: 100%", 619, 332, 12, "#a6ead6", "left");
      box(619, 345, 220, 24, "#ffd166", 5);
      text("DEPLOY ANYWAY", 729, 362, 13, "#172a46");
    } else if (!broken) {
      const label =
        t < 3.2
          ? "Uploading code…"
          : t < 4.3
            ? "Uploading bugs…"
            : "Disabling weekend…";
      text(label, 729, 283, 16, t < 3.2 ? "#9ce6d1" : "#ffd166");
      box(622, 301, 214, 16, "#31465e", 5);
      box(
        624,
        303,
        Math.min(210, ((t - 2) / 3.4) * 210),
        12,
        t < 4.3 ? "#86d9c7" : "#ff887b",
        4,
      );
      text(
        t < 3.2
          ? "Reviewers notified: 0"
          : t < 4.3
            ? "Bugs are a deliverable, right?"
            : "Canceling Mersad’s plans…",
        729,
        345,
        10,
        "#b6c9df",
      );
      if (t < 2.5) {
        line(
          [
            [556, 351],
            [619, 353],
          ],
          "#ffd0a8",
          12,
        );
        oval(620, 353, 10, 8, "#ffd0a8", "#102237");
      }
    } else {
      text("500: WEEKEND NOT FOUND", 729, 277, 14, "#ffbfaf");
      text("Root cause: Malvandi", 729, 302, 11, "#f4d7df");
      text("Assigned to: Mersad", 729, 325, 12, "#ffd166");
      text("Rollback? Never heard of her.", 729, 356, 10, "#dfb7cd");
    }
    // Three coffees: one for courage, two for plausible deniability.
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(419 + i * 24, 394 - i * 9);
      if (broken && i === 2) {
        const spill = Math.min(1, (t - 5.4) * 2);
        ctx.rotate(spill * 1.5);
      }
      box(-9, -23, 18, 25, i === 0 ? "#eb997c" : "#ffd166", 4, "#102237");
      line(
        [
          [10, -18],
          [17, -18],
          [17, -7],
          [10, -7],
        ],
        "#f9d688",
        3,
      );
      ctx.restore();
    }
    if (broken) {
      const spill = Math.min(1, (t - 5.4) * 1.4);
      oval(478, 405, spill * 38, spill * 7, "#8f5c3c");
      line(
        [
          [499, 415],
          [502, 435 + spill * 26],
        ],
        "#8f5c3c",
        4,
      );
      oval(504, 479, spill * 23, spill * 7, "#705441");
      for (let i = 0; i < 9; i++) {
        const f = Math.max(0, t - 5.4 - i * 0.07),
          a = 1.3 + i * 0.62;
        bug(
          {
            x: 729 + Math.cos(a) * f * 135,
            y: 302 + Math.sin(a) * f * 105,
            type: i % 3 === 0 ? "armor" : i % 2 ? "runner" : "crawler",
            hp: 3,
          },
          t,
        );
      }
      text("!", 529, 164, 44, "#ffd166");
    }
    if (!menu) {
      box(28, 68, 309, 151, "#f3f5fd", 16, "#102237");
      text("MALVANDI / bug manufacturer", 182, 96, 11, "#6f6c83");
      text(
        broken
          ? "“Probably a frontend issue.”"
          : pressed
            ? "“No tests. No failed tests.”"
            : "“AI wrote it.”",
        182,
        135,
        18,
        "#21344b",
        "center",
        "sans-serif",
      );
      text(
        broken
          ? "Mersad has been volunteered."
          : pressed
            ? "He considers this a productivity hack."
            : "“What could go wrong?”",
        182,
        171,
        14,
        "#6b5c79",
        "center",
        "sans-serif",
      );
      text("Mersad", 182, 290, 18, "#8ce1d1");
      programmer(182, 356, 1.5, t, { angle: 0 });
      text(
        broken
          ? "“I was literally logging off.”"
          : "“Please tell me you ran the tests.”",
        182,
        437,
        12,
        "#bcd3e8",
      );
      text(
        broken
          ? "MALVANDI SHIPS. MERSAD SUFFERS."
          : "One confident click. Four phases of consequences.",
        480,
        536,
        16,
        broken ? "#ffd166" : "#a5bad3",
      );
    }
  };
}
