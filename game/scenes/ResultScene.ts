import Phaser from "phaser";
import { WIDTH, HEIGHT, COLORS } from "../config/tuning";
import { HOLES } from "../config/holes";
import { getCharacter } from "../config/characters";
import type { RunState } from "../run";
import { Sfx } from "../audio";

interface ResultData {
  type: "cleared" | "fail";
  holeNumber?: number;
}

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  create(data: ResultData) {
    const g = this.add.graphics();
    g.fillStyle(COLORS.turfDark, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    if (data.type === "cleared") this.cleared(data.holeNumber ?? 1);
    else this.failed();
  }

  private cleared(clearedHole: number) {
    const run = this.registry.get("run") as RunState;
    const over = run.totalStrokes > run.target;
    const numberColor = over ? "#ff6b6b" : "#f4c430";

    this.add
      .text(WIDTH / 2, HEIGHT / 2 - 300, "\u2713", {
        fontSize: "90px",
        color: "#7ee0a1",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(WIDTH / 2, HEIGHT / 2 - 200, `Hole ${clearedHole} cleared`, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "44px",
        color: "#f5f2e8",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // The running total, made huge so nobody loses track of their count.
    this.add
      .text(WIDTH / 2, HEIGHT / 2 - 60, "STROKES SO FAR", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "30px",
        color: "#9fb8a8",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setLetterSpacing(3);
    this.add
      .text(WIDTH / 2, HEIGHT / 2 + 60, String(run.totalStrokes), {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "180px",
        color: numberColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(WIDTH / 2, HEIGHT / 2 + 170, `Target: ${run.target} or fewer`, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "32px",
        color: "#f5f2e8",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(WIDTH / 2, HEIGHT / 2 + 230, `Next: ${HOLES[run.holeIndex].name}`, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "26px",
        color: "#cfe0d4",
      })
      .setOrigin(0.5);

    Sfx.select();
    this.ctaOrTap("Next hole", () => this.scene.start("HoleScene"));
    this.time.delayedCall(1800, () => {
      if (this.scene.isActive()) this.scene.start("HoleScene");
    });
  }

  private failed() {
    const char = getCharacter(this.registry.get("character"));
    const run = this.registry.get("run") as RunState;

    this.add
      .text(WIDTH / 2, HEIGHT / 2 - 150, char.emoji, { fontSize: "90px" })
      .setOrigin(0.5)
      .setAlpha(0.85);
    this.add
      .text(WIDTH / 2, HEIGHT / 2 - 40, "So close.", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "48px",
        color: "#f4c430",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(
        WIDTH / 2,
        HEIGHT / 2 + 30,
        "Glitchy Golf stands.\nRealign your aim and go again.",
        {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "24px",
          color: "#dfe8e0",
          align: "center",
          lineSpacing: 8,
        }
      )
      .setOrigin(0.5);
    this.add
      .text(WIDTH / 2, HEIGHT / 2 + 130, `Attempt ${run.attempt}`, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#9fb8a8",
      })
      .setOrigin(0.5);

    this.ctaOrTap("Try Again", () => this.scene.start("HoleScene"));
  }

  private ctaOrTap(label: string, action: () => void) {
    const c = this.add.container(WIDTH / 2, HEIGHT - 140);
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.gold, 1);
    bg.fillRoundedRect(-200, -38, 400, 76, 16);
    c.add(bg);
    c.add(
      this.add
        .text(0, 0, label, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "28px",
          color: "#08251b",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
    );
    const hit = this.add
      .rectangle(0, 0, 400, 76, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      Sfx.select();
      action();
    });
    c.add(hit);
    this.tweens.add({
      targets: c,
      scale: { from: 1, to: 1.04 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }
}
