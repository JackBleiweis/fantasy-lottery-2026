"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import MobileGate from "@/components/MobileGate";
import NameSelect from "@/components/NameSelect";
import type { Player } from "@/game/session";

// Phaser is browser-only; never render it on the server.
const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
  loading: () => (
    <main className="screen">
      <p className="loading">Warming up the course...</p>
    </main>
  ),
});

// The entire app lives on a single route with no persistence. We swap between
// name-select and the game in React state only, so there is no /game URL to
// deep-link into and nothing is stored. A refresh simply returns to name-select.
export default function HomePage() {
  const [player, setPlayer] = useState<Player | null>(null);

  return (
    <>
      <div className="rotate-overlay">
        <p className="brand">Glitchy Golf</p>
        <p className="title">Rotate to portrait</p>
        <p className="subtitle">Hold your phone upright to play.</p>
      </div>
      <MobileGate>
        {player ? (
          <GameCanvas player={player} onExit={() => setPlayer(null)} />
        ) : (
          <NameSelect onStart={setPlayer} />
        )}
      </MobileGate>
    </>
  );
}
