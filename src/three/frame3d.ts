/**
 * The per-frame snapshot shared between the Stage3D frame controller and the
 * 3D scenes. The controller (useFrame priority −1) resolves the SAME
 * `resolveSceneFrame` the 2D engine uses and writes the result here BEFORE any
 * scene's own useFrame runs; scenes read their slot(s) the same frame — so the
 * two worlds can never disagree about a cross-fade.
 *
 * Mutated in place, never re-created: the hot path allocates nothing (the
 * codebase idiom — pre-baked buffers, zero per-frame garbage).
 */

import type { Theme } from '../data/chapters'
import type { SceneSlot } from '../canvas/sceneTimeline'
import type { FlightPose } from './flightMath'

export type Slot3D = {
  theme: Theme
  /** Cross-fade weight 0..1 — identical meaning to the 2D renderer `alpha`. */
  alpha: number
  /** Clamped localT through the run — the story clock. */
  t: number
  /** Unclamped localT — ambient motion that must not freeze in a cross-fade. */
  tRaw: number
}

export type Frame3D = {
  /** Continuous chapter position (0..count−1). */
  pos: number
  /** Seconds, ambient-motion clock (R3F elapsed time). */
  time: number
  /** How many of `slots` are valid this frame (0..2: base + incoming). */
  count: number
  slots: [Slot3D, Slot3D]
  /** Engine-eased pointer, viewport-normalized 0..1; presence `a` eases 0→1
   *  on arrival and back out on leave/blur/touch-lift (the 2D channel's
   *  semantics). Scenes must look complete at a = 0. */
  pointer: { x: number; y: number; a: number }
  /** This frame's flight pose (E2) — the camera's place on the path BEFORE
   *  the pointer micro-parallax offset. Scenes and tooling read it; only the
   *  frame controller writes it. */
  camera: FlightPose
}

export function createFrame3D(): Frame3D {
  const slot = (): Slot3D => ({ theme: 'origin', alpha: 0, t: 0, tRaw: 0 })
  return {
    pos: 0,
    time: 0,
    count: 0,
    slots: [slot(), slot()],
    pointer: { x: 0.5, y: 0.5, a: 0 },
    camera: { x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: -1, roll: 0 },
  }
}

/** Copy a resolved 2D scene slot into a mutable 3D slot (no allocation). */
export function writeSlot3D(target: Slot3D, source: SceneSlot): void {
  target.theme = source.run.theme
  target.alpha = source.alpha
  target.t = source.t
  target.tRaw = source.tRaw
}
