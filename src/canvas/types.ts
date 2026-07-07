import type { Sky } from '../data/chapters'

/** Frame geometry + theme context a scene needs to paint, in CSS pixels
 *  (the 2D context is already DPR-scaled by the engine). */
export type SceneConfig = {
  w: number
  h: number
  dpr: number
  /** Signature accent of the scene's theme (hex), from `THEME_ACCENT`. */
  accent: string
  /** Sub-mood for `sky` scenes — the `chapter.sky` of the current run. */
  sky?: Sky
  /** `localT` left unclamped — continuous across the scene's window edges.
   *  Use for ambient world motion (cloud drift) so it never freezes while
   *  the scene is painted inside a neighbour's cross-fade. Story beats keep
   *  using the clamped `localT`. */
  tRaw?: number
  /** True → `time` is frozen at 0; the scene must look complete when static. */
  reducedMotion: boolean
  /** The engine-smoothed pointer, CSS px, with presence `a` easing 0→1 as
   *  the pointer arrives and back after it leaves (0 on touch rest, under
   *  reduced motion, and until the first move). Purely an ENHANCEMENT
   *  channel: scenes must look complete at a = 0. */
  pointer?: { x: number; y: number; a: number }
}

/**
 * A scene renderer: a pure draw function — no React, no DOM state, framework-
 * free so L2 can reuse it as the fallback. Everything painted derives from:
 *  - `alpha`  how present the scene is (cross-fade weight 0..1). Every fill
 *             must be multiplied by it so scenes stack during transitions.
 *  - `localT` scroll progress through the scene's chapter run (0..1) — the
 *             *story* clock. Never advance story by wall time.
 *  - `time`   seconds, for ambient motion only (twinkle, drift); 0 under
 *             reduced motion.
 *  - `cfg`    frame geometry + theme accents.
 */
export type Renderer = (
  ctx: CanvasRenderingContext2D,
  alpha: number,
  localT: number,
  time: number,
  cfg: SceneConfig,
) => void
