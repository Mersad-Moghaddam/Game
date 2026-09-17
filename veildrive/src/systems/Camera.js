// Camera: mouse-led follow, screen/world mapping and screen shake. Installed
// onto Game.prototype (see src/core/Game.js) so every existing call site keeps
// working while the logic lives in a focused module.
import { VIRTUAL_W, VIRTUAL_H } from '../data/config.js';
import { clamp } from '../core/math.js';

export const CameraSystem = {
  screenToWorld(x, y) { return { x: x + this.cam.x - this.shakeX, y: y + this.cam.y - this.shakeY }; },
  updateCamera(dt) {
    const mouseWorld = this.screenToWorld(this.input.mouse.x, this.input.mouse.y);
    const dx = clamp(mouseWorld.x - this.player.x, -240, 240);
    const dy = clamp(mouseWorld.y - this.player.y, -140, 140);
    this.cam.tx = clamp(this.player.x - VIRTUAL_W / 2 + dx * .18, 0, this.level.w - VIRTUAL_W);
    this.cam.ty = clamp(this.player.y - VIRTUAL_H / 2 + dy * .18, 0, this.level.h - VIRTUAL_H);
    this.cam.x += (this.cam.tx - this.cam.x) * (1 - Math.pow(.001, dt));
    this.cam.y += (this.cam.ty - this.cam.y) * (1 - Math.pow(.001, dt));
  },
  shake(n) { this.shakeMag = Math.max(this.shakeMag, n * this.settings.shake); }
};
