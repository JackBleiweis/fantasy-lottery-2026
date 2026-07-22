// The selected player is passed through React state -> Phaser registry only.
// Nothing is persisted: no localStorage, no sessionStorage. A refresh sends the
// player back to name-select, and a finished run's pick is shown once - they
// just remember it.

export interface Player {
  slug: string;
  name: string;
}
