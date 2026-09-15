import { createGame, update, PHASES, ROAST, WIDTH, HEIGHT } from "./game.mjs";
import { createRenderer } from "./renderer.mjs";
import { screenToWorld, zoneAt } from "./world.mjs";

const $ = (id) => document.getElementById(id),
  canvas = $("game");
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
  best = Number(localStorage.getItem("mersad-world-best")) || 0;
} catch {}
$("best").textContent = String(best).padStart(4, "0");

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
  document.querySelector(".arena").dataset.state = started
    ? game.status
    : "menu";
  $("skip-intro").hidden = !started || game.status !== "intro" || paused;
  const roasting = game.status === "intermission" && !paused;
  $("honarvar").hidden = !roasting;
  if (roasting) {
    $("roast-phase").textContent = `Phase ${game.wave} code review`;
    $("roast-line").textContent = ROAST;
  }
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
  if (!started || ["won", "lost"].includes(game.status)) return;
  paused = !paused;
  clearInput();
  $("overlay").hidden = !paused;
  $("overlay").classList.remove("welcome");
  $("pause").textContent = paused ? "▶" : "Ⅱ";
  $("pause").setAttribute("aria-label", paused ? "Resume game" : "Pause game");
  $("honarvar").classList.toggle("paused", paused);
  syncScene();
  if (paused) {
    $("kicker").textContent = "Even production needs a breather.";
    $("dialog-title").textContent = "Coffee break.";
    $("dialog-copy").textContent =
      "Bugs, deadlines, and Honarvar are all paused.";
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
  if (
    controls.includes(e.code) &&
    started &&
    !paused &&
    !["won", "lost"].includes(game.status)
  ) {
    e.preventDefault();
    keys.add(e.code);
  }
  if ((e.code === "KeyP" || e.code === "Escape") && !e.repeat) togglePause();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
function backgroundPause() {
  clearInput();
  if (started && !paused && !["won", "lost"].includes(game.status))
    togglePause();
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
    // Store the cursor in viewport coordinates; reproject every frame as the camera moves.
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
    localStorage.setItem("mersad-world-best", String(best));
  } catch {}
  $("best").textContent = String(best).padStart(4, "0");
  $("overlay").hidden = false;
  $("overlay").classList.remove("welcome");
  $("kicker").textContent = won
    ? "Fixed by Mersad. Claimed by Malvandi."
    : "Malvandi caused this. Mersad needs a raise.";
  $("dialog-title").textContent = won
    ? "Monday’s problem now."
    : "Weekend cancelled.";
  $("dialog-copy").textContent =
    `${game.kills} bugs patched · ${game.score} points · phase ${game.wave}/4`;
  $("play").textContent = "Clean up another deployment ▶";
  $("dialog-note").textContent = won
    ? "Honarvar is still laughing."
    : "Keep moving. Aim ahead of fast bugs. Coffee helps.";
  $("play").focus();
}
function hud() {
  $("location").textContent = zoneAt(game.player);
  if ($("hearts").dataset.count !== String(game.hearts)) {
    $("hearts").dataset.count = String(game.hearts);
    $("hearts").innerHTML = [0, 1, 2]
      .map(
        (i) =>
          `<svg width="19" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C9 18 2 13 2 7a5 5 0 0 1 10-1A5 5 0 0 1 22 7c0 6-7 11-10 14Z" fill="${i < game.hearts ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8"/></svg>`,
      )
      .join("");
    $("hearts").setAttribute("aria-label", `${game.hearts} hearts`);
  }
  $("score").textContent = String(game.score).padStart(4, "0");
  const seconds = Math.ceil(60 - game.time);
  $("timer").textContent =
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  $("wave").textContent = `${game.wave}/4 · ${PHASES[game.wave - 1].name}`;
  $("wave-countdown").textContent =
    game.status === "intermission"
      ? "Honarvar has feedback…"
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
      : "Malvandi: Works on my machine. Mersad: Then ship your machine."
    : "git blame → Malvandi  // incident assigned → Mersad";
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
      if (game.status === "intermission") {
        for (let i = 0; i < 5; i++)
          tone(i % 2 ? 240 : 310, i * 0.17, 0.13, "triangle");
      }
      if (game.status === "won" || game.status === "lost") finish();
    }
  }
  draw(game, { menu: !started });
  hud();
  requestAnimationFrame(frame);
}
syncScene();
requestAnimationFrame(frame);
