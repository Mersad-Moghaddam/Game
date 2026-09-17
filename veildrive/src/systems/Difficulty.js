// Seedable difficulty pressure. A pure function of run progress and how many
// hostiles are left, so it is deterministic and easy to reason about. Enemies
// use it to tighten aim and speed up slightly as a mission wears on.
export function pressure(missionIndex, alive, maxAlive) {
  const progress = Math.min(1, Math.max(0, missionIndex) / 4);
  const attrition = maxAlive > 0 ? 1 - Math.max(0, Math.min(1, alive / maxAlive)) : 0;
  return Math.max(0, Math.min(1, progress * 0.7 + attrition * 0.3));
}
