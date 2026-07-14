import type { ComponentType } from 'react'
import type { Theme } from '../data/chapters'
import type { SceneRun } from '../canvas/sceneTimeline'
import type { FlightPath } from './flightMath'
import type { Frame3D } from './frame3d'
import { Starfield } from './scenes3d/Starfield'
import { SkyScenes } from './scenes3d/SkyPatrols'

/** The shared world's flight rig (E2): the baked camera path plus the story
 *  runs it was built from — scenes anchor their world-space volumes on it. */
export type FlightRig = {
  path: FlightPath
  runs: readonly SceneRun[]
  count: number
}

/** Props every 3D scene receives: which theme slot it augments, the shared
 *  mutable frame snapshot (read inside useFrame, never in render), and the
 *  flight rig for world-space placement. */
export type Scene3DProps = {
  theme: Theme
  frame: Frame3D
  flight: FlightRig
}

/**
 * The 3D theme registry — the L2 mirror of the 2D `RENDERERS` map, total over
 * `Theme` so a new theme is a compile error here too. `null` = the 2D world
 * carries that scene alone (the E-phase strategy: AUGMENT scene by scene; a
 * scene only flips to 3D-owned when its 3D version clearly outclasses the 2D).
 *
 * E1 registers the two space scenes: the origin dawn and the contact finale
 * both gain a true-depth starfield. `SkyScenes` carries the L-159 patrols
 * (SkyPatrols.tsx: the airshow head-on pass and the sunset landing break),
 * the chapter-02 one-circle fight (CruiseBallet.tsx), the E3b-v2 climb
 * heroes (ClimbHeroes.tsx — Martin's re-authored Part-1 sequence; its 2D
 * silhouette story remains the in-scene fallback until the models are
 * live) and the chapter-03 Bagram base-ops actors (BagramActors.tsx —
 * C-17 / Apache pair / F-16 holding / Mi-17 over the panning 2D base).
 * Only the parametric fly-bys (Jets.tsx) stay unmounted, kept as reference.
 */
export const RENDERERS_3D: Record<Theme, ComponentType<Scene3DProps> | null> = {
  origin: Starfield,
  sky: SkyScenes,
  calm: null,
  bitcoin: null,
  dev: null,
  offer: null,
  contact: Starfield,
}
