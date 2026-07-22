// Data-driven hole definitions. Each hole is just config; HoleScene renders and
// simulates whatever is present. Coordinates are in the 720x1280 design space.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Vec {
  x: number;
  y: number;
}

export interface MovingObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  axis: "x" | "y";
  min: number; // range min for the top-left coord along axis
  max: number; // range max
  speed: number; // px/s
}

// A ramp is a fake slope: an acceleration zone (px/s^2) applied while rolling.
export interface Ramp extends Rect {
  ax: number;
  ay: number;
}

export interface WindSpec {
  base: number; // strength on the 0-20 scale shown to the player
  variance: number; // +/- randomization per attempt (also in 0-20 units)
}

export interface HoleConfig {
  index: number;
  name: string;
  par: number;
  tee: Vec;
  pinCandidates: Vec[]; // one chosen randomly per attempt
  walls: Rect[]; // interior walls (borders are added automatically)
  rocks: Rect[]; // solid rock obstacles (render gray, block like walls)
  sand: Rect[];
  water: Rect[];
  ramps: Ramp[];
  moving: MovingObstacle[];
  wind: WindSpec;
  tip: string;
}

const BOTTOM_TEE: Vec = { x: 360, y: 1120 };

export const HOLES: HoleConfig[] = [
  {
    index: 0,
    name: "The Opener",
    par: 2,
    tee: BOTTOM_TEE,
    pinCandidates: [
      { x: 300, y: 330 },
      { x: 440, y: 300 },
      { x: 250, y: 350 },
    ],
    walls: [],
    // Rocks force a slight angle/bank - never a dead-straight putt to the cup.
    rocks: [
      { x: 330, y: 720, w: 80, h: 80 },
      { x: 180, y: 520, w: 70, h: 70 },
      { x: 470, y: 500, w: 70, h: 70 },
    ],
    sand: [],
    water: [],
    // A gentle hill nudges the ball sideways so you must read the slope.
    ramps: [{ x: 300, y: 900, w: 150, h: 150, ax: 120, ay: 0 }],
    moving: [],
    wind: { base: 5, variance: 2 },
    tip: "Rocks block the direct line - curve around them. Watch the slope.",
  },
  {
    index: 1,
    name: "The Bunker",
    par: 3,
    tee: BOTTOM_TEE,
    pinCandidates: [
      { x: 360, y: 300 },
      { x: 250, y: 330 },
      { x: 470, y: 320 },
    ],
    walls: [],
    rocks: [
      { x: 120, y: 470, w: 64, h: 64 },
      { x: 540, y: 470, w: 64, h: 64 },
    ],
    sand: [{ x: 170, y: 560, w: 380, h: 210 }],
    water: [],
    ramps: [{ x: 470, y: 820, w: 150, h: 150, ax: -110, ay: 0 }],
    moving: [],
    wind: { base: 8, variance: 3 },
    tip: "Sand kills your roll - go around it or blast through with power.",
  },
  {
    index: 2,
    name: "The Narrows",
    par: 3,
    tee: BOTTOM_TEE,
    pinCandidates: [
      { x: 400, y: 300 },
      { x: 300, y: 320 },
      { x: 500, y: 330 },
    ],
    walls: [],
    rocks: [{ x: 336, y: 430, w: 60, h: 60 }],
    sand: [],
    water: [
      { x: 52, y: 640, w: 300, h: 120 },
      { x: 460, y: 640, w: 208, h: 120 },
    ],
    // Downhill toward the water on the right - punishes an over-hit.
    ramps: [{ x: 430, y: 820, w: 170, h: 160, ax: 100, ay: 0 }],
    moving: [],
    wind: { base: 10, variance: 4 },
    tip: "Water resets your shot. Thread the gap - the slope pulls you right.",
  },
  {
    index: 3,
    name: "The Gale",
    par: 4,
    tee: BOTTOM_TEE,
    pinCandidates: [
      { x: 360, y: 300 },
      { x: 240, y: 330 },
      { x: 480, y: 320 },
    ],
    // Baffles give you something to shelter behind from the wind.
    walls: [
      { x: 52, y: 560, w: 200, h: 22 },
      { x: 468, y: 560, w: 200, h: 22 },
    ],
    rocks: [{ x: 336, y: 470, w: 64, h: 64 }],
    sand: [{ x: 260, y: 760, w: 200, h: 120 }],
    water: [],
    // A hill that pushes back against the prevailing gusts.
    ramps: [{ x: 285, y: 900, w: 150, h: 150, ax: 0, ay: -160 }],
    moving: [
      { x: 260, y: 640, w: 200, h: 24, axis: "x", min: 90, max: 430, speed: 150 },
    ],
    wind: { base: 16, variance: 4 },
    tip: "Strong wind - use the baffles and hill for shelter. Aim into the gust.",
  },
  {
    index: 4,
    name: "The Championship",
    par: 4,
    tee: { x: 120, y: 1120 },
    pinCandidates: [
      { x: 600, y: 300 },
      { x: 560, y: 340 },
      { x: 620, y: 260 },
    ],
    walls: [
      { x: 52, y: 888, w: 452, h: 24 },
      { x: 216, y: 620, w: 452, h: 24 },
    ],
    rocks: [{ x: 300, y: 720, w: 70, h: 70 }],
    sand: [{ x: 500, y: 912, w: 168, h: 120 }],
    water: [{ x: 52, y: 320, w: 220, h: 120 }],
    ramps: [{ x: 120, y: 940, w: 180, h: 120, ax: 0, ay: -220 }],
    moving: [
      { x: 300, y: 452, w: 96, h: 26, axis: "x", min: 120, max: 540, speed: 165 },
    ],
    wind: { base: 8, variance: 4 },
    tip: "Maze, a moving blocker, and a ramp. Time it and finish Glitchy Golf.",
  },
];

export const PAR_TOTAL = HOLES.reduce((s, h) => s + h.par, 0);
