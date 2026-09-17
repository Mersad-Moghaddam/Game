// Uniform-grid spatial index. Levels rebuild it only when static geometry
// changes, so collision and perception queries stop scanning every blocker
// (a full O(n) sweep per movement/line-of-sight query). Objects are indexed by
// their axis-aligned bounds and may appear in more than one cell, so callers
// that need uniqueness must de-duplicate.
export class SpatialHash {
  constructor(cell = 128) {
    this.cell = cell;
    this.map = new Map();
  }
  _key(cx, cy) {
    return (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) >>> 0;
  }
  clear() {
    this.map.clear();
  }
  _bounds(o) {
    const x = o.x - (o.r || 0), y = o.y - (o.r || 0);
    const w = (o.w != null ? o.w : (o.r || 0) * 2), h = (o.h != null ? o.h : (o.r || 0) * 2);
    return { x0: x, y0: y, x1: x + w, y1: y + h };
  }
  insert(o) {
    const b = this._bounds(o);
    const c0x = Math.floor(b.x0 / this.cell), c1x = Math.floor(b.x1 / this.cell);
    const c0y = Math.floor(b.y0 / this.cell), c1y = Math.floor(b.y1 / this.cell);
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const k = this._key(cx, cy);
        let a = this.map.get(k);
        if (!a) { a = []; this.map.set(k, a); }
        a.push(o);
      }
    }
  }
  rebuild(items) {
    this.clear();
    for (const o of items) this.insert(o);
    return this;
  }
  queryRect(x0, y0, x1, y1, out = []) {
    out.length = 0;
    const c0x = Math.floor(Math.min(x0, x1) / this.cell), c1x = Math.floor(Math.max(x0, x1) / this.cell);
    const c0y = Math.floor(Math.min(y0, y1) / this.cell), c1y = Math.floor(Math.max(y0, y1) / this.cell);
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const a = this.map.get(this._key(cx, cy));
        if (a) for (const o of a) out.push(o);
      }
    }
    return out;
  }
  query(x, y, r, out = []) {
    return this.queryRect(x - r, y - r, x + r, y + r, out);
  }
}
