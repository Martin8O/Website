/**
 * Timeline math — the pure bridge from the global `scrollProgress` (0..1) to
 * "which chapter are we in, and how far through it." No React, no DOM, no wall
 * clock: everything here is a pure function of `(progress, count)`, so it is
 * trivially unit-testable and reusable by both the L1 DOM shell and any later
 * renderer (L2). The story is always *derived* from scroll — never a timer.
 */

/** Scroll distance the track gives each chapter, in viewport heights. */
export const VH_PER_CHAPTER = 110

/** Total scroll-track height (in vh) for a story of `count` chapters. */
export function trackHeightVh(count: number): number {
  return Math.max(count, 1) * VH_PER_CHAPTER
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

function clampInt(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n
}

/**
 * Continuous position along the chapter line, from 0 (first chapter centered)
 * to `count - 1` (last chapter centered). This is the value cards fade around.
 */
export function chapterPosition(progress: number, count: number): number {
  if (count <= 1) return 0
  return clamp01(progress) * (count - 1)
}

/**
 * Resolve scroll progress to a discrete chapter `index` plus `localT` (0..1),
 * how far we are into that chapter. `pos` is the underlying continuous value.
 */
export function resolveTimeline(
  progress: number,
  count: number,
): { pos: number; index: number; localT: number } {
  const pos = chapterPosition(progress, count)
  const index = clampInt(Math.floor(pos), 0, Math.max(count - 1, 0))
  const localT = clamp01(pos - index)
  return { pos, index, localT }
}

/** The chapter currently nearest to center — what the HUD reads out. */
export function nearestChapter(progress: number, count: number): number {
  if (count <= 0) return 0
  return clampInt(Math.round(chapterPosition(progress, count)), 0, count - 1)
}

/**
 * A card's opacity given the continuous position and the card's own index.
 * Peaks at 1 when centered, smoothstep-eased to 0 by `falloff` chapters away.
 * Falloff ≈ 0.5 keeps neighbouring cards from ever stacking visibly — two
 * same-side cards overlapping mid-transition read as a glitch.
 */
export function cardOpacity(pos: number, cardIndex: number, falloff = 0.52): number {
  const d = Math.abs(pos - cardIndex)
  const o = clamp01(1 - d / falloff)
  return o * o * (3 - 2 * o)
}
