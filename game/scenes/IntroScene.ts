import Phaser from "phaser";
import { WIDTH, HEIGHT, COLORS } from "../config/tuning";
import { getCharacter } from "../config/characters";
import { PAR_TOTAL } from "../config/holes";
import type { RunState } from "../run";
import type { Tuning } from "../config/tuning";
import type { Player } from "../session";
import { Sfx, unlockAudio } from "../audio";

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super("IntroScene");
  }

  create() {
    const g = this.add.graphics();
    g.fillGradientStyle(
      COLORS.turfLight,
      COLORS.turfLight,
      COLORS.turfDark,
      COLORS.turfDark,
      1
    );
    g.fillRect(0, 0, WIDTH, HEIGHT);

    const char = getCharacter(this.registry.get("character"));
    const tuning = this.registry.get("tuning") as Tuning;
    const player = this.registry.get("player") as Player | undefined;
    const who = player?.name ?? char.title;

    this.add
      .text(WIDTH / 2, 130, char.emoji, { fontSize: "110px" })
      .setOrigin(0.5);
    this.add
      .text(WIDTH / 2, 240, `${who} enters Glitchy Golf`, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "42px",
        color: "#f4c430",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5);

    // The one rule that matters, made impossible to miss.
    this.add
      .text(
        WIDTH / 2,
        360,
        `Finish all 5 holes in\n${tuning.target} STROKES OR FEWER`,
        {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "46px",
          color: "#ffffff",
          fontStyle: "bold",
          align: "center",
          lineSpacing: 12,
        }
      )
      .setOrigin(0.5);
    this.add
      .text(WIDTH / 2, 470, "Go over and you start the whole course over.", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "28px",
        color: "#f4c430",
        align: "center",
      })
      .setOrigin(0.5);

    const rules = [
      "Drag from the ball to aim.",
      "Release, then TAP to stop the power meter.",
      "",
      "Sand slows you. Water resets the shot.",
      "Wind and pins change every attempt.",
    ];

    this.add
      .text(WIDTH / 2, 560, rules.join("\n"), {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "32px",
        color: "#f5f2e8",
        align: "center",
        lineSpacing: 12,
      })
      .setOrigin(0.5, 0);

    // Tee off CTA
    const c = this.add.container(WIDTH / 2, HEIGHT - 120);
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.gold, 1);
    bg.fillRoundedRect(-220, -40, 440, 80, 18);
    c.add(bg);
    c.add(
      this.add
        .text(0, 0, "Tee Off", {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "30px",
          color: "#08251b",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
    );
    const hit = this.add
      .rectangle(0, 0, 440, 80, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      unlockAudio();
      Sfx.select();
      this.startRun(char.key, tuning);
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

  private startRun(character: RunState["character"], tuning: Tuning) {
    const run: RunState = {
      character,
      holeIndex: 0,
      totalStrokes: 0,
      attempt: 1,
      startedAt: Date.now(),
      target: tuning.target,
    };
    this.registry.set("run", run);
    this.scene.start("HoleScene");
  }
}
