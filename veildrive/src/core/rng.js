// Seedable PRNG. The whole simulation draws from the shared `rng` instance so
// a fixed seed reproduces a run exactly (see Game.setSeed / the determinism
// tests). Systems that must not perturb the simulation stream (audio noise)
// keep their own Rng instance.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed = Date.now() >>> 0) {
    this.reseed(seed);
  }
  reseed(seed) {
    this._seed = seed >>> 0;
    this._next = mulberry32(this._seed);
  }
  seed() {
    return this._seed;
  }
  random() {
    return this._next();
  }
  range(a, b) {
    return a + this._next() * (b - a);
  }
  int(n) {
    return Math.floor(this._next() * n);
  }
  pick(arr) {
    return arr[Math.floor(this._next() * arr.length)];
  }
  chance(p) {
    return this._next() < p;
  }
}

export const rng = new Rng();
