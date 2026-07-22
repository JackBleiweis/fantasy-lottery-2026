import { Rect, Vec } from "./config/holes";
import { BALL_RADIUS, FIELD, GRASS_DRAG, STOP_SPEED, WALL_THICKNESS } from "./config/tuning";

interface PredictInput {
  start: Vec;
  angle: number; // radians
  speed: number; // px/s
  wind: Vec; // px/s^2
  walls: Rect[]; // interior walls
}

const DT = 1 / 60;
const MAX_STEPS = 240;

function insideRect(x: number, y: number, r: Rect, pad: number): boolean {
  return (
    x > r.x - pad &&
    x < r.x + r.w + pad &&
    y > r.y - pad &&
    y < r.y + r.h + pad
  );
}

// Simulates the ball forward and returns the path up to (and including) the
// first wall/border contact - matching the "guide stops at first bounce" rule.
export function predictGuide(input: PredictInput): Vec[] {
  const { start, angle, speed, wind, walls } = input;
  const pts: Vec[] = [{ x: start.x, y: start.y }];

  let px = start.x;
  let py = start.y;
  let vx = Math.cos(angle) * speed;
  let vy = Math.sin(angle) * speed;

  const innerMinX = FIELD.x + WALL_THICKNESS + BALL_RADIUS;
  const innerMaxX = FIELD.x + FIELD.w - WALL_THICKNESS - BALL_RADIUS;
  const innerMinY = FIELD.y + WALL_THICKNESS + BALL_RADIUS;
  const innerMaxY = FIELD.y + FIELD.h - WALL_THICKNESS - BALL_RADIUS;

  for (let i = 0; i < MAX_STEPS; i++) {
    const sp = Math.hypot(vx, vy);
    if (sp < STOP_SPEED) break;

    // Friction (grass) then wind.
    const newSp = Math.max(0, sp - GRASS_DRAG * DT);
    vx = (vx / sp) * newSp;
    vy = (vy / sp) * newSp;
    vx += wind.x * DT;
    vy += wind.y * DT;

    const nx = px + vx * DT;
    const ny = py + vy * DT;

    // Border contact.
    if (nx <= innerMinX || nx >= innerMaxX || ny <= innerMinY || ny >= innerMaxY) {
      pts.push({ x: Math.min(Math.max(nx, innerMinX), innerMaxX), y: Math.min(Math.max(ny, innerMinY), innerMaxY) });
      break;
    }

    // Interior wall contact.
    let hit = false;
    for (const w of walls) {
      if (insideRect(nx, ny, w, BALL_RADIUS)) {
        hit = true;
        break;
      }
    }
    pts.push({ x: nx, y: ny });
    if (hit) break;

    px = nx;
    py = ny;
  }

  return pts;
}
