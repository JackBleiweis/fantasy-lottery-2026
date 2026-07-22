import Phaser from "phaser";
import { WIDTH, HEIGHT } from "./config/tuning";
import type { Player } from "./session";
import BootScene from "./scenes/BootScene";
import CharacterSelectScene from "./scenes/CharacterSelectScene";
import IntroScene from "./scenes/IntroScene";
import HoleScene from "./scenes/HoleScene";
import ResultScene from "./scenes/ResultScene";
import RevealScene from "./scenes/RevealScene";

export function createGame(
  parent: HTMLElement,
  player: Player,
  onExit?: () => void
): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: "#06170f",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // Cap DPR for perf on high-density phones while staying crisp.
    render: { antialias: true, powerPreference: "high-performance" },
    fps: { target: 60, min: 30 },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [
      BootScene,
      CharacterSelectScene,
      IntroScene,
      HoleScene,
      ResultScene,
      RevealScene,
    ],
  });

  game.registry.set("player", player);
  game.registry.set("onExit", onExit ?? (() => {}));
  return game;
}
