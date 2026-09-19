// Pure goal evaluation for every objective type. Kept free of the Game so it
// is trivially unit-testable and shared by Game.update and World.interact.
export function goalReached(goal, s) {
  if (!goal) return false;
  const objectives = s.objectives || [];
  switch (goal.type) {
    case 'eliminate':
      return objectives.length === 0 && (s.enemies || []).every(e => e.dead) && !(s.boss && !s.boss.dead);
    case 'target':
      return !!s.target && s.target.dead === true;
    case 'boss':
      return !!s.boss && s.boss.dead === true;
    case 'retrieve':
    case 'collect':
      return objectives.length > 0 && objectives.every(o => o.taken === true);
    case 'sabotage':
      return objectives.length > 0 && objectives.every(o => o.armed === true);
    case 'survive':
      return (s.missionTime || 0) >= (goal.duration || 0);
    default:
      return false;
  }
}
