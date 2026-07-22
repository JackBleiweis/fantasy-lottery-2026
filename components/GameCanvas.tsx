"use client";

import { useEffect, useRef } from "react";
import type { Player } from "@/game/session";

export default function GameCanvas({
  player,
  onExit,
}: {
  player: Player;
  onExit: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the latest onExit without re-running the mount effect.
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  useEffect(() => {
    let destroy: (() => void) | undefined;
    let cancelled = false;

    // Dynamically import so Phaser only ever loads in the browser.
    import("@/game/main").then(({ createGame }) => {
      if (cancelled || !containerRef.current) return;
      const game = createGame(containerRef.current, player, () =>
        onExitRef.current()
      );
      destroy = () => game.destroy(true);
    });

    return () => {
      cancelled = true;
      if (destroy) destroy();
    };
  }, [player]);

  return <div className="game-root" ref={containerRef} />;
}
