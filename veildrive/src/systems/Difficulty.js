// Seedable difficulty pressure plus per-phase scaling. Pure functions of run
// progress and difficulty tier, so they stay deterministic and easy to reason
// about and test.
import { PHASES, MISSION_COUNT } from '../data/missions.js';

export function pressure(missionIndex, alive, maxAlive) {
  const span = Math.max(1, MISSION_COUNT - 1);
  const progress = Math.min(1, Math.max(0, missionIndex) / span);
  const attrition = maxAlive > 0 ? 1 - Math.max(0, Math.min(1, alive / maxAlive)) : 0;
  return Math.max(0, Math.min(1, progress * 0.7 + attrition * 0.3));
}

export function phaseDifficulty(phaseIndex) {
  const i = Math.max(0, Math.min(PHASES.length - 1, Math.floor(phaseIndex) || 0));
  const d = PHASES[i].difficulty;
  return { reaction: d.reaction, detect: d.detect, score: d.score };
}

// Shared by the mission rollout and reinforcement waves so every enemy in a
// phase gets the same reaction/detection scaling. Speed is intentionally left
// untouched.
export function applyPhaseToEnemy(enemy, diff) {
  enemy.reaction = Math.max(0.05, enemy.reaction * diff.reaction);
  enemy.vision *= diff.detect;
  return enemy;
}
