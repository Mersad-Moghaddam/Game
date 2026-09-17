// Perception / alerting. Noises are muffled by intervening walls instead of
// travelling as a flat radius, so rooms and openings actually shape stealth.
import { dist } from '../core/math.js';

// A listener hears a muffled fraction of the radius when a wall blocks the
// straight line to the source.
export const MUFFLE = 0.45;
export function audibleRadius(level, listener, source, radius) {
  return level.lineBlocked(listener, source) ? radius * MUFFLE : radius;
}

export const AISystem = {
  perceiveAll() { for (const e of this.enemies) e.perceive(this); },
  emitNoise(x, y, radius, type = 'noise') {
    if (this.debug) this.fx.flash(x, y, radius, '#4ad9d3', .08);
    const src = { x, y };
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.hearNoise({ x, y, radius: audibleRadius(this.level, e, src, radius), type }, this);
    }
  },
  alertNearby(x, y, r, target) {
    const src = { x, y };
    for (const e of this.enemies) {
      if (e.dead || e.state === 'COMBAT') continue;
      if (dist(e, src) < audibleRadius(this.level, e, src, r)) {
        e.state = 'INVESTIGATE';
        e.lastKnown = { x: target.x, y: target.y };
        e.searchT = 3;
      }
    }
  }
};
