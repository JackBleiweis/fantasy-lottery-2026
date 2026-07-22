import { CharacterKey } from "./config/characters";

export interface RunState {
  character: CharacterKey;
  holeIndex: number; // hole currently being played (0-based)
  totalStrokes: number;
  attempt: number; // 1-based
  startedAt: number; // epoch ms of first tee-off
  target: number;
}
