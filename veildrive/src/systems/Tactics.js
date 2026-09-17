// Squad roles. Deterministic by enemy order so a fixed seed reproduces the
// same fight: the first engaged enemy suppresses, the second flanks, and the
// rest alternate hold/push.
export function assignRoles(enemies) {
  const combat = enemies.filter(e => !e.dead && e.state === 'COMBAT');
  let ci = 0;
  for (const e of enemies) {
    if (e.dead || e.state !== 'COMBAT') { e.role = null; continue; }
    e.role = ci === 0 ? 'suppress' : ci === 1 ? 'flank' : (ci % 3 === 2 ? 'hold' : 'push');
    ci++;
  }
  return enemies.map(e => e.role);
}
