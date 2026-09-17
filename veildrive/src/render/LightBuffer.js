// Reusable light buffer. `pushLights` used to build a new THREE.Color and a
// fresh string per light every frame; this reuses one array and one object per
// slot, caching parsed colors. Renderer.setLights consumes the plain [r,g,b].
import { moodColor } from './mood.js';

const parseHex = h => { const n = parseInt(h.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

export class LightBuffer {
  constructor() {
    this.list = [];
    this.pool = [];
    this.idx = 0;
    this._mood = new Map();
    this._hex = new Map();
  }
  _moodRgb(id) { let c = this._mood.get(id); if (!c) { c = parseHex(moodColor(id, 'glow', 0)); this._mood.set(id, c); } return c; }
  _hexRgb(h) { let c = this._hex.get(h); if (!c) { c = parseHex(h); this._hex.set(h, c); } return c; }
  begin() { this.idx = 0; this.list.length = 0; }
  _slot() { let o = this.pool[this.idx]; if (!o) { o = { sx: 0, sy: 0, radius: 0, intensity: 0, color: [1, 1, 1] }; this.pool[this.idx] = o; } this.idx++; return o; }
  pushMood(sx, sy, radius, intensity, moodId, k = 1) {
    const o = this._slot(), c = this._moodRgb(moodId);
    o.sx = sx; o.sy = sy; o.radius = radius; o.intensity = intensity;
    o.color[0] = c[0] * k; o.color[1] = c[1] * k; o.color[2] = c[2] * k;
    this.list.push(o);
    return o;
  }
  pushHex(sx, sy, radius, intensity, hex) {
    const o = this._slot(), c = this._hexRgb(hex);
    o.sx = sx; o.sy = sy; o.radius = radius; o.intensity = intensity;
    o.color[0] = c[0]; o.color[1] = c[1]; o.color[2] = c[2];
    this.list.push(o);
    return o;
  }
}
