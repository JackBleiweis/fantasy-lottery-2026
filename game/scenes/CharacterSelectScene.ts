import Phaser from "phaser";
import { WIDTH, HEIGHT, COLORS } from "../config/tuning";
import {
  CHARACTERS,
  CHARACTER_ORDER,
  CharacterKey,
} from "../config/characters";
import { unlockAudio, Sfx } from "../audio";

export default class CharacterSelectScene extends Phaser.Scene {
  private selected: CharacterKey | null = null;
  private cards: Map<CharacterKey, Phaser.GameObjects.Container> = new Map();
  private cta!: Phaser.GameObjects.Container;
  private ctaLabel!: Phaser.GameObjects.Text;

  constructor() {
    super("CharacterSelectScene");
  }

  create() {
    // First user gesture unlocks audio on mobile.
    this.input.once("pointerdown", () => unlockAudio());

    this.drawBackground();

    this.add
      .text(WIDTH / 2, 70, "GLITCHY GOLF", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "22px",
        color: "#f4c430",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setLetterSpacing(3);

    this.add
      .text(WIDTH / 2, 118, "Choose your champion", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "34px",
        color: "#f5f2e8",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const top = 190;
    const gap = 288;
    CHARACTER_ORDER.forEach((key, i) => {
      const card = this.makeCard(key, WIDTH / 2, top + i * gap + 120);
      this.cards.set(key, card);
    });

    this.cta = this.makeCta();
    this.setSelected(null);
  }

  private drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(
      COLORS.turfLight,
      COLORS.turfLight,
      COLORS.turfDark,
      COLORS.turfDark,
      1
    );
    g.fillRect(0, 0, WIDTH, HEIGHT);
  }

  private makeCard(key: CharacterKey, cx: number, cy: number) {
    const def = CHARACTERS[key];
    const w = 640;
    const h = 250;
    const container = this.add.container(cx, cy);

    const bg = this.add.graphics();
    const drawBg = (active: boolean) => {
      bg.clear();
      bg.fillStyle(0x000000, active ? 0.35 : 0.22);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.lineStyle(active ? 4 : 2, active ? COLORS.gold : 0xffffff, active ? 1 : 0.18);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
    };
    drawBg(false);
    container.add(bg);
    container.setData("drawBg", drawBg);

    // Emoji badge
    const badge = this.add.graphics();
    badge.fillStyle(def.color, 1);
    badge.fillCircle(-w / 2 + 80, -h / 2 + 80, 54);
    container.add(badge);
    container.add(
      this.add
        .text(-w / 2 + 80, -h / 2 + 80, def.emoji, { fontSize: "56px" })
        .setOrigin(0.5)
    );

    container.add(
      this.add
        .text(-w / 2 + 160, -h / 2 + 44, def.name, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "34px",
          color: "#f5f2e8",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5)
    );
    container.add(
      this.add
        .text(-w / 2 + 160, -h / 2 + 86, def.blurb, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "17px",
          color: "#dfe8e0",
          wordWrap: { width: w - 200 },
        })
        .setOrigin(0, 0.5)
    );

    // Stat bars: power and accuracy
    const powerN = Phaser.Math.Clamp((def.maxPower - 480) / (960 - 480), 0.1, 1);
    const accN = def.guideFraction;
    this.statBar(container, -w / 2 + 40, h / 2 - 70, "POWER", powerN, def.color);
    this.statBar(container, -w / 2 + 40, h / 2 - 34, "ACCURACY", accN, COLORS.turfLight);

    const hit = this.add
      .rectangle(0, 0, w, h, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      unlockAudio();
      Sfx.select();
      this.setSelected(key);
    });
    container.add(hit);

    return container;
  }

  private statBar(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    label: string,
    value: number,
    color: number
  ) {
    const barX = x + 130;
    const barW = 380;
    container.add(
      this.add
        .text(x, y, label, {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "14px",
          color: "#9fb8a8",
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5)
    );
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(barX, y - 8, barW, 16, 8);
    g.fillStyle(color, 1);
    g.fillRoundedRect(barX, y - 8, Math.max(16, barW * value), 16, 8);
    container.add(g);
  }

  private makeCta() {
    const c = this.add.container(WIDTH / 2, HEIGHT - 70);
    const g = this.add.graphics();
    g.fillStyle(COLORS.gold, 1);
    g.fillRoundedRect(-260, -38, 520, 76, 18);
    c.add(g);
    this.ctaLabel = this.add
      .text(0, 0, "Select a champion", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "26px",
        color: "#08251b",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    c.add(this.ctaLabel);
    const hit = this.add
      .rectangle(0, 0, 520, 76, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      if (!this.selected) return;
      Sfx.select();
      this.registry.set("character", this.selected);
      this.scene.start("IntroScene");
    });
    c.add(hit);
    return c;
  }

  private setSelected(key: CharacterKey | null) {
    this.selected = key;
    this.cards.forEach((card, k) => {
      const drawBg = card.getData("drawBg") as (a: boolean) => void;
      drawBg(k === key);
      this.tweens.add({
        targets: card,
        scale: k === key ? 1.02 : 1,
        duration: 120,
        ease: "Quad.out",
      });
    });
    this.ctaLabel.setText(
      key ? `Choose ${CHARACTERS[key].name}` : "Select a champion"
    );
    this.cta.setAlpha(key ? 1 : 0.55);
  }
}
