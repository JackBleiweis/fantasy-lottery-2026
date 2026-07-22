// Tiny Web Audio synth for juice. No asset loading (keeps the game quick to
// load) and it doubles as the mobile audio-unlock: the AudioContext is created
// and resumed on the first user gesture, otherwise iOS keeps it suspended.

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function unlockAudio(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  unlocked = true;
}

interface ToneOpts {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
}

function tone({ freq, dur, type = "sine", gain = 0.14, slideTo }: ToneOpts) {
  const c = getCtx();
  if (!c || !unlocked) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, slideTo),
      c.currentTime + dur
    );
  }
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur + 0.02);
}

export const Sfx = {
  putt() {
    tone({ freq: 320, dur: 0.09, type: "square", gain: 0.1, slideTo: 180 });
  },
  wall() {
    tone({ freq: 180, dur: 0.06, type: "triangle", gain: 0.08 });
  },
  sink() {
    tone({ freq: 660, dur: 0.12, type: "sine", gain: 0.16 });
    setTimeout(() => tone({ freq: 990, dur: 0.16, type: "sine", gain: 0.14 }), 90);
  },
  water() {
    tone({ freq: 220, dur: 0.28, type: "sine", gain: 0.12, slideTo: 90 });
  },
  fail() {
    tone({ freq: 200, dur: 0.5, type: "sawtooth", gain: 0.1, slideTo: 70 });
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, dur: 0.22, type: "square", gain: 0.13 }), i * 130)
    );
  },
  select() {
    tone({ freq: 520, dur: 0.08, type: "square", gain: 0.1 });
  },
};
