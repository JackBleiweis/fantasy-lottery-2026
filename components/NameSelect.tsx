"use client";

import { useState } from "react";
import type { Player } from "@/game/session";
import { PLAYERS } from "@/game/config/players";

export default function NameSelect({
  onStart,
}: {
  onStart: (player: Player) => void;
}) {
  const [slug, setSlug] = useState("");

  const selected = PLAYERS.find((p) => p.slug === slug);

  function start() {
    if (!selected) return;
    onStart({ slug: selected.slug, name: selected.name });
  }

  return (
    <main className="screen">
      <p className="brand">Glitchy Golf</p>
      <h1 className="title">Draft Lottery</h1>
      <p className="subtitle">
        Conquer 5 holes of Glitchy Golf under par to unlock your draft pick.
        Miss the mark and you tee off again.
      </p>

      <div className="card">
        <label className="label" htmlFor="player">
          Who&apos;s playing?
        </label>
        <select
          id="player"
          className="name-select"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        >
          <option value="" disabled>
            Select your name
          </option>
          {PLAYERS.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>

        <button className="cta" disabled={!selected} onClick={start}>
          Enter Glitchy Golf
        </button>
      </div>

      <p className="hint">
        Best played with sound on. Your pick shows once - remember it!
      </p>
    </main>
  );
}
