/**
 * Timeline math — the pure bridge from the global `scrollProgress` (0..1) to
 * "which chapter are we in, and how far through it." No React, no DOM, no wall
 * clock: everything here is a pure function of `(progress, count)`, so it is
 * trivially unit-testable and reusable by both the L1 DOM shell and any later
 * renderer (L2). The story is always *derived* from scroll — never a timer.
 */

/** Scroll distance the track gives each chapter, in viewport heights. */
export const VH_PER_CHAPTER = 110

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

function clampInt(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n
}

/**
 * SCROLL WEIGHTS (E3b follow-up) — a chapter may claim MORE scroll than its
 * uniform share: `chapter.scrollWeight` (default 1) stretches its span of the
 * pos line without touching pos-space itself. The warp is piecewise-linear
 * with knots on the HALF-INTEGER grid (chapter i owns pos [i−0.5, i+0.5] —
 * the same grid scene run-windows sit on, so a weighted chapter stretches
 * EXACTLY its own scene window and both worlds stretch together). Everything
 * downstream keeps thinking in pos; only progress↔pos changes, and the track
 * gains the extra height so unweighted chapters keep their real scroll pace.
 */
export type ChapterWeights = {
  /** Per-chapter weight (default 1). */
  w: readonly number[]
  /** Weighted length of the pos line up to each knot (knot i = pos i − 0.5;
   *  knot 0 = pos 0). cum[count] = the total weighted length. */
  cum: readonly number[]
  total: number
}

export function buildChapterWeights(
  chapters: ReadonlyArray<{ scrollWeight?: number }>,
): ChapterWeights {
  const w = chapters.map((c) => Math.max(c.scrollWeight ?? 1, 0.01))
  const n = w.length
  const cum: number[] = [0]
  for (let i = 0; i < n; i++) {
    // chapter i's span on the pos line: half-spans at both story ends
    const len = n <= 1 ? 1 : i === 0 || i === n - 1 ? 0.5 : 1
    cum.push(cum[i] + len * w[i])
  }
  return { w, cum, total: cum[n] }
}

/** The knot (pos of chapter i's span start) for segment i. */
function knotPos(i: number): number {
  return i === 0 ? 0 : i - 0.5
}

/** progress (0..1) → continuous pos (0..count−1) through the weight warp. */
export function posFromProgress(progress: number, weights: ChapterWeights): number {
  const { w, cum, total } = weights
  const n = w.length
  if (n <= 1) return 0
  const target = clamp01(progress) * total
  let i = 0
  while (i < n - 1 && target > cum[i + 1]) i++
  return knotPos(i) + (target - cum[i]) / w[i]
}

/** Continuous pos → progress (0..1) — the inverse warp, for retuning any
 *  progress-anchored value off the pos-space moment it marks. */
export function progressFromPos(pos: number, weights: ChapterWeights): number {
  const { w, cum, total } = weights
  const n = w.length
  if (n <= 1) return 0
  const p = Math.min(Math.max(pos, 0), n - 1)
  let i = 0
  while (i < n - 1 && p > knotPos(i + 1)) i++
  return (cum[i] + (p - knotPos(i)) * w[i]) / total
}

/** Total scroll-track height (in vh): weighted chapters ADD height, so every
 *  weight-1 chapter keeps exactly the pace it always had. */
export function trackHeightVh(count: number, weights?: ChapterWeights): number {
  const base = Math.max(count, 1) * VH_PER_CHAPTER
  if (!weights || count <= 1) return base
  return Math.round(base * (weights.total / (count - 1)))
}

/**
 * Continuous position along the chapter line, from 0 (first chapter centered)
 * to `count - 1` (last chapter centered). This is the value cards fade around.
 * With `weights` the scroll is warped so weighted chapters own more of it.
 */
export function chapterPosition(progress: number, count: number, weights?: ChapterWeights): number {
  if (count <= 1) return 0
  if (weights) return posFromProgress(progress, weights)
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
 * The era label the HUD should read at `progress`. Each chapter with an `era`
 * owns a breakpoint = `eraFrom` (explicit, 0..1) or the default uniform
 * midpoint `(i − 0.5)/(count − 1)` — the point at which its era becomes active.
 * The active era is the last breakpoint at or before `progress`. With no
 * overrides this exactly reproduces `nearestChapter`'s switch points; an
 * `eraFrom` lets a label flip when the scene actually arrives (L-159 at 24 %,
 * sunset at ~59 %) instead of at the mechanical boundary. Breakpoints must
 * stay monotonic in chapter order (they are — defaults are, and overrides keep
 * within their neighbours' windows).
 */
export function activeEra(
  progress: number,
  chapters: readonly { era?: string; eraFrom?: number }[],
  extra: readonly { from: number; era: string }[] = [],
  weights?: ChapterWeights,
): string {
  const p = clamp01(progress)
  const span = Math.max(chapters.length - 1, 1)
  // Default breakpoint = the chapter's span start (pos i − 0.5) expressed in
  // progress — through the weight warp when the story carries one.
  const defFrom = (i: number) =>
    weights ? progressFromPos(i - 0.5, weights) : (i - 0.5) / span
  const stops = chapters
    .map((ch, i) => (ch.era ? { from: ch.eraFrom ?? defFrom(i), era: ch.era } : null))
    .filter((s): s is { from: number; era: string } => s !== null)
    .concat(extra)
  let era = ''
  let best = -Infinity
  for (const s of stops) {
    if (s.from <= p && s.from >= best) {
      best = s.from
      era = s.era
    }
  }
  return era
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

/**
 * Windowed variant for chapters whose card must HOLD at full strength over a
 * stretch of the scroll instead of peaking at the chapter centre (data-driven
 * via `chapter.cardFull`): full between `cardIndex + full[0]` and
 * `cardIndex + full[1]`, easing in/out over `ease` chapters on either side —
 * the Selfhealing card stays up until the tree stands in full bloom (83 %).
 */
export function cardOpacityWindowed(
  pos: number,
  cardIndex: number,
  full: readonly [number, number],
  ease = 0.13,
): number {
  const a = cardIndex + full[0]
  const b = cardIndex + full[1]
  const up = clamp01((pos - (a - ease)) / ease)
  const down = clamp01(((b + ease) - pos) / ease)
  const rise = up * up * (3 - 2 * up)
  const fall = down * down * (3 - 2 * down)
  return Math.min(rise, fall)
}
