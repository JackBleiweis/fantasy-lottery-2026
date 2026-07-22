"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type GateState = "checking" | "mobile" | "desktop";

function detectMobile(): boolean {
  if (typeof window === "undefined") return false;

  // Explicit override for testing on desktop: ?force
  const params = new URLSearchParams(window.location.search);
  if (params.has("force")) return true;

  const ua = navigator.userAgent || "";
  const uaMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
    ua
  );
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const touch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  const smallish = Math.min(window.innerWidth, window.innerHeight) <= 820;

  // Soft gate: we err toward letting real touch devices through (iPads,
  // foldables) rather than hard-blocking. Desktop = no touch + big screen.
  if (uaMobile) return true;
  if (coarse && touch && smallish) return true;
  return false;
}

export default function MobileGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<GateState>("checking");
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const isMobile = detectMobile();
    setState(isMobile ? "mobile" : "desktop");
    if (!isMobile) {
      QRCode.toDataURL(window.location.href, { margin: 1, width: 360 })
        .then(setQr)
        .catch(() => setQr(null));
    }
  }, []);

  if (state === "checking") {
    return (
      <main className="screen">
        <p className="loading">Loading Glitchy Golf...</p>
      </main>
    );
  }

  if (state === "desktop") {
    return (
      <main className="screen">
        <p className="brand">Glitchy Golf</p>
        <h1 className="title">Play on your phone</h1>
        <p className="subtitle">
          This challenge is built for mobile. Scan the code with your phone
          camera to tee off and unlock your draft pick.
        </p>
        {qr && (
          <div className="qr">
            <img src={qr} alt="Scan to play on your phone" />
          </div>
        )}
        <p className="hint">On a phone already? Reload this page.</p>
      </main>
    );
  }

  return <>{children}</>;
}
