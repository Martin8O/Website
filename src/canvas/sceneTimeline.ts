/**
 * Scene timeline — pure math mapping the continuous chapter position (`pos`
 * from `timeline.ts`) onto *scenes*: contiguous runs of chapters that share a
 * visual world (same theme, and for `sky` the same sub-mood). One scene paints
 * as the base each frame; near a run boundary the next scene cross-fades in
 * on top, exactly like the story cards hand over around the midpoint.
 *
 * Pure functions of `(pos, runs)` — no DOM, no clock — so this is unit-tested
 * and reusable by any renderer (L1 canvas today, L2 later).
 */

import type { Chapter, Sky, Theme } from '../data/chapters'
import { clamp01, smoothstep } from './toolkit'

/** A contiguous run of chapters painted by one scene. Indices inclusive. */
export type SceneRun = {
  theme: Theme
  sky?: Sky
  start: number
  end: number
  /** Where THIS scene fades in over its predecessor, in localT of the
   *  predecessor's last chapter (defaults to [FADE_START, FADE_END]) — the
   *  sunset landing waits for the airshow's falling flares (B2.3c). */
  enterFade?: readonly [number, number]
}

/** One scene to paint this frame: which run, how far through it (`t`, the
 *  renderer's `localT`), and its cross-fade weight. `tRaw` is the SAME
 *  progress left unclamped — while a scene is painted beyond its own window
 *  (both halves of a cross-fade), ambient world motion (cloud drift) must
 *  keep flowing from it, or one copy of the world freezes and doubles. */
export type SceneSlot = {
  run: SceneRun
  t: number
  tRaw: number
  alpha: number
}

export type SceneFrame = {
  base: SceneSlot
  /** Present only inside a transition zone; painted over the base. */
  incoming?: SceneSlot
}

/** Cross-fade window within the last chapter of a run, in `localT` of that
 *  chapter: the next scene starts appearing at 0.3 and fully owns the frame
 *  by 0.7 — bracketing the card handover at 0.5. */
export const FADE_START = 0.3
export const FADE_END = 0.7

/** Group chapters into scene runs. `sky` chapters split per sub-mood, so each
 *  aviation mood is its own scene (B2 cross-fades between them for free). */
export function buildRuns(
  chapters: ReadonlyArray<Pick<Chapter, 'theme' | 'sky' | 'enterFade'>>,
): SceneRun[] {
  const runs: SceneRun[] = []
  chapters.forEach((ch, i) => {
    const last = runs[runs.length - 1]
    if (last && last.theme === ch.theme && last.sky === ch.sky) {
      last.end = i
    } else {
      runs.push({ theme: ch.theme, sky: ch.sky, start: i, end: i, enterFade: ch.enterFade })
    }
  })
  return runs
}

/**
 * A run's ownership window in `pos` space: half a chapter beyond the run on
 * each side (where cross-fades live), clamped to the story's ends. The ONE
 * definition — `runLocalT` and the L2 flight path both derive from it, so the
 * worlds can't disagree about where a scene begins and ends.
 */
export function runWindow(run: SceneRun, count: number): readonly [number, number] {
  const lastIndex = Math.max(count - 1, 0)
  const winStart = run.start === 0 ? 0 : run.start - 0.5
  const winEnd = run.end === lastIndex ? lastIndex : run.end + 0.5
  return [winStart, winEnd]
}

/**
 * Progress (0..1) through a run's ownership window, so a scene's `localT`
 * moves smoothly across every chapter it owns — e.g. the origin sun arcs over
 * both intro and school without a jump.
 */
export function runLocalT(pos: number, run: SceneRun, count: number): number {
  return clamp01(runLocalTRaw(pos, run, count))
}

/** `runLocalT` without the clamp — continuous across the window edges, for
 *  ambient motion that must not freeze while a scene cross-fades. */
export function runLocalTRaw(pos: number, run: SceneRun, count: number): number {
  const [winStart, winEnd] = runWindow(run, count)
  if (winEnd <= winStart) return 0
  return (pos - winStart) / (winEnd - winStart)
}

/** Resolve a frame: the base scene (alpha 1) and, inside a transition zone,
 *  the incoming scene with its cross-fade weight. */
export function resolveSceneFrame(
  pos: number,
  runs: readonly SceneRun[],
  count: number,
): SceneFrame | null {
  if (runs.length === 0 || count === 0) return null
  const chapter = Math.min(Math.max(Math.floor(pos), 0), count - 1)
  let runIndex = 0
  for (let i = 0; i < runs.length; i++) {
    if (chapter >= runs[i].start && chapter <= runs[i].end) {
      runIndex = i
      break
    }
  }
  let run = runs[runIndex]
  const frac = pos - chapter

  // Only the last chapter of a run borders a different scene.
  if (chapter === run.end && runIndex < runs.length - 1) {
    const next = runs[runIndex + 1]
    const [fadeStart, fadeEnd] = next.enterFade ?? [FADE_START, FADE_END]
    const blend = smoothstep(fadeStart, fadeEnd, frac)
    if (blend >= 1) {
      // Fully handed over — the next scene IS the frame; skip the dead base.
      run = next
    } else if (blend > 0) {
      return {
        base: {
          run,
          t: runLocalT(pos, run, count),
          tRaw: runLocalTRaw(pos, run, count),
          alpha: 1,
        },
        incoming: {
          run: next,
          t: runLocalT(pos, next, count),
          tRaw: runLocalTRaw(pos, next, count),
          alpha: blend,
        },
      }
    }
  }

  return {
    base: {
      run,
      t: runLocalT(pos, run, count),
      tRaw: runLocalTRaw(pos, run, count),
      alpha: 1,
    },
  }
}
