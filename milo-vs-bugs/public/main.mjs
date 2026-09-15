import {
  createGame,
  update,
  chooseUpgrade,
  PHASES,
  WIDTH,
  HEIGHT,
} from "./game.mjs";
import { UPGRADES } from "./upgrades.mjs";
import { createRenderer } from "./renderer.mjs";
import { screenToWorld, zoneAt } from "./world.mjs";

const $ = (id) => document.getElementById(id),
  canvas = $("game"),
  win = document.querySelector(".game-window"),
  arena = document.querySelector(".arena");
const draw = createRenderer(
  canvas.getContext("2d"),
  matchMedia("(prefers-reduced-motion: reduce)").matches,
);
let game = createGame(),
  started = false,
  paused = false,
  last = 0,
  best = 0,
  sound = false,
  audio;
const keys = new Set(),
  mouse = { x: 480, y: 100, active: false, down: false },
  stick = { x: 0, y: 0, active: false };
try {
  best = Number(localStorage.getItem("milo-world-best")) || 0;
} catch {}
$("best").textContent = String(best).padStart(4, "0");

const ICONS = {
  rate: "M3 17 9 5l2 8 2-4 2 8",
  damage: "M12 2 4 14h6l-1 8 9-13h-6z",
  speed: "M3 18h6l2-5 3 5h7M6 7h9M8 11h8",
  coffee: "M5 8h10v6a4 4 0 0 1-8 0zM15 9h3v2h-3M8 3v3M12 3v3",
  size: "M5 5h6v6H5zM13 13h6v6h-6z",
  magnet: "M6 4v7a6 6 0 0 0 12 0V4h-3v7a3 3 0 0 1-6 0V4z",
  heart: "M12 21C9 18 2 13 2 7a5 5 0 0 1 10-1A5 5 0 0 1 22 7c0 6-7 11-10 14Z",
  pierce: "M4 20 20 4M14 4h6v6M4 20l4-1M9 15l-1 4",
  multi: "M4 20 14 4M8 20 18 4M12 20 22 4",
  ricochet: "M4 18c0-6 4-8 8-6s8 2 8-4M4 18h4M18 8V4",
  crit: "M12 3l2.5 6L21 9l-5 4 2 7-6-4-6 4 2-7-5-4 6.5 0z",
  revive: "M12 3a9 9 0 1 0 9 9M12 3v6h6",
};
const icon = (n) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n] || ICONS.crit}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function tone(frequency = 400, delay = 0, duration = 0.07, type = "square") {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator(),
      v = audio.createGain(),
      time = audio.currentTime + delay;
    o.connect(v);
    v.connect(audio.destination);
    o.type = type;
    o.frequency.setValueAtTime(frequency, time);
    o.frequency.exponentialRampToValueAtTime(frequency * 0.65, time + duration);
    v.gain.setValueAtTime(0.025, time);
    v.gain.exponentialRampToValueAtTime(0.001, time + duration);
    o.start(time);
    o.stop(time + duration);
  } catch {}
}
$("sound").onclick = () => {
  sound = !sound;
  $("sound").textContent = `Sound: ${sound ? "on" : "off"}`;
  $("sound").setAttribute("aria-pressed", String(sound));
  if (sound) audio?.resume();
  else audio?.suspend();
  tone();
};

function isFullscreen() {
  return document.fullscreenElement === win;
}
function syncFullscreenButton() {
  const on = isFullscreen();
  const b = $("fullscreen");
  b.textContent = on ? "⤡" : "⛶";
  b.title = on ? "Exit fullscreen (F)" : "Fullscreen (F)";
  b.setAttribute("aria-label", on ? "Exit fullscreen" : "Enter fullscreen");
}
function fitCanvas() {
  if (!isFullscreen()) {
    canvas.style.width = "";
    canvas.style.height = "";
    return;
  }
  const scale = Math.max(
    0.1,
    Math.min(arena.clientWidth / WIDTH, arena.clientHeight / HEIGHT),
  );
  canvas.style.width = `${Math.floor(WIDTH * scale)}px`;
  canvas.style.height = `${Math.floor(HEIGHT * scale)}px`;
}
function toggleFullscreen() {
  if (isFullscreen()) document.exitFullscreen?.();
  else if (win.requestFullscreen)
    win.requestFullscreen().catch(() => win.classList.toggle("maximize"));
  else win.classList.toggle("maximize");
}
$("fullscreen").onclick = toggleFullscreen;
document.addEventListener("fullscreenchange", () => {
  syncFullscreenButton();
  fitCanvas();
});
window.addEventListener("resize", fitCanvas);

function clearInput() {
  keys.clear();
  mouse.down = false;
  stick.active = false;
  stick.x = 0;
  stick.y = 0;
  $("aim-knob").style.transform = "translate(0, 0)";
}
function start() {
  game = createGame();
  started = true;
  paused = false;
  mouse.active = false;
  clearInput();
  $("overlay").hidden = true;
  $("pause").disabled = false;
  $("pause").textContent = "Ⅱ";
  $("pause").setAttribute("aria-label", "Pause game");
  $("play").blur();
  syncScene();
}
function syncScene() {
  arena.dataset.state = started ? game.status : "menu";
  $("skip-intro").hidden = !started || game.status !== "intro" || paused;
  const upgrading = started && game.status === "upgrade" && !paused;
  $("upgrade").hidden = !upgrading;
  if (upgrading) {
    const signature = game.choices.join(",");
    if ($("upgrade-cards").dataset.signature !== signature) {
      $("upgrade-cards").dataset.signature = signature;
      renderChoices();
    }
  }
}
function renderChoices() {
  const wrap = $("upgrade-cards");
  wrap.innerHTML = "";
  game.choices.forEach((id, i) => {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return;
    const btn = document.createElement("button");
    btn.className = "card";
    btn.type = "button";
    btn.innerHTML =
      `<span class="card-key">${i + 1}</span>` +
      `<span class="card-icon">${icon(u.icon)}</span>` +
      `<strong>${u.name}</strong><small>${u.desc}</small>`;
    btn.setAttribute("aria-label", `${u.name}. ${u.desc}`);
    btn.onclick = () => pick(id);
    wrap.appendChild(btn);
  });
}
function pick(id) {
  if (!started || game.status !== "upgrade" || paused) return;
  chooseUpgrade(game, id);
  tone(560);
  clearInput();
  syncScene();
}
$("play").onclick = () => (paused ? togglePause() : start());
$("skip-intro").onclick = () => {
  if (!paused) {
    update(game, { skipIntro: true }, 0);
    clearInput();
    syncScene();
  }
};
function togglePause() {
  if (!started || ["won", "lost", "upgrade"].includes(game.status)) return;
  paused = !paused;
  clearInput();
  $("overlay").hidden = !paused;
  $("overlay").classList.remove("welcome");
  $("pause").textContent = paused ? "▶" : "Ⅱ";
  $("pause").setAttribute("aria-label", paused ? "Resume game" : "Pause game");
  syncScene();
  if (paused) {
    $("kicker").textContent = "Even production needs a breather.";
    $("dialog-title").textContent = "Coffee break.";
    $("dialog-copy").textContent = "Bugs and deadlines are paused.";
    $("play").textContent = "Back to the chaos ▶";
    $("dialog-note").textContent = "P or Escape to resume";
    $("play").focus();
  }
}
$("pause").onclick = togglePause;
const controls = [
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
  "Space",
  "KeyI",
  "KeyJ",
  "KeyK",
  "KeyL",
];
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyF" && !e.repeat) {
    toggleFullscreen();
    return;
  }
  if (started && game.status === "upgrade" && !paused) {
    const n = Number(e.key);
    if (n >= 1 && n <= game.choices.length) pick(game.choices[n - 1]);
    return;
  }
  if (
    controls.includes(e.code) &&
    started &&
    !paused &&
    game.status === "playing"
  ) {
    e.preventDefault();
    keys.add(e.code);
  }
  if ((e.code === "KeyP" || e.code === "Escape") && !e.repeat) togglePause();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
function backgroundPause() {
  clearInput();
  if (started && !paused && game.status === "playing") togglePause();
}
window.addEventListener("blur", backgroundPause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) backgroundPause();
});
function point(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * WIDTH,
    y: ((e.clientY - r.top) / r.height) * HEIGHT,
  };
}
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse") {
    Object.assign(mouse, point(e));
    mouse.active = true;
  }
});
canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || paused || game.status !== "playing") return;
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  Object.assign(mouse, point(e));
  mouse.active = true;
  mouse.down = true;
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(event, () => (mouse.down = false));
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
document.querySelectorAll("[data-key]").forEach((b) => {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    keys.add(b.dataset.key);
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, () => keys.delete(b.dataset.key));
});
const aimPad = $("aim-pad");
function aimStick(e) {
  const r = aimPad.getBoundingClientRect(),
    x = e.clientX - r.left - r.width / 2,
    y = e.clientY - r.top - r.height / 2,
    d = Math.hypot(x, y),
    n = Math.max(1, d / 32);
  stick.x = x;
  stick.y = y;
  stick.active = d > 6;
  mouse.active = false;
  $("aim-knob").style.transform = `translate(${x / n}px, ${y / n}px)`;
}
aimPad.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  aimPad.setPointerCapture(e.pointerId);
  aimStick(e);
});
aimPad.addEventListener("pointermove", (e) => {
  if (aimPad.hasPointerCapture(e.pointerId)) aimStick(e);
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  aimPad.addEventListener(event, () => {
    stick.active = false;
    $("aim-knob").style.transform = "translate(0, 0)";
  });
function readInput() {
  const x =
    Number(keys.has("KeyD") || keys.has("ArrowRight")) -
    Number(keys.has("KeyA") || keys.has("ArrowLeft"));
  const y =
    Number(keys.has("KeyS") || keys.has("ArrowDown")) -
    Number(keys.has("KeyW") || keys.has("ArrowUp"));
  const ax = Number(keys.has("KeyL")) - Number(keys.has("KeyJ")),
    ay = Number(keys.has("KeyK")) - Number(keys.has("KeyI"));
  let aimAngle = game.player.angle;
  if (mouse.active) {
    const target = screenToWorld(mouse, game.player);
    aimAngle = Math.atan2(target.y - game.player.y, target.x - game.player.x);
  }
  if (ax || ay) aimAngle = Math.atan2(ay, ax);
  if (stick.active) aimAngle = Math.atan2(stick.y, stick.x);
  return {
    x,
    y,
    aimAngle,
    shoot: keys.has("Space") || mouse.down || stick.active,
  };
}
function finish() {
  clearInput();
  $("pause").disabled = true;
  const won = game.status === "won";
  tone(won ? 750 : 110, 0, 0.25);
  best = Math.max(best, game.score);
  try {
    localStorage.setItem("milo-world-best", String(best));
  } catch {}
  $("best").textContent = String(best).padStart(4, "0");
  $("overlay").hidden = false;
  $("overlay").classList.remove("welcome");
  $("kicker").textContent = won
    ? "Fixed by Milo. Claimed by Marlow."
    : "Marlow caused this. Milo needs a raise.";
  $("dialog-title").textContent = won
    ? "Monday’s problem now."
    : "Weekend cancelled.";
  $("dialog-copy").textContent = `${game.kills} bugs patched · ${game.score} points · phase ${game.wave}/4`;
  $("play").textContent = "Clean up another deployment ▶";
  $("dialog-note").textContent = won
    ? "Hollis is still laughing."
    : "Keep moving. Aim ahead of fast bugs. Coffee helps.";
  $("play").focus();
}
function hud() {
  $("location").textContent = zoneAt(game.player);
  if ($("hearts").dataset.count !== String(game.hearts)) {
    $("hearts").dataset.count = String(game.hearts);
    $("hearts").innerHTML = Array.from(
      { length: Math.max(3, game.mods.maxHearts) },
      (_, i) =>
        `<svg width="19" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C9 18 2 13 2 7a5 5 0 0 1 10-1A5 5 0 0 1 22 7c0 6-7 11-10 14Z" fill="${i < game.hearts ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8"/></svg>`,
    ).join("");
    $("hearts").setAttribute("aria-label", `${game.hearts} hearts`);
  }
  $("score").textContent = String(game.score).padStart(4, "0");
  const boss = game.boss && game.status === "playing";
  $("timer").textContent = boss
    ? "BOSS"
    : `${String(Math.ceil(15 - game.phaseTime)).padStart(2, "0")}s`;
  $("wave").textContent = `${game.wave}/4 · ${PHASES[game.wave - 1].name}`;
  $("wave-countdown").textContent =
    game.status === "intermission"
      ? "Hollis has feedback…"
      : game.status === "upgrade"
        ? "Choose an upgrade"
        : boss
          ? "Sir Deploys-A-Lot"
          : `Phase ends in ${Math.ceil(15 - game.phaseTime)}s`;
  $("phase-progress").style.width = `${(game.phaseTime / 15) * 100}%`;
  document.querySelectorAll(".phase-step").forEach((el, i) => {
    el.classList.toggle("current", i === game.wave - 1);
    el.classList.toggle("complete", i < game.wave - 1);
  });
  $("boost").hidden = game.boost <= 0;
  $("boost-time").textContent = `${Math.ceil(game.boost)}s`;
  const message = started
    ? game.messageTime > 0
      ? game.message
      : "Marlow: “Works on my machine.” Milo: “Then ship your machine.”"
    : "git blame → Marlow  // incident → Milo";
  if ($("message").textContent !== message) $("message").textContent = message;
}
function frame(now) {
  const dt = Math.min((now - last) / 1000 || 0, 0.033);
  last = now;
  if (started && !paused) {
    const previous = game.status,
      score = game.score,
      hearts = game.hearts,
      shots = game.shots;
    update(game, readInput(), dt);
    if (game.shots > shots) tone(330, 0, 0.045, "triangle");
    if (game.score > score) tone(640);
    if (game.hearts < hearts) tone(100, 0, 0.2);
    if (previous !== game.status) {
      clearInput();
      syncScene();
      if (game.status === "intermission")
        for (let i = 0; i < 5; i++)
          tone(i % 2 ? 240 : 310, i * 0.17, 0.13, "triangle");
      if (game.status === "won" || game.status === "lost") finish();
    }
  }
  draw(game, { menu: !started });
  hud();
  requestAnimationFrame(frame);
}
syncScene();
syncFullscreenButton();
requestAnimationFrame(frame);
