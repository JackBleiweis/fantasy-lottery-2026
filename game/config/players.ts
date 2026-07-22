// The league roster + pre-assigned draft picks, baked into the app (no backend).
// Edit data/players.seed.json to change names or picks. This is fully
// client-side by design: if someone digs through the bundle they can find the
// picks, and that's an accepted trade-off for a friendly league.
import seed from "@/data/players.seed.json";
import { toSlug } from "@/lib/slug";

export interface LeaguePlayer {
  slug: string;
  name: string;
  pick: number;
}

const raw = (seed as { picks: { name: string; pick: number }[] }).picks;

export const PLAYERS: LeaguePlayer[] = raw
  .map((p) => ({ slug: toSlug(p.name), name: p.name, pick: p.pick }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function pickForSlug(slug: string): number | undefined {
  return PLAYERS.find((p) => p.slug === slug)?.pick;
}
