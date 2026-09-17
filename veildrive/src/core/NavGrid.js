// Uniform navigation grid for enemies. Cells whose centre is blocked for a
// body-sized radius are marked solid; A* with 8-way movement (no corner
// cutting) routes agents through doorways and around props instead of relying
// on local steering alone. Deterministic: neighbour order is fixed.
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const COST = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];

export class NavGrid {
  constructor(level, cell = 28, radius = 10) {
    this.level = level;
    this.cell = cell;
    this.w = Math.max(1, Math.ceil(level.w / cell));
    this.h = Math.max(1, Math.ceil(level.h / cell));
    this.solid = new Uint8Array(this.w * this.h);
    const isSolid = level.staticBlocked ? (x, y, r) => level.staticBlocked(x, y, r) : (x, y, r) => level.blocked(x, y, r);
    for (let cy = 0; cy < this.h; cy++) {
      for (let cx = 0; cx < this.w; cx++) {
        const x = (cx + 0.5) * cell, y = (cy + 0.5) * cell;
        this.solid[cy * this.w + cx] = isSolid(x, y, radius) ? 1 : 0;
      }
    }
  }
  idx(cx, cy) { return cy * this.w + cx; }
  inBounds(cx, cy) { return cx >= 0 && cy >= 0 && cx < this.w && cy < this.h; }
  walkable(cx, cy) { return this.inBounds(cx, cy) && !this.solid[this.idx(cx, cy)]; }
  cellOf(x, y) { return { cx: Math.floor(x / this.cell), cy: Math.floor(y / this.cell) }; }
  center(cx, cy) { return { x: (cx + 0.5) * this.cell, y: (cy + 0.5) * this.cell }; }
  nearestWalkable(cx, cy, maxRing = 12) {
    if (this.walkable(cx, cy)) return { cx, cy };
    for (let ring = 1; ring <= maxRing; ring++) {
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          if (this.walkable(cx + dx, cy + dy)) return { cx: cx + dx, cy: cy + dy };
        }
      }
    }
    return null;
  }
  // A* between two world points. Returns an array of world waypoints (start
  // cell .. goal cell) or null when unreachable.
  path(sx, sy, tx, ty, maxNodes = 6000) {
    const n = this.w * this.h;
    let s = this.cellOf(sx, sy), g = this.cellOf(tx, ty);
    s = this.nearestWalkable(s.cx, s.cy); if (!s) return null;
    g = this.nearestWalkable(g.cx, g.cy); if (!g) return null;
    const start = this.idx(s.cx, s.cy), goal = this.idx(g.cx, g.cy);
    if (start === goal) return [this.center(s.cx, s.cy)];
    const gScore = new Float64Array(n).fill(Infinity);
    const fScore = new Float64Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const open = [start];
    const inOpen = new Uint8Array(n);
    inOpen[start] = 1;
    gScore[start] = 0;
    const hx = g.cx, hy = g.cy;
    fScore[start] = Math.hypot(hx - s.cx, hy - s.cy);
    let expanded = 0;
    while (open.length && expanded < maxNodes) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (fScore[open[i]] < fScore[open[bi]]) bi = i;
      const cur = open[bi];
      open[bi] = open[open.length - 1]; open.pop();
      inOpen[cur] = 0;
      if (cur === goal) return this._reconstruct(came, cur);
      closed[cur] = 1;
      expanded++;
      const cx = cur % this.w, cy = (cur / this.w) | 0;
      for (let d = 0; d < 8; d++) {
        const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
        if (!this.walkable(nx, ny)) continue;
        if (d >= 4 && (!this.walkable(cx + DIRS[d][0], cy) || !this.walkable(cx, cy + DIRS[d][1]))) continue;
        const ni = this.idx(nx, ny);
        if (closed[ni]) continue;
        const tentative = gScore[cur] + COST[d];
        if (tentative < gScore[ni]) {
          came[ni] = cur;
          gScore[ni] = tentative;
          fScore[ni] = tentative + Math.hypot(hx - nx, hy - ny);
          if (!inOpen[ni]) { open.push(ni); inOpen[ni] = 1; }
        }
      }
    }
    return null;
  }
  _reconstruct(came, cur) {
    const out = [];
    while (cur !== -1) {
      out.push(this.center(cur % this.w, (cur / this.w) | 0));
      cur = came[cur];
    }
    out.reverse();
    return out;
  }
}
