// Free-list pooling helpers. Effect and projectile lists are updated every
// frame; compacting them in place (instead of Array.filter) avoids a fresh
// array per frame, and recycling dead objects avoids per-spawn allocation.
export function obtain(free, factory) {
  const o = free.pop();
  return o !== undefined ? o : factory();
}
// Keep live objects in place, order-preserving, recycling the rest.
export function compact(arr, alive, free) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    const o = arr[i];
    if (alive(o)) arr[w++] = o;
    else free.push(o);
  }
  arr.length = w;
}
