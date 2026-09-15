// Logical viewport size is independent of the larger walkable world.
export const WIDTH = 960,
  HEIGHT = 560,
  WORLD_WIDTH = 1920,
  WORLD_HEIGHT = 1120;
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function getCamera(player) {
  return {
    x: clamp(player.x - WIDTH / 2, 0, WORLD_WIDTH - WIDTH),
    y: clamp(player.y - HEIGHT / 2, 0, WORLD_HEIGHT - HEIGHT),
  };
}
export function screenToWorld(point, player) {
  const camera = getCamera(player);
  return { x: point.x + camera.x, y: point.y + camera.y };
}
export const ZONES = [
  {
    name: "Server racks",
    joke: "Have you tried turning Mersad off and on?",
    x: 100,
    y: 100,
    w: 650,
    h: 340,
    color: "#477e9d",
  },
  {
    name: "Coffee corner",
    joke: "The only dependency that works.",
    x: 1260,
    y: 110,
    w: 560,
    h: 340,
    color: "#b18b54",
  },
  {
    name: "Untested code",
    joke: "100% coverage. Of the floor. In bugs.",
    x: 100,
    y: 710,
    w: 660,
    h: 310,
    color: "#8966a6",
  },
  {
    name: "Production",
    joke: "Malvandi shipped it. Mersad inherited it.",
    x: 820,
    y: 460,
    w: 1000,
    h: 560,
    color: "#4b8e83",
  },
];
export function zoneAt(player) {
  return (
    ZONES.find(
      (z) =>
        player.x >= z.x &&
        player.x <= z.x + z.w &&
        player.y >= z.y &&
        player.y <= z.y + z.h,
    )?.name || "Incident corridor"
  );
}
