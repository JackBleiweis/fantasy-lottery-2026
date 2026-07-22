import Phaser from "phaser";
import { WIDTH, HEIGHT, COLORS } from "../config/tuning";
import { getCharacter } from "../config/characters";
import type { Player } from "../session";
import { pickForSlug } from "../config/players";
import { Sfx } from "../audio";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default class RevealScene extends Phaser.Scene {
  private pick: number | null = null;
  private failedFetch = false;

  constructor() {
    super("RevealScene");
  }

  create() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x123, 0x123, COLORS.turfDark, COLORS.turfDark, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);

    // Pick is baked into the client - no backend call.
    const player = this.registry.get("player") as Player;
    const pick = pickForSlug(player.slug);
    if (pick === undefined) this.failedFetch = true;
    else this.pick = pick;

    Sfx.win();
    this.runSequence();
  }

  private runSequence() {
    const char = getCharacter(this.registry.get("character"));
    const player = this.registry.get("player") as Player;

    this.add
      .text(WIDTH / 2, 150, char.emoji, { fontSize: "110px" })
      .setOrigin(0.5);

    const line1 = this.add
      .text(WIDTH / 2, 320, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "30px",
        color: "#f4c430",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: WIDTH - 80 },
      })
      .setOrigin(0.5);

    const line2 = this.add
      .text(WIDTH / 2, 440, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "26px",
        color: "#f5f2e8",
        align: "center",
        wordWrap: { width: WIDTH - 80 },
      })
      .setOrigin(0.5);

    const pickText = this.add
      .text(WIDTH / 2, HEIGHT / 2 + 180, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "180px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScale(0);

    const pickLabel = this.add
      .text(WIDTH / 2, HEIGHT / 2 + 40, "", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "24px",
        color: "#9fb8a8",
      })
      .setOrigin(0.5)
      .setLetterSpacing(3);

    // Beat 1
    this.time.delayedCall(400, () => {
      line1.setText(`${char.title} has conquered\nGlitchy Golf...`);
      Sfx.select();
    });
    // Beat 2
    this.time.delayedCall(2600, () => {
      line2.setText(`${player.name}, your draft position is...`);
      Sfx.select();
    });
    // Beat 3 - drumroll then reveal
    this.time.delayedCall(4600, () => this.revealNumber(pickText, pickLabel));
  }

  private revealNumber(
    pickText: Phaser.GameObjects.Text,
    pickLabel: Phaser.GameObjects.Text
  ) {
    // Wait until fetch resolves (poll briefly), then reveal.
    const tryReveal = (attemptsLeft: number) => {
      if (this.pick === null && !this.failedFetch && attemptsLeft > 0) {
        this.time.delayedCall(200, () => tryReveal(attemptsLeft - 1));
        return;
      }

      if (this.failedFetch || this.pick === null) {
        pickLabel.setText("");
        pickText.setFontSize(40).setText("Result saved.\nAsk your commissioner!");
        this.tweens.add({ targets: pickText, scale: 1, duration: 300 });
        this.showReplay();
        return;
      }

      // Drumroll: flicker random numbers, then slam to the real pick.
      pickLabel.setText("DRAFT PICK");
      let ticks = 0;
      const roll = this.time.addEvent({
        delay: 70,
        repeat: 16,
        callback: () => {
          ticks++;
          pickText.setText(String(Phaser.Math.Between(1, 12)));
          pickText.setScale(1);
          Sfx.putt();
          if (roll.repeatCount === 0) {
            pickText.setText(ordinal(this.pick as number));
            pickText.setScale(0);
            Sfx.sink();
            this.cameras.main.flash(300, 244, 196, 48);
            this.cameras.main.shake(260, 0.006);
            this.tweens.add({
              targets: pickText,
              scale: 1,
              duration: 520,
              ease: "Back.out",
            });
            this.confetti();
            this.showReplay();
          }
        },
      });
      void ticks;
    };
    tryReveal(25);
  }

  private confetti() {
    const colors = [COLORS.gold, 0xffffff, COLORS.turfLight, 0xff5544];
    colors.forEach((c, i) => {
      this.time.delayedCall(i * 120, () => {
        const p = this.add.particles(
          Phaser.Math.Between(80, WIDTH - 80),
          -20,
          "pixel",
          {
            speedY: { min: 120, max: 320 },
            speedX: { min: -80, max: 80 },
            scale: { start: 1.6, end: 0.4 },
            lifespan: 2200,
            quantity: 3,
            frequency: 40,
            tint: c,
            gravityY: 120,
          }
        );
        this.time.delayedCall(2600, () => p.destroy());
      });
    });
  }

  private showReplay() {
    this.time.delayedCall(1400, () => {
      const t = this.add
        .text(WIDTH / 2, HEIGHT - 90, "Tap to return", {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "20px",
          color: "#cfe0d4",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      this.tweens.add({
        targets: t,
        alpha: { from: 0.4, to: 1 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
      t.on("pointerdown", () => {
        // Single-route app: no navigation. Tell the React shell to fall back to
        // the name-select screen.
        const onExit = this.registry.get("onExit") as (() => void) | undefined;
        onExit?.();
      });
    });
  }
}
