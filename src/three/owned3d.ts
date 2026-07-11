/**
 * The "3D-owned scene" mechanism (E2) — the explicit registry flip the phase
 * strategy reserves: a theme listed here is OWNED by the 3D layer, and the 2D
 * stage skips painting it while the world mode is '3d' (in '2d' mode the 2D
 * world always paints everything — it IS the fallback).
 *
 * The set ships EMPTY on purpose. With E2's content (depth starfields + the
 * camera rig) no scene's 3D version outclasses its 2D original yet, and a
 * flip is a per-scene product decision, never an implicit side effect. When a
 * theme does flip, mind two things: (1) its 3D scene must paint a COMPLETE
 * frame (the 2D safety floor `#06070a` is all that remains underneath), and
 * (2) the mode says '3d' even if the 3D chunk itself failed to load
 * (ChunkBoundary) — wire chunk failure back into the world mode before
 * flipping a real theme, or a flaky fetch leaves a hole in the story.
 *
 * Three-free by contract: `CanvasStage` (main-bundle 2D engine) imports this.
 */

import type { Sky, Theme } from '../data/chapters'
import type { WorldMode } from './worldMode'

/** Themes whose frame the 3D layer owns. Empty until a 3D scene clearly
 *  outclasses its 2D original — an explicit later decision (E3+). */
export const OWNED_3D: ReadonlySet<Theme> = new Set<Theme>()

/** Should the 2D stage paint this theme under the given world mode? */
export function paints2D(theme: Theme, mode: WorldMode, owned: ReadonlySet<Theme> = OWNED_3D): boolean {
  return mode !== '3d' || !owned.has(theme)
}

/**
 * The FINER flip (E3b): sky moods whose HERO AIRCRAFT the 3D layer owns.
 * Unlike `OWNED_3D` (a whole frame), the 2D scene keeps painting its entire
 * environment — sky, ground, cloud deck, white-out, sun — and skips only its
 * aircraft story (the hero, the graduation rings/tags, the cockpit HUD). The
 * real GLB heroes of the authored sequence fly in the 3D layer instead, over
 * the very same 2D backdrop — no seam, and the 2D world stays the complete
 * fallback in '2d' mode.
 */
export const HERO_3D: ReadonlySet<Sky> = new Set<Sky>(['climb'])

/**
 * Live readiness of each 3D hero scene — the chunk-failure caveat above,
 * answered at hero granularity: the 2D hero keeps painting until the 3D one
 * is actually LIVE (chunk fetched, GLBs decoded), and returns the instant it
 * stops being live (unmount, reduced-motion flip, a failed model fetch never
 * reports ready). Mutated by the 3D scene, read by the 2D stage every frame —
 * a module-level channel on purpose: no React between two render loops.
 */
const heroReady = new Set<Sky>()

export function setHero3DReady(sky: Sky, ready: boolean): void {
  if (ready) heroReady.add(sky)
  else heroReady.delete(sky)
}

/** Should the 2D scene paint its own hero aircraft this frame? */
export function paintsHero2D(sky: Sky | undefined, mode: WorldMode, owned: ReadonlySet<Sky> = HERO_3D): boolean {
  return mode !== '3d' || sky === undefined || !owned.has(sky) || !heroReady.has(sky)
}
