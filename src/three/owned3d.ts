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

import type { Theme } from '../data/chapters'
import type { WorldMode } from './worldMode'

/** Themes whose frame the 3D layer owns. Empty until a 3D scene clearly
 *  outclasses its 2D original — an explicit later decision (E3+). */
export const OWNED_3D: ReadonlySet<Theme> = new Set<Theme>()

/** Should the 2D stage paint this theme under the given world mode? */
export function paints2D(theme: Theme, mode: WorldMode, owned: ReadonlySet<Theme> = OWNED_3D): boolean {
  return mode !== '3d' || !owned.has(theme)
}
