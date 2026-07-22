// Central knobs. Difficulty can be loosened here (or via a ?tune= override)
// without touching gameplay code.

export const WIDTH = 720;
export const HEIGHT = 1280;

// Playfield rectangle (leaves room for the HUD up top).
export const FIELD = { x: 28, y: 168, w: 664, h: 1064 } as const;
export const WALL_THICKNESS = 24;

export const BALL_RADIUS = 13;
export const HOLE_RADIUS = 24;

// Physics (Arcade, non-damping: drag is a deceleration in px/s^2).
export const GRASS_DRAG = 240;
export const SAND_DRAG = 1500;
export const WALL_BOUNCE = 0.62;
export const STOP_SPEED = 9; // below this the ball is "at rest"
export const SINK_SPEED = 320; // must be slower than this to drop in the cup
export const MIN_POWER = 0.14; // floor so a dead-stop tap still moves

// Target score across all 5 holes (par total is 16). Lower = harder.
export const DEFAULT_TARGET = 16;

// Wind is authored on a friendly 0-20 scale (shown to the player as a number).
// Each unit converts to this much acceleration (px/s^2) on the ball. 20 units
// stays under GRASS_DRAG so the ball always eventually settles.
export const WIND_MAX_UNITS = 20;
export const WIND_ACCEL_PER_UNIT = 9;

export interface Tuning {
  target: number;
  windScale: number; // multiplier on hole wind
  powerScale: number; // multiplier on character max power
}

export function getTuning(): Tuning {
  const t: Tuning = {
    target: DEFAULT_TARGET,
    windScale: 1,
    powerScale: 1,
  };
  if (typeof window === "undefined") return t;
  const p = new URLSearchParams(window.location.search);

  const targetRaw = p.get("target");
  if (targetRaw !== null) {
    const target = Number(targetRaw);
    if (Number.isFinite(target) && target > 0) t.target = target;
  }

  // Only override wind when the param is actually present. (Number(null) is 0,
  // which would otherwise silently zero out all wind.)
  const windRaw = p.get("wind");
  if (windRaw !== null) {
    const wind = Number(windRaw);
    if (Number.isFinite(wind) && wind >= 0) t.windScale = wind;
  }

  return t;
}

// Glitchy Golf palette
export const COLORS = {
  turfDark: 0x0b3d2e,
  turf: 0x12613f,
  turfLight: 0x1c8a55,
  fairway: 0x2aa564,
  gold: 0xf4c430,
  cream: 0xf5f2e8,
  ink: 0x08251b,
  sand: 0xe6cf8f,
  water: 0x2b7fd4,
  wall: 0x083322,
  wallEdge: 0x0f5138,
  ball: 0xffffff,
  // Rocks: clearly not turf/sand/water. Gray boulders.
  rock: 0x6b7280,
  rockEdge: 0x3f4650,
  // Hills/slopes: a distinct purple so they're unmistakable on the green floor.
  hill: 0x9b7cc4,
  hillEdge: 0xd8c7f0,
} as const;
