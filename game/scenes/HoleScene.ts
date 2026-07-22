import Phaser from "phaser";
import {
  WIDTH,
  HEIGHT,
  FIELD,
  WALL_THICKNESS,
  BALL_RADIUS,
  HOLE_RADIUS,
  GRASS_DRAG,
  SAND_DRAG,
  WALL_BOUNCE,
  STOP_SPEED,
  SINK_SPEED,
  MIN_POWER,
  COLORS,
  WIND_MAX_UNITS,
  WIND_ACCEL_PER_UNIT,
} from "../config/tuning";
import type { Tuning } from "../config/tuning";
import { HOLES, HoleConfig, Rect, Vec } from "../config/holes";
import { getCharacter, CharacterDef } from "../config/characters";
import type { RunState } from "../run";
import { predictGuide } from "../prediction";
import { createRng, makeSeed, Rng } from "../rng";
import { Sfx } from "../audio";

type Mode = "aim" | "power" | "rolling" | "done";

interface Mover {
  rect: Phaser.GameObjects.Rectangle;
  body: Phaser.Physics.Arcade.Body;
  axis: "x" | "y";
  centerMin: number;
  centerMax: number;
  speed: number;
  dir: number;
}

export default class HoleScene extends Phaser.Scene {
  private run!: RunState;
  private hole!: HoleConfig;
  private char!: CharacterDef;
  private tuning!: Tuning;
  private rng!: Rng;

  private ball!: Phaser.Physics.Arcade.Sprite;
  private wallObjs: Phaser.GameObjects.GameObject[] = [];
  private movers: Mover[] = [];

  private sandRects: Phaser.Geom.Rectangle[] = [];
  private waterRects: Phaser.Geom.Rectangle[] = [];
  private ramps: { rect: Phaser.Geom.Rectangle; ax: number; ay: number }[] = [];

  private pin!: Vec;
  private cupGfx!: Phaser.GameObjects.Graphics;
  private flag!: Phaser.GameObjects.Image;

  private windVec = { x: 0, y: 0 }; // acceleration px/s^2
  private windUnits = 0; // 0-20 scale shown to the player

  private mode: Mode = "aim";
  private aiming = false;
  private aimAngle = 0;
  private aimLen = 0;
  private shotStart: Vec = { x: 0, y: 0 };
  private strokes = 0;

  private guideGfx!: Phaser.GameObjects.Graphics;
  private arrowGfx!: Phaser.GameObjects.Graphics;

  private power = { v: 0 };
  private powerTween?: Phaser.Tweens.Tween;
  private meterGfx!: Phaser.GameObjects.Graphics;

  private hudStrokes!: Phaser.GameObjects.Text;
  private hudTotal!: Phaser.GameObjects.Text;
  private hudHole!: Phaser.GameObjects.Text;
  private windGfx!: Phaser.GameObjects.Graphics;
  private windLabel!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super("HoleScene");
  }

  create() {
    this.movers = [];
    this.wallObjs = [];
    this.sandRects = [];
    this.waterRects = [];
    this.ramps = [];
    this.aiming = false;
    this.strokes = 0;
    this.mode = "aim";

    this.run = this.registry.get("run") as RunState;
    this.tuning = this.registry.get("tuning") as Tuning;
    this.char = getCharacter(this.run.character);
    this.hole = HOLES[this.run.holeIndex];
    this.rng = createRng(makeSeed(this.run.attempt, this.run.holeIndex));

    this.drawField();
    this.buildWalls();
    this.buildHazards();
    this.rollWindAndPin();
    this.buildCup();
    this.buildTeeAndBall();
    this.buildMovers();
    this.buildHud();
    this.buildInput();
    this.showTip();
  }

  // ----- construction -------------------------------------------------------

  private drawField() {
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.turfDark, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    // Fairway with soft mow stripes.
    bg.fillStyle(COLORS.turf, 1);
    bg.fillRoundedRect(FIELD.x, FIELD.y, FIELD.w, FIELD.h, 18);
    const stripe = 68;
    for (let y = FIELD.y; y < FIELD.y + FIELD.h; y += stripe * 2) {
      bg.fillStyle(COLORS.turfLight, 0.25);
      bg.fillRect(FIELD.x, y, FIELD.w, stripe);
    }
  }

  private buildWalls() {
    const t = WALL_THICKNESS;
    const border: Rect[] = [
      { x: FIELD.x, y: FIELD.y, w: FIELD.w, h: t },
      { x: FIELD.x, y: FIELD.y + FIELD.h - t, w: FIELD.w, h: t },
      { x: FIELD.x, y: FIELD.y, w: t, h: FIELD.h },
      { x: FIELD.x + FIELD.w - t, y: FIELD.y, w: t, h: FIELD.h },
    ];
    [...border, ...this.hole.walls].forEach((r) => this.addWall(r));
    this.hole.rocks.forEach((r) => this.addRock(r));
  }

  private addWall(r: Rect) {
    const rect = this.add.rectangle(
      r.x + r.w / 2,
      r.y + r.h / 2,
      r.w,
      r.h,
      COLORS.wall
    );
    rect.setStrokeStyle(3, COLORS.wallEdge);
    this.physics.add.existing(rect, true); // static body
    this.wallObjs.push(rect);
  }

  private addRock(r: Rect) {
    // Solid gray boulder: blocks like a wall, but clearly reads as a rock.
    const rect = this.add.rectangle(
      r.x + r.w / 2,
      r.y + r.h / 2,
      r.w,
      r.h,
      COLORS.rock
    );
    rect.setStrokeStyle(4, COLORS.rockEdge);
    // little highlight for a 3D-ish boulder feel
    const hl = this.add.graphics();
    hl.fillStyle(0xffffff, 0.18);
    hl.fillRoundedRect(r.x + 8, r.y + 8, r.w * 0.45, r.h * 0.3, 6);
    this.physics.add.existing(rect, true);
    this.wallObjs.push(rect);
  }

  private buildHazards() {
    const g = this.add.graphics();
    this.hole.sand.forEach((r) => {
      g.fillStyle(COLORS.sand, 1);
      g.fillRoundedRect(r.x, r.y, r.w, r.h, 14);
      this.sandRects.push(new Phaser.Geom.Rectangle(r.x, r.y, r.w, r.h));
    });
    this.hole.water.forEach((r) => {
      g.fillStyle(COLORS.water, 1);
      g.fillRoundedRect(r.x, r.y, r.w, r.h, 14);
      g.fillStyle(0xffffff, 0.12);
      g.fillRoundedRect(r.x + 8, r.y + 8, r.w - 16, 10, 6);
      this.waterRects.push(new Phaser.Geom.Rectangle(r.x, r.y, r.w, r.h));
    });
    this.hole.ramps.forEach((r) => {
      // Hill/slope: a clearly different colour on the floor + arrows showing the
      // downhill direction the ball gets pushed. Not pretty, but unmistakable.
      g.fillStyle(COLORS.hill, 0.9);
      g.fillRoundedRect(r.x, r.y, r.w, r.h, 14);
      g.lineStyle(4, COLORS.hillEdge, 1);
      g.strokeRoundedRect(r.x, r.y, r.w, r.h, 14);

      // Direction of the push (downhill).
      const ang = Math.atan2(r.ay, r.ax);
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      g.lineStyle(6, 0xffffff, 0.85);
      for (let i = -1; i <= 1; i++) {
        // stack 3 chevrons perpendicular to the flow
        const perp = ang + Math.PI / 2;
        const ox = cx + Math.cos(perp) * i * 34 - Math.cos(ang) * 18;
        const oy = cy + Math.sin(perp) * i * 34 - Math.sin(ang) * 18;
        const tx = ox + Math.cos(ang) * 30;
        const ty = oy + Math.sin(ang) * 30;
        g.beginPath();
        g.moveTo(ox + Math.cos(ang + 2.5) * 16, oy + Math.sin(ang + 2.5) * 16);
        g.lineTo(tx, ty);
        g.lineTo(ox + Math.cos(ang - 2.5) * 16, oy + Math.sin(ang - 2.5) * 16);
        g.strokePath();
      }

      this.ramps.push({
        rect: new Phaser.Geom.Rectangle(r.x, r.y, r.w, r.h),
        ax: r.ax,
        ay: r.ay,
      });
    });
  }

  private rollWindAndPin() {
    // Pin: pick a candidate then nudge slightly (obstacle/pin variation).
    const base = this.rng.pick(this.hole.pinCandidates);
    this.pin = {
      x: base.x + this.rng.range(-24, 24),
      y: base.y + this.rng.range(-18, 18),
    };

    // Wind: authored on a 0-20 scale, randomized per attempt, then converted to
    // acceleration. Every hole has some wind so it always visibly matters.
    const w = this.hole.wind;
    let units =
      (w.base + this.rng.range(-w.variance, w.variance)) * this.tuning.windScale;
    units = Phaser.Math.Clamp(units, 0, WIND_MAX_UNITS);
    this.windUnits = Math.round(units);
    const accel = units * WIND_ACCEL_PER_UNIT;
    const angle = this.rng.range(0, Math.PI * 2);
    this.windVec = { x: Math.cos(angle) * accel, y: Math.sin(angle) * accel };
  }

  private buildCup() {
    this.cupGfx = this.add.graphics();
    this.cupGfx.fillStyle(COLORS.ink, 1);
    this.cupGfx.fillCircle(this.pin.x, this.pin.y, HOLE_RADIUS);
    this.cupGfx.lineStyle(3, 0x063a28, 1);
    this.cupGfx.strokeCircle(this.pin.x, this.pin.y, HOLE_RADIUS);
    this.flag = this.add.image(this.pin.x + 14, this.pin.y - 28, "flag");
    this.tweens.add({
      targets: this.flag,
      angle: { from: -3, to: 3 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  private buildTeeAndBall() {
    const tee = this.hole.tee;
    const teeMark = this.add.graphics();
    teeMark.fillStyle(COLORS.cream, 0.35);
    teeMark.fillCircle(tee.x, tee.y, 18);

    this.ball = this.physics.add.sprite(tee.x, tee.y, "ball");
    this.ball.setCircle(BALL_RADIUS);
    this.ball.setBounce(WALL_BOUNCE);
    this.ball.setDamping(false);
    this.ball.setDrag(GRASS_DRAG, GRASS_DRAG);
    this.ball.setMaxVelocity(1200, 1200);
    (this.ball.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    this.physics.add.collider(this.ball, this.wallObjs, () => Sfx.wall());

    this.shotStart = { x: tee.x, y: tee.y };

    this.guideGfx = this.add.graphics();
    this.arrowGfx = this.add.graphics();
    this.meterGfx = this.add.graphics();
  }

  private buildMovers() {
    this.hole.moving.forEach((m) => {
      const rect = this.add.rectangle(
        m.x + m.w / 2,
        m.y + m.h / 2,
        m.w,
        m.h,
        COLORS.wallEdge
      );
      rect.setStrokeStyle(3, COLORS.cream, 0.4);
      this.physics.add.existing(rect);
      const body = rect.body as Phaser.Physics.Arcade.Body;
      body.setImmovable(true);
      body.setAllowGravity(false);
      const mover: Mover = {
        rect,
        body,
        axis: m.axis,
        centerMin: m.min + m.w / 2,
        centerMax: m.max + m.h / 2,
        speed: m.speed,
        dir: 1,
      };
      if (m.axis === "x") {
        mover.centerMax = m.max + m.w / 2;
        body.setVelocityX(m.speed);
      } else {
        mover.centerMax = m.max + m.h / 2;
        body.setVelocityY(m.speed);
      }
      this.movers.push(mover);
      this.physics.add.collider(this.ball, rect, () => Sfx.wall());
    });
  }

  // ----- HUD ----------------------------------------------------------------

  private buildHud() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 0.85);
    g.fillRect(0, 0, WIDTH, FIELD.y - 8);

    this.hudHole = this.add
      .text(24, 18, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "32px",
        color: "#f4c430",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    this.add
      .text(24, 62, `${this.hole.name}  \u00b7  Par ${this.hole.par}`, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "24px",
        color: "#cfe0d4",
      })
      .setOrigin(0, 0);

    this.hudStrokes = this.add
      .text(WIDTH / 2, 12, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "62px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);
    this.add
      .text(WIDTH / 2, 90, "STROKES", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "17px",
        color: "#9fb8a8",
      })
      .setOrigin(0.5, 0)
      .setLetterSpacing(2);

    this.hudTotal = this.add
      .text(WIDTH - 24, 16, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "28px",
        color: "#f5f2e8",
        fontStyle: "bold",
        align: "right",
        lineSpacing: 4,
      })
      .setOrigin(1, 0);

    // Wind indicator (label + live number + direction arrow)
    this.windGfx = this.add.graphics();
    this.add
      .text(WIDTH - 24, 92, "WIND", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#9fb8a8",
      })
      .setOrigin(1, 0)
      .setLetterSpacing(2);
    this.windLabel = this.add
      .text(WIDTH - 100, 120, "0", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "32px",
        color: "#f4c430",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5);

    // Give-up valve (safety net so a stuck player isn't hard-walled).
    const giveUp = this.add
      .text(WIDTH / 2, FIELD.y - 28, "give up hole (+3)", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "16px",
        color: "#7f9a8b",
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    giveUp.on("pointerdown", () => {
      if (this.mode === "rolling" || this.mode === "done") return;
      this.strokes = this.hole.par + 3;
      this.completeHole();
    });

    this.hintText = this.add
      .text(WIDTH / 2, HEIGHT - 60, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "20px",
        color: "#f5f2e8",
      })
      .setOrigin(0.5)
      .setAlpha(0.9);

    this.updateHud();
  }

  private updateHud() {
    this.hudHole.setText(`Hole ${this.run.holeIndex + 1}/${HOLES.length}`);
    this.hudStrokes.setText(String(this.strokes));
    const liveTotal = this.run.totalStrokes + this.strokes;
    this.hudTotal.setText(`Total ${liveTotal}\nTarget ${this.run.target}`);

    this.windLabel.setText(String(this.windUnits));
    this.windGfx.clear();
    const ox = WIDTH - 56;
    const oy = 126;
    if (this.windUnits <= 0) {
      this.windGfx.lineStyle(3, 0x9fb8a8, 1);
      this.windGfx.strokeCircle(ox, oy, 6);
      return;
    }
    const len = 12 + (this.windUnits / WIND_MAX_UNITS) * 22;
    const ang = Math.atan2(this.windVec.y, this.windVec.x);
    const ex = ox + Math.cos(ang) * len;
    const ey = oy + Math.sin(ang) * len;
    this.windGfx.lineStyle(4, COLORS.gold, 1);
    this.windGfx.beginPath();
    this.windGfx.moveTo(ox - Math.cos(ang) * len, oy - Math.sin(ang) * len);
    this.windGfx.lineTo(ex, ey);
    this.windGfx.strokePath();
    // arrowhead
    this.windGfx.fillStyle(COLORS.gold, 1);
    const a1 = ang + 2.6;
    const a2 = ang - 2.6;
    this.windGfx.fillTriangle(
      ex,
      ey,
      ex + Math.cos(a1) * 12,
      ey + Math.sin(a1) * 12,
      ex + Math.cos(a2) * 12,
      ey + Math.sin(a2) * 12
    );
  }

  private showTip() {
    this.hintText.setText(this.hole.tip);
    this.time.delayedCall(3200, () => {
      if (this.mode === "aim") this.hintText.setText("Drag to aim");
    });
  }

  // ----- input --------------------------------------------------------------

  private buildInput() {
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.mode === "aim") {
        this.aiming = true;
        this.updateAim(p);
      } else if (this.mode === "power") {
        this.shoot();
      }
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.mode === "aim" && this.aiming) this.updateAim(p);
    });
    this.input.on("pointerup", () => {
      if (this.mode === "aim" && this.aiming) {
        this.aiming = false;
        if (this.aimLen > 14) this.enterPower();
        else this.clearAimGfx();
      }
    });
  }

  private updateAim(p: Phaser.Input.Pointer) {
    const dx = p.worldX - this.ball.x;
    const dy = p.worldY - this.ball.y;
    this.aimLen = Math.hypot(dx, dy);
    if (this.aimLen < 2) return;
    this.aimAngle = Math.atan2(dy, dx);
    this.drawAim();
    this.hintText.setText("Release to set power");
  }

  private drawAim() {
    const { x, y } = this.ball;
    // Direction arrow
    this.arrowGfx.clear();
    const aLen = 74;
    const ex = x + Math.cos(this.aimAngle) * aLen;
    const ey = y + Math.sin(this.aimAngle) * aLen;
    this.arrowGfx.lineStyle(6, this.char.color, 1);
    this.arrowGfx.beginPath();
    this.arrowGfx.moveTo(x, y);
    this.arrowGfx.lineTo(ex, ey);
    this.arrowGfx.strokePath();
    this.arrowGfx.fillStyle(this.char.color, 1);
    const a1 = this.aimAngle + 2.6;
    const a2 = this.aimAngle - 2.6;
    this.arrowGfx.fillTriangle(
      ex,
      ey,
      ex + Math.cos(a1) * 16,
      ey + Math.sin(a1) * 16,
      ex + Math.cos(a2) * 16,
      ey + Math.sin(a2) * 16
    );

    // Predicted dotted guide (accuracy = length + wobble per character).
    const previewSpeed = this.char.maxPower * this.tuning.powerScale;
    const pts = predictGuide({
      start: { x, y },
      angle: this.aimAngle,
      speed: previewSpeed,
      wind: this.windVec,
      walls: this.hole.walls,
    });
    const showN = Math.max(6, Math.floor(pts.length * this.char.guideFraction));
    const perp = this.aimAngle + Math.PI / 2;
    this.guideGfx.clear();
    for (let i = 2; i < showN; i += 3) {
      const wob =
        this.char.guideWobble > 0
          ? Math.sin(i * 0.7) * this.char.guideWobble
          : 0;
      const px = pts[i].x + Math.cos(perp) * wob;
      const py = pts[i].y + Math.sin(perp) * wob;
      const alpha = 0.85 * (1 - i / showN) + 0.15;
      this.guideGfx.fillStyle(COLORS.cream, alpha);
      this.guideGfx.fillCircle(px, py, 4);
    }
  }

  private clearAimGfx() {
    this.arrowGfx.clear();
    this.guideGfx.clear();
  }

  private enterPower() {
    this.mode = "power";
    this.guideGfx.clear();
    this.power.v = 0;
    this.hintText.setText("TAP to set power");
    this.powerTween = this.tweens.add({
      targets: this.power,
      v: 1,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  private shoot() {
    if (this.powerTween) this.powerTween.stop();
    this.meterGfx.clear();
    this.arrowGfx.clear();

    const frac = MIN_POWER + this.power.v * (1 - MIN_POWER);
    const speed = frac * this.char.maxPower * this.tuning.powerScale;
    this.shotStart = { x: this.ball.x, y: this.ball.y };
    this.ball.setVelocity(
      Math.cos(this.aimAngle) * speed,
      Math.sin(this.aimAngle) * speed
    );
    this.strokes += 1;
    this.mode = "rolling";
    this.hintText.setText("");
    this.updateHud();
    Sfx.putt();
    this.cameras.main.shake(90, 0.003);
  }

  // ----- update loop --------------------------------------------------------

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    this.updateMovers();
    if (this.mode === "power") this.drawMeter();
    if (this.mode !== "rolling") return;

    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    const speed = body.velocity.length();

    // Sand slows the ball hard.
    const inSand = this.pointInRects(this.ball.x, this.ball.y, this.sandRects);
    body.setDrag(inSand ? SAND_DRAG : GRASS_DRAG, inSand ? SAND_DRAG : GRASS_DRAG);

    // Wind + ramp acceleration applied while moving.
    if (speed > STOP_SPEED) {
      body.velocity.x += this.windVec.x * dt;
      body.velocity.y += this.windVec.y * dt;
      for (const r of this.ramps) {
        if (r.rect.contains(this.ball.x, this.ball.y)) {
          body.velocity.x += r.ax * dt;
          body.velocity.y += r.ay * dt;
        }
      }
    }

    // Water resets the shot with a penalty.
    if (this.pointInRects(this.ball.x, this.ball.y, this.waterRects)) {
      this.hitWater();
      return;
    }

    // Sink check: near the cup and slow enough to drop.
    const dPin = Phaser.Math.Distance.Between(
      this.ball.x,
      this.ball.y,
      this.pin.x,
      this.pin.y
    );
    if (dPin < HOLE_RADIUS && speed < SINK_SPEED) {
      this.sink();
      return;
    }

    // Settle.
    if (speed < STOP_SPEED) {
      body.setVelocity(0, 0);
      this.mode = "aim";
      this.clampBall();
      if (this.checkDoomed()) return;
      this.hintText.setText("Drag to aim");
    }
  }

  private updateMovers() {
    for (const m of this.movers) {
      const center = m.axis === "x" ? m.rect.x : m.rect.y;
      if (center <= m.centerMin && m.dir < 0) {
        m.dir = 1;
        this.setMoverVel(m);
      } else if (center >= m.centerMax && m.dir > 0) {
        m.dir = -1;
        this.setMoverVel(m);
      }
    }
  }

  private setMoverVel(m: Mover) {
    if (m.axis === "x") m.body.setVelocityX(m.speed * m.dir);
    else m.body.setVelocityY(m.speed * m.dir);
  }

  private drawMeter() {
    const w = 460;
    const h = 34;
    const x = WIDTH / 2 - w / 2;
    const y = HEIGHT - 120;
    this.meterGfx.clear();
    this.meterGfx.fillStyle(COLORS.ink, 0.6);
    this.meterGfx.fillRoundedRect(x - 6, y - 6, w + 12, h + 12, 10);
    // gradient-ish segments
    const fillW = w * this.power.v;
    const col =
      this.power.v > 0.85 ? 0xff5544 : this.power.v > 0.6 ? COLORS.gold : COLORS.turfLight;
    this.meterGfx.fillStyle(0xffffff, 0.1);
    this.meterGfx.fillRoundedRect(x, y, w, h, 8);
    this.meterGfx.fillStyle(col, 1);
    this.meterGfx.fillRoundedRect(x, y, Math.max(10, fillW), h, 8);
    this.meterGfx.lineStyle(3, COLORS.cream, 0.4);
    this.meterGfx.strokeRoundedRect(x, y, w, h, 8);
  }

  private pointInRects(x: number, y: number, rects: Phaser.Geom.Rectangle[]) {
    for (const r of rects) if (r.contains(x, y)) return true;
    return false;
  }

  private clampBall() {
    const minX = FIELD.x + WALL_THICKNESS + BALL_RADIUS;
    const maxX = FIELD.x + FIELD.w - WALL_THICKNESS - BALL_RADIUS;
    const minY = FIELD.y + WALL_THICKNESS + BALL_RADIUS;
    const maxY = FIELD.y + FIELD.h - WALL_THICKNESS - BALL_RADIUS;
    this.ball.x = Phaser.Math.Clamp(this.ball.x, minX, maxX);
    this.ball.y = Phaser.Math.Clamp(this.ball.y, minY, maxY);
  }

  private hitWater() {
    Sfx.water();
    this.strokes += 1; // penalty
    this.cameras.main.flash(160, 40, 120, 210);
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.ball.setPosition(this.shotStart.x, this.shotStart.y);
    this.mode = "aim";
    this.updateHud();
    if (this.checkDoomed()) return;
    this.hintText.setText("Splash! Shot replayed. Drag to aim");
  }

  private sink() {
    this.mode = "done";
    const body = this.ball.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    Sfx.sink();
    this.emitBurst(this.pin.x, this.pin.y, COLORS.gold);
    this.tweens.add({
      targets: this.ball,
      x: this.pin.x,
      y: this.pin.y,
      scale: 0.5,
      duration: 180,
      ease: "Quad.in",
      onComplete: () => this.completeHole(),
    });
  }

  private emitBurst(x: number, y: number, color: number) {
    const particles = this.add.particles(x, y, "pixel", {
      speed: { min: 80, max: 260 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.4, end: 0 },
      lifespan: 520,
      quantity: 18,
      tint: color,
    });
    this.time.delayedCall(600, () => particles.destroy());
  }

  // ----- run flow -----------------------------------------------------------

  private checkDoomed(): boolean {
    // End the run early once the target is mathematically unreachable:
    // current live total + 1 (to finish this hole) + 1 per remaining hole.
    const liveTotal = this.run.totalStrokes + this.strokes;
    const remaining = HOLES.length - 1 - this.run.holeIndex;
    const minPossibleFinal = liveTotal + 1 + remaining;
    if (minPossibleFinal > this.run.target) {
      this.failRun("unreachable");
      return true;
    }
    return false;
  }

  private completeHole() {
    this.mode = "done";
    this.run.totalStrokes += this.strokes;
    const isLast = this.run.holeIndex === HOLES.length - 1;

    if (isLast) {
      if (this.run.totalStrokes <= this.run.target) {
        this.succeed();
      } else {
        this.failRun("over");
      }
      return;
    }

    const nextIndex = this.run.holeIndex + 1;
    const remaining = HOLES.length - nextIndex;
    if (this.run.totalStrokes + remaining > this.run.target) {
      this.failRun("over");
      return;
    }

    // Advance to the next hole (kept in the in-memory registry only).
    this.run.holeIndex = nextIndex;
    this.registry.set("run", this.run);
    this.scene.start("ResultScene", {
      type: "cleared",
      holeNumber: nextIndex, // number just cleared (1-based of previous)
    });
  }

  private succeed() {
    this.registry.set("result", {
      score: this.run.totalStrokes,
      elapsedMs: Date.now() - this.run.startedAt,
    });
    this.scene.start("RevealScene");
  }

  private failRun(_reason: string) {
    Sfx.fail();
    // Reset for a fresh attempt, keeping character + original start time.
    this.run = {
      ...this.run,
      attempt: this.run.attempt + 1,
      holeIndex: 0,
      totalStrokes: 0,
    };
    this.registry.set("run", this.run);
    this.scene.start("ResultScene", { type: "fail" });
  }
}
