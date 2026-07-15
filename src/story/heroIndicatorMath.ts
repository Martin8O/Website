/**
 * Pure logic for the HUD 3D-loading indicator — which hero scene's load the
 * chip should narrate at a given scroll position. Three-free, DOM-free.
 *
 * A hero's "window" is its scene run's ownership span in pos space (half a
 * chapter of cross-fade on each side, the sceneTimeline convention). The chip
 * shows the NEAREST hero ahead of (or under) the visitor whose build is in
 * flight — the promise "the 2D you are reading is not the maximum"; it stays
 * quiet once that hero is ready (the ✓ payoff flash is component state, not
 * logic here) and never narrates a beat the visitor has already left.
 */

import type { Sky } from '../data/chapters'
import type { SceneRun } from '../canvas/sceneTimeline'
import type { HeroKey, HeroLoadSnapshot } from '../three/heroLoad'

export type HeroWindow = { key: HeroKey; start: number; end: number }

/** How far ahead of a hero window the chip starts narrating, in chapters.
 *  1.6 puts the FIRST hero (climb, window from pos 0.5) on screen right at
 *  the intro — exactly where a phone visitor needs the promise. */
export const HERO_HORIZON = 1.6

/** Sky mood → load pipeline. The two flypast beats share one pipeline. */
const SKY_TO_HERO: Partial<Record<Sky, HeroKey>> = {
  climb: 'climb',
  cruise: 'cruise',
  desert: 'desert',
  airshow: 'patrol',
  sunset: 'patrol',
}

/** Hero windows from the scene runs, in story order; ADJACENT windows of the
 *  same pipeline (airshow + sunset) merge into one span. */
export function buildHeroWindows(runs: readonly SceneRun[]): HeroWindow[] {
  const windows: HeroWindow[] = []
  for (const run of runs) {
    const key = run.sky ? SKY_TO_HERO[run.sky] : undefined
    if (!key) continue
    const start = run.start - 0.5
    const end = run.end + 0.5
    const last = windows[windows.length - 1]
    if (last && last.key === key && start <= last.end + 0.001) last.end = end
    else windows.push({ key, start, end })
  }
  return windows
}

/**
 * The hero the chip narrates at `pos`, or null (chip hidden): the first
 * window in story order that is still LOADING, not yet left behind, and
 * within the look-ahead horizon.
 */
export function pickHeroIndicator(
  pos: number,
  windows: readonly HeroWindow[],
  snapshot: HeroLoadSnapshot,
): HeroKey | null {
  for (const w of windows) {
    if (pos >= w.end) continue // already behind the visitor
    if (pos < w.start - HERO_HORIZON) break // too far ahead (windows are ordered)
    if (snapshot[w.key].phase === 'loading') return w.key
  }
  return null
}
