import Phaser from "phaser";
import { BALL_RADIUS } from "../config/tuning";
import { getTuning } from "../config/tuning";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    this.makeBallTexture();
    this.makePixelTexture();
    this.makeFlagTexture();

    this.registry.set("tuning", getTuning());
    this.scene.start("CharacterSelectScene");
  }

  private makeBallTexture() {
    const size = BALL_RADIUS * 2;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(BALL_RADIUS, BALL_RADIUS, BALL_RADIUS);
    g.fillStyle(0xd8d8d8, 1);
    g.fillCircle(BALL_RADIUS + 3, BALL_RADIUS + 3, BALL_RADIUS - 4);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(BALL_RADIUS - 3, BALL_RADIUS - 3, BALL_RADIUS - 6);
    g.generateTexture("ball", size, size);
    g.destroy();
  }

  private makePixelTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 6, 6);
    g.generateTexture("pixel", 6, 6);
    g.destroy();
  }

  private makeFlagTexture() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // pole
    g.fillStyle(0xf5f2e8, 1);
    g.fillRect(10, 0, 4, 54);
    // flag
    g.fillStyle(0xf4c430, 1);
    g.fillTriangle(14, 2, 14, 26, 44, 14);
    g.generateTexture("flag", 48, 56);
    g.destroy();
  }
}
